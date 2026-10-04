package vn.edu.library.controller;

import java.util.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import vn.edu.library.service.BusinessException;

@RestControllerAdvice
public class ApiExceptionHandler {

  public record ErrorBody(String code, String message, Map<String, String> fieldErrors) {}

  @ExceptionHandler(BusinessException.class)
  ResponseEntity<ErrorBody> business(BusinessException e) {
    return ResponseEntity.status(e.status).body(new ErrorBody(e.code, e.getMessage(), Map.of()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ErrorBody> validation(MethodArgumentNotValidException e) {
    Map<String, String> fields = new LinkedHashMap<>();
    e.getBindingResult()
      .getFieldErrors()
      .forEach(f -> fields.put(f.getField(), f.getDefaultMessage()));
    return ResponseEntity.badRequest().body(
      new ErrorBody("VALIDATION", "Vui lòng kiểm tra dữ liệu.", fields)
    );
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  ResponseEntity<ErrorBody> duplicate() {
    return ResponseEntity.status(409).body(
      new ErrorBody("CONFLICT", "Dữ liệu trùng hoặc đang được sử dụng.", Map.of())
    );
  }

  @ExceptionHandler(
    org.springframework.web.method.annotation.HandlerMethodValidationException.class
  )
  ResponseEntity<ErrorBody> methodValidation(
    org.springframework.web.method.annotation.HandlerMethodValidationException e
  ) {
    Map<String, String> fields = new LinkedHashMap<>();
    e.getParameterValidationResults().forEach(result -> {
      String name = Objects.toString(result.getMethodParameter().getParameterName(), "items");
      if (result instanceof org.springframework.validation.method.ParameterErrors errors) {
        errors
          .getFieldErrors()
          .forEach(error -> fields.put(name + "." + error.getField(), error.getDefaultMessage()));
      } else {
        result.getResolvableErrors().forEach(error -> fields.put(name, error.getDefaultMessage()));
      }
    });
    return ResponseEntity.badRequest().body(
      new ErrorBody("VALIDATION", "Vui lòng kiểm tra dữ liệu.", fields)
    );
  }

  @ExceptionHandler(AccessDeniedException.class)
  ResponseEntity<ErrorBody> forbidden() {
    return ResponseEntity.status(403).body(
      new ErrorBody("FORBIDDEN", "Không đủ quyền thực hiện.", Map.of())
    );
  }

  @ExceptionHandler({
    IllegalArgumentException.class,
    org.springframework.http.converter.HttpMessageNotReadableException.class,
    org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
  })
  ResponseEntity<ErrorBody> invalid() {
    return ResponseEntity.badRequest().body(
      new ErrorBody("INVALID_REQUEST", "Dữ liệu hoặc định dạng không hợp lệ.", Map.of())
    );
  }

  @ExceptionHandler(MaxUploadSizeExceededException.class)
  ResponseEntity<ErrorBody> upload() {
    return ResponseEntity.status(413).body(
      new ErrorBody("FILE_TOO_LARGE", "Ảnh tối đa 5 MB.", Map.of())
    );
  }

  @ExceptionHandler(Exception.class)
  ResponseEntity<ErrorBody> unexpected(Exception e) {
    org.slf4j.LoggerFactory.getLogger(getClass()).error("Request failed", e);
    return ResponseEntity.internalServerError().body(
      new ErrorBody("INTERNAL_ERROR", "Không thể xử lý yêu cầu. Vui lòng thử lại.", Map.of())
    );
  }
}
