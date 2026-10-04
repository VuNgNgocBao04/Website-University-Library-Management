package vn.edu.library.service;

import java.math.BigDecimal;
import java.time.Clock;
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
public class ViolationService {

  private final ViolationRecordRepository violations;
  private final PaymentRecordRepository payments;
  private final BorrowService borrows;
  private final CurrentUser current;
  private final Clock clock;

  public Views.Violation createViolation(Requests.ViolationInput a) {
    current.librarian();
    if (a.type() == ViolationType.OVERDUE) throw BusinessException.bad(
      "Phí quá hạn được hệ thống chốt khi trả hoặc đóng nghĩa vụ mất sách."
    );
    var d = borrows.lockDetail(a.borrowDetailId());
    if (d.getClosedAt() != null) throw BusinessException.bad("Nghĩa vụ mượn đã đóng.");
    if (a.type() == ViolationType.DAMAGED) throw BusinessException.bad(
      "Ghi phí hỏng khi nhận trả cuốn sách."
    );
    var v = borrows.addViolation(d, a.type(), a.fineAmount(), a.notes());
    d.getBookItem().setCondition(ItemCondition.LOST);
    d.getBookItem().setStatus(ItemStatus.LOST);
    return view(v);
  }

  public void closeLostLoan(Long id, Requests.Reason input) {
    current.librarian();
    var v = violations.findById(id).orElseThrow(BusinessException::missing);
    var d = borrows.lockDetail(v.getBorrowDetail().getId());
    if (
      v.getViolationType() != ViolationType.LOST ||
      d.getBookItem().getStatus() != ItemStatus.LOST ||
      d.getClosedAt() != null
    ) throw BusinessException.bad("Không thể đóng nghĩa vụ mất sách này.");
    d.setClosedAt(clock.instant());
    d.setClosureReason("LOST: " + input.reason() + "; librarianId=" + current.id());
    borrows.settleOverdue(d, clock.instant());
    borrows.refreshStatus(d.getBorrowReceipt());
  }

  public Views.PageResult<Views.Violation> searchViolations(Long readerId, int page, int size) {
    Long owner = current.get().getRole() == Role.READER ? current.id() : readerId;
    return Views.PageResult.of(
      violations
        .findAll(
          (r, q, c) ->
            owner == null
              ? c.conjunction()
              : c.equal(r.get("borrowDetail").get("borrowReceipt").get("reader").get("id"), owner),
          Pages.of(page, size, "id")
        )
        .map(this::view)
    );
  }

  public Views.PageResult<Views.Violation> getMyViolations(int page, int size) {
    return searchViolations(current.id(), page, size);
  }

  public BigDecimal calculateOutstandingAmount(Long readerId) {
    current.ownerOrStaff(readerId);
    return violations
      .findAll((r, q, c) ->
        c.equal(r.get("borrowDetail").get("borrowReceipt").get("reader").get("id"), readerId)
      )
      .stream()
      .map(v -> v.getFineAmount().subtract(payments.totalPaid(v.getId())))
      .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  public Views.PaymentView recordPayment(Long id, Requests.Payment input) {
    current.librarian();
    var v = violations.lockById(id).orElseThrow(BusinessException::missing);
    var existing = payments.findByIdempotencyKey(input.idempotencyKey());
    if (existing.isPresent()) {
      var p = existing.get();
      if (
        !p.getViolation().getId().equals(id) ||
        p.getAmount().compareTo(input.amount()) != 0 ||
        !p.getCollectedBy().getId().equals(current.id())
      ) throw BusinessException.bad("Mã yêu cầu đã dùng cho lần thu khác.");
      return Views.PaymentView.of(p);
    }
    var debt = v.getFineAmount().subtract(payments.totalPaid(id));
    if (
      input.amount().signum() <= 0 || input.amount().compareTo(debt) > 0
    ) throw BusinessException.bad("Số tiền thu vượt số còn nợ hoặc không hợp lệ.");
    var p = new PaymentRecord();
    p.setViolation(v);
    p.setAmount(input.amount());
    p.setIdempotencyKey(input.idempotencyKey());
    p.setCollectedBy(current.get());
    p.setPaidAt(clock.instant());
    return Views.PaymentView.of(payments.saveAndFlush(p));
  }

  public List<Views.PaymentView> paymentHistory(Long id) {
    var v = violations.findById(id).orElseThrow(BusinessException::missing);
    current.ownerOrStaff(v.getBorrowDetail().getBorrowReceipt().getReader().getId());
    return payments
      .findAll((r, q, c) -> c.equal(r.get("violation").get("id"), id))
      .stream()
      .map(Views.PaymentView::of)
      .toList();
  }

  public void resolveViolation(Long id) {
    current.librarian();
    var v = violations.lockById(id).orElseThrow(BusinessException::missing);
    if (v.getStatus() == ViolationStatus.RESOLVED) throw BusinessException.bad(
      "Vi phạm đã được xử lý."
    );
    if (
      v.getViolationType() == ViolationType.LOST && v.getBorrowDetail().getClosedAt() == null
    ) throw BusinessException.bad("Cần đóng nghĩa vụ mất sách trước.");
    v.setStatus(ViolationStatus.RESOLVED);
    v.setResolvedAt(clock.instant());
  }

  public Views.Violation view(ViolationRecord v) {
    var d = v.getBorrowDetail();
    var paid = payments.totalPaid(v.getId());
    return new Views.Violation(
      v.getId(),
      d.getId(),
      d.getBorrowReceipt().getReader().getId(),
      d.getBorrowReceipt().getReader().getFullName(),
      d.getBookItem().getBook().getTitle(),
      v.getViolationType(),
      v.getFineAmount(),
      paid,
      v.getFineAmount().subtract(paid),
      v.getStatus(),
      v.getNotes(),
      v.getCreatedAt(),
      v.getResolvedAt(),
      d.getClosedAt()
    );
  }
}
