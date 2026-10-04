package vn.edu.library.config;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.library.domain.*;
import vn.edu.library.domain.Types.*;
import vn.edu.library.repository.*;

@Component
@Profile("local")
@RequiredArgsConstructor
public class LocalSeed implements CommandLineRunner {

  private final UserRepository users;
  private final CategoryRepository categories;
  private final BookRepository books;
  private final BookItemRepository items;
  private final BorrowingRuleRepository rules;
  private final BorrowReceiptRepository receipts;
  private final PasswordEncoder encoder;

  @Value("${library.demo-password}")
  private String password;

  @Override
  @Transactional
  public void run(String... args) {
    if (users.count() > 0) return;
    if (password.length() < 10) throw new IllegalStateException(
      "Set DEMO_PASSWORD (at least 10 characters) for first local startup."
    );
    var admin = new Admin();
    admin.setEmployeeId("NV001");
    account(admin, "admin", "Quản trị thư viện");
    var librarian = new Librarian();
    librarian.setEmployeeId("NV002");
    account(librarian, "librarian", "Thủ thư Nguyễn An");
    var student = new Reader();
    student.setReaderCode("SV001");
    student.setReaderType(ReaderType.STUDENT);
    account(student, "student", "Sinh viên Trần Minh");
    var lecturer = new Reader();
    lecturer.setReaderCode("GV001");
    lecturer.setReaderType(ReaderType.LECTURER);
    account(lecturer, "lecturer", "Giảng viên Lê Hà");
    rules.findAll().forEach(r -> r.setDailyFineAmount(new BigDecimal("2000.00"))); // Illustrative local rate only.
    var c = new Category();
    c.setName("Công nghệ thông tin");
    c.setDescription("Giáo trình và tài liệu chuyên ngành");
    categories.save(c);
    var c2 = new Category();
    c2.setName("Kỹ năng và nghiên cứu");
    categories.save(c2);
    String[] titles = {
      "Cấu trúc dữ liệu và giải thuật",
      "Cơ sở dữ liệu",
      "Lập trình hướng đối tượng với Java",
      "Mạng máy tính",
      "Phương pháp nghiên cứu khoa học",
      "Kỹ năng học tập đại học",
    };
    List<BookItem> copies = new ArrayList<>();
    for (int n = 0; n < titles.length; n++) {
      var b = new Book();
      b.setTitle(titles[n]);
      b.setAuthor(n < 4 ? "Khoa Công nghệ thông tin" : "Thư viện Đại học");
      b.setIsbn("97860400000" + n);
      b.setPublisher("Nhà xuất bản Giáo dục");
      b.setPublicationYear(2024 + (n % 2));
      b.setCategory(n < 4 ? c : c2);
      b.setDescription(
        "Dữ liệu minh họa phục vụ đồ án. Giáo trình tham khảo dành cho sinh viên và giảng viên."
      );
      books.save(b);
      for (int j = 1; j <= 4; j++) {
        var i = new BookItem();
        i.setBook(b);
        i.setBarcode("LIB-" + (n + 1) + "-" + j);
        i.setLocation("Kệ " + (n + 1) + " / Tầng 1");
        copies.add(items.save(i));
      }
    }
    var r = new BorrowReceipt();
    r.setReader(student);
    r.setCreatedByLibrarian(librarian);
    r.setBorrowDate(Instant.now().minus(Duration.ofDays(32)));
    r.setNote("Phiếu demo: một cuốn quá hạn và một cuốn sắp đến hạn.");
    for (int n = 0; n < 2; n++) {
      var d = new BorrowDetail();
      d.setBorrowReceipt(r);
      d.setBookItem(copies.get(n));
      copies.get(n).setStatus(ItemStatus.ON_LOAN);
      d.setDueDate(Instant.now().plus(Duration.ofDays(n == 0 ? -2 : 2)));
      d.setFineRatePerDay(new BigDecimal("2000.00"));
      r.getDetails().add(d);
    }
    receipts.save(r);
  }

  private void account(User u, String username, String name) {
    u.setUsername(username);
    u.setFullName(name);
    u.setEmail(username + "@library.test");
    u.setPasswordHash(encoder.encode(password));
    users.save(u);
  }
}
