package vn.edu.library.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import lombok.Getter;
import lombok.Setter;
import vn.edu.library.domain.Types.*;

@Entity
@Table(name = "payment_records")
@Getter
@Setter
public class PaymentRecord extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY)
  private ViolationRecord violation;

  @Column(precision = 15, scale = 2)
  private BigDecimal amount;

  private Instant paidAt = Instant.now();

  @ManyToOne(fetch = FetchType.LAZY)
  private User collectedBy;

  @Column(unique = true)
  private String idempotencyKey;
}
