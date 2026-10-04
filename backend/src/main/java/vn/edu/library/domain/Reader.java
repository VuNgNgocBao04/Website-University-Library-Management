package vn.edu.library.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@DiscriminatorValue("READER")
@Getter
@Setter
public class Reader extends User {

  private String readerCode;

  @Enumerated(EnumType.STRING)
  private Types.ReaderType readerType;
}
