package vn.edu.library.repository;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import vn.edu.library.domain.*;

public interface ViolationRecordRepository
  extends JpaRepository<ViolationRecord, Long>, JpaSpecificationExecutor<ViolationRecord>
{
  boolean existsByBorrowDetailIdAndViolationType(Long detailId, Types.ViolationType type);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select v from ViolationRecord v where v.id = :id")
  Optional<ViolationRecord> lockById(@Param("id") Long id);
}
