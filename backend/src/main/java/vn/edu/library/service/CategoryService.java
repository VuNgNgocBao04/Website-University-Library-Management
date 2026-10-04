package vn.edu.library.service;

import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.library.domain.*;
import vn.edu.library.dto.*;
import vn.edu.library.repository.*;

@Service
@RequiredArgsConstructor
@Transactional
public class CategoryService {

  private final CategoryRepository categories;
  private final BookRepository books;

  public List<Views.CategoryView> listCategories() {
    return categories.findAll().stream().map(Views.CategoryView::of).toList();
  }

  public Views.CategoryView createCategory(Requests.CategoryInput input) {
    var c = new Category();
    c.setName(input.name());
    c.setDescription(input.description());
    return Views.CategoryView.of(categories.save(c));
  }

  public Views.CategoryView updateCategory(Long id, Requests.CategoryInput input) {
    var c = categories.findById(id).orElseThrow(BusinessException::missing);
    c.setName(input.name());
    c.setDescription(input.description());
    return Views.CategoryView.of(c);
  }

  public void deleteCategory(Long id) {
    if (
      books.exists((r, q, c) -> c.equal(r.get("category").get("id"), id))
    ) throw BusinessException.bad("Thể loại đang được sử dụng.");
    categories.delete(categories.findById(id).orElseThrow(BusinessException::missing));
  }
}
