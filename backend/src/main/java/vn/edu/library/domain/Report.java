package vn.edu.library.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import lombok.Getter;
import lombok.Setter;
import vn.edu.library.domain.Types.*;

@Entity
@Table(name = "reports")
@Getter
@Setter
public class Report extends BaseEntity {

  private String reportType;

  @ManyToOne(fetch = FetchType.LAZY)
  private User generatedBy;

  private Instant fromDate;
  private Instant toDate;

  @Column(columnDefinition = "TEXT")
  private String parameters;

  private Instant generatedAt = Instant.now();
}
