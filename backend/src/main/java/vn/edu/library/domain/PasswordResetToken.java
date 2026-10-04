package vn.edu.library.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import lombok.Getter;
import lombok.Setter;
import vn.edu.library.domain.Types.*;

@Entity
@Table(name = "password_reset_tokens")
@Getter
@Setter
public class PasswordResetToken extends BaseEntity {

  @ManyToOne(fetch = FetchType.LAZY)
  private User user;

  @Column(unique = true)
  private String tokenHash;

  private Instant expiresAt;
  private Instant usedAt;
}
