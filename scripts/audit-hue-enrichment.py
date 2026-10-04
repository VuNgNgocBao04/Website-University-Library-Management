"""Validate bibliography enrichment and produce a reviewable audit; no DB access."""
import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--input', type=Path, required=True)
parser.add_argument('--output', type=Path, default=Path('docs/du_lieu_hue_da_lam_sach'))
args = parser.parse_args()

def read(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))

def write(name, rows):
    with (args.output / name).open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)

source = {r['source_id']: r for r in read(args.input)}
rows = read(args.output / 'tat_ca_240_da_chuan_hoa.csv')
current = {r['source_id']: r for r in rows}
reviews = json.loads((args.output / 'bo_sung_da_xac_minh.json').read_text(encoding='utf8'))
report = json.loads((args.output / 'bao_cao.json').read_text(encoding='utf8'))
assert len(rows) == len(current) == len(source) == 240
assert set(current) == set(source)
assert len(reviews) == 93 and set(reviews) <= set(source)
assert hashlib.sha256(args.input.read_bytes()).hexdigest() == report['source_sha256']
for sid, row in current.items():
    for field in ('title', 'author', 'publisher', 'isbn_raw', 'publication_year', 'subject'):
        assert row['original_' + field] == source[sid][field], (sid, field)
    if row['duplicate_of']:
        parent = current[row['duplicate_of']]
        assert not parent['duplicate_of'] and parent['isbn'] == row['isbn']
ready = [r for r in rows if r['status'] == 'READY']
assert len({r['isbn'] for r in ready}) == len(ready)
for row in ready:
    number = row['isbn']
    assert len(number) == 13 and number.startswith(('978', '979'))
    assert sum(int(c) * (1 if i % 2 == 0 else 3) for i, c in enumerate(number)) % 10 == 0
    assert not row['issues']
    assert all(0 < len(row[f]) <= 255 for f in ('title', 'author', 'publisher'))

changes, outcomes = [], []
for sid, review in reviews.items():
    row = current[sid]
    assert review['sources'] and review['notes']
    for field, value in review['updates'].items():
        changes.append(dict(source_id=sid, field=field, before=source[sid][field],
                            verified_value=value, output_value=row[field],
                            sources='; '.join(review['sources']), notes=review['notes']))
    outcomes.append(dict(source_id=sid, title=row['title'], before_status='REVIEW',
                         after_status=row['status'], before_issues=review['before_issues'],
                         remaining_issues=row['issues'], duplicate_of=row['duplicate_of'],
                         updated_fields='; '.join(review['updates']),
                         sources='; '.join(review['sources']), notes=review['notes']))
write('thay_doi_tung_truong.csv', changes)
write('ket_qua_ra_soat_93.csv', outcomes)
counts = Counter(r['after_status'] for r in outcomes)
issues = Counter(issue for r in outcomes if r['after_status'] == 'REVIEW'
                 for issue in r['remaining_issues'].split(';') if issue)
text = f'''# Kết quả rà soát 93 bản ghi — 03/10/2026

Đã tra nguồn Đại học Huế, các tệp đính kèm và mục lục thư viện. Chưa nhập MySQL; không thay đổi frontend/backend.

## Kết quả

- Trong 93 bản ban đầu: {counts.get('READY', 0)} bản đạt kiểm tra, {counts.get('DUPLICATE', 0)} bản được liên kết với bản trùng, {counts.get('REVIEW', 0)} bản vẫn cần kiểm tra.
- Có {sum(bool(r['updates']) for r in reviews.values())} bản được bổ sung/đính chính trường dữ liệu, tổng cộng {len(changes)} thay đổi. Một số bản đã bổ sung vẫn còn vấn đề khác.
- Toàn bộ 240 dòng: {report['counts']['READY']} đề xuất nhập, {report['counts']['REVIEW']} cần kiểm tra, {report['counts']['DUPLICATE']} trùng, {report['counts']['EXCLUDED']} không chọn.
- ISBN hợp lệ: {report['isbn_status']['VALID']}; thiếu: {report['isbn_status']['MISSING']}; sai: {report['isbn_status']['INVALID']}. Số này bao gồm cả dòng trùng/không chọn.

## Xem chi tiết

- [Kết quả từng bản trong 93 bản](ket_qua_ra_soat_93.csv).
- [Thay đổi từng trường trước–sau, kèm nguồn](thay_doi_tung_truong.csv).
- [Bằng chứng và truy vấn đã thực hiện](bo_sung_da_xac_minh.json).
- [Danh sách đề xuất nhập](sach_de_xuat_nhap.csv).
- [Danh sách còn vướng](can_kiem_tra.csv).

## Giới hạn và bước tiếp theo

Không lấy ISBN của bản tái bản khác để lấp chỗ trống; không đoán ISBN từ checksum. Chưa xác minh được không có nghĩa là sách không có ISBN. Các truy vấn lỗi hoặc không trả kết quả được giữ trong nhật ký, không coi là bằng chứng không tồn tại.

Các cờ còn lại (một bản có thể có nhiều cờ):

'''
text += '\n'.join(f'- `{key}`: {value} bản.' for key, value in issues.most_common())
text += '''

Cần trang bản quyền cho các bản chưa rõ ISBN/năm; bài giảng nội bộ có thể không có ISBN. Danh sách tác giả dài được giữ đầy đủ, cần thống nhất cách lưu trước khi nhập. Chưa thay đổi cấu trúc database để giải quyết những trường hợp này.

Kiểm chứng đã chạy: đủ 240 source_id, giữ nguyên các trường gốc, checksum và tính duy nhất ISBN trong danh sách đề xuất, liên kết bản trùng hợp lệ, giới hạn trường bắt buộc và mã băm file nguồn. READY chỉ là đạt các kiểm tra hiện có, không phải xác minh toàn bộ ấn bản thực tế.

Chạy kiểm tra và tạo lại báo cáo:

```powershell
python scripts/audit-hue-enrichment.py --input .local/hue-books-data/giao_trinh_dai_hoc_hue_mau.csv
```
'''
(args.output / 'BAO_CAO_RA_SOAT.md').write_text(text, encoding='utf8')
print(json.dumps({'reviewed_outcomes': counts, 'field_changes': len(changes), 'validation': 'passed'}, ensure_ascii=False))
