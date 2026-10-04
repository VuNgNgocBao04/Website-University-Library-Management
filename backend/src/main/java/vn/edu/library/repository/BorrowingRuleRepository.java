package vn.edu.library.repository;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import vn.edu.library.domain.*;

public interface BorrowingRuleRepository
  extends JpaRepository<BorrowingRule, Long>, JpaSpecificationExecutor<BorrowingRule>
{
  Optional<BorrowingRule> findByReaderType(Types.ReaderType readerType);
}
