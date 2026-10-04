# Giao diện UniLib

Trang chủ được tinh chỉnh ngày 30/09/2026: hero navy với minh họa kệ sách bằng CSS, khối tra cứu nổi bật, ba liên kết dịch vụ theo vai trò và hướng dẫn nhận sách tại quầy. Tham khảo cách ưu tiên tìm kiếm và liên kết dịch vụ từ [WashU Libraries](https://library.washu.edu/), [Harvard Library](https://library.harvard.edu/) và [Glasgow Library](https://www.gla.ac.uk/myglasgow/library/). Không sao chép thương hiệu, hình ảnh hoặc dữ liệu của các trường. Chỉ thay Home.tsx và phần theme trang chủ; giữ route, API, database và cấu trúc thư mục hiện có.

Giao diện dùng React, Bootstrap 5.3.8 và React Bootstrap 2.10.10; không có thư viện UI hoặc biểu đồ khác. Cấu trúc `frontend/` và `backend/` được giữ riêng. Các trang nghiệp vụ vẫn ở `frontend/src/pages/`; API, session cookie, CSRF và phân quyền backend giữ nguyên.

## Các file chính

| File trong frontend/src | Trách nhiệm |
| --- | --- |
| theme.css | Toàn bộ CSS tùy chỉnh, thay styles.css; bảng màu, Bootstrap variables, responsive, focus, trạng thái |
| components/Layouts.tsx | PublicLayout, AdminLayout, Navbar, Sidebar, Footer, Brand; chọn layout theo vai trò |
| components/BookCard.tsx | Bìa sách, thông tin đầu sách, số cuốn khả dụng, liên kết chi tiết |
| components/DataTable.tsx | Bảng dùng chung, caption, hàng hover, cuộn ngang |
| components/StatCard.tsx | Chỉ số có nhãn và liên kết nghiệp vụ |
| components/LoginForm.tsx | Đăng nhập thật và trở về trang yêu cầu sau đăng nhập |
| components/Feedback.tsx | Toast kết quả thao tác API |
| pages/Home.tsx | Trang chủ giới thiệu và tìm kiếm |
| pages/Dashboard.tsx | Tổng quan quản trị lấy dữ liệu từ API hiện có |
| ui.tsx | Form, lỗi theo trường, loading, empty, phân trang; modal React Bootstrap |
| App.tsx | Giữ route nghiệp vụ, bổ sung /home và /dashboard |

Chỉ import `theme.css` sau Bootstrap trong `main.tsx`. Chỉnh màu, bo góc, bóng tại `:root`; các nút Bootstrap có biến riêng cũng được ghi đè. Font Be Vietnam Pro được tải từ Google Fonts, dùng system font khi không có mạng. Brand UniLib là tên đồ án; chưa thay bằng logo của một trường cụ thể.

## Điều hướng và nghiệp vụ

- `/home` công khai; tìm kiếm chuyển đến danh mục sau đăng nhập và giữ từ khóa. Danh mục `/` vẫn yêu cầu đăng nhập theo cơ chế có sẵn.
- READER dùng navbar; vai trò Bạn đọc bao gồm sinh viên và giảng viên. Có sách đang mượn, lịch sử, vi phạm/phí, thông báo và hồ sơ.
- ADMIN và LIBRARIAN dùng sidebar; mobile mở bằng Offcanvas. Dashboard dùng API có quyền tương ứng. Admin không được thêm nút lập phiếu, nhận trả hoặc thu phí.
- BookCard dẫn đến chi tiết và hướng dẫn mượn tại quầy. Không tạo nút mượn online, đặt chỗ hay nghiệp vụ mới. Pre-Order vẫn là trang tĩnh.
- Dashboard tách rõ đầu sách, phiếu chưa trả hết, cuốn quá hạn và bạn đọc. Biểu đồ đếm **phiếu**, không phải lượt cuốn. Danh sách phiếu theo thứ tự API hiện có, không gắn nhãn “mới nhất”. Số liệu nhiều API là tổng quan tại lần tải, không phải một snapshot transaction chung.
- DataTable dùng cho dashboard; các bảng nghiệp vụ cũ giữ cấu trúc/handler và nhận theme chung. Bộ lọc và phân trang hiện có không bị thay bằng dữ liệu mẫu.
- Giờ mở cửa và liên hệ trường chưa được cung cấp nên footer ghi rõ đang cập nhật/hướng dẫn liên hệ quầy, không tự đặt thông tin.

## Trải nghiệm và kiểm tra

Modal và drawer dùng React Bootstrap để quản lý focus/Escape. Menu có tên tiếng Việt, aria-expanded; trang có liên kết bỏ qua menu. Form có label, ID riêng, aria-invalid, aria-describedby và lỗi dưới trường. Trạng thái luôn có chữ; dùng màu chữ đậm hơn trên nền nhạt để tăng tương phản. Toast chỉ báo thành công sau phản hồi API thành công; lỗi chi tiết vẫn giữ trên form/trang.

Chạy `npm.cmd run build --prefix frontend`, sau đó `powershell -ExecutionPolicy Bypass -File scripts/test-frontend.ps1` khi backend, MySQL, Vite và Mailpit đang chạy. `e2e/theme.spec.ts` kiểm tra tìm kiếm từ trang chủ, ba vai trò, drawer bằng bàn phím và chiều rộng mobile 390px; ảnh chụp ở `.local/screenshots/`. Các test nghiệp vụ khác tiếp tục kiểm tra tài khoản, mượn trả, phí, thông báo và báo cáo.

Tài khoản tạo riêng trong E2E dùng mật khẩu đủ 10–72 ký tự. Không đổi mật khẩu các tài khoản demo hoặc nới validation backend để phục vụ test.

Chưa chứng nhận WCAG toàn bộ website; cần kiểm tra thêm bằng trình đọc màn hình và thiết bị thực. Tham khảo cách dùng [Navbar](https://react-bootstrap.github.io/docs/components/navbar/) và [React Bootstrap](https://react-bootstrap.github.io/docs/getting-started/introduction/).
