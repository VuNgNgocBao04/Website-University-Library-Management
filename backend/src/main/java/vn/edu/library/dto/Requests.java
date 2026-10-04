package vn.edu.library.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import vn.edu.library.domain.Types.*;

public final class Requests {

  private Requests() {}

  public record Login(@NotBlank String username, @NotBlank String password) {
    @Override
    public String toString() {
      return "Login[credentials=REDACTED]";
    }
  }

  public record Profile(
    @NotBlank @Size(max = 120) String fullName,
    @NotBlank @Email @Size(max = 255) String email,
    @Size(max = 30) String phoneNumber
  ) {}

  public record Password(
    @NotBlank String currentPassword,
    @Size(min = 10, max = 72) @NotBlank String newPassword
  ) {
    @Override
    public String toString() {
      return "Password[REDACTED]";
    }
  }

  public record Forgot(@NotBlank @Email @Size(max = 255) String email) {}

  public record Reset(@NotBlank String token, @Size(min = 10, max = 72) @NotBlank String password) {
    @Override
    public String toString() {
      return "Reset[REDACTED]";
    }
  }

  public record Account(
    @NotBlank @Pattern(regexp = "[a-zA-Z0-9_.-]{3,50}") String username,
    @NotBlank @Size(min = 10, max = 72) String password,
    @NotBlank @Size(max = 120) String fullName,
    @NotBlank @Email @Size(max = 255) String email,
    @Size(max = 30) String phoneNumber,
    @NotNull Role role,
    @Size(max = 255) String employeeId,
    @Size(max = 255) String readerCode,
    ReaderType readerType
  ) {
    @Override
    public String toString() {
      return "Account[credentials=REDACTED]";
    }
  }

  public record RoleChange(
    @NotNull Role role,
    @Size(max = 255) String employeeId,
    @Size(max = 255) String readerCode,
    ReaderType readerType
  ) {}

  public record Status(@NotNull UserStatus status) {}

  public record CategoryInput(
    @NotBlank @Size(max = 120) String name,
    @Size(max = 255) String description
  ) {}

  public record BookInput(
    @NotBlank @Size(max = 255) String title,
    @NotBlank @Size(max = 255) String author,
    @NotBlank @Size(max = 32) String isbn,
    @Size(max = 255) String publisher,
    @Min(1000) @Max(2200) Integer publicationYear,
    @NotNull Long categoryId,
    @Size(max = 10000) String description
  ) {}

  public record ItemInput(
    @NotBlank @Size(max = 80) String barcode,
    @NotBlank @Size(max = 100) String location
  ) {}

  public record ItemUpdate(
    @NotBlank @Size(max = 100) String location,
    @NotNull ItemCondition condition
  ) {}

  public record RuleInput(
    @Min(1) @Max(100) int maxBooksAllowed,
    @Min(1) @Max(365) int maxDaysAllowed,
    @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal dailyFineAmount
  ) {}

  public record Borrow(
    @NotNull Long readerId,
    @NotEmpty @Size(max = 100) List<@NotBlank String> barcodes,
    @Size(max = 255) String note
  ) {}

  public record Return(
    @NotNull ItemCondition condition,
    @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal damageFine,
    @Size(max = 255) String reason
  ) {}

  public record ViolationInput(
    @NotNull Long borrowDetailId,
    @NotNull ViolationType type,
    @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal fineAmount,
    @NotBlank @Size(max = 255) String notes
  ) {}

  public record Payment(
    @NotNull @DecimalMin("0.01") @Digits(integer = 10, fraction = 2) BigDecimal amount,
    @NotBlank @Size(min = 16, max = 100) String idempotencyKey
  ) {}

  public record Reason(@NotBlank @Size(max = 180) String reason) {}
}
