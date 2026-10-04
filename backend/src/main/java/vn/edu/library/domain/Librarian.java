package vn.edu.library.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@DiscriminatorValue("LIBRARIAN")
@Getter
@Setter
public class Librarian extends User {

  private String employeeId;
}
