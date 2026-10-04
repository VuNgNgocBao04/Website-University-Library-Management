package vn.edu.library.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import lombok.Getter;
import lombok.Setter;
import vn.edu.library.domain.Types.*;

@Entity
@Table(name = "notifications")
@Getter
@Setter
public class Notification extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY)
  private User recipient;

  private String title;
  private String content;

  @Enumerated(EnumType.STRING)
  private NotificationType type;

  private Instant createdAt = Instant.now();
  private Instant readAt;

  @Column(unique = true)
  private String dedupKey;

  @ManyToOne(fetch = FetchType.LAZY)
  private BorrowDetail borrowDetail;
}
