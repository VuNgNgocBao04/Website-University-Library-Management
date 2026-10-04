package vn.edu.library.controller;

import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.*;
import org.springframework.web.bind.annotation.*;
import vn.edu.library.domain.Types.UserStatus;
import vn.edu.library.dto.*;
import vn.edu.library.repository.UserRepository;
import vn.edu.library.security.*;
import vn.edu.library.service.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

  private final UserRepository users;
  private final PasswordEncoder encoder;
  private final HttpSessionSecurityContextRepository contexts;
  private final AccountService accounts;
  private final PasswordResetService resets;

  @GetMapping("/csrf")
  public Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
  }

  @PostMapping("/login")
  public Views.Account login(
    @Valid @RequestBody Requests.Login input,
    HttpServletRequest req,
    HttpServletResponse res
  ) {
    var u = users
      .findByUsername(input.username())
      .orElseThrow(() ->
        new BusinessException(
          HttpStatus.UNAUTHORIZED,
          "LOGIN_FAILED",
          "Tài khoản hoặc mật khẩu không đúng."
        )
      );
    if (
      !encoder.matches(input.password(), u.getPasswordHash()) || u.getStatus() != UserStatus.ACTIVE
    ) throw new BusinessException(
      HttpStatus.UNAUTHORIZED,
      "LOGIN_FAILED",
      "Tài khoản không khả dụng hoặc mật khẩu không đúng."
    );
    req.getSession();
    req.changeSessionId();
    var auth = UsernamePasswordAuthenticationToken.authenticated(
      new SessionIdentity(u.getId(), u.getAuthVersion()),
      null,
      List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole()))
    );
    var context = SecurityContextHolder.createEmptyContext();
    context.setAuthentication(auth);
    SecurityContextHolder.setContext(context);
    contexts.saveContext(context, req, res);
    new HttpSessionCsrfTokenRepository().saveToken(null, req, res);
    return Views.Account.of(u);
  }

  @GetMapping("/me")
  public Views.Account me() {
    return accounts.me();
  }

  @PutMapping("/profile")
  public Views.Account profile(@Valid @RequestBody Requests.Profile input) {
    return accounts.updateProfile(accounts.me().id(), input);
  }

  @PostMapping("/password")
  public void password(@Valid @RequestBody Requests.Password input) {
    accounts.password(input);
  }

  @PostMapping("/forgot-password")
  public Map<String, String> forgot(@Valid @RequestBody Requests.Forgot input) {
    resets.forgot(input.email());
    return Map.of("message", "Nếu email tồn tại, liên kết đặt lại mật khẩu sẽ được gửi.");
  }

  @PostMapping("/reset-password")
  public void reset(@Valid @RequestBody Requests.Reset input) {
    resets.reset(input.token(), input.password());
  }
}
