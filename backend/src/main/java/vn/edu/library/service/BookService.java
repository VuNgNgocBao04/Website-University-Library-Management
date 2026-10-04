package vn.edu.library.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.criteria.Predicate;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import javax.imageio.ImageIO;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.library.domain.*;
import vn.edu.library.domain.Types.*;
import vn.edu.library.dto.*;
import vn.edu.library.repository.*;
import vn.edu.library.security.CurrentUser;

@Service
@RequiredArgsConstructor
@Transactional
public class BookService {

  private final BookRepository books;
  private final CategoryRepository categories;
  private final BookItemRepository items;
  private final BorrowDetailRepository details;
  private final BookChangeLogRepository logs;
  private final CurrentUser current;
  private final EntityManager em;

  @Value("${library.upload-dir}")
  private String uploadDir;

  public Views.BookView view(Book b) {
    return new Views.BookView(
      b.getId(),
      b.getTitle(),
      b.getAuthor(),
      b.getIsbn(),
      b.getPublisher(),
      b.getPublicationYear(),
      b.getCategory().getId(),
      b.getCategory().getName(),
      b.getDescription(),
      b.getCoverImageUrl(),
      b.isDeleted(),
      countAvailableItems(b.getId())
    );
  }

  public long countAvailableItems(Long id) {
    if (books.findById(id).orElseThrow(BusinessException::missing).isDeleted()) return 0;
    return items.countByBookIdAndStatusAndCondition(id, ItemStatus.AVAILABLE, ItemCondition.GOOD);
  }

  public Views.BookView getBookById(Long id) {
    return view(books.findById(id).orElseThrow(BusinessException::missing));
  }

  public Views.PageResult<Views.BookView> searchBooks(
    String keyword,
    Long category,
    String publisher,
    Integer yearFrom,
    Integer yearTo,
    boolean available,
    int page,
    int size,
    String sort
  ) {
    String field = Set.of("title", "publicationYear", "createdAt", "id").contains(sort)
      ? sort
      : "title";
    return Views.PageResult.of(
      books
        .findAll(
          (r, q, c) -> {
            List<Predicate> p = new ArrayList<>();
            p.add(c.isFalse(r.get("isDeleted")));
            String like = "%" + keyword.toLowerCase() + "%";
            p.add(
              c.or(
                c.like(c.lower(r.get("title")), like),
                c.like(c.lower(r.get("author")), like),
                c.like(c.lower(r.get("isbn")), like)
              )
            );
            if (category != null) p.add(c.equal(r.get("category").get("id"), category));
            if (publisher != null && !publisher.isBlank()) p.add(
              c.like(c.lower(r.get("publisher")), "%" + publisher.toLowerCase() + "%")
            );
            if (yearFrom != null) p.add(c.greaterThanOrEqualTo(r.get("publicationYear"), yearFrom));
            if (yearTo != null) p.add(c.lessThanOrEqualTo(r.get("publicationYear"), yearTo));
            if (available) {
              var sub = q.subquery(Long.class);
              var i = sub.from(BookItem.class);
              sub
                .select(i.get("id"))
                .where(
                  c.equal(i.get("book"), r),
                  c.equal(i.get("status"), ItemStatus.AVAILABLE),
                  c.equal(i.get("condition"), ItemCondition.GOOD)
                );
              p.add(c.exists(sub));
            }
            return c.and(p.toArray(Predicate[]::new));
          },
          Pages.of(page, size, field)
        )
        .map(this::view)
    );
  }

  public Views.BookView createBook(Requests.BookInput a) {
    var b = new Book();
    apply(b, a);
    books.save(b);
    log(b, "Tạo đầu sách: " + a);
    return view(b);
  }

  public Views.BookView updateBook(Long id, Requests.BookInput a) {
    var b = lock(id);
    String before = view(b).toString();
    apply(b, a);
    log(b, "Trước: " + before + "; Sau: " + a);
    return view(b);
  }

  private void apply(Book b, Requests.BookInput a) {
    b.setTitle(a.title());
    b.setAuthor(a.author());
    b.setIsbn(a.isbn());
    b.setPublisher(a.publisher());
    b.setPublicationYear(a.publicationYear());
    b.setCategory(categories.findById(a.categoryId()).orElseThrow(BusinessException::missing));
    b.setDescription(a.description());
    b.setUpdatedAt(Instant.now());
  }

  public void softDeleteBook(Long id) {
    var b = lock(id);
    if (details.existsByBookItemBookIdAndClosedAtIsNull(id)) throw BusinessException.bad(
      "Đầu sách còn cuốn chưa đóng nghĩa vụ mượn."
    );
    b.setDeleted(true);
    b.setUpdatedAt(Instant.now());
    log(b, "Xóa mềm đầu sách");
  }

  public Views.BookView uploadCover(Long id, MultipartFile file) {
    var b = lock(id);
    if (
      file.isEmpty() ||
      file.getSize() > 5 * 1024 * 1024 ||
      !Set.of("image/jpeg", "image/png").contains(Objects.toString(file.getContentType(), ""))
    ) throw BusinessException.bad("Chỉ nhận ảnh PNG/JPEG tối đa 5 MB.");
    try (var stream = ImageIO.createImageInputStream(file.getInputStream())) {
      var readers = ImageIO.getImageReaders(stream);
      if (!readers.hasNext()) throw BusinessException.bad("Tệp không phải ảnh hợp lệ.");
      var reader = readers.next();
      try {
        reader.setInput(stream);
        if (
          (long) reader.getWidth(0) * reader.getHeight(0) > 20_000_000
        ) throw BusinessException.bad("Ảnh tối đa 20 triệu điểm ảnh.");
        var image = reader.read(0);
        String name = UUID.randomUUID() + ".png";
        var dir = Path.of(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(dir);
        ImageIO.write(image, "png", dir.resolve(name).toFile());
        b.setCoverImageUrl("/api/covers/" + name);
        b.setUpdatedAt(Instant.now());
        log(b, "Đổi ảnh bìa: " + name);
      } finally {
        reader.dispose();
      }
    } catch (java.io.IOException e) {
      throw BusinessException.bad("Không thể lưu ảnh bìa.");
    }
    return view(b);
  }

  public List<Views.ChangeView> changes(Long id) {
    return logs
      .findAll((r, q, c) -> c.equal(r.get("book").get("id"), id))
      .stream()
      .map(l ->
        new Views.ChangeView(
          l.getId(),
          l.getChangedBy().getFullName(),
          l.getDescription(),
          l.getCreatedAt()
        )
      )
      .toList();
  }

  private Book lock(Long id) {
    var b = em.find(Book.class, id, LockModeType.PESSIMISTIC_WRITE);
    if (b == null) throw BusinessException.missing();
    return b;
  }

  private void log(Book b, String text) {
    var l = new BookChangeLog();
    l.setBook(b);
    l.setChangedBy(current.get());
    l.setDescription(text);
    logs.save(l);
  }
}
