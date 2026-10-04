package vn.edu.library.repository;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import vn.edu.library.domain.*;

public interface PasswordResetTokenRepository
  extends JpaRepository<PasswordResetToken, Long>, JpaSpecificationExecutor<PasswordResetToken>
{
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<PasswordResetToken> findByTokenHash(String hash);
}
