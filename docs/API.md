# Hợp đồng REST API

Base `/api`, JSON UTF-8, session cookie HttpOnly. Trừ csrf/login/forgot/reset, tất cả cần đăng nhập. Mọi request thay đổi dữ liệu cần CSRF, kể cả login/forgot/reset.

## Tích hợp frontend khác

1. GET `/auth/csrf` với `credentials: 'include'` → `{token,headerName}`.
2. POST `/auth/login` với `{username,password}` và header tên headerName mang token.
3. Gọi lại csrf sau login/logout. Cookie tự gửi khi credentials=include; không lưu credential trong localStorage.
4. Request POST/PUT/PATCH/DELETE gửi token. 401 yêu cầu đăng nhập lại, 403 là quyền/CSRF. Retry thu tiền giữ nguyên idempotencyKey.

Lỗi: `{code,message,fieldErrors}`. Code thường dùng: UNAUTHENTICATED (401), FORBIDDEN (403), NOT_FOUND (404), BUSINESS_RULE/CONFLICT (409), EMAIL_FAILED (503), FILE_TOO_LARGE (413), VALIDATION/INVALID_REQUEST (400). Không trả stack trace. FieldErrors Bean Validation theo ngôn ngữ thư viện mặc định.

Page: `{content,page,size,totalElements,totalPages}`, page từ 0, size giới hạn 1–100. Thời gian UTC ISO-8601; tiền JSON number, VND, tối đa 2 số lẻ. Không tính lại phí chính thức ở frontend.

## Auth / Users

| Method | Path | Quyền / body |
| --- | --- | --- |
| GET | `/auth/csrf` | Công khai; token, headerName |
| POST | `/auth/login` | Công khai + CSRF; username, password → Account |
| POST | `/auth/logout` | CSRF; 204 |
| GET | `/auth/me` | Bản thân → Account |
| PUT | `/auth/profile` | Bản thân; fullName, email, phoneNumber |
| POST | `/auth/password` | Bản thân; currentPassword, newPassword; đăng nhập lại |
| POST | `/auth/forgot-password` | email; không trả token |
| POST | `/auth/reset-password` | token, password |
| GET | `/users?q=&role=&page=&size=` | ADMIN; Page Account |
| GET | `/users/readers?q=&page=&size=` | LIBRARIAN; Page Reader |
| POST | `/users` | ADMIN; username, password, fullName, email, phoneNumber, role, employeeId hoặc readerCode+readerType |
| PUT | `/users/{id}` | ADMIN; fullName, email, phoneNumber |
| PATCH | `/users/{id}/status` | ADMIN; status ACTIVE/LOCKED/INACTIVE |
| PATCH | `/users/{id}/role` | ADMIN; role, employeeId hoặc readerCode+readerType |

Account: id, username, fullName, email, phoneNumber, role, status, employeeId, readerCode, readerType. Không trả passwordHash/authVersion.

Giới hạn đầu vào tài khoản: fullName tối đa 120 ký tự (thống nhất tạo/sửa), email tối đa 255, phoneNumber tối đa 30, employeeId/readerCode tối đa 255. Vượt giới hạn trả 400 VALIDATION với fieldErrors theo trường, trước khi ghi database hoặc đổi phiên.

## Catalog

Staff = ADMIN hoặc LIBRARIAN.

| Method | Path | Quyền / body |
| --- | --- | --- |
| GET | `/categories` | Đăng nhập |
| POST / PUT | `/categories` / `/categories/{id}` | Staff; name, description |
| DELETE | `/categories/{id}` | Staff; chặn thể loại đang dùng |
| GET | `/books` | q, category ID, publisher, yearFrom, yearTo, available, page, size, sort |
| GET | `/books/{id}` | Đăng nhập; BookView |
| POST / PUT | `/books` / `/books/{id}` | Staff; title, author, isbn, publisher, publicationYear, categoryId, description |
| DELETE | `/books/{id}` | Staff; xóa mềm |
| POST | `/books/{id}/cover` | Staff; multipart file, PNG/JPEG ≤5MB, ≤20 triệu pixel |
| GET | `/covers/{name}` | Đăng nhập; PNG |
| GET | `/books/{id}/changes` | Staff; nhật ký |
| GET | `/books/{id}/items` | Đăng nhập; ItemView[] |
| POST | `/books/{id}/items` | Staff; mảng {barcode,location}, 1–100 |
| GET | `/items/barcode/{barcode}` | Staff |
| PUT | `/items/{id}` | Staff; location, condition GOOD/DAMAGED |
| PATCH | `/items/{id}/location` | Staff; barcode, location (không đổi barcode) |
| DELETE | `/items/{id}` | Staff; WITHDRAWN |

Sort: title/publicationYear/createdAt/id tăng dần. BookView: id, title, author, isbn, publisher, publicationYear, categoryId, categoryName, description, coverImageUrl, deleted, availableItems. ItemView: id, bookId, barcode, location, condition, status.

## Rules / Loans

| Method | Path | Quyền / body |
| --- | --- | --- |
| GET | `/rules` | Đăng nhập |
| PUT | `/rules/{type}` | ADMIN; type STUDENT/LECTURER; maxBooksAllowed,maxDaysAllowed,dailyFineAmount |
| GET | `/loans/eligibility/{readerId}` | LIBRARIAN |
| POST | `/loans` | LIBRARIAN; readerId, barcodes[], note |
| GET | `/loans?readerId=&status=&page=&size=` | Staff toàn bộ; Reader chỉ bản thân |
| GET | `/loans/{id}` | Staff hoặc chủ phiếu |
| GET | `/loans/mine/current` | Detail[] của bản thân |
| GET | `/loans/mine/history?page=&size=` | Page Receipt của bản thân |
| GET | `/loans/overdue` | Staff; phiếu có cuốn quá hạn |
| POST | `/loan-details/{id}/return` | LIBRARIAN; condition GOOD/DAMAGED; damageFine,reason bắt buộc khi DAMAGED |

Receipt: id, readerId, readerName, librarianName, borrowDate, status, note, details[]. Detail: id, bookId, title, barcode, dueDate, returnedAt, closedAt, closureReason, conditionOnReturn, fineRatePerDay, estimatedFine.

Ví dụ: `{"readerId":3,"barcodes":["LIB-2-1","LIB-2-2"],"note":"Giao tại quầy"}`. Actor lấy từ session, không nhận actorId. Không có quy trình yêu cầu online/đặt chỗ.

## Violations / Payments

| Method | Path | Quyền / body |
| --- | --- | --- |
| GET | `/violations?readerId=&page=&size=` | Staff hoặc bản thân |
| GET | `/violations/debt/{readerId}` | Staff hoặc chủ; outstandingAmount |
| POST | `/violations` | LIBRARIAN; borrowDetailId,type LOST,fineAmount,notes |
| POST | `/violations/{id}/payments` | LIBRARIAN; amount,idempotencyKey UUID |
| GET | `/violations/{id}/payments` | Staff hoặc chủ; PaymentView[] |
| POST | `/violations/{id}/resolve` | LIBRARIAN; xử lý, không xóa nợ |
| POST | `/violations/{id}/close-lost-loan` | LIBRARIAN; reason |

Phí hỏng qua nhận trả, phí quá hạn hệ thống chốt; không nhập phí trễ bằng tay. Unique (detail,type). Retry payment cùng key/cùng nội dung trả lại lần thu cũ.

Violation: id, borrowDetailId, readerId, readerName, title, type, fineAmount, paidAmount, outstandingAmount, status, notes, createdAt, resolvedAt. PaymentView: id, violationId, amount, paidAt, collectedBy, idempotencyKey.

## Notifications / Reports

| Method | Path | Quyền / kết quả |
| --- | --- | --- |
| GET | `/notifications?page=&size=` | Bản thân; Page NotificationView |
| GET | `/notifications/unread-count` | Bản thân; count |
| POST | `/notifications/{id}/read` | Bản thân |
| POST | `/notifications/read-all` | Bản thân |
| GET | `/reports?from=2026-09-01&to=2026-09-30` | ADMIN; tạo metadata và trả tổng hợp |
| GET | `/reports/export/{format}?from=&to=` | ADMIN; csv hoặc pdf |

Report: id, generatedAt, fromDate, toDate (exclusive UTC), borrowing {receipts,bookLoans}, popularBooks [{bookId,title,loans}], overdue [{detailId,readerName,title,barcode,dueDate}], fines {assessedInPeriod,collectedInPeriod,totalOutstanding}. Ngày from/to lấy theo giờ Việt Nam, to gồm cả ngày. Mỗi lần xuất tạo báo cáo tại thời điểm gọi, có thể khác màn hình nếu giao dịch vừa đổi.

Detail bổ sung `itemStatus`: trạng thái hiện tại của cuốn vật lý. Khi nghĩa vụ chưa đóng và itemStatus là LOST, giao diện hướng dẫn xử lý mất thay vì nhận trả/báo mất lần nữa. Với lịch sử đã đóng, dùng returnedAt/closedAt để diễn giải giao dịch, không dùng trạng thái hiện tại của cuốn.

Violation bổ sung `loanClosedAt` (ISO-8601 hoặc null): thời điểm đóng nghĩa vụ mượn liên quan. Trường này độc lập với status xử lý vi phạm và outstandingAmount. Chỉ hiển thị thao tác đóng nghĩa vụ mất khi type=LOST và loanClosedAt=null.

Không có endpoint Pre-Order.
