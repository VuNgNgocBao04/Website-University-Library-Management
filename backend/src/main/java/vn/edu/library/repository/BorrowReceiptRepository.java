package vn.edu.library.repository;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import vn.edu.library.domain.*;

public interface BorrowReceiptRepository
  extends JpaRepository<BorrowReceipt, Long>, JpaSpecificationExecutor<BorrowReceipt>
{
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from BorrowReceipt r where r.id = :id")
  Optional<BorrowReceipt> lockById(@Param("id") Long id);
}
