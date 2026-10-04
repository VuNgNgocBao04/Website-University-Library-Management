package vn.edu.library.controller;

import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.edu.library.domain.Types.*;
import vn.edu.library.dto.*;
import vn.edu.library.service.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CirculationController {

  private final BorrowService borrows;
  private final BorrowingRuleService rules;
  private final ViolationService violations;

  @GetMapping("/rules")
  public List<Views.RuleView> rules() {
    return rules.list();
  }

  @PutMapping("/rules/{type}")
  @PreAuthorize("hasRole('ADMIN')")
  public Views.RuleView rule(
    @PathVariable ReaderType type,
    @Valid @RequestBody Requests.RuleInput a
  ) {
    return rules.update(type, a);
  }

  @GetMapping("/loans/eligibility/{readerId}")
  @PreAuthorize("hasRole('LIBRARIAN')")
  public BorrowService.Eligibility eligibility(@PathVariable Long readerId) {
    return borrows.checkEligibility(readerId);
  }

  @PostMapping("/loans")
  @PreAuthorize("hasRole('LIBRARIAN')")
  public Views.Receipt create(@Valid @RequestBody Requests.Borrow a) {
    return borrows.createBorrowReceipt(a);
  }

  @GetMapping("/loans")
  public Views.PageResult<Views.Receipt> loans(
    @RequestParam(required = false) Long readerId,
    @RequestParam(required = false) ReceiptStatus status,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
  ) {
    return borrows.searchBorrowReceipts(readerId, status, page, size);
  }

  @GetMapping("/loans/{id}")
  public Views.Receipt loan(@PathVariable Long id) {
    return borrows.getBorrowReceipt(id);
  }

  @GetMapping("/loans/mine/current")
  public List<Views.Detail> current() {
    return borrows.getMyCurrentLoans();
  }

  @GetMapping("/loans/mine/history")
  public Views.PageResult<Views.Receipt> history(
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
  ) {
    return borrows.getMyBorrowHistory(page, size);
  }

  @GetMapping("/loans/overdue")
  @PreAuthorize("hasAnyRole('ADMIN','LIBRARIAN')")
  public List<Views.Receipt> overdue() {
    return borrows.getOverdueDetails();
  }

  @PostMapping("/loan-details/{id}/return")
  @PreAuthorize("hasRole('LIBRARIAN')")
  public Views.Receipt returned(@PathVariable Long id, @Valid @RequestBody Requests.Return a) {
    return borrows.returnBook(id, a);
  }

  @GetMapping("/violations")
  public Views.PageResult<Views.Violation> violations(
    @RequestParam(required = false) Long readerId,
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
  ) {
    return violations.searchViolations(readerId, page, size);
  }

  @GetMapping("/violations/debt/{readerId}")
  public Map<String, BigDecimal> debt(@PathVariable Long readerId) {
    return Map.of("outstandingAmount", violations.calculateOutstandingAmount(readerId));
  }

  @PostMapping("/violations")
  @PreAuthorize("hasRole('LIBRARIAN')")
  public Views.Violation createViolation(@Valid @RequestBody Requests.ViolationInput a) {
    return violations.createViolation(a);
  }

  @PostMapping("/violations/{id}/payments")
  @PreAuthorize("hasRole('LIBRARIAN')")
  public Views.PaymentView payment(@PathVariable Long id, @Valid @RequestBody Requests.Payment a) {
    return violations.recordPayment(id, a);
  }

  @GetMapping("/violations/{id}/payments")
  public List<Views.PaymentView> payments(@PathVariable Long id) {
    return violations.paymentHistory(id);
  }

  @PostMapping("/violations/{id}/resolve")
  @PreAuthorize("hasRole('LIBRARIAN')")
  public void resolve(@PathVariable Long id) {
    violations.resolveViolation(id);
  }

  @PostMapping("/violations/{id}/close-lost-loan")
  @PreAuthorize("hasRole('LIBRARIAN')")
  public void closeLost(@PathVariable Long id, @Valid @RequestBody Requests.Reason a) {
    violations.closeLostLoan(id, a);
  }
}
