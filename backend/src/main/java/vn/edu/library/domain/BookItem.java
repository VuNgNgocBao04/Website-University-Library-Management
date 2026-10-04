package vn.edu.library.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import lombok.Getter;
import lombok.Setter;
import vn.edu.library.domain.Types.*;

@Entity
@Table(name = "book_items")
@Getter
@Setter
public class BookItem extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY)
  private Book book;

  @Column(unique = true)
  private String barcode;

  private String location;

  @Enumerated(EnumType.STRING)
  @Column(name = "item_condition")
  private ItemCondition condition = ItemCondition.GOOD;

  @Enumerated(EnumType.STRING)
  private ItemStatus status = ItemStatus.AVAILABLE;
}
