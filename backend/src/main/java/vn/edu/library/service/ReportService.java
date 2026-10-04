package vn.edu.library.service;

import java.io.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.library.domain.Report;
import vn.edu.library.repository.ReportRepository;
import vn.edu.library.security.CurrentUser;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportService {

  private final JdbcTemplate jdbc;
  private final ReportRepository reports;
  private final CurrentUser current;
  private final Clock clock;

  @Value("${library.pdf-font}")
  private String fontPath;

  public record BorrowStatistics(long receipts, long bookLoans) {}

  public record PopularBook(Long bookId, String title, long loans) {}

  public record Overdue(
    Long detailId,
    String readerName,
    String title,
    String barcode,
    Instant dueDate
  ) {}

  public record FineReport(
    BigDecimal assessedInPeriod,
    BigDecimal collectedInPeriod,
    BigDecimal totalOutstanding
  ) {}

  public record ReportView(
    Long id,
    Instant generatedAt,
    Instant fromDate,
    Instant toDate,
    BorrowStatistics borrowing,
    List<PopularBook> popularBooks,
    List<Overdue> overdue,
    FineReport fines
  ) {}

  private Timestamp ts(Instant i) {
    return Timestamp.from(i);
  }

  public BorrowStatistics getBorrowStatistics(Instant from, Instant to) {
    return new BorrowStatistics(
      jdbc.queryForObject(
        "SELECT COUNT(*) FROM borrow_receipts WHERE borrow_date>=? AND borrow_date<?",
        Long.class,
        ts(from),
        ts(to)
      ),
      jdbc.queryForObject(
        "SELECT COUNT(*) FROM borrow_details d JOIN borrow_receipts r ON r.id=d.borrow_receipt_id WHERE r.borrow_date>=? AND r.borrow_date<?",
        Long.class,
        ts(from),
        ts(to)
      )
    );
  }

  public List<PopularBook> getPopularBooks(Instant from, Instant to) {
    return jdbc.query(
      "SELECT b.id,b.title,COUNT(*) AS loans FROM borrow_details d JOIN borrow_receipts r ON r.id=d.borrow_receipt_id JOIN book_items i ON i.id=d.book_item_id JOIN books b ON b.id=i.book_id WHERE r.borrow_date>=? AND r.borrow_date<? GROUP BY b.id,b.title ORDER BY loans DESC,b.id LIMIT 20",
      (r, n) -> new PopularBook(r.getLong(1), r.getString(2), r.getLong(3)),
      ts(from),
      ts(to)
    );
  }

  public List<Overdue> getOverdueReport(Instant at) {
    return jdbc.query(
      "SELECT d.id,u.full_name,b.title,i.barcode,d.due_date FROM borrow_details d JOIN borrow_receipts r ON r.id=d.borrow_receipt_id JOIN users u ON u.id=r.reader_id JOIN book_items i ON i.id=d.book_item_id JOIN books b ON b.id=i.book_id WHERE r.borrow_date<=? AND d.due_date<? AND (d.closed_at IS NULL OR d.closed_at>?) ORDER BY d.due_date",
      (r, n) ->
        new Overdue(
          r.getLong(1),
          r.getString(2),
          r.getString(3),
          r.getString(4),
          r.getTimestamp(5).toInstant()
        ),
      ts(at),
      ts(at),
      ts(at)
    );
  }

  public FineReport getFineReport(Instant from, Instant to) {
    return new FineReport(
      jdbc.queryForObject(
        "SELECT COALESCE(SUM(fine_amount),0) FROM violation_records WHERE created_at>=? AND created_at<?",
        BigDecimal.class,
        ts(from),
        ts(to)
      ),
      jdbc.queryForObject(
        "SELECT COALESCE(SUM(amount),0) FROM payment_records WHERE paid_at>=? AND paid_at<?",
        BigDecimal.class,
        ts(from),
        ts(to)
      ),
      jdbc.queryForObject(
        "SELECT (SELECT COALESCE(SUM(fine_amount),0) FROM violation_records)-(SELECT COALESCE(SUM(amount),0) FROM payment_records)",
        BigDecimal.class
      )
    );
  }

  @Transactional
  public ReportView generateReport(Instant from, Instant to) {
    if (!from.isBefore(to)) throw BusinessException.bad("Ngày bắt đầu phải trước ngày kết thúc.");
    var now = clock.instant();
    var r = new Report();
    r.setReportType("LIBRARY_SUMMARY");
    r.setGeneratedBy(current.get());
    r.setFromDate(from);
    r.setToDate(to);
    r.setGeneratedAt(now);
    r.setParameters("Khoảng [from,to), UTC; quá hạn và tổng nợ tại thời điểm tạo.");
    reports.save(r);
    return new ReportView(
      r.getId(),
      now,
      from,
      to,
      getBorrowStatistics(from, to),
      getPopularBooks(from, to),
      getOverdueReport(now),
      getFineReport(from, to)
    );
  }

  public byte[] exportCsv(ReportView r) {
    StringBuilder s = new StringBuilder("\uFEFF");
    for (var row : rows(r)) {
      s.append(
        row.stream().map(ReportService::csvCell).collect(java.util.stream.Collectors.joining(","))
      ).append("\r\n");
    }
    return s.toString().getBytes(StandardCharsets.UTF_8);
  }

  public static String csvCell(String value) {
    String safe = value;
    if (
      (!value.stripLeading().isEmpty() && "=+@-".indexOf(value.stripLeading().charAt(0)) >= 0) ||
      value.startsWith("\t") ||
      value.startsWith("\r") ||
      value.startsWith("\n")
    ) safe = "'" + value;
    return "\"" + safe.replace("\"", "\"\"") + "\"";
  }

  public byte[] exportPdf(ReportView r) {
    try (
      var document = new PDDocument();
      var output = new ByteArrayOutputStream();
      InputStream font = fontPath.isBlank()
        ? new ClassPathResource("fonts/NotoSans-Regular.ttf").getInputStream()
        : new FileInputStream(fontPath)
    ) {
      var typeface = PDType0Font.load(document, font);
      PDPageContentStream stream = null;
      float y = 0;
      try {
        for (var row : rows(r)) {
          String line = String.join(" | ", row).replaceAll("[\\r\\n\\t]", " ");
          for (String part : wrap(line, 85)) {
            if (stream == null || y < 50) {
              if (stream != null) stream.close();
              var page = new PDPage();
              document.addPage(page);
              stream = new PDPageContentStream(document, page);
              y = 750;
            }
            stream.beginText();
            stream.setFont(typeface, 10);
            stream.newLineAtOffset(40, y);
            stream.showText(part);
            stream.endText();
            y -= 17;
          }
        }
      } finally {
        if (stream != null) stream.close();
      }
      document.save(output);
      return output.toByteArray();
    } catch (IOException e) {
      throw BusinessException.bad("Không xuất được PDF. Kiểm tra font Unicode đã cấu hình.");
    }
  }

  private List<String> wrap(String line, int width) {
    List<String> parts = new ArrayList<>();
    while (line.length() > width) {
      int end = line.lastIndexOf(' ', width);
      if (end < 1) end = width;
      parts.add(line.substring(0, end));
      line = line.substring(end).stripLeading();
    }
    parts.add(line);
    return parts;
  }

  private List<List<String>> rows(ReportView r) {
    List<List<String>> rows = new ArrayList<>();
    rows.add(List.of("BÁO CÁO THƯ VIỆN", String.valueOf(r.id())));
    rows.add(List.of("Từ", r.fromDate().toString(), "Đến (không gồm)", r.toDate().toString()));
    rows.add(List.of("Thời điểm tạo", r.generatedAt().toString()));
    rows.add(
      List.of(
        "Số phiếu",
        String.valueOf(r.borrowing().receipts()),
        "Số lượt cuốn",
        String.valueOf(r.borrowing().bookLoans())
      )
    );
    rows.add(
      List.of(
        "Phí phát sinh",
        r.fines().assessedInPeriod().toString(),
        "Đã thu trong kỳ",
        r.fines().collectedInPeriod().toString(),
        "Tổng nợ",
        r.fines().totalOutstanding().toString()
      )
    );
    rows.add(List.of("SÁCH PHỔ BIẾN", "Lượt cuốn"));
    r.popularBooks().forEach(b -> rows.add(List.of(b.title(), String.valueOf(b.loans()))));
    rows.add(List.of("QUÁ HẠN TẠI THỜI ĐIỂM TẠO", "Bạn đọc", "Mã vạch", "Hạn trả"));
    r.overdue().forEach(d ->
      rows.add(List.of(d.title(), d.readerName(), d.barcode(), d.dueDate().toString()))
    );
    return rows;
  }
}
