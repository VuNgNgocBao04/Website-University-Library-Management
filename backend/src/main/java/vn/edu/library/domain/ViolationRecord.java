package vn.edu.library.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import lombok.Getter;
import lombok.Setter;
import vn.edu.library.domain.Types.*;

@Entity
@Table(name = "violation_records")
@Getter
@Setter
public class ViolationRecord extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY)
  private BorrowDetail borrowDetail;

  @Enumerated(EnumType.STRING)
  private ViolationType violationType;

  @Column(precision = 15, scale = 2)
  private BigDecimal fineAmount;

  @Enumerated(EnumType.STRING)
  private ViolationStatus status = ViolationStatus.OPEN;

  private String notes;
  private Instant createdAt = Instant.now();
  private Instant resolvedAt;
}
