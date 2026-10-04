package vn.edu.library;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.library.domain.Types.*;
import vn.edu.library.dto.*;
import vn.edu.library.security.SessionIdentity;
import vn.edu.library.service.*;

@SpringBootTest(
  properties = { "library.reminder-initial-delay-ms=86400000", "logging.level.root=WARN" }
)
@AutoConfigureMockMvc
class LibraryIntegrationTest {

  @Autowired
  JdbcTemplate jdbc;

  @Autowired
  MockMvc mvc;

  @Autowired
  PasswordEncoder encoder;

  @Autowired
  BorrowService borrows;

  @Autowired
  ViolationService violations;

  @Autowired
  BorrowingRuleService rules;

  @Autowired
  NotificationService notifications;

  @Autowired
  ReportService reports;

  @Autowired
  PasswordResetService resets;

  @Autowired
  AccountService accounts;

  @Autowired
  BookService books;

  @MockitoBean
  JavaMailSender mail;

  static final Instant NOW = Instant.parse("2026-09-23T10:00:00Z");

  @TestConfiguration
  static class TimeConfig {

    @Bean
    @Primary
    Clock testClock() {
      return Clock.fixed(NOW, ZoneOffset.UTC);
    }
  }

  @BeforeEach
  void fixture() {
    assertTrue(
      jdbc.queryForObject("SELECT DATABASE()", String.class).endsWith("_test"),
      "Tests must use a dedicated *_test database"
    );
    for (String table : List.of(
      "notifications",
      "payment_records",
      "violation_records",
      "borrow_details",
      "borrow_receipts",
      "book_change_logs",
      "reports",
      "password_reset_tokens",
      "book_items",
      "books",
      "categories",
      "users"
    ))
      jdbc.update("DELETE FROM " + table);
    jdbc.update(
      "UPDATE borrowing_rules SET max_books_allowed=10,max_days_allowed=30,daily_fine_amount=2000 WHERE reader_type='STUDENT'"
    );
    String hash = encoder.encode("TestPassword123!");
    for (int i = 1; i <= 4; i++) jdbc.update(
      "INSERT INTO users(id,role,username,password_hash,full_name,email,status,auth_version,employee_id,reader_code,reader_type,created_at,updated_at) VALUES (?,?,?,?,?,?,'ACTIVE',0,?,?,?,UTC_TIMESTAMP(),UTC_TIMESTAMP())",
      i,
      i == 1 ? "ADMIN" : i == 2 ? "LIBRARIAN" : "READER",
      "user" + i,
      hash,
      "Người dùng " + i,
      "user" + i + "@test.local",
      i <= 2 ? "NV" + i : null,
      i > 2 ? "SV" + i : null,
      i > 2 ? "STUDENT" : null
    );
    jdbc.update("INSERT INTO categories(id,name) VALUES(1,'Công nghệ thông tin')");
    jdbc.update(
      "INSERT INTO books(id,title,author,isbn,publisher,publication_year,category_id,is_deleted,created_at,updated_at) VALUES(1,'Cơ sở dữ liệu','Tác giả','ISBN-1','NXB',2025,1,0,UTC_TIMESTAMP(),UTC_TIMESTAMP())"
    );
    for (int i = 1; i <= 24; i++) jdbc.update(
      "INSERT INTO book_items(id,book_id,barcode,location,item_condition,status) VALUES(?,1,?,'A1','GOOD','AVAILABLE')",
      i,
      "BC" + i
    );
    auth(2, Role.LIBRARIAN);
  }

  @AfterEach
  void cleanup() {
    SecurityContextHolder.clearContext();
  }

  static UsernamePasswordAuthenticationToken auth(long id, Role role) {
    var a = UsernamePasswordAuthenticationToken.authenticated(
      new SessionIdentity(id, 0),
      null,
      List.of(new SimpleGrantedAuthority("ROLE_" + role))
    );
    SecurityContextHolder.getContext().setAuthentication(a);
    return a;
  }

  Views.Receipt borrow(long reader, String... codes) {
    return borrows.createBorrowReceipt(new Requests.Borrow(reader, List.of(codes), "Test"));
  }

  Requests.Return good() {
    return new Requests.Return(ItemCondition.GOOD, null, null);
  }

  @Test
  void securityRejectsWrongRoleAndMissingCsrf() throws Exception {
    mvc
      .perform(
        post("/api/loans")
          .with(authentication(auth(1, Role.ADMIN)))
          .with(csrf())
          .contentType("application/json")
          .content("{\"readerId\":3,\"barcodes\":[\"BC1\"]}")
      )
      .andExpect(status().isForbidden());
    mvc
      .perform(
        post("/api/loans")
          .with(authentication(auth(2, Role.LIBRARIAN)))
          .contentType("application/json")
          .content("{\"readerId\":3,\"barcodes\":[\"BC1\"]}")
      )
      .andExpect(status().isForbidden());
  }

  @Test
  void readerCannotReadOtherReadersData() throws Exception {
    var r = borrow(3, "BC1");
    mvc
      .perform(get("/api/loans/" + r.id()).with(authentication(auth(4, Role.READER))))
      .andExpect(status().isForbidden());
    mvc
      .perform(get("/api/violations/debt/3").with(authentication(auth(4, Role.READER))))
      .andExpect(status().isForbidden());
    auth(2, Role.LIBRARIAN);
    jdbc.update(
      "UPDATE borrow_details SET due_date=?",
      java.sql.Timestamp.from(NOW.minusSeconds(1))
    );
    notifications.sendOverdueReminders();
    long n = jdbc.queryForObject("SELECT id FROM notifications LIMIT 1", Long.class);
    mvc
      .perform(
        post("/api/notifications/" + n + "/read")
          .with(authentication(auth(4, Role.READER)))
          .with(csrf())
      )
      .andExpect(status().isForbidden());
  }

  @Test
  void exceedingLimitAndDuplicateBarcodeRollback() {
    assertThrows(BusinessException.class, () -> borrow(3, "BC1", "BC1"));
    rules.update(ReaderType.STUDENT, new Requests.RuleInput(1, 30, new BigDecimal("2000")));
    assertThrows(BusinessException.class, () -> borrow(3, "BC1", "BC2"));
    assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM borrow_receipts", Integer.class));
  }

  @Test
  void anyUnavailableBookRollsBackWholeReceipt() {
    jdbc.update("UPDATE book_items SET status='DAMAGED',item_condition='DAMAGED' WHERE id=2");
    assertThrows(BusinessException.class, () -> borrow(3, "BC1", "BC2"));
    assertEquals(
      "AVAILABLE",
      jdbc.queryForObject("SELECT status FROM book_items WHERE id=1", String.class)
    );
    assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM borrow_receipts", Integer.class));
  }

  @Test
  void twoReadersCannotBorrowSameCopy() throws Exception {
    assertEquals(1, race(() -> borrow(3, "BC1"), () -> borrow(4, "BC1")));
    assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM borrow_details", Integer.class));
  }

  @Test
  void simultaneousRequestsCannotExceedReaderLimit() throws Exception {
    rules.update(ReaderType.STUDENT, new Requests.RuleInput(1, 30, new BigDecimal("2000")));
    assertEquals(1, race(() -> borrow(3, "BC1"), () -> borrow(3, "BC2")));
    assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM borrow_details", Integer.class));
  }

  @Test
  void partialFullAndRepeatedReturn() {
    var r = borrow(3, "BC1", "BC2");
    var first = borrows.returnBook(r.details().get(0).id(), good());
    assertEquals(ReceiptStatus.PARTIALLY_RETURNED, first.status());
    var last = borrows.returnBook(r.details().get(1).id(), good());
    assertEquals(ReceiptStatus.RETURNED, last.status());
    assertThrows(BusinessException.class, () ->
      borrows.returnBook(r.details().get(0).id(), good())
    );
    assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM violation_records", Integer.class));
  }

  @Test
  void concurrentReturnOnlyOnce() throws Exception {
    var r = borrow(3, "BC1");
    Long id = r.details().get(0).id();
    assertEquals(
      1,
      race(() -> borrows.returnBook(id, good()), () -> borrows.returnBook(id, good()))
    );
  }

  @Test
  void concurrentReturnsOfDifferentCopiesCloseReceiptAndKeepBothFines() throws Exception {
    var receipt = borrow(3, "BC1", "BC2");
    jdbc.update(
      "UPDATE borrow_details SET due_date=? WHERE borrow_receipt_id=?",
      java.sql.Timestamp.from(NOW.minusSeconds(1)),
      receipt.id()
    );

    assertEquals(
      2,
      race(
        () -> borrows.returnBook(receipt.details().get(0).id(), good()),
        () -> borrows.returnBook(receipt.details().get(1).id(), good())
      )
    );

    var completed = borrows.getBorrowReceipt(receipt.id());
    assertEquals(ReceiptStatus.RETURNED, completed.status());
    assertTrue(
      completed
        .details()
        .stream()
        .allMatch(d -> d.returnedAt() != null && d.closedAt() != null)
    );
    assertEquals(
      2,
      jdbc.queryForObject(
        "SELECT COUNT(*) FROM book_items WHERE id IN (1,2) AND status='AVAILABLE'",
        Integer.class
      )
    );
    assertEquals(
      2,
      jdbc.queryForObject(
        "SELECT COUNT(*) FROM borrow_details WHERE borrow_receipt_id=? AND returned_by_librarian_id=2",
        Integer.class,
        receipt.id()
      )
    );
    assertEquals(
      2,
      jdbc.queryForObject(
        "SELECT COUNT(*) FROM violation_records WHERE violation_type='OVERDUE'",
        Integer.class
      )
    );
    assertEquals(new BigDecimal("4000.00"), violations.calculateOutstandingAmount(3L));
  }

  @Test
  void concurrentReturnAndLostClosureKeepDistinctPhysicalOutcomes() throws Exception {
    var receipt = borrow(3, "BC1", "BC2");
    var lost = violations.createViolation(
      new Requests.ViolationInput(
        receipt.details().get(1).id(),
        ViolationType.LOST,
        new BigDecimal("90000"),
        "Biên bản mất sách"
      )
    );

    assertEquals(
      2,
      race(
        () -> borrows.returnBook(receipt.details().get(0).id(), good()),
        () -> {
          violations.closeLostLoan(lost.id(), new Requests.Reason("Đã xác minh mất sách"));
          return null;
        }
      )
    );

    var completed = borrows.getBorrowReceipt(receipt.id());
    assertEquals(ReceiptStatus.RETURNED, completed.status());
    var returned = completed
      .details()
      .stream()
      .filter(d -> d.barcode().equals("BC1"))
      .findFirst()
      .orElseThrow();
    var missing = completed
      .details()
      .stream()
      .filter(d -> d.barcode().equals("BC2"))
      .findFirst()
      .orElseThrow();
    assertNotNull(returned.returnedAt());
    assertNotNull(returned.closedAt());
    assertNull(missing.returnedAt());
    assertNotNull(missing.closedAt());
    assertTrue(missing.closureReason().contains("librarianId=2"));
    assertEquals(
      "AVAILABLE",
      jdbc.queryForObject("SELECT status FROM book_items WHERE id=1", String.class)
    );
    assertEquals(
      "LOST",
      jdbc.queryForObject("SELECT status FROM book_items WHERE id=2", String.class)
    );
    assertEquals(new BigDecimal("90000.00"), violations.calculateOutstandingAmount(3L));
  }

  @Test
  void fineUsesCeilingAndFrozenRate() {
    var r = borrow(3, "BC1");
    assertEquals(new BigDecimal("2000.00"), r.details().get(0).fineRatePerDay());
    rules.update(ReaderType.STUDENT, new Requests.RuleInput(5, 2, new BigDecimal("9000")));
    var unchanged = borrows.getBorrowReceipt(r.id());
    assertEquals(r.details().get(0).dueDate(), unchanged.details().get(0).dueDate());
    assertEquals(new BigDecimal("2000.00"), unchanged.details().get(0).fineRatePerDay());
    jdbc.update(
      "UPDATE borrow_details SET due_date=?",
      java.sql.Timestamp.from(NOW.minusSeconds(86401))
    );
    borrows.returnBook(r.details().get(0).id(), good());
    assertEquals(
      new BigDecimal("4000.00"),
      jdbc.queryForObject("SELECT fine_amount FROM violation_records", BigDecimal.class)
    );
  }

  @Test
  void fineBoundaryCases() {
    var rate = new BigDecimal("2000.00");
    assertEquals(0, BorrowService.calculateFine(NOW, NOW, rate).signum());
    assertEquals(0, BorrowService.calculateFine(NOW, NOW.minusSeconds(1), rate).signum());
    assertEquals(rate, BorrowService.calculateFine(NOW, NOW.plusNanos(1), rate));
    assertEquals(rate, BorrowService.calculateFine(NOW, NOW.plusSeconds(86400), rate));
    assertEquals(
      new BigDecimal("4000.00"),
      BorrowService.calculateFine(NOW, NOW.plusSeconds(86400).plusNanos(1), rate)
    );
  }

  long damage() {
    var r = borrow(3, "BC1");
    borrows.returnBook(
      r.details().get(0).id(),
      new Requests.Return(ItemCondition.DAMAGED, new BigDecimal("10000"), "Bìa rách")
    );
    return jdbc.queryForObject("SELECT id FROM violation_records", Long.class);
  }

  @Test
  void paymentCannotExceedDebtAndRetryIsIdempotent() {
    long id = damage();
    assertThrows(BusinessException.class, () ->
      violations.recordPayment(
        id,
        new Requests.Payment(new BigDecimal("10001"), UUID.randomUUID().toString())
      )
    );
    var a = new Requests.Payment(new BigDecimal("4000"), UUID.randomUUID().toString());
    var first = violations.recordPayment(id, a);
    assertEquals(first.id(), violations.recordPayment(id, a).id());
    assertEquals(new BigDecimal("6000.00"), violations.calculateOutstandingAmount(3L));
    assertThrows(BusinessException.class, () ->
      violations.recordPayment(id, new Requests.Payment(new BigDecimal("1000"), a.idempotencyKey()))
    );
    violations.resolveViolation(id);
    assertEquals(new BigDecimal("6000.00"), violations.calculateOutstandingAmount(3L));
  }

  @Test
  void concurrentPaymentsCannotOverpay() throws Exception {
    long id = damage();
    assertEquals(
      1,
      race(
        () ->
          violations.recordPayment(
            id,
            new Requests.Payment(new BigDecimal("8000"), UUID.randomUUID().toString())
          ),
        () ->
          violations.recordPayment(
            id,
            new Requests.Payment(new BigDecimal("8000"), UUID.randomUUID().toString())
          )
      )
    );
    assertEquals(new BigDecimal("2000.00"), violations.calculateOutstandingAmount(3L));
  }

  @Test
  void concurrentSamePaymentOnlyOneRecord() throws Exception {
    long id = damage();
    var input = new Requests.Payment(new BigDecimal("5000"), UUID.randomUUID().toString());
    assertEquals(
      2,
      race(() -> violations.recordPayment(id, input), () -> violations.recordPayment(id, input))
    );
    assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM payment_records", Integer.class));
  }

  @Test
  void lostBookRequiresExplicitClosure() {
    var r = borrow(3, "BC1");
    var id = r.details().get(0).id();
    var v = violations.createViolation(
      new Requests.ViolationInput(id, ViolationType.LOST, new BigDecimal("90000"), "Mất giáo trình")
    );
    assertNull(borrows.getBorrowReceipt(r.id()).details().get(0).closedAt());
    assertThrows(BusinessException.class, () -> borrows.returnBook(id, good()));
    violations.closeLostLoan(v.id(), new Requests.Reason("Đã lập biên bản mất sách"));
    var d = borrows.getBorrowReceipt(r.id()).details().get(0);
    assertNull(d.returnedAt());
    assertNotNull(d.closedAt());
    assertEquals(
      "LOST",
      jdbc.queryForObject("SELECT status FROM book_items WHERE id=1", String.class)
    );
    assertThrows(BusinessException.class, () ->
      violations.closeLostLoan(v.id(), new Requests.Reason("Lặp"))
    );
  }

  @Test
  void remindersDeduplicateAndExcludeClosedLoans() {
    var r = borrow(3, "BC1", "BC2");
    jdbc.update(
      "UPDATE borrow_details SET due_date=? WHERE book_item_id=1",
      java.sql.Timestamp.from(NOW.minusSeconds(1))
    );
    jdbc.update(
      "UPDATE borrow_details SET due_date=? WHERE book_item_id=2",
      java.sql.Timestamp.from(NOW.plusSeconds(86400))
    );
    notifications.reminders();
    notifications.reminders();
    assertEquals(2, jdbc.queryForObject("SELECT COUNT(*) FROM notifications", Integer.class));
    borrows.returnBook(r.details().get(0).id(), good());
    jdbc.update("DELETE FROM notifications");
    notifications.reminders();
    assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM notifications", Integer.class));
  }

  @Test
  void notificationReadStateIsIdempotentAndScopedToRecipient() {
    borrow(3, "BC1", "BC2");
    borrow(4, "BC3");
    jdbc.update(
      "UPDATE borrow_details SET due_date=?",
      java.sql.Timestamp.from(NOW.minusSeconds(1))
    );
    notifications.reminders();
    auth(3, Role.READER);
    assertEquals(2, notifications.countMyUnreadNotifications());
    var mine = notifications.getMyNotifications(0, 1);
    assertEquals(2, mine.totalElements());
    assertEquals(1, mine.content().size());
    long id = mine.content().get(0).id();
    notifications.markAsRead(id);
    notifications.markAsRead(id);
    assertEquals(1, notifications.countMyUnreadNotifications());
    notifications.markAllAsRead();
    notifications.markAllAsRead();
    assertEquals(0, notifications.countMyUnreadNotifications());
    auth(4, Role.READER);
    assertEquals(1, notifications.countMyUnreadNotifications());
    assertThrows(BusinessException.class, () -> notifications.markAsRead(id));
    assertEquals(1, notifications.countMyUnreadNotifications());
  }

  @Test
  void catalogPaginationFilterAndSoftDeleteHistory() throws Exception {
    mvc
      .perform(
        get("/api/books")
          .param("q", "ISBN-1")
          .param("size", "999")
          .param("available", "true")
          .with(authentication(auth(3, Role.READER)))
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.size").value(100))
      .andExpect(jsonPath("$.totalElements").value(1));
    auth(2, Role.LIBRARIAN);
    var r = borrow(3, "BC1");
    assertThrows(BusinessException.class, () -> books.softDeleteBook(1L));
    borrows.returnBook(r.details().get(0).id(), good());
    books.softDeleteBook(1L);
    assertEquals(0, books.countAvailableItems(1L));
    assertEquals("Cơ sở dữ liệu", borrows.getBorrowReceipt(r.id()).details().get(0).title());
    assertEquals(
      0,
      books.searchBooks("", null, null, null, null, false, 0, 20, "title").totalElements()
    );
  }

  @Test
  void reportsSeparateReceiptsCopiesAndDebtAndExportVietnamese() throws Exception {
    damage();
    borrow(3, "BC2", "BC3");
    auth(1, Role.ADMIN);
    var report = reports.generateReport(NOW.minusSeconds(1), NOW.plusSeconds(1));
    assertEquals(2, report.borrowing().receipts());
    assertEquals(3, report.borrowing().bookLoans());
    assertEquals(1, report.popularBooks().size());
    assertEquals(3, report.popularBooks().get(0).loans());
    var empty = reports.generateReport(NOW.minusSeconds(86400), NOW.minusSeconds(10));
    assertEquals(0, empty.fines().assessedInPeriod().signum());
    assertEquals(new BigDecimal("10000.00"), empty.fines().totalOutstanding());
    assertTrue(
      new String(reports.exportCsv(report), java.nio.charset.StandardCharsets.UTF_8).startsWith(
        "\uFEFF"
      )
    );
    assertEquals("\"'=HYPERLINK(1)\"", ReportService.csvCell("=HYPERLINK(1)"));
    assertTrue(ReportService.csvCell("=SUM(1)\nsecond line").startsWith("\"'="));
    try (var pdf = Loader.loadPDF(reports.exportPdf(report))) {
      assertTrue(new PDFTextStripper().getText(pdf).contains("Cơ sở dữ liệu"));
    }
  }

  @Test
  void roleChangeKeepsHistoryAndRevokesSession() throws Exception {
    var r = borrow(3, "BC1");
    borrows.returnBook(r.details().get(0).id(), good());
    auth(1, Role.ADMIN);
    accounts.changeRole(3L, new Requests.RoleChange(Role.LIBRARIAN, "NV003", null, null));
    mvc
      .perform(get("/api/auth/me").with(authentication(auth(3, Role.READER))))
      .andExpect(status().isUnauthorized());
    auth(2, Role.LIBRARIAN);
    assertEquals(3L, borrows.getBorrowReceipt(r.id()).readerId());
    assertEquals(
      "LIBRARIAN",
      jdbc.queryForObject("SELECT role FROM users WHERE id=3", String.class)
    );
  }

  @Test
  void lockAccountRevokesExistingSession() throws Exception {
    auth(1, Role.ADMIN);
    accounts.status(3L, UserStatus.LOCKED);
    mvc
      .perform(get("/api/books").with(authentication(auth(3, Role.READER))))
      .andExpect(status().isUnauthorized());
  }

  @Test
  void resetTokenIsHashedOneTimeAndMailFailureIsNotSuccess() {
    resets.forgot("user3@test.local");
    var captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
    verify(mail).send(captor.capture());
    String text = captor.getValue().getText();
    String token = text.substring(text.indexOf("token=") + 6);
    assertNotEquals(
      token,
      jdbc.queryForObject("SELECT token_hash FROM password_reset_tokens", String.class)
    );
    resets.reset(token, "NewPassword123!");
    assertThrows(BusinessException.class, () -> resets.reset(token, "AnotherPassword123!"));
    doThrow(new MailSendException("SMTP unavailable"))
      .when(mail)
      .send(any(SimpleMailMessage.class));
    assertThrows(BusinessException.class, () -> resets.forgot("user4@test.local"));
    assertEquals(
      1,
      jdbc.queryForObject("SELECT COUNT(*) FROM password_reset_tokens", Integer.class)
    );
  }

  @Test
  void loginDoesNotLeakPasswordAndChangesSession() throws Exception {
    mvc
      .perform(
        post("/api/auth/login")
          .with(csrf())
          .contentType("application/json")
          .content("{\"username\":\"user3\",\"password\":\"TestPassword123!\"}")
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.role").value("READER"))
      .andExpect(jsonPath("$.passwordHash").doesNotExist());
  }

  @Test
  void corsAllowsConfiguredFrontendAndRejectsUnknownOrigin() throws Exception {
    mvc
      .perform(
        options("/api/auth/login")
          .header("Origin", "http://127.0.0.1:5173")
          .header("Access-Control-Request-Method", "POST")
          .header("Access-Control-Request-Headers", "X-CSRF-TOKEN")
      )
      .andExpect(status().isOk())
      .andExpect(header().string("Access-Control-Allow-Origin", "http://127.0.0.1:5173"));
    mvc
      .perform(
        options("/api/auth/login")
          .header("Origin", "https://untrusted.example")
          .header("Access-Control-Request-Method", "POST")
      )
      .andExpect(status().isForbidden());
  }

  @Test
  void bulkItemsValidateNestedFieldsAndCategoryInUseIsProtected() throws Exception {
    mvc
      .perform(
        post("/api/books/1/items")
          .with(authentication(auth(2, Role.LIBRARIAN)))
          .with(csrf())
          .contentType("application/json")
          .content("[{\"barcode\":\"\",\"location\":\"\"}]")
      )
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.code").value("VALIDATION"));
    mvc
      .perform(
        delete("/api/categories/1")
          .with(authentication(auth(2, Role.LIBRARIAN)))
          .with(csrf())
      )
      .andExpect(status().isConflict());
    var invalidImage = new org.springframework.mock.web.MockMultipartFile(
      "file",
      "image.jpg",
      "image/jpeg",
      "not an image".getBytes()
    );
    mvc
      .perform(
        multipart("/api/books/1/cover")
          .file(invalidImage)
          .with(authentication(auth(2, Role.LIBRARIAN)))
          .with(csrf())
      )
      .andExpect(status().isConflict());
  }

  @Test
  void expiredResetTokenCannotChangePassword() {
    resets.forgot("user3@test.local");
    var captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
    verify(mail).send(captor.capture());
    String text = captor.getValue().getText();
    String token = text.substring(text.indexOf("token=") + 6);
    jdbc.update(
      "UPDATE password_reset_tokens SET expires_at=?",
      java.sql.Timestamp.from(NOW.minusSeconds(1))
    );
    assertThrows(BusinessException.class, () -> resets.reset(token, "NewPassword123!"));
    assertEquals(0L, jdbc.queryForObject("SELECT auth_version FROM users WHERE id=3", Long.class));
  }

  @Test
  void accountCreationRejectsOversizedFieldsWithoutWriting() throws Exception {
    var json = new com.fasterxml.jackson.databind.ObjectMapper();
    var input = Map.of(
      "username",
      "newreader",
      "password",
      "TestPassword123!",
      "fullName",
      "A".repeat(121),
      "email",
      "a".repeat(64) + "@" + "b".repeat(63) + "." + "c".repeat(63) + "." + "d".repeat(63) + ".vn",
      "role",
      "READER",
      "readerCode",
      "R".repeat(256),
      "readerType",
      "STUDENT"
    );
    mvc
      .perform(
        post("/api/users")
          .with(authentication(auth(1, Role.ADMIN)))
          .with(csrf())
          .contentType("application/json")
          .content(json.writeValueAsString(input))
      )
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.code").value("VALIDATION"))
      .andExpect(jsonPath("$.fieldErrors.fullName").exists())
      .andExpect(jsonPath("$.fieldErrors.email").exists())
      .andExpect(jsonPath("$.fieldErrors.readerCode").exists());
    assertEquals(4, jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class));
  }

  @Test
  void roleChangeRejectsOversizedCodeWithoutChangingAccount() throws Exception {
    var json = new com.fasterxml.jackson.databind.ObjectMapper();
    for (String field : List.of("employeeId", "readerCode")) {
      var input = Map.of(
        "role",
        field.equals("employeeId") ? "LIBRARIAN" : "READER",
        field,
        "X".repeat(256),
        "readerType",
        "STUDENT"
      );
      mvc
        .perform(
          patch("/api/users/3/role")
            .with(authentication(auth(1, Role.ADMIN)))
            .with(csrf())
            .contentType("application/json")
            .content(json.writeValueAsString(input))
        )
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fieldErrors." + field).exists());
    }
    assertEquals("READER", jdbc.queryForObject("SELECT role FROM users WHERE id=3", String.class));
    assertEquals(
      "SV3",
      jdbc.queryForObject("SELECT reader_code FROM users WHERE id=3", String.class)
    );
    assertEquals(0L, jdbc.queryForObject("SELECT auth_version FROM users WHERE id=3", Long.class));
  }

  @Test
  void accountCreationAcceptsBoundaryAndProfileCanBeSaved() throws Exception {
    var json = new com.fasterxml.jackson.databind.ObjectMapper();
    String fullName = "N".repeat(120);
    String employeeId = "E".repeat(255);
    var input = Map.of(
      "username",
      "newstaff",
      "password",
      "TestPassword123!",
      "fullName",
      fullName,
      "email",
      "newstaff@test.local",
      "role",
      "LIBRARIAN",
      "employeeId",
      employeeId
    );
    var result = mvc
      .perform(
        post("/api/users")
          .with(authentication(auth(1, Role.ADMIN)))
          .with(csrf())
          .contentType("application/json")
          .content(json.writeValueAsString(input))
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.fullName").value(fullName))
      .andExpect(jsonPath("$.employeeId").value(employeeId))
      .andReturn();
    long id = json.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    mvc
      .perform(
        put("/api/users/" + id)
          .with(authentication(auth(1, Role.ADMIN)))
          .with(csrf())
          .contentType("application/json")
          .content(
            json.writeValueAsString(Map.of("fullName", fullName, "email", "updated@test.local"))
          )
      )
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.email").value("updated@test.local"));
    assertEquals(5, jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class));
  }

  int race(Callable<?> first, Callable<?> second) throws Exception {
    var pool = Executors.newFixedThreadPool(2);
    var ready = new CountDownLatch(2);
    var go = new CountDownLatch(1);
    try {
      List<Future<Boolean>> results = new ArrayList<>();
      for (var operation : List.of(first, second))
        results.add(
          pool.submit(() -> {
            auth(2, Role.LIBRARIAN);
            ready.countDown();
            go.await();
            try {
              operation.call();
              return true;
            } catch (BusinessException expected) {
              return false;
            } finally {
              SecurityContextHolder.clearContext();
            }
          })
        );
      assertTrue(ready.await(5, TimeUnit.SECONDS));
      go.countDown();
      int success = 0;
      for (var result : results) if (result.get(20, TimeUnit.SECONDS)) success++;
      return success;
    } finally {
      pool.shutdownNow();
    }
  }
}
