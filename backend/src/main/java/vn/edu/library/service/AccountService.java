package vn.edu.library.service;

import jakarta.persistence.EntityManager;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.library.domain.*;
import vn.edu.library.domain.Types.*;
import vn.edu.library.dto.*;
import vn.edu.library.repository.*;
import vn.edu.library.security.CurrentUser;

@Service
@RequiredArgsConstructor
@Transactional
public class AccountService {

  private final UserRepository users;
  private final BorrowDetailRepository details;
  private final PasswordEncoder encoder;
  private final CurrentUser current;
  private final EntityManager em;

  public Views.Account me() {
    return Views.Account.of(current.get());
  }

  public Views.Account updateProfile(Long id, Requests.Profile input) {
    var u = users.lockById(id).orElseThrow(BusinessException::missing);
    u.setFullName(input.fullName());
    u.setEmail(input.email());
    u.setPhoneNumber(input.phoneNumber());
    u.setUpdatedAt(Instant.now());
    return Views.Account.of(u);
  }

  public void password(Requests.Password input) {
    var u = users.lockById(current.id()).orElseThrow(BusinessException::missing);
    if (!encoder.matches(input.currentPassword(), u.getPasswordHash())) throw BusinessException.bad(
      "Mật khẩu hiện tại không đúng."
    );
    u.setPasswordHash(encoder.encode(input.newPassword()));
    u.setAuthVersion(u.getAuthVersion() + 1);
  }

  public Views.Account create(Requests.Account a) {
    validateProfile(a.role(), a.employeeId(), a.readerCode(), a.readerType());
    User u = switch (a.role()) {
      case ADMIN -> new Admin();
      case LIBRARIAN -> new Librarian();
      case READER -> new Reader();
    };
    u.setUsername(a.username());
    u.setPasswordHash(encoder.encode(a.password()));
    u.setFullName(a.fullName());
    u.setEmail(a.email());
    u.setPhoneNumber(a.phoneNumber());
    if (u instanceof Admin v) v.setEmployeeId(a.employeeId());
    if (u instanceof Librarian v) v.setEmployeeId(a.employeeId());
    if (u instanceof Reader v) {
      v.setReaderCode(a.readerCode());
      v.setReaderType(a.readerType());
    }
    users.saveAndFlush(u);
    em.refresh(u);
    return Views.Account.of(u);
  }

  public Views.PageResult<Views.Account> search(String q, Role role, int page, int size) {
    return Views.PageResult.of(
      users
        .findAll(
          (root, query, cb) -> {
            var match = cb.or(
              cb.like(cb.lower(root.get("username")), "%" + q.toLowerCase() + "%"),
              cb.like(cb.lower(root.get("fullName")), "%" + q.toLowerCase() + "%")
            );
            return role == null ? match : cb.and(match, cb.equal(root.get("role"), role));
          },
          Pages.of(page, size, "id")
        )
        .map(Views.Account::of)
    );
  }

  public void status(Long id, UserStatus status) {
    var u = users.lockById(id).orElseThrow(BusinessException::missing);
    if (id.equals(current.id())) throw BusinessException.bad(
      "Không thể khóa hoặc vô hiệu hóa chính mình."
    );
    u.setStatus(status);
    u.setAuthVersion(u.getAuthVersion() + 1);
    u.setUpdatedAt(Instant.now());
  }

  public void changeRole(Long id, Requests.RoleChange a) {
    if (id.equals(current.id())) throw BusinessException.bad("Không thể tự đổi vai trò.");
    users.lockById(id).orElseThrow(BusinessException::missing);
    if (details.countByBorrowReceiptReaderIdAndClosedAtIsNull(id) > 0) throw BusinessException.bad(
      "Cần đóng các nghĩa vụ mượn trước khi đổi hồ sơ vai trò."
    );
    validateProfile(a.role(), a.employeeId(), a.readerCode(), a.readerType());
    em.flush();
    em.createNativeQuery(
      "UPDATE users SET role=:role, employee_id=:employee, reader_code=:code, reader_type=:type, auth_version=auth_version+1, updated_at=UTC_TIMESTAMP(6) WHERE id=:id"
    )
      .setParameter("role", a.role().name())
      .setParameter("employee", a.role() == Role.READER ? null : a.employeeId())
      .setParameter("code", a.role() == Role.READER ? a.readerCode() : null)
      .setParameter("type", a.role() == Role.READER ? a.readerType().name() : null)
      .setParameter("id", id)
      .executeUpdate();
    em.clear();
  }

  private void validateProfile(Role role, String employee, String code, ReaderType type) {
    if (
      role == Role.READER
        ? code == null || code.isBlank() || type == null
        : employee == null || employee.isBlank()
    ) throw BusinessException.bad("Cần mã nhân viên hoặc mã bạn đọc và loại bạn đọc tương ứng.");
  }
}
