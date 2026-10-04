package vn.edu.library.domain;

public final class Types {

  private Types() {}

  public enum Role {
    ADMIN,
    LIBRARIAN,
    READER,
  }

  public enum UserStatus {
    ACTIVE,
    LOCKED,
    INACTIVE,
  }

  public enum ReaderType {
    STUDENT,
    LECTURER,
  }

  public enum ItemCondition {
    GOOD,
    DAMAGED,
    LOST,
  }

  public enum ItemStatus {
    AVAILABLE,
    ON_LOAN,
    DAMAGED,
    LOST,
    WITHDRAWN,
  }

  public enum ReceiptStatus {
    BORROWING,
    PARTIALLY_RETURNED,
    RETURNED,
  }

  public enum ViolationType {
    OVERDUE,
    DAMAGED,
    LOST,
  }

  public enum ViolationStatus {
    OPEN,
    RESOLVED,
  }

  public enum NotificationType {
    DUE_SOON,
    OVERDUE,
    GENERAL,
  }
}
