package vn.edu.library.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import lombok.Getter;
import lombok.Setter;
import vn.edu.library.domain.Types.*;

@Entity
@Table(name = "borrow_details")
@Getter
@Setter
public class BorrowDetail extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY)
  private BorrowReceipt borrowReceipt;

  @ManyToOne(fetch = FetchType.LAZY)
  private BookItem bookItem;

  private Instant dueDate;
  private Instant returnedAt;

  @ManyToOne(fetch = FetchType.LAZY)
  private User returnedByLibrarian;

  @Enumerated(EnumType.STRING)
  private ItemCondition conditionOnReturn;

  @Column(precision = 15, scale = 2)
  private BigDecimal fineRatePerDay;

  private Instant closedAt;
  private String closureReason;
}
