package vn.edu.library.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import lombok.Getter;
import lombok.Setter;
import vn.edu.library.domain.Types.*;

@Entity
@Table(name = "books")
@Getter
@Setter
public class Book extends BaseEntity {

  private String title;
  private String author;

  @Column(unique = true)
  private String isbn;

  private String publisher;
  private Integer publicationYear;

  @ManyToOne(fetch = FetchType.LAZY)
  private Category category;

  @Column(columnDefinition = "TEXT")
  private String description;

  private String coverImageUrl;
  private boolean isDeleted;
  private Instant createdAt = Instant.now();
  private Instant updatedAt = Instant.now();
}
