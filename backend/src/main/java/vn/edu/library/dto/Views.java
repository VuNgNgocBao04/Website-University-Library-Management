package vn.edu.library.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.Page;
import vn.edu.library.domain.*;
import vn.edu.library.domain.Types.*;

public final class Views {

  private Views() {}

  public record PageResult<T>(
    List<T> content,
    int page,
    int size,
    long totalElements,
    int totalPages
  ) {
    public static <T> PageResult<T> of(Page<T> p) {
      return new PageResult<>(
        p.getContent(),
        p.getNumber(),
        p.getSize(),
        p.getTotalElements(),
        p.getTotalPages()
      );
    }
  }

  public record Account(
    Long id,
    String username,
    String fullName,
    String email,
    String phoneNumber,
    Role role,
    UserStatus status,
    String employeeId,
    String readerCode,
    ReaderType readerType
  ) {
    public static Account of(User u) {
      return new Account(
        u.getId(),
        u.getUsername(),
        u.getFullName(),
        u.getEmail(),
        u.getPhoneNumber(),
        u.getRole(),
        u.getStatus(),
        u instanceof Admin a
          ? a.getEmployeeId()
          : u instanceof Librarian l
            ? l.getEmployeeId()
            : null,
        u instanceof Reader r ? r.getReaderCode() : null,
        u instanceof Reader r ? r.getReaderType() : null
      );
    }
  }

  public record CategoryView(Long id, String name, String description) {
    public static CategoryView of(Category c) {
      return new CategoryView(c.getId(), c.getName(), c.getDescription());
    }
  }

  public record BookView(
    Long id,
    String title,
    String author,
    String isbn,
    String publisher,
    Integer publicationYear,
    Long categoryId,
    String categoryName,
    String description,
    String coverImageUrl,
    boolean deleted,
    long availableItems
  ) {}

  public record ItemView(
    Long id,
    Long bookId,
    String barcode,
    String location,
    ItemCondition condition,
    ItemStatus status
  ) {
    public static ItemView of(BookItem i) {
      return new ItemView(
        i.getId(),
        i.getBook().getId(),
        i.getBarcode(),
        i.getLocation(),
        i.getCondition(),
        i.getStatus()
      );
    }
  }

  public record RuleView(
    Long id,
    ReaderType readerType,
    int maxBooksAllowed,
    int maxDaysAllowed,
    BigDecimal dailyFineAmount
  ) {
    public static RuleView of(BorrowingRule r) {
      return new RuleView(
        r.getId(),
        r.getReaderType(),
        r.getMaxBooksAllowed(),
        r.getMaxDaysAllowed(),
        r.getDailyFineAmount()
      );
    }
  }

  public record Detail(
    Long id,
    Long bookId,
    String title,
    String barcode,
    Instant dueDate,
    Instant returnedAt,
    Instant closedAt,
    String closureReason,
    ItemCondition conditionOnReturn,
    BigDecimal fineRatePerDay,
    BigDecimal estimatedFine,
    ItemStatus itemStatus
  ) {}

  public record Receipt(
    Long id,
    Long readerId,
    String readerName,
    String librarianName,
    Instant borrowDate,
    ReceiptStatus status,
    String note,
    List<Detail> details
  ) {}

  public record Violation(
    Long id,
    Long borrowDetailId,
    Long readerId,
    String readerName,
    String title,
    ViolationType type,
    BigDecimal fineAmount,
    BigDecimal paidAmount,
    BigDecimal outstandingAmount,
    ViolationStatus status,
    String notes,
    Instant createdAt,
    Instant resolvedAt,
    Instant loanClosedAt
  ) {}

  public record PaymentView(
    Long id,
    Long violationId,
    BigDecimal amount,
    Instant paidAt,
    String collectedBy,
    String idempotencyKey
  ) {
    public static PaymentView of(PaymentRecord p) {
      return new PaymentView(
        p.getId(),
        p.getViolation().getId(),
        p.getAmount(),
        p.getPaidAt(),
        p.getCollectedBy().getFullName(),
        p.getIdempotencyKey()
      );
    }
  }

  public record NotificationView(
    Long id,
    String title,
    String content,
    NotificationType type,
    Instant createdAt,
    Instant readAt
  ) {
    public static NotificationView of(Notification n) {
      return new NotificationView(
        n.getId(),
        n.getTitle(),
        n.getContent(),
        n.getType(),
        n.getCreatedAt(),
        n.getReadAt()
      );
    }
  }

  public record ChangeView(Long id, String actor, String description, Instant createdAt) {}
}
