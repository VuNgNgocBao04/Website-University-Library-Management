# Dữ liệu Đại học Huế đã làm sạch

Nguồn: bộ CSV 240 bản ghi đã tải. Không sửa file gốc và chưa nhập MySQL.

Phân loại: {'READY': 137, 'REVIEW': 71, 'DUPLICATE': 13, 'EXCLUDED': 19}. Kiểm tra ISBN: {'VALID': 175, 'MISSING': 63, 'INVALID': 2}.

- `tat_ca_240_da_chuan_hoa.csv`: đủ 240 dòng và source_id gốc để ghép bìa.
- `sach_de_xuat_nhap.csv`: đạt kiểm tra kỹ thuật, ISBN hợp lệ, không có xung đột đã phát hiện. Đây là đề xuất, không khẳng định mọi thông tin nguồn chính xác.
- `can_kiem_tra.csv`: thiếu/sai ISBN, thiếu nhà xuất bản, nghi trùng hoặc mâu thuẫn ấn bản. Không bịa ISBN, không sửa checksum bằng cách đoán.
- `ban_ghi_trung.csv`: giữ duplicate_of và nguồn gốc; không xóa mất bản ghi nguồn.
- `khong_chon.csv`: sách/giáo án phổ thông và chương sách/bài kỷ yếu; vẫn lưu để xem lại. Sách phương pháp giảng dạy dành cho sinh viên sư phạm không bị loại chỉ vì có từ tiểu học/mầm non.
- `anh_xa_the_loai.csv`: lĩnh vực gốc → thể loại thống nhất; phân loại chủ yếu theo lĩnh vực công bố tại nguồn.

Chuẩn hóa Unicode NFC, khoảng trắng, dấu phẩy tên tác giả, tiền tố NXB; giữ nguyên tên riêng và chữ viết tắt. Chỉ sửa hai lỗi gõ có đối chiếu, bỏ chuỗi rác trong nhan đề. ISBN-10 hợp lệ được quy đổi ISBN-13, kiểm tra checksum và tiền tố 978/979. Bản ghi trùng ISBN + tên + năm được giữ một dòng đầy đủ hơn; khác năm/tên được đưa ra kiểm tra. Tác giả của các bản ghi trùng vẫn được giữ trong bảng đầy đủ để rà soát, không tự cộng hoặc đoán tác giả.

Điều kiện gộp còn yêu cầu nhà xuất bản khớp nhau. Dòng đại diện ưu tiên danh sách tác giả đầy đủ nhất; nếu tác giả khác nhau giữa các nguồn, dòng đại diện mang cờ `AUTHOR_METADATA_REVIEW` và nằm trong danh sách cần kiểm tra. Không rút ngắn tác giả để vượt giới hạn cột database; trường quá dài cũng phải kiểm tra trước khi nhập.

Số lượng đầu sách đạt chuẩn nhỏ hơn 240 là bình thường. Ưu tiên tiếng Việt nhưng giữ giáo trình ngoại ngữ phù hợp đại học; chưa xác minh ngôn ngữ thực tế từng ấn bản. Chưa tái xác minh quyền sử dụng nguồn. Không nhập ảnh bìa trong bước này.

Tra cứu bổ sung được ghi trong `bo_sung_da_xac_minh.json`; mỗi dòng có nguồn, ghi chú và các trường được sửa. Bản gốc ISBN/năm/tác giả luôn được giữ. Trạng thái READY vẫn là đạt kiểm tra kỹ thuật, không phải cam kết mọi thông tin nguồn đều chính xác.

Xem [báo cáo rà soát 93 bản](BAO_CAO_RA_SOAT.md) và [thay đổi từng trường](thay_doi_tung_truong.csv). `isbn_checksum_valid` được tính lại sau bổ sung; giá trị nguồn được giữ tại `original_isbn_checksum_valid`.

Chạy lại: `python scripts/clean-hue-books.py --input <CSV-gốc> --output docs/du_lieu_hue_da_lam_sach --enrichment docs/du_lieu_hue_da_lam_sach/bo_sung_da_xac_minh.json`.
