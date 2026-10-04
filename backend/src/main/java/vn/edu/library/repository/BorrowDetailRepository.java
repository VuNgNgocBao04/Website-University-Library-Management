package vn.edu.library.repository;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import vn.edu.library.domain.*;

public interface BorrowDetailRepository
  extends JpaRepository<BorrowDetail, Long>, JpaSpecificationExecutor<BorrowDetail>
{
  long countByBorrowReceiptReaderIdAndClosedAtIsNull(Long readerId);
  List<BorrowDetail> findByClosedAtIsNull();
  boolean existsByBookItemBookIdAndClosedAtIsNull(Long bookId);
}
