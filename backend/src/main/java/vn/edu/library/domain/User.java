package vn.edu.library.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import lombok.Getter;
import lombok.Setter;
import vn.edu.library.domain.Types.*;

@Entity
@Table(name = "users")
@Getter
@Setter
@Inheritance(strategy = InheritanceType.SINGLE_TABLE)
@DiscriminatorColumn(name = "role")
public abstract class User extends BaseEntity {

  @Column(nullable = false, unique = true)
  private String username;

  @Column(nullable = false)
  private String passwordHash;

  private String fullName;
  private String email;
  private String phoneNumber;

  @Enumerated(EnumType.STRING)
  @Column(insertable = false, updatable = false)
  private Role role;

  @Enumerated(EnumType.STRING)
  private UserStatus status = UserStatus.ACTIVE;

  private long authVersion;
  private Instant createdAt = Instant.now();
  private Instant updatedAt = Instant.now();
}
