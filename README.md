# UniLib — Website quản lý thư viện trường đại học

Đồ án Project 1. Backend Java/Spring Boot độc lập với React; có thể thay frontend nếu giữ hợp đồng trong [docs/API.md](docs/API.md).

Kiểm chứng giao diện mới nhất (30/09/2026): **15/15 kịch bản giao diện đạt**, frontend build thành công trên backend JAR, MySQL và Mailpit local. Backend giữ kết quả **30/30 kiểm thử đạt ngày 26/09/2026**, không chạy lại bộ backend trong đợt đổi giao diện. Xem [kết quả và giới hạn kiểm chứng](docs/VERIFICATION.md).

Đã kiểm tra JAR trên database trống và khởi động lại không trùng seed. Xem cách chạy kiểm tra tách biệt và chuẩn bị buổi demo tại [docs/DEMO.md](docs/DEMO.md).

Phần trình bày và câu hỏi backend khi bảo vệ: [docs/DEFENSE.md](docs/DEFENSE.md).

## Công nghệ

| Thành phần | Phiên bản |
| --- | --- |
| Java / Maven | 17 / 3.9.11 |
| Spring Boot | 3.5.16 |
| MySQL | 8.0.45, InnoDB, utf8mb4 |
| React / React DOM | 19.2.0 |
| Vite / TypeScript | 7.2.2 / 5.9.3 |
| React Router / Bootstrap | 7.9.6 / 5.3.8 |
| React Bootstrap | 2.10.10 |
| PDFBox / font | 3.0.6 / Noto Sans (SIL OFL) |
| Playwright | 1.56.1 |
| Mailpit (SMTP local) | 1.31.2 |

Spring Boot BOM quản lý Spring Security, JPA, Validation, Flyway. Frontend có package-lock.json, dùng `npm ci`. Đã build bằng Node 24.14.0; yêu cầu Node 22.12+. Tham khảo [Spring Boot 3.5](https://docs.spring.io/spring-boot/3.5/system-requirements.html), [Vite](https://vite.dev/guide/) và [Spring Security CSRF](https://docs.spring.io/spring-security/reference/servlet/exploits/csrf.html).

## Cấu trúc

Theo dõi tiến độ và phần cần hoàn thiện tại [Bảng đối chiếu đặc tả](docs/REQUIREMENTS-REVIEW.md); kết quả chạy thực tế ở [Tài liệu kiểm chứng](docs/VERIFICATION.md).

```text
project1/
├── frontend/
│   ├── src/                         Mã nguồn giao diện React
│   │   ├── pages/                   Các trang giao diện
│   │   ├── components/              Layout, menu, card, bảng, form đăng nhập
│   │   ├── App.tsx                  Điều hướng, phân quyền trang và bố cục
│   │   ├── main.tsx                 Điểm khởi chạy React
│   │   ├── api.ts                   Gọi API, cookie và CSRF dùng chung
│   │   ├── auth.tsx                 Quản lý phiên đăng nhập
│   │   ├── types.ts                 Kiểu dữ liệu TypeScript
│   │   ├── ui.tsx                   Thành phần giao diện dùng chung
│   │   └── theme.css                Một file CSS tùy chỉnh, ghi đè Bootstrap
│   ├── e2e/                         Kiểm thử giao diện bằng Playwright
│   ├── package.json                 Dependency và lệnh chạy frontend
│   └── vite.config.ts               Cấu hình Vite và proxy /api
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/vn/edu/library/
│   │   │   │   ├── LibraryApplication.java   Điểm khởi chạy Spring Boot
│   │   │   │   ├── controller/      Các endpoint REST API
│   │   │   │   ├── service/         Xử lý nghiệp vụ và transaction
│   │   │   │   ├── repository/      Truy cập database qua JPA
│   │   │   │   ├── domain/          Entity và enum nghiệp vụ
│   │   │   │   ├── dto/             Dữ liệu request/response
│   │   │   │   ├── security/        Đăng nhập, session và bảo mật
│   │   │   │   └── config/          Cấu hình ứng dụng
│   │   │   └── resources/
│   │   │       ├── application.yml  Cấu hình Spring Boot
│   │   │       ├── db/migration/    Migration database bằng Flyway
│   │   │       └── fonts/           Font tiếng Việt cho báo cáo PDF
│   │   └── test/java/vn/edu/library/
│   │       └── LibraryIntegrationTest.java   Kiểm thử tích hợp backend
│   └── pom.xml                      Dependency và cấu hình Maven
├── docs/                            Kiến trúc, quan hệ bảng, API, demo, kiểm chứng
├── scripts/                         Script chạy và kiểm thử trên Windows
├── .local/                          Database, cấu hình local, bản dự phòng (gitignore)
├── .tools/                          Maven, Mailpit, cache dependency (gitignore)
├── .env.example                     Mẫu biến môi trường
└── README.md                        Hướng dẫn dự án
```

Mã nguồn chính nằm trong [`frontend/src/`](frontend/src/) và [`backend/src/main/`](backend/src/main/). Luồng xử lý thông thường: giao diện React → lớp gọi API → Controller → Service → Repository → database.

Giao diện navy–kem–gold: [hướng dẫn component và theme](docs/UI.md). Trang giới thiệu tại `/home`, danh mục giữ nguyên `/`, dashboard Admin/Thủ thư tại `/dashboard`. Các trang nghiệp vụ cũ vẫn trong `pages/`; không di chuyển hoặc đổi phân tầng backend, migration, Entity hay hợp đồng API.

Sơ đồ tập trung vào các file và thư mục chính. `frontend/node_modules/` chứa thư viện đã cài; `frontend/dist/` và `backend/target/` là kết quả build tự sinh, không phải nơi sửa mã nguồn.

## Chạy trên máy Windows hiện tại

### Lấy dự án và chuẩn bị máy mới

```powershell
git clone https://github.com/VuNgNgocBao04/Website-University-Library-Management.git
cd Website-University-Library-Management
java -version
node --version
npm.cmd --version
```

Cài JDK 17, Node.js 22.12+ và MySQL Server 8.0 trước. Các script Windows hiện giả định MySQL nằm tại `C:\Program Files\MySQL\MySQL Server 8.0\bin` và JDK tại `C:\Program Files\Java\jdk-17`. Nếu khác đường dẫn, chỉnh `$bin` trong `scripts/start-mysql.ps1` và `JAVA_HOME` trong `.local/env.ps1` sau khi file được tạo; hoặc dùng mục **Môi trường tự cấu hình** bên dưới. Script setup-tools chỉ tải Maven, không cài Java, Node hay MySQL. Lần cài dependency đầu tiên cần Internet.

Máy clone mới không có `.local`, `.tools`, `node_modules` hoặc dữ liệu MySQL của máy tác giả. Chạy các bước dưới để tạo môi trường riêng; migration tự tạo bảng khi backend khởi động, profile local tạo dữ liệu mẫu khi bảng tài khoản rỗng.

Từ thư mục `project1`, chạy trong PowerShell:

```powershell
# Chỉ lần đầu nếu chưa tải Maven
powershell -ExecutionPolicy Bypass -File scripts/setup-tools.ps1

# MySQL riêng ở 127.0.0.1:3307, dữ liệu .local/mysql
powershell -ExecutionPolicy Bypass -File scripts/start-mysql.ps1

# SMTP local và hộp thư thử nghiệm
powershell -ExecutionPolicy Bypass -File scripts/setup-mailpit.ps1

# Giữ terminal backend mở
powershell -ExecutionPolicy Bypass -File scripts/run-backend.ps1
```

Terminal thứ hai:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

- Website: **http://127.0.0.1:5173**
- Backend: `http://127.0.0.1:8080/api`
- Hộp thư thử nghiệm: **http://127.0.0.1:8025**
- Vite proxy `/api`, gồm cookie và CSRF; dùng nhất quán một hostname.
- Script MySQL sinh mật khẩu ngẫu nhiên trong `.local/env.ps1`. Mở file để xem `DEMO_PASSWORD`. File này không được commit.
- MySQL local dùng root không mật khẩu để khởi tạo instance thử nghiệm bind loopback; ứng dụng dùng user `library` với mật khẩu ngẫu nhiên. Không dùng cấu hình root này cho production.

### Tài khoản local

| Username | Vai trò / loại | Mã |
| --- | --- | --- |
| admin | ADMIN | NV001 |
| librarian | LIBRARIAN | NV002 |
| student | READER / STUDENT | SV001 |
| lecturer | READER / LECTURER | GV001 |

Cả bốn dùng `DEMO_PASSWORD` trong `.local/env.ps1`. Không có mật khẩu thật trong Git. Seed chỉ chạy khi profile `local` và bảng users rỗng; không ghi đè dữ liệu đã có. Đổi biến DEMO_PASSWORD sau lần seed đầu không đổi mật khẩu đã lưu.

Seed có 6 đầu sách minh họa, 24 cuốn, 2 thể loại và phiếu 2 cuốn (quá hạn/sắp đến hạn). **2.000 VND/ngày là phí demo minh họa**, admin cấu hình mức thực tế. Migration khởi tạo phí bằng 0. Không bật profile local trong production.

## Môi trường tự cấu hình

1. Cài Java 17, Maven 3.9+, Node 22.12+ và MySQL 8.0+.
2. Tạo database utf8mb4 và user có quyền trên database này.
3. Export các biến theo [`.env.example`](.env.example). Spring **không tự đọc file .env**.
4. Backend: `cd backend`, `mvn spring-boot:run`. Khi seed lần đầu local: bật `SPRING_PROFILES_ACTIVE=local`, đặt `DEMO_PASSWORD` ít nhất 10 ký tự.
5. Frontend: `cd frontend`, `npm ci`, `npm run dev`.
6. Cấu hình SMTP thật hoặc Mailpit. SMTP lỗi trả HTTP 503, không báo gửi email thành công giả.

Production: bỏ profile local, dùng HTTPS và `COOKIE_SECURE=true`, secret qua môi trường, reverse proxy cùng origin. Nếu khác origin, cấu hình `FRONTEND_URL` chính xác; khác site còn cần điều chỉnh SameSite/HTTPS. Upload cần persistent storage. Cấp tài khoản quản trị ban đầu theo quy trình quản trị riêng; không bật dữ liệu demo trên hệ thống thật.

## Quyết định kỹ thuật và nghiệp vụ

- JPA **SINGLE_TABLE**: User trừu tượng, Admin/Librarian/Reader là lớp con riêng. Cột role đồng thời là discriminator, thuộc tính role chỉ đọc; CHECK constraint kiểm tra hồ sơ. Đổi vai trò giữ ID, cập nhật trường con và tăng authVersion để request sau của phiên cũ bị từ chối. Chặn đổi khi còn nghĩa vụ mượn mở.
- Lịch sử tham chiếu User để không mất khi đổi loại hồ sơ. Service kiểm tra Reader/Librarian khi tạo giao dịch. Không gộp Book–BookItem hoặc BorrowReceipt–BorrowDetail.
- ADMIN không lập phiếu/nhận trả/báo mất/thu phí. LIBRARIAN thực hiện giao dịch. Reader chỉ xem dữ liệu của mình.
- Session HttpOnly và CSRF session + token XOR mặc định Spring. Frontend lấy `/auth/csrf`, gửi X-CSRF-TOKEN, lấy lại sau login/logout. Không lưu credential trong localStorage.
- Mượn dùng READ_COMMITTED, khóa Reader trước khi đếm hạn mức, khóa Book theo ID rồi Item theo barcode; phối hợp xóa mềm. Bất kỳ lỗi nào rollback toàn bộ. Thu phí khóa Violation và unique idempotency key.
- Snapshot dueDate và fineRatePerDay từng detail. `lateDays = max(0, ceil((returnedAt − dueDate)/24 giờ))`, tiền VND dùng DECIMAL/BigDecimal. Cuốn chưa đóng hiển thị phí tạm tính. Đổi rule không thay đổi phiếu cũ.
- Sách mất không giả lập trả sách: item LOST, returnedAt trống, nghĩa vụ mở cho đến thao tác đóng mất có dấu vết. Khi đó dùng closedAt để chốt trễ hạn. RETURNED nghĩa là nghĩa vụ của phiếu đã đóng; không đồng nghĩa thu đủ tiền.
- Phí hỏng nhập cùng lý do khi trả; phí mất nhập khi báo mất. PaymentRecord lưu từng lần thu; không thu vượt nợ, retry giữ cùng key. Trạng thái vi phạm độc lập với nợ. Không tự khóa Reader do phí.
- Nhắc hạn mỗi giờ, lần đầu sau 30 giây, trước hạn mặc định 3 ngày. Unique dedupKey theo loại + detail; INSERT IGNORE chống trùng. Không nhắc cuốn đã đóng.
- DB lưu UTC, API ISO-8601, UI Asia/Ho_Chi_Minh. Báo cáo theo từ đầu ngày from đến đầu ngày sau to (exclusive). Số phiếu tách số lượt cuốn; phổ biến theo Book. Phí phát sinh theo Violation.createdAt, tiền thu theo Payment.paidAt; tổng nợ tính toàn bộ, không lấy chênh riêng trong kỳ. Quá hạn tại thời điểm tạo báo cáo.
- Report chỉ lưu metadata. PDF nhúng Noto Sans; CSV UTF-8 BOM và trung hòa ô có nguy cơ công thức.
- Pre-Order chỉ trang tĩnh, không có bảng/API/đặt chỗ/giỏ hàng.

## Kiểm thử và build

```powershell
# Database library_test riêng; không tác động library
powershell -ExecutionPolicy Bypass -File scripts/test-backend.ps1

# Kiểm thử và tạo backend/target/university-library-1.0.0.jar
powershell -ExecutionPolicy Bypass -File scripts/test-backend.ps1 -Package

# Tùy chọn: chạy JAR đã build thay cho Maven (dừng backend cũ trước)
powershell -ExecutionPolicy Bypass -File scripts/run-backend.ps1 -Jar

# Backend/frontend đang chạy; dùng Chrome trên máy
powershell -ExecutionPolicy Bypass -File scripts/test-frontend.ps1

cd frontend
npm.cmd run build
```

Môi trường khác: DB_URL phải trỏ database kết thúc `_test`, profile test, rồi `mvn test`. Test từ chối xóa fixture nếu database sai hậu tố. Không dùng database chứa dữ liệu cần giữ. E2E tạo dữ liệu tên có tiền tố E2E trong database local demo.

Định dạng mã từ gốc:

```powershell
node frontend/node_modules/prettier/bin/prettier.cjs --write "frontend/src/**/*.{ts,tsx,css}" "backend/src/**/*.java"
```

Xem [kiến trúc](docs/ARCHITECTURE.md), [API](docs/API.md), [demo](docs/DEMO.md), [kết quả kiểm chứng](docs/VERIFICATION.md).

## Số file, dữ liệu và những gì được đưa lên Git

Tại thời điểm chuẩn bị Git ngày 04/10/2026, bộ dự án có **135 file được Git theo dõi hoặc chưa bị bỏ qua**:

| Vị trí | Số file | Nội dung |
| --- | ---: | --- |
| `backend/` | 63 | Mã Java, cấu hình, migration, font PDF và kiểm thử |
| `frontend/` | 33 | React, cấu hình, package-lock và kiểm thử E2E |
| `docs/` | 19 | Tài liệu và bộ dữ liệu đã rà soát |
| `scripts/` | 12 | Khởi chạy, kiểm thử và xử lý dữ liệu |
| Thư mục gốc | 8 | README, LICENSE, cấu hình mẫu và tài liệu/dữ liệu đính kèm |

Đây là số file bàn giao, không phải số file tối thiểu cần để chạy. Tổng 20.124 file từng đếm trên máy bao gồm cả dependency, công cụ, database local và lịch sử Git; con số này thay đổi sau mỗi lần cài/build/chạy. Đếm lại các file thuộc bộ dự án bằng PowerShell:

```powershell
(git ls-files --cached --others --exclude-standard | Sort-Object -Unique | Measure-Object).Count
```

| Thư mục/file | Đưa lên Git? | Vai trò và cách tạo lại |
| --- | --- | --- |
| `frontend/src`, `backend/src`, cấu hình, lockfile, scripts, docs | Có | Bộ nguồn để phát triển, chạy và bàn giao |
| `frontend/node_modules/` | Không | Thư viện frontend; tạo lại bằng `npm ci` trong frontend |
| `frontend/dist/` | Không | Build giao diện; tạo lại bằng `npm run build` |
| `backend/target/` | Không | Class/JAR/kết quả test; Maven tạo lại |
| `.tools/` | Không | Maven, Mailpit và cache dependency dùng bởi script local |
| `.local/`, `.env`, `uploads/` | Không | Cấu hình riêng, database, bản sao lưu và ảnh đã tải lên; cần sao lưu riêng |
| `.git/` | Git tự quản lý | Lịch sử và cấu hình repository, không xóa để dọn file |
| `*.log`, `*.tmp`, kết quả Playwright, cache Python | Không | File sinh khi chạy; không phải mã kiểm thử |

Giữ `frontend/package-lock.json` để `npm ci` cài đúng phiên bản. Giữ `backend/src/test` và `frontend/e2e`: đây là mã kiểm thử cần bảo trì. Có thể dọn `target`, `dist` và kết quả test sau khi dừng tiến trình liên quan; xóa `node_modules` sẽ cần cài lại trước khi chạy frontend. Không xóa toàn bộ `.local` vì có thể mất database và bản sao lưu.

Dữ liệu Đại học Huế tại [docs/du_lieu_hue_da_lam_sach](docs/du_lieu_hue_da_lam_sach/DOC_TRUOC.md) có 240 bản nguồn: 137 đề xuất nhập, 71 cần kiểm tra, 13 trùng và 19 không chọn. **Chưa nhập bộ này vào MySQL.** Xem [báo cáo rà soát](docs/du_lieu_hue_da_lam_sach/BAO_CAO_RA_SOAT.md). File CSV nguồn được các script xử lý yêu cầu qua `--input`; đường dẫn `.local/...` trong ví dụ là dữ liệu riêng của máy tác giả, không có sẵn sau clone. File `bia_sach_dai_hoc_hue.zip`, danh mục Excel và `khungduan.docx` là tài liệu/dữ liệu bổ trợ, không bắt buộc để khởi chạy ứng dụng.

## Kiểm tra khi khởi chạy gặp lỗi

- **Không mở được web:** giữ terminal Vite đang chạy, mở đúng `http://127.0.0.1:5173`; kiểm tra đầu ra của `npm run dev` nếu cổng bị chiếm.
- **API không kết nối/502:** kiểm tra terminal backend và MySQL cổng 3307. Backend phải khởi động thành công trước khi đăng nhập.
- **Access denied từ MySQL:** kiểm tra DB_USER/DB_PASSWORD và đúng instance. Không xóa database để chữa lỗi mật khẩu.
- **Sai tài khoản/mật khẩu:** dùng tài khoản local trong bảng trên và mật khẩu đã seed. Sửa DEMO_PASSWORD không đổi mật khẩu tài khoản đã tồn tại; dùng đổi/quên mật khẩu của ứng dụng.
- **Lỗi 403 hoặc CSRF:** dùng cùng hostname cho trình duyệt và FRONTEND_URL, tải lại trang và đăng nhập lại. Không tắt CSRF.
- **Quên mật khẩu không gửi được email:** mở Mailpit cổng 8025, kiểm tra SMTP cổng 1025. Token reset nằm trong email, không được API trả trực tiếp.
- **Java không chạy:** kiểm tra JDK 17 và JAVA_HOME; lỗi extension Java của IDE cần xử lý riêng với lỗi build Maven.

Dừng Vite/backend chạy trong terminal bằng `Ctrl+C`. MySQL và Mailpit do script khởi chạy nền vẫn tiếp tục chạy; đóng terminal không tự dừng hai dịch vụ này. Sao lưu database và uploads trước khi chuyển máy. Không sao chép secret lên Git.

## Cập nhật mã nguồn lên GitHub

Từ thư mục gốc, kiểm tra thay đổi và các file bị bỏ qua trước khi commit:

```powershell
git status --short
git diff --check
git add README.md .gitignore .env.example .prettierrc.json backend frontend docs scripts
# Thêm riêng các tài liệu/dữ liệu gốc muốn bàn giao nếu chưa được theo dõi.
git diff --cached --stat
git commit -m "Update library project and documentation"
git push origin main
```

Không dùng `git add -f` cho `.local`, secret hoặc thư viện đã bỏ qua. Git chỉ lưu mã/tài liệu được commit, không tự đồng bộ database MySQL hay triển khai website. Nếu remote có commit mới, fetch và xử lý khác biệt trước; không force-push để ghi đè lịch sử người khác.
