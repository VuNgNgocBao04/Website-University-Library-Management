package vn.edu.library.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import lombok.Getter;
import lombok.Setter;
import vn.edu.library.domain.Types.*;

@Entity
@Table(name = "borrow_receipts")
@Getter
@Setter
public class BorrowReceipt extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY)
  private User reader;

  @ManyToOne(fetch = FetchType.LAZY)
  private User createdByLibrarian;

  private Instant borrowDate;

  @Enumerated(EnumType.STRING)
  private ReceiptStatus status = ReceiptStatus.BORROWING;

  private String note;
  private Instant createdAt = Instant.now();
  private Instant updatedAt = Instant.now();

  @OneToMany(mappedBy = "borrowReceipt", cascade = CascadeType.ALL)
  private List<BorrowDetail> details = new ArrayList<>();
}
