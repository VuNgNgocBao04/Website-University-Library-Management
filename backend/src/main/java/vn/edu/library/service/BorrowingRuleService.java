package vn.edu.library.service;

import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.library.domain.Types.ReaderType;
import vn.edu.library.dto.*;
import vn.edu.library.repository.BorrowingRuleRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class BorrowingRuleService {

  private final BorrowingRuleRepository rules;

  public List<Views.RuleView> list() {
    return rules.findAll().stream().map(Views.RuleView::of).toList();
  }

  public Views.RuleView update(ReaderType type, Requests.RuleInput input) {
    var r = rules.findByReaderType(type).orElseThrow(BusinessException::missing);
    r.setMaxBooksAllowed(input.maxBooksAllowed());
    r.setMaxDaysAllowed(input.maxDaysAllowed());
    r.setDailyFineAmount(input.dailyFineAmount());
    return Views.RuleView.of(r);
  }
}
