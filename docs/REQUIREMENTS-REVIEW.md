# Đối chiếu đặc tả và kế hoạch hoàn thiện

Ngày rà soát: 26/09/2026. Phạm vi là bản local; chưa triển khai MySQL/server công khai. Bảng này tổng hợp mã hiện có và bằng chứng trong [VERIFICATION.md](VERIFICATION.md), không đồng nghĩa mọi tổ hợp nghiệp vụ đã được kiểm thử.

| Phần đặc tả | Hiện có | Bằng chứng kiểm chứng | Còn cần làm rõ hoặc kiểm tra |
| --- | --- | --- | --- |
| Frontend/backend riêng | React/Vite/TypeScript và Spring Boot/Maven, hợp đồng API | Frontend build; backend tích hợp MySQL | Đóng gói lại JAR sau các lượt sửa |
| Dữ liệu và lớp nghiệp vụ | Entity riêng, kế thừa User, migration Flyway, DECIMAL, thời gian UTC | Kiểm thử tạo giao dịch, đổi role giữ ID/lịch sử | Thử cài mới từ database trống bằng hướng dẫn bàn giao |
| Ba vai trò | Guard giao diện, quyền và chủ sở hữu ở backend | Backend kiểm tra sai quyền; E2E tài khoản, Reader bị chặn báo cáo | Chưa kiểm tra mọi endpoint với mọi vai trò |
| Tài khoản | Tạo/sửa/khóa, role, hồ sơ, mật khẩu, reset SMTP | Kiểm thử backend và E2E tài khoản/reset | SMTP production, HTTPS/cookie Secure chưa kiểm tra |
| Sách/thể loại/cuốn | CRUD, lọc, phân trang, xóa mềm, barcode, nhật ký | Backend tìm kiếm/xóa mềm; E2E tạo/cuốn/thanh lý/chặn xóa thể loại | JPEG hợp lệ, ảnh vượt 20 triệu pixel, tổ hợp bộ lọc và nhật ký trên UI chưa kiểm tra riêng |
| Ảnh bìa | PNG/JPEG, giới hạn kích thước, tên file UUID | E2E PNG, file giả, giới hạn 5 MB trên UI | Client gửi multipart quá lớn trực tiếp có thể nhận lỗi kết nối thay vì JSON; cần kiểm tra/sửa riêng |
| Quy định và mượn–trả | Snapshot hạn/phí, transaction, khóa reader/cuốn, trả từng cuốn | Backend hạn mức, đồng thời, trả lặp, phí; E2E mượn/trả hỏng | Quy định mượn trên giao diện chưa có E2E riêng |
| Mất sách | Ghi vi phạm và đóng nghĩa vụ riêng, cuốn vẫn LOST | E2E báo mất/đóng/thu; E2E sửa vị trí không đổi nghĩa vụ | UI còn hiện nút nhận trả/báo mất với cuốn mất chưa đóng và nút đóng nghĩa vụ với vi phạm đã đóng; backend chặn thao tác không hợp lệ, cần cải thiện hiển thị |
| Thu phí | PaymentRecord, khóa, idempotency, không thu vượt nợ | Backend thu đồng thời/gửi lặp; E2E thu từng phần và đã xử lý vẫn giữ nợ | Chưa mô phỏng mất kết nối ngay sau khi server đã ghi tiền trên trình duyệt |
| Thông báo | Scheduler, dedup, quyền sở hữu, đọc từng/tất cả | Backend gọi tác vụ lặp; backend đọc lặp/phân trang/cách ly người nhận; E2E đọc tất cả | Chưa kiểm tra UI nút đọc từng thông báo; chưa kiểm tra scheduler chạy qua nhiều chu kỳ thời gian thực |
| Báo cáo | Phiếu/lượt cuốn, nhóm Book, nợ toàn kỳ, CSV/PDF tiếng Việt | Backend số liệu/Unicode/chống công thức; E2E lọc kỳ và tải file | Chưa kiểm tra trực quan PDF nhiều trang và dữ liệu lớn |
| Pre-Order | Trang tĩnh, không có nghiệp vụ đặt chỗ/mua hàng | E2E trang không có form; đối chiếu tài liệu API | Giữ đúng phạm vi hiện tại |
| Bàn giao | README, API, ERD, demo, cấu hình mẫu, seed local | Các lệnh đã ghi trong tài liệu kiểm chứng | Chạy lại toàn bộ test sau hoàn thiện, build cuối, thử kịch bản demo từ đầu, lưu phiên bản Git |

## Kết quả cập nhật sau rà soát — 26/09/2026

1. Đã hoàn thiện hiển thị trạng thái mất/đóng nghĩa vụ và kiểm thử lại ngày 26/09/2026: ẩn nhận trả/báo mất với cuốn LOST chưa đóng và ẩn đóng nghĩa vụ với vi phạm đã đóng. Các nhận xét trong bảng phía trên mô tả thời điểm rà soát ban đầu; điểm này đã được xử lý.
2. Đã kiểm tra UI quy định mượn và khôi phục giá trị cũ; sửa cấu hình Tomcat và kiểm tra upload trực tiếp 5,5/6 MB trả JSON 413. Các nhận xét tương ứng trong bảng là lịch sử trước sửa; file lớn hơn giới hạn đọc bỏ 10 MB vẫn có thể ngắt kết nối.
3. Đã chạy toàn bộ 30 backend và 12 E2E, tất cả đạt; build frontend, đóng gói JAR mới và kiểm tra JAR khởi động trả HTTP 200. Chưa thử cài mới từ database trống hoặc commit/push GitHub. Chi tiết xem VERIFICATION.md.

## Việc tiếp theo

Đã kiểm tra cài mới trên database trống tách biệt bằng JAR và khởi động lại, không nhân đôi seed; script tự thu hồi quyền và xóa database tạm sau chạy. Đã cập nhật chuẩn bị/kịch bản demo. Chưa kiểm tra cài toàn bộ công cụ trên máy Windows mới. Tiếp theo hoàn thiện phần giải thích khi bảo vệ và rà soát file để chuẩn bị phiên bản Git. Các giới hạn môi trường production và các ca chưa kiểm tra riêng vẫn được giữ trong bảng để theo dõi.

Dữ liệu Kaggle và MySQL server là bước riêng khi có dataset/server; không đưa vào đợt hoàn thiện local này. Không triển khai đặt chỗ, giỏ hàng, thanh toán trực tuyến hay module mua sách.
