package vn.edu.library.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import lombok.Getter;
import lombok.Setter;
import vn.edu.library.domain.Types.*;

@Entity
@Table(name = "borrowing_rules")
@Getter
@Setter
public class BorrowingRule extends BaseEntity {

  @Enumerated(EnumType.STRING)
  @Column(unique = true)
  private ReaderType readerType;

  private int maxBooksAllowed;
  private int maxDaysAllowed;

  @Column(precision = 15, scale = 2)
  private BigDecimal dailyFineAmount;
}
