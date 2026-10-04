package vn.edu.library.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.web.cors.*;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.edu.library.domain.Types.UserStatus;
import vn.edu.library.repository.UserRepository;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

  private final UserRepository users;
  private final ObjectMapper mapper;

  @Value("${library.frontend-url}")
  private String origin;

  @Bean
  PasswordEncoder encoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  HttpSessionSecurityContextRepository contexts() {
    return new HttpSessionSecurityContextRepository();
  }

  @Bean
  SecurityFilterChain security(HttpSecurity http) throws Exception {
    http
      .cors(c -> c.configurationSource(cors()))
      .securityContext(c -> c.securityContextRepository(contexts()))
      .authorizeHttpRequests(a ->
        a
          .requestMatchers(
            "/api/auth/csrf",
            "/api/auth/login",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/error"
          )
          .permitAll()
          .anyRequest()
          .authenticated()
      )
      .exceptionHandling(e ->
        e
          .authenticationEntryPoint((q, s, x) ->
            error(s, 401, "UNAUTHENTICATED", "Vui lòng đăng nhập.")
          )
          .accessDeniedHandler((q, s, x) ->
            error(s, 403, "FORBIDDEN", "Không đủ quyền hoặc phiên CSRF đã hết hạn.")
          )
      )
      .logout(l ->
        l
          .logoutUrl("/api/auth/logout")
          .invalidateHttpSession(true)
          .deleteCookies("JSESSIONID")
          .logoutSuccessHandler((q, s, a) -> s.setStatus(204))
      )
      .addFilterBefore(
        new OncePerRequestFilter() {
          @Override
          protected void doFilterInternal(
            HttpServletRequest req,
            HttpServletResponse res,
            FilterChain chain
          ) throws ServletException, IOException {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof SessionIdentity principal) {
              var user = users.findById(principal.id());
              if (
                user.isEmpty() ||
                user.get().getStatus() != UserStatus.ACTIVE ||
                user.get().getAuthVersion() != principal.version()
              ) {
                if (req.getSession(false) != null) req.getSession(false).invalidate();
                SecurityContextHolder.clearContext();
              }
            }
            chain.doFilter(req, res);
          }
        },
        AuthorizationFilter.class
      );
    return http.build();
  }

  private CorsConfigurationSource cors() {
    var c = new CorsConfiguration();
    c.setAllowedOrigins(List.of(origin));
    c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE"));
    c.setAllowedHeaders(List.of("Content-Type", "X-CSRF-TOKEN"));
    c.setAllowCredentials(true);
    var source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", c);
    return source;
  }

  private void error(HttpServletResponse response, int status, String code, String message)
    throws IOException {
    response.setStatus(status);
    response.setContentType("application/json;charset=UTF-8");
    mapper.writeValue(
      response.getWriter(),
      Map.of("code", code, "message", message, "fieldErrors", Map.of())
    );
  }
}
