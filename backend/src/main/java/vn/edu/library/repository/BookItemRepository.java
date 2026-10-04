package vn.edu.library.repository;

import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import vn.edu.library.domain.*;

public interface BookItemRepository
  extends JpaRepository<BookItem, Long>, JpaSpecificationExecutor<BookItem>
{
  Optional<BookItem> findByBarcode(String barcode);
  List<BookItem> findByBookId(Long bookId);
  long countByBookIdAndStatusAndCondition(
    Long bookId,
    Types.ItemStatus status,
    Types.ItemCondition condition
  );

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select i from BookItem i where i.barcode = :barcode")
  Optional<BookItem> lockByBarcode(@Param("barcode") String barcode);
}
