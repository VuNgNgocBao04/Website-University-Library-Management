package vn.edu.library.service;

import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.library.dto.Views;
import vn.edu.library.repository.*;
import vn.edu.library.security.CurrentUser;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationService {

  private final NotificationRepository notifications;
  private final CurrentUser current;
  private final JdbcTemplate jdbc;
  private final Clock clock;

  @Value("${library.reminder-days}")
  private int days;

  public Views.PageResult<Views.NotificationView> getMyNotifications(int page, int size) {
    return Views.PageResult.of(
      notifications
        .findAll(
          (r, q, c) -> c.equal(r.get("recipient").get("id"), current.id()),
          Pages.of(page, size, "id")
        )
        .map(Views.NotificationView::of)
    );
  }

  public long countMyUnreadNotifications() {
    return notifications.countByRecipientIdAndReadAtIsNull(current.id());
  }

  public void markAsRead(Long id) {
    var n = notifications.findById(id).orElseThrow(BusinessException::missing);
    if (!n.getRecipient().getId().equals(current.id())) throw BusinessException.forbidden();
    if (n.getReadAt() == null) n.setReadAt(clock.instant());
  }

  public void markAllAsRead() {
    jdbc.update(
      "UPDATE notifications SET read_at=? WHERE recipient_id=? AND read_at IS NULL",
      java.sql.Timestamp.from(clock.instant()),
      current.id()
    );
  }

  @Scheduled(
    fixedDelayString = "${library.reminder-interval-ms:3600000}",
    initialDelayString = "${library.reminder-initial-delay-ms:30000}"
  )
  public void reminders() {
    sendDueSoonReminders();
    sendOverdueReminders();
  }

  public void sendDueSoonReminders() {
    insert(
      "DUE_SOON",
      "Sách sắp đến hạn",
      "Vui lòng kiểm tra hạn trả trong mục Đang mượn.",
      clock.instant(),
      clock.instant().plus(Duration.ofDays(Math.max(0, days)))
    );
  }

  public void sendOverdueReminders() {
    insert(
      "OVERDUE",
      "Sách đã quá hạn",
      "Vui lòng mang sách đến thư viện để trả.",
      Instant.parse("1970-01-01T00:00:00Z"),
      clock.instant()
    );
  }

  private void insert(String type, String title, String content, Instant from, Instant to) {
    // Unique dedup_key plus atomic INSERT IGNORE handles overlapping scheduler runs.
    jdbc.update(
      "INSERT IGNORE INTO notifications(recipient_id,title,content,type,created_at,dedup_key,borrow_detail_id) SELECT r.reader_id,?,?,?,?,CONCAT(?,':',d.id),d.id FROM borrow_details d JOIN borrow_receipts r ON r.id=d.borrow_receipt_id WHERE d.closed_at IS NULL AND d.due_date>=? AND d.due_date<?",
      title,
      content,
      type,
      java.sql.Timestamp.from(clock.instant()),
      type,
      java.sql.Timestamp.from(from),
      java.sql.Timestamp.from(to)
    );
  }
}
