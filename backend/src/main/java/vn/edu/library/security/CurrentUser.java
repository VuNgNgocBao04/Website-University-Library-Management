package vn.edu.library.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import vn.edu.library.domain.*;
import vn.edu.library.repository.UserRepository;
import vn.edu.library.service.BusinessException;

@Component
@RequiredArgsConstructor
public class CurrentUser {

  private final UserRepository users;

  public Long id() {
    var a = SecurityContextHolder.getContext().getAuthentication();
    if (
      a == null || !(a.getPrincipal() instanceof SessionIdentity s)
    ) throw BusinessException.forbidden();
    return s.id();
  }

  public User get() {
    return users.findById(id()).orElseThrow(BusinessException::missing);
  }

  public void librarian() {
    if (get().getRole() != Types.Role.LIBRARIAN) throw BusinessException.forbidden();
  }

  public void ownerOrStaff(Long owner) {
    if (
      get().getRole() == Types.Role.READER && !id().equals(owner)
    ) throw BusinessException.forbidden();
  }
}
