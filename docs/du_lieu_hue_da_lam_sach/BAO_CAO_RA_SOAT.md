# Kết quả rà soát 93 bản ghi — 03/10/2026

Đã tra nguồn Đại học Huế, các tệp đính kèm và mục lục thư viện. Chưa nhập MySQL; không thay đổi frontend/backend.

## Kết quả

- Trong 93 bản ban đầu: 18 bản đạt kiểm tra, 4 bản được liên kết với bản trùng, 71 bản vẫn cần kiểm tra.
- Có 27 bản được bổ sung/đính chính trường dữ liệu, tổng cộng 34 thay đổi. Một số bản đã bổ sung vẫn còn vấn đề khác.
- Toàn bộ 240 dòng: 137 đề xuất nhập, 71 cần kiểm tra, 13 trùng, 19 không chọn.
- ISBN hợp lệ: 175; thiếu: 63; sai: 2. Số này bao gồm cả dòng trùng/không chọn.

## Xem chi tiết

- [Kết quả từng bản trong 93 bản](ket_qua_ra_soat_93.csv).
- [Thay đổi từng trường trước–sau, kèm nguồn](thay_doi_tung_truong.csv).
- [Bằng chứng và truy vấn đã thực hiện](bo_sung_da_xac_minh.json).
- [Danh sách đề xuất nhập](sach_de_xuat_nhap.csv).
- [Danh sách còn vướng](can_kiem_tra.csv).

## Giới hạn và bước tiếp theo

Không lấy ISBN của bản tái bản khác để lấp chỗ trống; không đoán ISBN từ checksum. Chưa xác minh được không có nghĩa là sách không có ISBN. Các truy vấn lỗi hoặc không trả kết quả được giữ trong nhật ký, không coi là bằng chứng không tồn tại.

Các cờ còn lại (một bản có thể có nhiều cờ):

- `ISBN_MISSING`: 47 bản.
- `EDITION_YEAR_REVIEW`: 16 bản.
- `MISSING_PUBLISHER`: 12 bản.
- `POSSIBLE_DUPLICATE_TITLE`: 10 bản.
- `TOO_LONG_AUTHOR`: 7 bản.
- `AUTHOR_METADATA_REVIEW`: 6 bản.
- `INTERNAL_TEACHING_MATERIAL`: 3 bản.
- `ISBN_METADATA_CONFLICT`: 3 bản.
- `MISSING_AUTHOR`: 2 bản.
- `ISBN_INVALID`: 1 bản.

Cần trang bản quyền cho các bản chưa rõ ISBN/năm; bài giảng nội bộ có thể không có ISBN. Danh sách tác giả dài được giữ đầy đủ, cần thống nhất cách lưu trước khi nhập. Chưa thay đổi cấu trúc database để giải quyết những trường hợp này.

Kiểm chứng đã chạy: đủ 240 source_id, giữ nguyên các trường gốc, checksum và tính duy nhất ISBN trong danh sách đề xuất, liên kết bản trùng hợp lệ, giới hạn trường bắt buộc và mã băm file nguồn. READY chỉ là đạt các kiểm tra hiện có, không phải xác minh toàn bộ ấn bản thực tế.

Chạy kiểm tra và tạo lại báo cáo:

```powershell
python scripts/audit-hue-enrichment.py --input .local/hue-books-data/giao_trinh_dai_hoc_hue_mau.csv
```
