# Kịch bản demo

Chuẩn bị MySQL/backend/frontend/Mailpit theo README. Mật khẩu ở .local/env.ps1. Demo ghi dữ liệu thật; khi chạy lại chọn barcode khả dụng mới.

## Chuẩn bị trước buổi demo

- Khởi động MySQL, Mailpit, backend và frontend theo README. Dùng cùng hostname `127.0.0.1`.
- Nếu dùng JAR: chạy `powershell -ExecutionPolicy Bypass -File scripts/run-backend.ps1 -Jar`. Dừng backend đang chạy trước để tránh trùng cổng 8080.
- Chuẩn bị một ảnh PNG/JPEG dưới 5 MB và một file văn bản đổi đuôi PNG để minh họa kiểm tra nội dung ảnh.
- Tạo mã vạch mới cho buổi demo, ví dụ `DEMO-20260926-A` và `DEMO-20260926-B`; các mã trong bước 4 chỉ là ví dụ, không giả định còn khả dụng sau những lần chạy trước.
- Ghi lại quy định mượn trước khi thay đổi ở bước 10 và khôi phục sau demo. Không đọc hoặc chiếu nội dung `.local/env.ps1` khi chia sẻ màn hình.
- Phân biệt khoản phí mô phỏng và tiền thật: tất cả giao dịch của kịch bản này chỉ phục vụ đồ án local.

## Trình tự thao tác

1. **student** đăng nhập; tìm Cơ sở dữ liệu, lọc thể loại/năm/khả dụng, mở chi tiết vị trí/mã vạch. Xem Đang mượn, Lịch sử, Thông báo. Không có nút tự mượn.
2. Đăng xuất, Quên mật khẩu với student@library.test. Mở Mailpit :8025 lấy liên kết, đặt lại và đăng nhập. Dùng lại token phải lỗi. Ghi nhớ mật khẩu mới.
3. **librarian** thêm/sửa đầu sách, thêm nhiều barcode, upload ảnh và xem nhật ký sửa.
4. Mượn & trả → Lập phiếu → chọn SV001 → kiểm tra hạn mức → nhập LIB-2-1 và LIB-2-2 nếu vẫn AVAILABLE → xác nhận giao sách.
5. Thử mượn barcode đang ON_LOAN hoặc lặp barcode: lỗi, không có phiếu dở dang. Hai test concurrency minh họa bảo vệ item/hạn mức.
6. Trả cuốn thứ nhất GOOD → PARTIALLY_RETURNED, item AVAILABLE. Trả thứ hai DAMAGED kèm phí/lý do → phiếu đóng, item DAMAGED. Trả lặp bị từ chối.
7. Trả LIB-1-1 của seed để minh họa trễ hạn. Seed đã quá 2 ngày; vì phần ngày lẻ làm tròn lên, phí có thể hơn 4.000đ. Phí 2.000đ/ngày chỉ minh họa.
8. Vi phạm & phí → thu một phần → xem sổ thu/nợ → thu nốt → đánh dấu xử lý. Thử thu vượt nợ; test retry cùng key chỉ tạo một payment.
9. Mượn cuốn khác → Báo mất kèm phí/lý do → item LOST nhưng nghĩa vụ còn mở. Vi phạm → Đóng nghĩa vụ mất kèm căn cứ. returnedAt trống, closedAt có dấu vết, item không trở về AVAILABLE.
10. **admin** tạo tài khoản/khóa/mở/đổi role người không còn nghĩa vụ mở. Phiên cũ hết hiệu lực. Sửa rule, kiểm tra snapshot phiếu cũ giữ nguyên.
11. Báo cáo: chọn kỳ ngày demo, so số phiếu/lượt cuốn, phí phát sinh/tiền thu/tổng nợ; tải CSV/PDF. Admin không có quyền giao dịch thủ thư.
12. Pre-Order chỉ Sắp phát triển, không form/đặt chỗ.

Giải thích khi bảo vệ: SINGLE_TABLE và đổi role giữ ID; Book so với BookItem; receipt/detail; transaction và READ_COMMITTED; snapshot rule; idempotency; CSRF/owner checks; phí và nghĩa vụ độc lập; Report chỉ metadata.

Sau báo mất, giao diện ẩn nhận trả/báo mất lần nữa và hướng dẫn sang Vi phạm. Sau đóng nghĩa vụ, nút đóng lại biến mất nhưng vẫn có Thu phí nếu còn nợ. Có thể đánh dấu vi phạm đã xử lý khi còn nợ để minh họa hai trạng thái độc lập.

## Kiểm tra cài mới trước khi bàn giao

Sau khi đã cấu hình local và đóng gói JAR, chạy từ thư mục dự án:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-fresh-install.ps1
```

Script sử dụng MySQL local của dự án ở cổng 3307, tạo database tạm tên ngẫu nhiên và chạy JAR ở cổng 18081. Nó kiểm tra migration, seed, đăng nhập, danh mục rồi khởi động lại để phát hiện seed trùng. Cuối cùng dừng tiến trình riêng, thu hồi quyền và xóa đúng database tạm vừa tạo. Không dùng để kiểm tra server production. Nếu lỗi, xem `.local/fresh-install/`; database `library` và `library_test` không bị xóa.
