package vn.edu.library.repository;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import vn.edu.library.domain.*;

public interface NotificationRepository
  extends JpaRepository<Notification, Long>, JpaSpecificationExecutor<Notification>
{
  boolean existsByDedupKey(String key);
  long countByRecipientIdAndReadAtIsNull(Long id);
}
