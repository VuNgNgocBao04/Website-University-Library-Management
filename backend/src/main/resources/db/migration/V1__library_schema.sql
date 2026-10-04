CREATE TABLE users (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, role VARCHAR(31) NOT NULL,
 username VARCHAR(255) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
 full_name VARCHAR(255), email VARCHAR(255) UNIQUE, phone_number VARCHAR(255),
 status VARCHAR(30) NOT NULL, auth_version BIGINT NOT NULL DEFAULT 0,
 employee_id VARCHAR(255) UNIQUE, reader_code VARCHAR(255) UNIQUE, reader_type VARCHAR(30),
 created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
 CONSTRAINT ck_user_profile CHECK (
  (role='READER' AND reader_code IS NOT NULL AND reader_type IN ('STUDENT','LECTURER') AND employee_id IS NULL)
  OR (role IN ('ADMIN','LIBRARIAN') AND employee_id IS NOT NULL AND reader_code IS NULL AND reader_type IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE categories (id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, description VARCHAR(255)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE books (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255) NOT NULL, author VARCHAR(255) NOT NULL,
 isbn VARCHAR(255) NOT NULL UNIQUE, publisher VARCHAR(255), publication_year INT,
 category_id BIGINT NOT NULL, description TEXT, cover_image_url VARCHAR(255),
 is_deleted BIT NOT NULL DEFAULT 0, created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
 FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE book_items (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, book_id BIGINT NOT NULL, barcode VARCHAR(255) NOT NULL UNIQUE,
 location VARCHAR(255), item_condition VARCHAR(30) NOT NULL, status VARCHAR(30) NOT NULL,
 FOREIGN KEY (book_id) REFERENCES books(id), INDEX idx_item_book_status(book_id,status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE borrowing_rules (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, reader_type VARCHAR(30) NOT NULL UNIQUE,
 max_books_allowed INT NOT NULL, max_days_allowed INT NOT NULL, daily_fine_amount DECIMAL(15,2) NOT NULL,
 CHECK (max_books_allowed>0 AND max_days_allowed>0 AND daily_fine_amount>=0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE borrow_receipts (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, reader_id BIGINT NOT NULL, created_by_librarian_id BIGINT NOT NULL,
 borrow_date DATETIME(6) NOT NULL, status VARCHAR(30) NOT NULL, note VARCHAR(255),
 created_at DATETIME(6) NOT NULL, updated_at DATETIME(6) NOT NULL,
 FOREIGN KEY(reader_id) REFERENCES users(id), FOREIGN KEY(created_by_librarian_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE borrow_details (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, borrow_receipt_id BIGINT NOT NULL, book_item_id BIGINT NOT NULL,
 due_date DATETIME(6) NOT NULL, returned_at DATETIME(6), returned_by_librarian_id BIGINT,
 condition_on_return VARCHAR(30), fine_rate_per_day DECIMAL(15,2) NOT NULL,
 closed_at DATETIME(6), closure_reason VARCHAR(255),
 FOREIGN KEY(borrow_receipt_id) REFERENCES borrow_receipts(id), FOREIGN KEY(book_item_id) REFERENCES book_items(id),
 FOREIGN KEY(returned_by_librarian_id) REFERENCES users(id), INDEX idx_detail_due(closed_at,due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE violation_records (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, borrow_detail_id BIGINT NOT NULL, violation_type VARCHAR(30) NOT NULL,
 fine_amount DECIMAL(15,2) NOT NULL, status VARCHAR(30) NOT NULL, notes VARCHAR(255),
 created_at DATETIME(6) NOT NULL, resolved_at DATETIME(6),
 FOREIGN KEY(borrow_detail_id) REFERENCES borrow_details(id), UNIQUE(borrow_detail_id,violation_type), CHECK(fine_amount>=0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE payment_records (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, violation_id BIGINT NOT NULL, amount DECIMAL(15,2) NOT NULL,
 paid_at DATETIME(6) NOT NULL, collected_by_id BIGINT NOT NULL, idempotency_key VARCHAR(255) NOT NULL UNIQUE,
 FOREIGN KEY(violation_id) REFERENCES violation_records(id), FOREIGN KEY(collected_by_id) REFERENCES users(id), CHECK(amount>0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE notifications (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, recipient_id BIGINT NOT NULL, title VARCHAR(255) NOT NULL,
 content VARCHAR(255), type VARCHAR(30) NOT NULL, created_at DATETIME(6) NOT NULL, read_at DATETIME(6),
 dedup_key VARCHAR(255) NOT NULL UNIQUE, borrow_detail_id BIGINT,
 FOREIGN KEY(recipient_id) REFERENCES users(id), FOREIGN KEY(borrow_detail_id) REFERENCES borrow_details(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE reports (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, report_type VARCHAR(255), generated_by_id BIGINT NOT NULL,
 from_date DATETIME(6), to_date DATETIME(6), parameters TEXT, generated_at DATETIME(6) NOT NULL,
 FOREIGN KEY(generated_by_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE password_reset_tokens (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id BIGINT NOT NULL, token_hash VARCHAR(255) NOT NULL UNIQUE,
 expires_at DATETIME(6) NOT NULL, used_at DATETIME(6), FOREIGN KEY(user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE book_change_logs (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, book_id BIGINT NOT NULL, changed_by_id BIGINT NOT NULL,
 description TEXT NOT NULL, created_at DATETIME(6) NOT NULL,
 FOREIGN KEY(book_id) REFERENCES books(id), FOREIGN KEY(changed_by_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO borrowing_rules(reader_type,max_books_allowed,max_days_allowed,daily_fine_amount)
 VALUES ('STUDENT',10,30,0),('LECTURER',20,60,0);
