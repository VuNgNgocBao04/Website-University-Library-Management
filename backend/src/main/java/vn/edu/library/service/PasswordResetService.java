package vn.edu.library.service;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.library.domain.*;
import vn.edu.library.repository.*;

@Service
@RequiredArgsConstructor
@Transactional
public class PasswordResetService {

  private final UserRepository users;
  private final PasswordResetTokenRepository tokens;
  private final JavaMailSender mail;
  private final PasswordEncoder encoder;
  private final Clock clock;

  @Value("${library.frontend-url}")
  private String frontend;

  @Value("${library.mail-from}")
  private String from;

  public void forgot(String email) {
    var found = users.findByEmail(email);
    if (found.isEmpty()) return;
    byte[] bytes = new byte[32];
    new SecureRandom().nextBytes(bytes);
    String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    var token = new PasswordResetToken();
    token.setUser(found.get());
    token.setTokenHash(hash(raw));
    token.setExpiresAt(clock.instant().plusSeconds(1800));
    tokens.save(token);
    var message = new SimpleMailMessage();
    message.setFrom(from);
    message.setTo(email);
    message.setSubject("Đặt lại mật khẩu thư viện");
    message.setText(
      "Liên kết có hiệu lực 30 phút, dùng một lần: " + frontend + "/reset-password?token=" + raw
    );
    try {
      mail.send(message);
    } catch (org.springframework.mail.MailException e) {
      throw new BusinessException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "EMAIL_FAILED",
        "Không gửi được email. Vui lòng thử lại sau."
      );
    }
  }

  public void reset(String raw, String password) {
    var t = tokens
      .findByTokenHash(hash(raw))
      .orElseThrow(() -> BusinessException.bad("Liên kết không hợp lệ."));
    if (
      t.getUsedAt() != null || !clock.instant().isBefore(t.getExpiresAt())
    ) throw BusinessException.bad("Liên kết đã dùng hoặc hết hạn.");
    var u = users.lockById(t.getUser().getId()).orElseThrow(BusinessException::missing);
    u.setPasswordHash(encoder.encode(password));
    u.setAuthVersion(u.getAuthVersion() + 1);
    t.setUsedAt(clock.instant());
  }

  private String hash(String text) {
    try {
      return HexFormat.of().formatHex(
        MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8))
      );
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
