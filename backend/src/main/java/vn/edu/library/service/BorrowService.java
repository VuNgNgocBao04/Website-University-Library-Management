package vn.edu.library.service;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.library.domain.*;
import vn.edu.library.domain.Types.*;
import vn.edu.library.dto.*;
import vn.edu.library.repository.*;
import vn.edu.library.security.CurrentUser;

@Service
@RequiredArgsConstructor
@Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
public class BorrowService {

  private final UserRepository users;
  private final BookItemRepository items;
  private final BorrowingRuleRepository rules;
  private final BorrowReceiptRepository receipts;
  private final BorrowDetailRepository details;
  private final ViolationRecordRepository violations;
  private final CurrentUser current;
  private final Clock clock;
  private final EntityManager em;

  public record Eligibility(
    Long readerId,
    long currentBooks,
    int maxBooksAllowed,
    int maxDaysAllowed,
    BigDecimal dailyFineAmount
  ) {}

  public Eligibility checkEligibility(Long readerId) {
    var u = users.findById(readerId).orElseThrow(BusinessException::missing);
    if (!(u instanceof Reader r) || u.getStatus() != UserStatus.ACTIVE) throw BusinessException.bad(
      "Bạn đọc không hoạt động."
    );
    var rule = rules.findByReaderType(r.getReaderType()).orElseThrow(BusinessException::missing);
    return new Eligibility(
      readerId,
      details.countByBorrowReceiptReaderIdAndClosedAtIsNull(readerId),
      rule.getMaxBooksAllowed(),
      rule.getMaxDaysAllowed(),
      rule.getDailyFineAmount()
    );
  }

  public Views.Receipt createBorrowReceipt(Requests.Borrow input) {
    current.librarian();
    var reader = users.lockById(input.readerId()).orElseThrow(BusinessException::missing);
    var eligibility = checkEligibility(reader.getId());
    var barcodes = input.barcodes().stream().map(String::trim).sorted().toList();
    if (
      barcodes.isEmpty() || new HashSet<>(barcodes).size() != barcodes.size()
    ) throw BusinessException.bad("Danh sách cuốn rỗng hoặc mã vạch bị lặp.");
    if (
      eligibility.currentBooks() + barcodes.size() > eligibility.maxBooksAllowed()
    ) throw BusinessException.bad("Vượt hạn mức sách đang mượn.");
    // Book locks coordinate with soft deletion; a stable order avoids cross-book deadlocks.
    var candidates = barcodes
      .stream()
      .map(b -> items.findByBarcode(b).orElseThrow(BusinessException::missing))
      .toList();
    candidates
      .stream()
      .map(i -> i.getBook().getId())
      .distinct()
      .sorted()
      .forEach(id -> em.find(Book.class, id, LockModeType.PESSIMISTIC_WRITE));
    var receipt = new BorrowReceipt();
    receipt.setReader(reader);
    receipt.setCreatedByLibrarian(current.get());
    receipt.setBorrowDate(clock.instant());
    receipt.setNote(input.note());
    for (String barcode : barcodes) {
      var item = items.lockByBarcode(barcode).orElseThrow(BusinessException::missing);
      em.refresh(item);
      if (
        item.getStatus() != ItemStatus.AVAILABLE ||
        item.getCondition() != ItemCondition.GOOD ||
        item.getBook().isDeleted()
      ) throw BusinessException.bad("Cuốn " + barcode + " không khả dụng.");
      var detail = new BorrowDetail();
      detail.setBorrowReceipt(receipt);
      detail.setBookItem(item);
      detail.setDueDate(clock.instant().plus(Duration.ofDays(eligibility.maxDaysAllowed())));
      detail.setFineRatePerDay(eligibility.dailyFineAmount());
      receipt.getDetails().add(detail);
      item.setStatus(ItemStatus.ON_LOAN);
    }
    receipts.saveAndFlush(receipt);
    return view(receipt);
  }

  public Views.Receipt getBorrowReceipt(Long id) {
    var r = receipts.findById(id).orElseThrow(BusinessException::missing);
    current.ownerOrStaff(r.getReader().getId());
    return view(r);
  }

  public Views.PageResult<Views.Receipt> searchBorrowReceipts(
    Long readerId,
    ReceiptStatus status,
    int page,
    int size
  ) {
    Long owner = current.get().getRole() == Role.READER ? current.id() : readerId;
    return Views.PageResult.of(
      receipts
        .findAll(
          (r, q, c) -> {
            var p = c.conjunction();
            if (owner != null) p = c.and(p, c.equal(r.get("reader").get("id"), owner));
            if (status != null) p = c.and(p, c.equal(r.get("status"), status));
            return p;
          },
          Pages.of(page, size, "id")
        )
        .map(this::view)
    );
  }

  public Views.PageResult<Views.Receipt> getMyBorrowHistory(int page, int size) {
    return searchBorrowReceipts(current.id(), null, page, size);
  }

  public List<Views.Detail> getMyCurrentLoans() {
    return details
      .findByClosedAtIsNull()
      .stream()
      .filter(d -> d.getBorrowReceipt().getReader().getId().equals(current.id()))
      .map(this::detailView)
      .toList();
  }

  public List<Views.Receipt> getOverdueDetails() {
    return details
      .findByClosedAtIsNull()
      .stream()
      .filter(d -> d.getDueDate().isBefore(clock.instant()))
      .map(BorrowDetail::getBorrowReceipt)
      .distinct()
      .map(this::view)
      .toList();
  }

  public Views.Receipt returnBook(Long id, Requests.Return input) {
    current.librarian();
    if (input.condition() == ItemCondition.LOST) throw BusinessException.bad(
      "Sách mất cần ghi vi phạm và đóng nghĩa vụ riêng."
    );
    var d = lockDetail(id);
    if (d.getClosedAt() != null) throw BusinessException.bad("Cuốn đã trả hoặc đã đóng nghĩa vụ.");
    if (d.getBookItem().getStatus() == ItemStatus.LOST) throw BusinessException.bad(
      "Cuốn đã báo mất; cần dùng thao tác đóng nghĩa vụ mất sách."
    );
    if (
      input.condition() == ItemCondition.DAMAGED &&
      (input.damageFine() == null || input.reason() == null || input.reason().isBlank())
    ) throw BusinessException.bad("Sách hỏng cần số phí và lý do.");
    var now = clock.instant();
    d.setReturnedAt(now);
    d.setClosedAt(now);
    d.setReturnedByLibrarian(current.get());
    d.setConditionOnReturn(input.condition());
    d.setClosureReason("RETURNED");
    var item = d.getBookItem();
    item.setCondition(input.condition());
    item.setStatus(
      input.condition() == ItemCondition.GOOD ? ItemStatus.AVAILABLE : ItemStatus.DAMAGED
    );
    settleOverdue(d, now);
    if (input.condition() == ItemCondition.DAMAGED) addViolation(
      d,
      ViolationType.DAMAGED,
      input.damageFine(),
      input.reason()
    );
    refreshStatus(d.getBorrowReceipt());
    return view(d.getBorrowReceipt());
  }

  public BorrowDetail lockDetail(Long id) {
    var d = details.findById(id).orElseThrow(BusinessException::missing);
    users
      .lockById(d.getBorrowReceipt().getReader().getId())
      .orElseThrow(BusinessException::missing);
    receipts.lockById(d.getBorrowReceipt().getId()).orElseThrow(BusinessException::missing);
    em.refresh(d);
    em.lock(d.getBookItem(), LockModeType.PESSIMISTIC_WRITE);
    em.refresh(d.getBookItem());
    return d;
  }

  public void settleOverdue(BorrowDetail d, Instant at) {
    var fine = calculateFine(d.getDueDate(), at, d.getFineRatePerDay());
    if (fine.signum() > 0) addViolation(
      d,
      ViolationType.OVERDUE,
      fine,
      "Phí trễ hạn chốt khi đóng nghĩa vụ mượn."
    );
  }

  public ViolationRecord addViolation(
    BorrowDetail d,
    ViolationType type,
    BigDecimal amount,
    String reason
  ) {
    if (
      violations.existsByBorrowDetailIdAndViolationType(d.getId(), type)
    ) throw BusinessException.bad("Loại vi phạm này đã được ghi nhận.");
    var v = new ViolationRecord();
    v.setBorrowDetail(d);
    v.setViolationType(type);
    v.setFineAmount(amount);
    v.setNotes(reason);
    v.setCreatedAt(clock.instant());
    return violations.save(v);
  }

  public void refreshStatus(BorrowReceipt r) {
    long closed = r
      .getDetails()
      .stream()
      .filter(d -> d.getClosedAt() != null)
      .count();
    r.setStatus(
      closed == r.getDetails().size()
        ? ReceiptStatus.RETURNED
        : closed == 0
          ? ReceiptStatus.BORROWING
          : ReceiptStatus.PARTIALLY_RETURNED
    );
    r.setUpdatedAt(clock.instant());
  }

  public static BigDecimal calculateFine(Instant due, Instant at, BigDecimal rate) {
    if (!at.isAfter(due)) return BigDecimal.ZERO.setScale(2);
    Duration late = Duration.between(due, at);
    long days =
      late.getSeconds() / 86400 + (late.getSeconds() % 86400 > 0 || late.getNano() > 0 ? 1 : 0);
    return rate.multiply(BigDecimal.valueOf(days));
  }

  public Views.Detail detailView(BorrowDetail d) {
    return new Views.Detail(
      d.getId(),
      d.getBookItem().getBook().getId(),
      d.getBookItem().getBook().getTitle(),
      d.getBookItem().getBarcode(),
      d.getDueDate(),
      d.getReturnedAt(),
      d.getClosedAt(),
      d.getClosureReason(),
      d.getConditionOnReturn(),
      d.getFineRatePerDay(),
      calculateFine(
        d.getDueDate(),
        d.getClosedAt() == null ? clock.instant() : d.getClosedAt(),
        d.getFineRatePerDay()
      ),
      d.getBookItem().getStatus()
    );
  }

  public Views.Receipt view(BorrowReceipt r) {
    return new Views.Receipt(
      r.getId(),
      r.getReader().getId(),
      r.getReader().getFullName(),
      r.getCreatedByLibrarian().getFullName(),
      r.getBorrowDate(),
      r.getStatus(),
      r.getNote(),
      r.getDetails().stream().map(this::detailView).toList()
    );
  }
}
