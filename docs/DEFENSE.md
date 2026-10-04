# Giải thích backend khi bảo vệ đồ án

Tài liệu dành cho phần backend của Website quản lý thư viện trường đại học. Dùng cùng [kiến trúc và ERD](ARCHITECTURE.md), [API](API.md), [kịch bản demo](DEMO.md) và [kết quả kiểm chứng](VERIFICATION.md). Các câu trả lời dưới đây mô tả bản local đã triển khai, không phải chức năng dự kiến.

## Trình bày trong khoảng 5 phút

1. **Phạm vi:** Admin quản lý tài khoản/quy định/báo cáo; Librarian giao sách, nhận trả và thu phí; Reader tra cứu và xem dữ liệu của mình. Admin không tự có quyền giao dịch của thủ thư. Pre-Order chỉ là trang tĩnh.
2. **Kiến trúc:** React gọi REST JSON qua `/api`. Spring Security kiểm tra session/CSRF; Controller nhận DTO có validation; Service xử lý nghiệp vụ trong transaction; Repository truy cập MySQL. Frontend có thể thay thế nếu giữ hợp đồng API.
3. **Dữ liệu:** một Book là đầu sách/ấn bản, BookItem là từng cuốn có barcode. BorrowReceipt là phiếu, BorrowDetail là từng cuốn của phiếu. Vì vậy trả một phần không phải tách hoặc xóa phiếu cũ.
4. **Tính đúng khi giao dịch:** khóa bạn đọc để giữ hạn mức và khóa cuốn để tránh cho mượn trùng; lỗi ở một cuốn rollback toàn bộ phiếu. Hạn trả và phí được chốt vào chi tiết khi giao sách.
5. **Bằng chứng:** trình bày một luồng mượn/trả, một luồng mất/thu phí; chỉ vào các kiểm thử tương ứng. Kết quả tổng hợp hiện tại là 30 backend và 12 E2E đạt, không diễn giải thành bảo đảm mọi trường hợp đều đúng.

## Các câu hỏi thường gặp

### Vì sao tách frontend và backend?

Frontend phụ trách hiển thị và tương tác; backend là nơi quyết định quyền, điều kiện mượn và dữ liệu hợp lệ. Giao diện khác có thể gọi cùng API với cookie, CSRF và DTO đúng hợp đồng. Ẩn nút chỉ hỗ trợ người dùng, không thay thế kiểm tra quyền ở server.

### Vì sao không trả trực tiếp Entity?

DTO kiểm soát trường được công khai, tránh lộ passwordHash hoặc quan hệ nội bộ và tránh phụ thuộc cấu trúc JPA trong hợp đồng frontend. Khi cần hiển thị việc đóng nghĩa vụ, API thêm `loanClosedAt` vào DTO thay vì trả toàn bộ đồ thị Entity.

### User kế thừa như thế nào? Đổi vai trò có mất lịch sử không?

Admin, Librarian và Reader là các lớp riêng, dùng SINGLE_TABLE trong bảng users. Role đồng thời là discriminator nên không có hai cột loại tài khoản độc lập dễ mâu thuẫn. Khi đổi vai trò, cập nhật loại và trường hồ sơ tương ứng nhưng giữ userId; quan hệ giao dịch lịch sử vẫn trỏ tới ID này. Service chặn đổi vai trò khi còn nghĩa vụ mượn mở. `authVersion` tăng để phiên cũ không tiếp tục dùng quyền trước đó.

### Vì sao transaction vẫn cần khóa?

Transaction cho phép rollback toàn bộ, nhưng hai transaction vẫn có thể cùng đọc một cuốn đang AVAILABLE hoặc cùng thấy bạn đọc còn hạn mức. Khóa bi quan buộc các thao tác tranh chấp chờ nhau. Khi lập phiếu, thứ tự chính là Reader → Book theo ID → BookItem theo barcode; khi trả là Reader → phiếu → cuốn. READ_COMMITTED và refresh sau chờ khóa giúp dùng trạng thái mới. Xem `BorrowService` và các test hai yêu cầu đồng thời.

### Sửa quy định có ảnh hưởng phiếu cũ không?

Không. Chi tiết phiếu lưu dueDate và fineRatePerDay tại lúc giao sách. Quy định mới chỉ dùng cho lần mượn sau. Với bản demo, số ngày trễ là phần thời gian vượt hạn chia 24 giờ rồi làm tròn lên; trả trễ một phần ngày vẫn tính một ngày. Phí cuốn chưa đóng là tạm tính, không được cộng như khoản nợ đã chốt.

### Vì sao dùng BigDecimal/DECIMAL?

Tiền cần phép tính thập phân chính xác. Java dùng BigDecimal và database dùng DECIMAL để tránh sai số nhị phân kiểu float/double. Backend kiểm tra số tiền thu dương và không vượt khoản còn nợ.

### Mất sách khác trả sách thế nào?

Báo mất tạo vi phạm và chuyển cuốn LOST, chưa tự đóng nghĩa vụ. Thủ thư phải đóng nghĩa vụ riêng kèm lý do; closedAt có giá trị nhưng returnedAt vẫn null. Cuốn không trở lại AVAILABLE. Phiếu đã đóng hoặc vi phạm đã xử lý vẫn có thể còn nợ.

### Bấm thu phí hai lần có thu trùng không?

Mỗi yêu cầu có idempotencyKey. Backend khóa vi phạm, kiểm tra lần thu đã có và tổng tiền đã thu; cùng key và cùng nội dung trả lại bản ghi cũ. Dùng lại key cho số tiền/vi phạm/người thu khác bị từ chối. Unique constraint hỗ trợ chống trùng tại database. Frontend giữ key khi gửi lại trong cùng hộp thoại; chưa kiểm tra mọi tình huống mất kết nối rồi mở lại hộp thoại mới.

### Vì sao dùng session và CSRF?

Website dùng session cookie HttpOnly để JavaScript không đọc được cookie phiên. Vì trình duyệt tự gửi cookie, các request thay đổi dữ liệu cần token CSRF. Backend lấy người thao tác từ phiên, kiểm tra quyền và chủ sở hữu, không tin actorId do client gửi. PasswordEncoder băm mật khẩu; reset token ngẫu nhiên lưu hash, có hạn và dùng một lần. SMTP local dùng Mailpit.

### Thông báo và báo cáo có gì cần chú ý?

Thông báo có dedupKey duy nhất; tác vụ chạy lại không tạo trùng cùng loại cho cùng chi tiết, bỏ qua nghĩa vụ đã đóng. Người dùng chỉ đọc/đánh dấu thông báo của mình.

Báo cáo tách số phiếu với số lượt cuốn, nhóm sách phổ biến theo Book. Phí phát sinh trong kỳ khác tiền thực thu trong kỳ; tổng nợ lấy các khoản phí đã chốt chưa thu trên toàn bộ thời gian, không chỉ lấy hai số trong kỳ trừ nhau. CSV có BOM và xử lý ô có nguy cơ thành công thức; PDF nhúng font tiếng Việt.

### Giới hạn hiện tại là gì?

Bản local một backend, session trong bộ nhớ, ảnh lưu filesystem; khởi động lại backend cần đăng nhập lại. Chưa triển khai server/MySQL công khai, chưa kiểm tra tải lớn, HTTPS/SMTP production hoặc cài toàn bộ công cụ trên máy mới. Upload trực tiếp đã kiểm tra 5,5/6 MB trả 413; file vượt giới hạn đọc bỏ của Tomcat vẫn có thể bị ngắt kết nối. Không có đặt chỗ, mua hàng hay thanh toán trực tuyến.

## Nơi mở mã để giải thích

| Nội dung | File chính |
| --- | --- |
| Nhận request, phân quyền endpoint | `backend/src/main/java/vn/edu/library/controller/` |
| Mượn/trả, snapshot, khóa | `backend/src/main/java/vn/edu/library/service/BorrowService.java` |
| Vai trò và thu hồi phiên | `backend/src/main/java/vn/edu/library/service/AccountService.java`, `security/` |
| Thu phí và idempotency | `backend/src/main/java/vn/edu/library/service/ViolationService.java` |
| Thông báo/báo cáo | `NotificationService.java`, `ReportService.java` trong `service/` |
| Bảng và ràng buộc | `backend/src/main/resources/db/migration/V1__library_schema.sql` |
| Bằng chứng nghiệp vụ | `backend/src/test/java/vn/edu/library/LibraryIntegrationTest.java` |
| Bằng chứng luồng giao diện | `frontend/e2e/` |

Khi được hỏi về phần chưa kiểm tra, nêu rõ giới hạn và cách kiểm tra tiếp; không nhận là đã chạy trên production hoặc đã dùng dữ liệu thư viện thật.
