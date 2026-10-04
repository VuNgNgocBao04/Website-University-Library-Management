# Kiểm chứng

## Giao diện navy–kem–gold — 30/09/2026

- `npm.cmd run build --prefix frontend`: TypeScript và Vite production build đạt.
- `scripts/test-frontend.ps1`: **15/15 kịch bản đạt trong 1,3 phút**, Chrome headless, Vite 5173, backend JAR 8080, MySQL 3307 và Mailpit 8025.
- Giữ các kiểm thử tài khoản/phân quyền, sách/ảnh bìa, mượn trả, mất sách, phí, SMTP reset, thông báo, quy định, CSV/PDF; thêm ba ca trang chủ/Reader và dashboard Admin/Thủ thư. Đã kiểm tra drawer Escape/focus, không tràn ngang ở 390px và tìm kiếm xuyên qua đăng nhập.
- Đã xem ảnh trang chủ, đăng nhập, danh mục và dashboard. Ảnh lưu `.local/screenshots/`, không đưa vào Git. Các cặp màu chính được tính tương phản: navy/trắng 11,50:1; chữ chính/kem 13,84:1; chữ phụ/kem 4,56:1; chữ đậm/gold 5,61:1. Đây không phải chứng nhận WCAG toàn website; chưa kiểm thử trình đọc màn hình hoặc Safari/iOS.
- Bổ sung React Bootstrap 2.10.10 và sửa metadata dependency thiếu phiên bản trong lockfile; không còn entry registry thiếu version. Một file theme CSS thay cho styles.css, các component mới ở `src/components`, các trang nghiệp vụ giữ vị trí và API cũ. Chi tiết tại [UI.md](UI.md).
- E2E dùng mật khẩu riêng đủ validation cho tài khoản mới, không đổi mật khẩu demo. Kiểm thử luồng mượn trả duyệt phân trang khi dữ liệu vượt trang đầu; kiểm thử đăng nhập chấp nhận trở về trang yêu cầu rồi mở danh mục.
- Dịch vụ bị dừng giữa phiên nên đã khởi động lại trước lượt đạt trên. Các lượt trước có lỗi selector/menu/toast đã được sửa; kết quả cuối trên thay thế các lượt chưa đạt. Backend, Entity, migration và quyền nghiệp vụ không thay đổi trong đợt UI; không chạy lại bộ 30 kiểm thử backend.

## Cài mới trên database trống — 26/09/2026

`scripts/verify-fresh-install.ps1` đã đạt cả hai lần khởi động JAR trên database riêng mới tạo: Flyway có 1 migration thành công; 4 tài khoản, 6 đầu sách, 24 cuốn, 1 phiếu và 2 chi tiết mượn. Đăng nhập Admin bằng session/CSRF và API danh mục trả 6 đầu sách. Khởi động lại vẫn giữ đúng số lượng, không nhân đôi seed.

JAR dùng cổng 18081; database tên ngẫu nhiên trên MySQL local 3307. Tiến trình riêng đã dừng, quyền tạm đã thu hồi và database tạm đã xóa khi hoàn tất. Không xóa/sửa dữ liệu `library` hay `library_test`. Đây là kiểm chứng database trống với JDK/MySQL/dependency đã có trên máy hiện tại, chưa phải cài toàn bộ công cụ trên máy Windows mới. Hướng dẫn và chuẩn bị demo được bổ sung trong DEMO.md.

## Kết quả tổng hợp mới nhất — 26/09/2026

- Backend: `scripts/test-backend.ps1 -Package` chạy toàn bộ **30/30 kiểm thử đạt**, không lỗi/bỏ qua; tạo lại `backend/target/university-library-1.0.0.jar`.
- Frontend: `npm.cmd run build --prefix frontend` đạt TypeScript và Vite, kết quả tại `frontend/dist/`.
- Giao diện: `scripts/test-frontend.ps1` chạy toàn bộ **12/12 kịch bản đạt** trong 57,6 giây trên Chrome, backend và MySQL local, Mailpit thật.
- Khởi động lại bằng `scripts/run-backend.ps1 -Jar`: endpoint `/api/auth/csrf` trả HTTP 200. Đây là kiểm tra khởi động JAR; 12 E2E ở trên chạy với backend từ source.

Hai ca mới trong `rules-upload.spec.ts`: sửa quy định STUDENT bằng UI, reload xác nhận rồi khôi phục chính xác quy định ban đầu trong finally; gửi multipart trực tiếp 5,5 MB và 6 MB, nhận HTTP 413 với FILE_TOO_LARGE, ảnh bìa không đổi. Cấu hình Tomcat `max-swallow-size: 10MB` cho phép đọc bỏ các upload vượt giới hạn ở mức này để phản hồi lỗi tới client. Giới hạn nhận ảnh vẫn 5 MB, request multipart vẫn 6 MB. Upload lớn hơn giới hạn đọc bỏ có thể vẫn bị ngắt kết nối; chưa kiểm thử mọi kích thước. Cơ sở: [Tomcat HTTP Connector — maxSwallowSize](https://tomcat.apache.org/tomcat-10.1-doc/config/http.html).

Các mục dưới đây là lịch sử từng lượt, gồm cả giới hạn kiểm chứng tại thời điểm đó; kết quả tổng hợp trên thay thế thông tin “chưa chạy toàn bộ/chưa đóng gói JAR” của các lượt cũ. Chưa kiểm thử cài mới hoàn toàn, HTTPS/SMTP production, Safari/iOS hoặc tải lớn. Chưa commit/push GitHub.

Môi trường: Windows, JDK 17.0.12, MySQL 8.0.45, Node 24.14.0, Chrome headless, SMTP Mailpit. Database kiểm thử riêng `library_test`; không dùng H2 để thay thế kiểm thử khóa MySQL.

## Backend

### Khôi phục mã nguồn và kiểm chứng lại (25/09/2026)

Khôi phục 94 file văn bản từ lịch sử các bản vá thành công, bao gồm những chỉnh sửa validation tài khoản và hai kiểm thử trả sách đồng thời mới nhất. Font Noto Sans và giấy phép được lấy lại từ JAR còn lưu, nâng tổng số file khôi phục lên 96. Danh sách mã Java được đối chiếu với danh sách đầu vào của Maven ở lần build trước; migration khớp nội dung đóng gói trong JAR. `frontend/package-lock.json` được tạo lại offline từ các dependency hiện có, không khẳng định giống từng byte với lockfile đã mất.

Đã chạy lại toàn bộ kiểm thử backend bằng `scripts/test-backend.ps1`: **29 kiểm thử đạt, 0 lỗi, 0 bỏ qua** trên MySQL `library_test`, JDK 17. Hai ca mới kiểm tra trả đồng thời hai cuốn quá hạn của cùng phiếu và trả một cuốn đồng thời đóng nghĩa vụ cuốn mất; xác nhận trạng thái phiếu, phí và trạng thái LOST được giữ đúng.

Frontend `npm.cmd run build --prefix frontend` đạt kiểm tra TypeScript và Vite production build. Playwright/SMTP được kiểm tra lại ở lượt riêng bên dưới. Chưa đóng gói lại JAR sau khôi phục.

Chưa xác định nguyên nhân mất file; nhật ký nâng cấp Java riêng không đủ để kết luận nguyên nhân. Dự án được khôi phục về Java 17 đã kiểm thử. Bản sao mã nguồn sau kiểm chứng được lưu local tại `.local/recovery/recovered-project-20260925.zip`, không chứa database, mật khẩu local hay dependency đã cài.

### Lượt rà soát nhỏ: validation tài khoản (24/09/2026)

Đã thống nhất giới hạn họ tên giữa tạo/sửa (120 ký tự), thêm giới hạn email/mã nhân viên/mã bạn đọc theo độ dài cột database. API trả 400 với lỗi từng trường trước khi ghi dữ liệu.

Đã chạy riêng 5 kiểm thử liên quan, cả 5 đạt: ba ca mới kiểm tra dữ liệu quá dài, yêu cầu đổi vai trò lỗi không làm thay đổi tài khoản/phiên và giá trị hợp lệ tại biên; hai ca cũ kiểm tra đổi vai trò giữ lịch sử và khóa tài khoản thu hồi phiên. Lượt này không chạy lại toàn bộ bộ kiểm thử hoặc đóng gói lại JAR.

Lệnh chạy lại nhóm này:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-backend.ps1 -TestFilter 'LibraryIntegrationTest#accountCreationRejectsOversizedFieldsWithoutWriting+roleChangeRejectsOversizedCodeWithoutChangingAccount+accountCreationAcceptsBoundaryAndProfileCanBeSaved+roleChangeKeepsHistoryAndRevokesSession+lockAccountRevokesExistingSession'
```

### Lần kiểm tra toàn bộ trước lượt rà soát

24 kiểm thử tích hợp, 0 lỗi, 0 bỏ qua trong lần kiểm tra ngày 24/09/2026. Xem `backend/src/test/java/vn/edu/library/LibraryIntegrationTest.java`; kết quả tự sinh ở `backend/target/surefire-reports/` (gitignore).

- Sai vai trò (ADMIN không giao sách), thiếu CSRF, truy cập phiếu/nợ/thông báo người khác.
- Hạn mức Reader, barcode lặp, rollback khi một cuốn không khả dụng.
- Hai bạn đọc mượn cùng cuốn; hai yêu cầu cùng Reader vượt hạn mức.
- Trả một phần/toàn bộ/trả lặp và hai lần trả đồng thời.
- Phí đúng hạn, ngày lẻ, ranh giới 24 giờ; snapshot rule giữ nguyên khi đổi cấu hình.
- Thu vượt nợ, retry cùng key, hai lần thu đồng thời, hai request cùng key.
- Báo mất không phải trả, đóng nghĩa vụ rõ ràng, item tiếp tục LOST.
- Thông báo chống trùng và bỏ qua cuốn đã đóng.
- Tìm kiếm/phân trang, xóa mềm giữ lịch sử, chặn xóa khi đang mượn.
- Báo cáo phân biệt phiếu/cuốn, Book phổ biến, nợ ngoài kỳ, CSV BOM/chống công thức và trích xuất đúng tiếng Việt từ PDF.
- Đổi role giữ userId/lịch sử; khóa hoặc đổi quyền thu hồi phiên cũ.
- Reset token lưu hash, dùng một lần, hết hạn, rollback khi SMTP thất bại.
- CORS cho origin cấu hình và chặn origin lạ.
- Validation cuốn trong mảng, chặn xóa thể loại đang dùng, từ chối ảnh giả.

## Giao diện và SMTP

### Hiển thị thao tác theo trạng thái mất/đóng nghĩa vụ (26/09/2026)

Bổ sung DTO Detail.itemStatus và Violation.loanClosedAt, cập nhật hợp đồng API/TypeScript. Cuốn LOST chưa đóng không còn nút nhận trả/báo mất; hiển thị hướng dẫn sang Vi phạm. Vi phạm LOST đã đóng không còn nút đóng lại; nút thu phí vẫn dựa trên số nợ. Không thay đổi bảng database hoặc quy tắc backend.

Frontend build đạt; hai kiểm thử backend `lostBookRequiresExplicitClosure` và `partialFullAndRepeatedReturn` đạt 2/2. Kịch bản `lost-payment.spec.ts` mở rộng xác nhận nút ẩn đúng, trạng thái giữ sau reload và vẫn thu đủ hai lần: 1/1 đạt (12,2 giây toàn lượt). Lần E2E đầu chạy trước khi backend khởi động xong nên thất bại; chạy lại sau endpoint CSRF trả 200 đã đạt. Chưa chạy lại toàn bộ bộ kiểm thử hoặc đóng gói JAR.

### Thông báo, báo cáo và đối chiếu đặc tả (26/09/2026)

Backend chạy riêng 3 ca, **3/3 đạt**: ca mới `notificationReadStateIsIdempotentAndScopedToRecipient` kiểm tra phân trang, đọc một/đọc tất cả lặp không đổi kết quả và không ảnh hưởng người khác; hai ca có sẵn kiểm tra nhắc hạn chống trùng/bỏ qua nghĩa vụ đã đóng và báo cáo tách phiếu/lượt cuốn/nợ, CSV/PDF tiếng Việt. Lượt này không phải chạy toàn bộ 30 ca backend hiện có.

`frontend/e2e/notifications-reports.spec.ts`: **2/2 đạt** (29,5 giây toàn lượt). Reader đọc tất cả thông báo trên dữ liệu local có sẵn, reload giữ trạng thái và bị chặn báo cáo cả UI/API. Admin lọc kỳ 01–02/01/2000 không có giao dịch, thấy số phiếu/lượt bằng 0 và tải CSV có UTF-8 BOM/PDF có chữ ký file hợp lệ. Không dùng kiểm tra chữ ký file để thay cho kiểm tra nội dung/hiển thị PDF. Thao tác đọc tất cả thay đổi trạng thái thông báo tài khoản student local.

Lần chạy đầu thất bại do dịch vụ local đã dừng (frontend từ chối kết nối, MySQL communications link failure). Sau khởi động lại, hai nhóm kiểm thử trên đều đạt. Không thay đổi mã nghiệp vụ trong lượt này.

Đã tổng hợp phần đã triển khai, bằng chứng và khoảng trống kiểm chứng tại [REQUIREMENTS-REVIEW.md](REQUIREMENTS-REVIEW.md).

### Báo mất, đóng nghĩa vụ và thu phí qua giao diện (26/09/2026)

Thêm `frontend/e2e/lost-payment.spec.ts`. API có session/CSRF chuẩn bị bạn đọc, sách, cuốn và phiếu riêng; các thao tác báo mất, nhập lý do/phí 10.000đ, đóng nghĩa vụ, thu phí và đánh dấu đã xử lý đều thực hiện qua giao diện. Xác nhận đóng phiếu vẫn giữ nợ 10.000đ, returnedAt vẫn null; thu 10.001đ bị từ chối và không đổi nợ; thu 4.000đ còn nợ 6.000đ; đánh dấu vi phạm đã xử lý không xóa nợ; thu tiếp 6.000đ hết nợ và lịch sử hiển thị đúng hai lần thu. Cuốn tiếp tục LOST sau toàn bộ luồng.

Kết quả: **1/1 đạt**, 11,8 giây toàn lượt trên Chrome/MySQL local. Không phát hiện lỗi nghiệp vụ trong kịch bản này, không sửa mã ứng dụng. Dữ liệu kiểm thử được giữ trong database demo, phí đã thu đủ. Chưa chạy lại toàn bộ bộ kiểm thử trong lượt này.

```powershell
powershell -ExecutionPolicy Bypass -Command '. ./.local/env.ps1; Set-Location frontend; npm.cmd run test:e2e -- lost-payment.spec.ts; exit $LASTEXITCODE'
```

### Cập nhật vị trí cuốn đang mượn và bị mất (26/09/2026)

Thêm `frontend/e2e/item-location.spec.ts`: tạo bạn đọc, thể loại, sách, cuốn và phiếu riêng qua API có session/CSRF; cập nhật vị trí qua giao diện khi cuốn ON_LOAN, sau đó báo mất qua API và kiểm tra lại với LOST. Cả hai trạng thái không hiển thị trường sửa tình trạng. Sau lưu và reload, vị trí được cập nhật nhưng trạng thái/tình trạng cuốn, hạn trả, đơn giá phạt và nghĩa vụ mượn được giữ nguyên (chưa trả, chưa đóng).

Cuối kịch bản, gọi thao tác đóng nghĩa vụ mất riêng có lý do kiểm thử; xác nhận phiếu RETURNED nhưng returnedAt vẫn null và cuốn vẫn LOST. Dữ liệu E2E và khoản phí mất sách minh họa được giữ trong database local; không dùng bạn đọc mẫu cho giao dịch này.

Kết quả: **1/1 đạt**, 11,4 giây toàn lượt trên Chrome và MySQL local. Không sửa mã nghiệp vụ, không chạy lại toàn bộ backend/E2E hoặc build vì lượt này chỉ thêm kiểm thử. Việc báo mất và đóng nghĩa vụ trong ca này dùng API để chuẩn bị/hoàn tất dữ liệu, không được tính là kiểm thử giao diện hai thao tác đó.

```powershell
powershell -ExecutionPolicy Bypass -Command '. ./.local/env.ps1; Set-Location frontend; npm.cmd run test:e2e -- item-location.spec.ts; exit $LASTEXITCODE'
```

### Lượt rà soát ảnh bìa (26/09/2026)

Mở rộng `catalog.spec.ts` kiểm tra PNG hợp lệ được lưu bằng tên UUID, tải được sau reload; tệp giả mang MIME image/png bị backend từ chối với thông báo cụ thể; file 6 MB bị giao diện từ chối với thông báo giới hạn 5 MB. Sau cả hai lỗi, ảnh đã lưu vẫn giữ nguyên.

Kiểm thử ban đầu phát hiện upload quá lớn có thể chỉ hiện “Failed to fetch”. Đã thêm kiểm tra kích thước và MIME trước khi gửi trong giao diện, giữ nguyên kiểm tra backend. Đây là sửa trải nghiệm trên website; chưa xử lý riêng phản hồi kết nối khi client khác gửi multipart vượt giới hạn trực tiếp.

Sau sửa: kịch bản danh mục mở rộng đạt 1/1 (14,3 giây toàn lượt), frontend TypeScript/Vite build đạt. Chưa chạy lại toàn bộ E2E/backend, chưa kiểm thử riêng JPEG, giới hạn điểm ảnh hoặc nhánh sửa vị trí cuốn ON_LOAN/LOST trong lượt này.

### Lượt rà soát danh mục và cuốn vật lý (26/09/2026)

Sửa form cập nhật cuốn trong `Catalog.tsx`: với ON_LOAN, LOST hoặc WITHDRAWN, chỉ hiển thị trường vị trí và giải thích tình trạng được giữ nguyên. Trước đây form vẫn cho chọn tình trạng nhưng yêu cầu gửi đi chỉ cập nhật vị trí, khiến người dùng có thể hiểu nhầm thay đổi đã được lưu.

Thêm và chạy riêng `frontend/e2e/catalog.spec.ts`: **1/1 đạt**, thời gian toàn lượt 25,4 giây trên Chrome, backend local và MySQL thật. Kịch bản tạo thể loại, đầu sách, cuốn vật lý; tìm sách; cập nhật cuốn hỏng và vị trí; thanh lý; kiểm tra không còn trường chọn tình trạng, đổi vị trí sau thanh lý rồi tải lại và đối chiếu API xác nhận WITHDRAWN/DAMAGED được giữ nguyên; chặn xóa thể loại đang dùng và xác nhận thể loại vẫn tồn tại sau tải lại. Dữ liệu có tên/mã E2E được giữ để nhận diện là dữ liệu minh họa.

Frontend `npm.cmd run build --prefix frontend` đạt TypeScript và production build. Lượt này chưa chạy lại toàn bộ backend/E2E, chưa kiểm thử giao diện riêng cho cuốn ON_LOAN/LOST hoặc ảnh bìa. Phần ảnh bìa và các trường hợp còn lại sẽ được rà soát ở lượt tiếp theo.

```powershell
powershell -ExecutionPolicy Bypass -Command '. ./.local/env.ps1; Set-Location frontend; npm.cmd run test:e2e -- catalog.spec.ts; exit $LASTEXITCODE'
```

### Lượt rà soát tài khoản và phân quyền (25/09/2026)

Thêm `frontend/e2e/accounts.spec.ts`, dùng hai phiên Chrome độc lập và tài khoản E2E riêng. Kiểm thử đã đạt (1/1, 33,6 giây gồm khởi chạy): Admin tạo bạn đọc, tìm kiếm, sửa hồ sơ, khóa/mở, đổi sang thủ thư giữ ID và ngừng hoạt động; người dùng sửa hồ sơ và kiểm tra dữ liệu sau tải lại, đổi mật khẩu rồi đăng nhập lại. Xác nhận khóa/đổi quyền/ngừng hoạt động thu hồi phiên, tài khoản khóa không đăng nhập được, Reader bị chặn trang tài khoản, Reader và Librarian nhận HTTP 403 khi gọi API quản lý tài khoản.

Không sửa mã nghiệp vụ trong lượt này. Những lần chạy đầu bị dừng hoặc lỗi do bộ chọn nhãn/nút của kiểm thử mới; đã sửa bộ chọn và chạy lại thành công. Chỉ chạy kịch bản mới, không chạy lại bốn kịch bản trước hoặc bộ kiểm thử backend. Tài khoản `e2e_user_<timestamp>` được giữ làm dữ liệu minh họa và chuyển INACTIVE khi kịch bản hoàn tất.

Chạy riêng kịch bản này trong PowerShell từ thư mục dự án, sau khi MySQL, backend và frontend đã khởi động:

```powershell
powershell -ExecutionPolicy Bypass -Command '. ./.local/env.ps1; Set-Location frontend; npm.cmd run test:e2e -- accounts.spec.ts; exit $LASTEXITCODE'
```

### Kiểm tra lại sau khôi phục (25/09/2026)

Đã khởi chạy backend từ mã nguồn Java 17, Vite và Mailpit, sau đó chạy `powershell -ExecutionPolicy Bypass -File scripts/test-frontend.ps1` cho toàn bộ 4 kịch bản bên dưới. Khi tiếp tục sau gián đoạn kết nối, tiến trình terminal cũ không còn truy cập được; file `frontend/test-results/.last-run.json` lưu lúc 14:44:21 ghi nhận `status: passed`, `failedTests: []`. Đây là bằng chứng kết quả được lưu của lượt chạy, không phải kết quả chạy lại sau khi nối lại phiên.

Không chạy lặp để tránh tạo thêm giao dịch demo. Backend, Vite và Mailpit đã dừng tại thời điểm kiểm tra lại trạng thái dịch vụ. Không có thay đổi mã nghiệp vụ trong lượt này.

4 kịch bản Playwright đã đạt trên Chrome:

1. Reader đăng nhập, tìm sách, xem chi tiết/đang mượn, trang Pre-Order tĩnh và bố cục mobile.
2. Librarian tạo Book/BookItem → giao sách → nhận trả DAMAGED → thu tiền → xem lịch sử thu, qua UI/API/MySQL.
3. Admin không có nút giao dịch thủ thư; xem báo cáo và tải cả CSV/PDF.
4. Gửi email quên mật khẩu qua SMTP Mailpit thật → mở liên kết → reset → từ chối token dùng lại → đăng nhập thành công.

SMTP tích hợp dùng Mailpit loopback, chưa kiểm thử với nhà cung cấp email production. Giao diện được kiểm tra ở Chrome desktop và viewport 390px; chưa kiểm tra Safari/iOS, HTTPS production hoặc tải lớn. Không khẳng định mọi tổ hợp dữ liệu/người dùng đều đã được kiểm thử.

Frontend `npm run build` đã đạt TypeScript và Vite production build. Nguồn dữ liệu là API/MySQL; seed và dữ liệu E2E có ghi rõ tính minh họa. Các test UI có thể để lại sách/phiếu tên E2E trong database demo. Không có thay đổi được đẩy lên GitHub tự động.

## Bàn giao theo giai đoạn

Backend đã đóng gói thành JAR thực thi `backend/target/university-library-1.0.0.jar`; thư mục target và frontend/dist là sản phẩm build, được gitignore.

| Giai đoạn | Đã triển khai | Kiểm chứng chính |
| --- | --- | --- |
| Tài khoản | Session/CSRF, hồ sơ, mật khẩu, reset, admin tài khoản/role/status | Quyền/thu hồi phiên, SMTP end-to-end |
| Sách | Book/Item/Category, tìm kiếm, upload, nhật ký, xóa mềm | Catalog, validation, ảnh giả, E2E tạo sách/cuốn |
| Quy định/mượn trả | Snapshot, giao sách, trả từng cuốn, khóa đồng thời | Hạn mức, item race, return race, phí |
| Vi phạm | Hỏng/mất/quá hạn, payment/idempotency, đóng mất | Nợ, concurrent payment, lost closure |
| Thông báo | Scheduler, unread/read, dedup | Chạy lặp không trùng, không nhắc cuốn đóng |
| Báo cáo | Metadata, tổng hợp, CSV/PDF | Period semantics, Unicode PDF, tải thật |
| Tài liệu | README, ERD, API, demo, config mẫu | Các lệnh local/build/test đã sử dụng |
