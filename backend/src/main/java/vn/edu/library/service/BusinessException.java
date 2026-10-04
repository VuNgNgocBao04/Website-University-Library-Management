package vn.edu.library.service;

import org.springframework.http.HttpStatus;

public class BusinessException extends RuntimeException {

  public final HttpStatus status;
  public final String code;

  public BusinessException(HttpStatus status, String code, String message) {
    super(message);
    this.status = status;
    this.code = code;
  }

  public static BusinessException bad(String message) {
    return new BusinessException(HttpStatus.CONFLICT, "BUSINESS_RULE", message);
  }

  public static BusinessException missing() {
    return new BusinessException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Không tìm thấy dữ liệu.");
  }

  public static BusinessException forbidden() {
    return new BusinessException(
      HttpStatus.FORBIDDEN,
      "FORBIDDEN",
      "Bạn không có quyền truy cập dữ liệu này."
    );
  }
}
