package vn.edu.library.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.nio.file.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.library.dto.*;
import vn.edu.library.service.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CatalogController {

  private final BookService books;
  private final BookItemService items;
  private final CategoryService categories;

  @Value("${library.upload-dir}")
  private String uploadDir;

  @GetMapping("/categories")
  public List<Views.CategoryView> categories() {
    return categories.listCategories();
  }

  @PostMapping("/categories")
  @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
  public Views.CategoryView createCategory(@Valid @RequestBody Requests.CategoryInput a) {
    return categories.createCategory(a);
  }

  @PutMapping("/categories/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
  public Views.CategoryView updateCategory(
    @PathVariable Long id,
    @Valid @RequestBody Requests.CategoryInput a
  ) {
    return categories.updateCategory(id, a);
  }

  @DeleteMapping("/categories/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
  public void deleteCategory(@PathVariable Long id) {
    categories.deleteCategory(id);
  }

  @GetMapping("/books")
  public Views.PageResult<Views.BookView> books(
    @RequestParam(defaultValue = "") String q,
    @RequestParam(required = false) Long category,
    @RequestParam(required = false) String publisher,
    @RequestParam(required = false) Integer yearFrom,
    @RequestParam(required = false) Integer yearTo,
    @RequestParam(defaultValue = "false") boolean available,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size,
    @RequestParam(defaultValue = "title") String sort
  ) {
    return books.searchBooks(q, category, publisher, yearFrom, yearTo, available, page, size, sort);
  }

  @GetMapping("/books/{id}")
  public Views.BookView book(@PathVariable Long id) {
    return books.getBookById(id);
  }

  @PostMapping("/books")
  @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
  public Views.BookView create(@Valid @RequestBody Requests.BookInput a) {
    return books.createBook(a);
  }

  @PutMapping("/books/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
  public Views.BookView update(@PathVariable Long id, @Valid @RequestBody Requests.BookInput a) {
    return books.updateBook(id, a);
  }

  @DeleteMapping("/books/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
  public void delete(@PathVariable Long id) {
    books.softDeleteBook(id);
  }

  @PostMapping("/books/{id}/cover")
  @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
  public Views.BookView cover(@PathVariable Long id, @RequestParam MultipartFile file) {
    return books.uploadCover(id, file);
  }

  @GetMapping("/covers/{name}")
  public ResponseEntity<Resource> cover(@PathVariable String name) {
    if (!name.matches("[a-f0-9-]{36}\\.png")) throw BusinessException.missing();
    var file = Path.of(uploadDir).resolve(name);
    if (!Files.exists(file)) throw BusinessException.missing();
    return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).body(new FileSystemResource(file));
  }

  @GetMapping("/books/{id}/changes")
  @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
  public List<Views.ChangeView> changes(@PathVariable Long id) {
    return books.changes(id);
  }

  @GetMapping("/books/{id}/items")
  public List<Views.ItemView> items(@PathVariable Long id) {
    return items.listByBook(id);
  }

  @PostMapping("/books/{id}/items")
  @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
  public List<Views.ItemView> add(
    @PathVariable Long id,
    @NotEmpty @Size(max = 100) @Valid @RequestBody List<Requests.@Valid ItemInput> a
  ) {
    return items.addBookItems(id, a);
  }

  @GetMapping("/items/barcode/{barcode}")
  @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
  public Views.ItemView barcode(@PathVariable String barcode) {
    return items.getByBarcode(barcode);
  }

  @PutMapping("/items/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
  public Views.ItemView item(@PathVariable Long id, @Valid @RequestBody Requests.ItemUpdate a) {
    return items.updateCondition(id, a);
  }

  @PatchMapping("/items/{id}/location")
  @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
  public Views.ItemView location(@PathVariable Long id, @Valid @RequestBody Requests.ItemInput a) {
    return items.updateLocation(id, a.location());
  }

  @DeleteMapping("/items/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
  public void withdraw(@PathVariable Long id) {
    items.withdrawBookItem(id);
  }
}
