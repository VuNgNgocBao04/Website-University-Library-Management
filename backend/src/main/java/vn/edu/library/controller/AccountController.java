package vn.edu.library.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.library.domain.Types.*;
import vn.edu.library.dto.*;
import vn.edu.library.service.AccountService;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class AccountController {

  private final AccountService service;

  @GetMapping
  @PreAuthorize("hasRole('ADMIN')")
  public Views.PageResult<Views.Account> list(
    @RequestParam(defaultValue = "") String q,
    @RequestParam(required = false) Role role,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
  ) {
    return service.search(q, role, page, size);
  }

  @GetMapping("/readers")
  @PreAuthorize("hasRole('LIBRARIAN')")
  public Views.PageResult<Views.Account> readers(
    @RequestParam(defaultValue = "") String q,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
  ) {
    return service.search(q, Role.READER, page, size);
  }

  @PostMapping
  @PreAuthorize("hasRole('ADMIN')")
  public Views.Account create(@Valid @RequestBody Requests.Account input) {
    return service.create(input);
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public Views.Account update(@PathVariable Long id, @Valid @RequestBody Requests.Profile input) {
    return service.updateProfile(id, input);
  }

  @PatchMapping("/{id}/status")
  @PreAuthorize("hasRole('ADMIN')")
  public void status(@PathVariable Long id, @Valid @RequestBody Requests.Status input) {
    service.status(id, input.status());
  }

  @PatchMapping("/{id}/role")
  @PreAuthorize("hasRole('ADMIN')")
  public void role(@PathVariable Long id, @Valid @RequestBody Requests.RoleChange input) {
    service.changeRole(id, input);
  }
}
