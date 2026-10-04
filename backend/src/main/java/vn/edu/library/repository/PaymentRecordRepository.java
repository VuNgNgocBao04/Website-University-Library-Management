package vn.edu.library.repository;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import vn.edu.library.domain.*;

public interface PaymentRecordRepository
  extends JpaRepository<PaymentRecord, Long>, JpaSpecificationExecutor<PaymentRecord>
{
  Optional<PaymentRecord> findByIdempotencyKey(String key);

  @Query("select coalesce(sum(p.amount),0) from PaymentRecord p where p.violation.id = :id")
  java.math.BigDecimal totalPaid(@Param("id") Long id);
}
