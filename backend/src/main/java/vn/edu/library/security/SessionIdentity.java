package vn.edu.library.security;

import java.io.Serializable;

public record SessionIdentity(Long id, long version) implements Serializable {}
