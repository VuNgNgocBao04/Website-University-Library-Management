package vn.edu.library.service;

import org.springframework.data.domain.*;

public final class Pages {

  private Pages() {}

  public static Pageable of(int page, int size, String sort) {
    return PageRequest.of(
      Math.max(0, page),
      Math.max(1, Math.min(100, size)),
      Sort.by(sort).ascending()
    );
  }
}
