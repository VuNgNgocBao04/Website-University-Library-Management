package vn.edu.library.service;

import jakarta.persistence.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.library.domain.*;
import vn.edu.library.domain.Types.*;
import vn.edu.library.dto.*;
import vn.edu.library.repository.*;

@Service
@RequiredArgsConstructor
@Transactional
public class BookItemService {

  private final BookItemRepository items;
  private final EntityManager em;

  public Views.ItemView addBookItem(Long bookId, Requests.ItemInput a) {
    var b = em.find(Book.class, bookId, LockModeType.PESSIMISTIC_WRITE);
    if (b == null) throw BusinessException.missing();
    if (b.isDeleted()) throw BusinessException.bad("Đầu sách đã xóa.");
    var i = new BookItem();
    i.setBook(b);
    i.setBarcode(a.barcode());
    i.setLocation(a.location());
    return Views.ItemView.of(items.save(i));
  }

  public List<Views.ItemView> addBookItems(Long id, List<Requests.ItemInput> inputs) {
    if (inputs.isEmpty() || inputs.size() > 100) throw BusinessException.bad(
      "Mỗi lần thêm từ 1 đến 100 cuốn."
    );
    return inputs
      .stream()
      .map(a -> addBookItem(id, a))
      .toList();
  }

  public Views.ItemView getByBarcode(String barcode) {
    return Views.ItemView.of(items.findByBarcode(barcode).orElseThrow(BusinessException::missing));
  }

  public List<Views.ItemView> listByBook(Long id) {
    return items.findByBookId(id).stream().map(Views.ItemView::of).toList();
  }

  public Views.ItemView updateLocation(Long id, String location) {
    var i = lock(id);
    i.setLocation(location);
    return Views.ItemView.of(i);
  }

  public Views.ItemView updateCondition(Long id, Requests.ItemUpdate a) {
    var i = lock(id);
    if (
      i.getStatus() == ItemStatus.ON_LOAN ||
      i.getStatus() == ItemStatus.LOST ||
      i.getStatus() == ItemStatus.WITHDRAWN
    ) throw BusinessException.bad(
      "Không thể sửa tình trạng cuốn đang mượn, đã mất hoặc đã thanh lý."
    );
    if (a.condition() == ItemCondition.LOST) throw BusinessException.bad(
      "Mất sách phải được ghi nhận qua xử lý vi phạm."
    );
    i.setCondition(a.condition());
    i.setStatus(a.condition() == ItemCondition.GOOD ? ItemStatus.AVAILABLE : ItemStatus.DAMAGED);
    i.setLocation(a.location());
    return Views.ItemView.of(i);
  }

  public void withdrawBookItem(Long id) {
    var i = lock(id);
    if (
      i.getStatus() == ItemStatus.ON_LOAN || i.getStatus() == ItemStatus.LOST
    ) throw BusinessException.bad("Không thể thanh lý cuốn đang mượn hoặc mất.");
    i.setStatus(ItemStatus.WITHDRAWN);
  }

  private BookItem lock(Long id) {
    var i = em.find(BookItem.class, id, LockModeType.PESSIMISTIC_WRITE);
    if (i == null) throw BusinessException.missing();
    return i;
  }
}
