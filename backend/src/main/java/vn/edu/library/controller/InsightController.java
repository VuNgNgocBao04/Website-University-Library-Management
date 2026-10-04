package vn.edu.library.controller;

import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.library.dto.Views;
import vn.edu.library.service.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class InsightController {

  private final NotificationService notifications;
  private final ReportService reports;

  @GetMapping("/notifications")
  public Views.PageResult<Views.NotificationView> notifications(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
  ) {
    return notifications.getMyNotifications(page, size);
  }

  @GetMapping("/notifications/unread-count")
  public Map<String, Long> unread() {
    return Map.of("count", notifications.countMyUnreadNotifications());
  }

  @PostMapping("/notifications/{id}/read")
  public void read(@PathVariable Long id) {
    notifications.markAsRead(id);
  }

  @PostMapping("/notifications/read-all")
  public void readAll() {
    notifications.markAllAsRead();
  }

  @GetMapping("/reports")
  @PreAuthorize("hasRole('ADMIN')")
  public ReportService.ReportView report(@RequestParam LocalDate from, @RequestParam LocalDate to) {
    return generate(from, to);
  }

  @GetMapping("/reports/export/{format}")
  @PreAuthorize("hasRole('ADMIN')")
  public ResponseEntity<byte[]> export(
    @PathVariable String format,
    @RequestParam LocalDate from,
    @RequestParam LocalDate to
  ) {
    if (!Set.of("csv", "pdf").contains(format)) throw BusinessException.bad(
      "Định dạng không hợp lệ."
    );
    var r = generate(from, to);
    return ResponseEntity.ok()
      .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=library-report." + format)
      .contentType(
        MediaType.parseMediaType(
          format.equals("csv") ? "text/csv;charset=UTF-8" : "application/pdf"
        )
      )
      .body(format.equals("csv") ? reports.exportCsv(r) : reports.exportPdf(r));
  }

  private ReportService.ReportView generate(LocalDate from, LocalDate to) {
    var zone = ZoneId.of("Asia/Ho_Chi_Minh");
    return reports.generateReport(
      from.atStartOfDay(zone).toInstant(),
      to.plusDays(1).atStartOfDay(zone).toInstant()
    );
  }
}
