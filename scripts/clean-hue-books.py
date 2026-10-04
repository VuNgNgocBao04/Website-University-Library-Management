"""Clean the local Hue bibliography; never connect to or modify the database."""
import argparse,csv,json,re,unicodedata,hashlib
from pathlib import Path
from collections import defaultdict,Counter
parser=argparse.ArgumentParser();parser.add_argument('--input',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);parser.add_argument('--enrichment',type=Path);args=parser.parse_args()
source=list(csv.DictReader(args.input.open(encoding='utf-8-sig')))
source_hash=hashlib.sha256(args.input.read_bytes()).hexdigest()
enrichment=json.loads(args.enrichment.read_text(encoding='utf8')) if args.enrichment else {}
assert len(source)==240 and len({r['source_id'] for r in source})==240
def norm(s):return re.sub(r'\s+',' ',unicodedata.normalize('NFC',s or '')).strip()
def key(s):
    s=unicodedata.normalize('NFD',norm(s).casefold()).replace('đ','d')
    return ''.join(c for c in s if unicodedata.category(c)!='Mn')
def titlekey(s):return ''.join(c for c in re.sub(r'^giao trinh\s*','',key(s)) if c.isalnum())
def isbn(s):return re.sub(r'[^0-9X]','',re.sub(r'(?i)isbn(?:-1[03])?\s*:?', '', s).upper())
def valid(s):
    if len(s)==13 and s.isdigit():return s.startswith(('978','979')) and sum(int(c)*(1 if i%2==0 else 3) for i,c in enumerate(s))%10==0
    if len(s)==10 and s[:9].isdigit() and (s[-1].isdigit() or s[-1]=='X'):return sum((10-i)*(10 if c=='X' else int(c)) for i,c in enumerate(s))%11==0
    return False
def isbn13(s):
    if len(s)!=10:return s
    stem='978'+s[:9];return stem+str((-sum(int(c)*(1 if i%2==0 else 3) for i,c in enumerate(stem)))%10)
def category(subject,title):
    s=key(subject);t=key(title)
    rules=[('Luật học',['phap luat','luat hoc','toi pham']),('Công nghệ thông tin',['may tinh','thong tin']),('Toán học và thống kê',['toan hoc','thong ke']),('Y dược và sức khỏe',['y hoc','y te','duoc','benh','dieu duong','dieu tri','than kinh','tim mach','nhi khoa','ngoai khoa','nha khoa','mien dich','dinh duong','dich te','da lieu','cham soc suc khoe']),('Nông nghiệp và thú y',['nong nghiep','thu y','chan nuoi','thuy san','lam nghiep','bao ve thuc vat','cay luong thuc','dong vat nuoi','nong hoa']),('Kinh tế và quản trị',['kinh te va kinh doanh','kinh doanh va quan ly']),('Giáo dục học',['giao duc']),('Ngôn ngữ và văn học',['ngon ngu','van hoc']),('Kỹ thuật và công nghệ',['ky thuat']),('Toán học và thống kê',['toan']),('Vật lý',['vat ly']),('Hóa học',['hoa hoc','hoa huu co','hoa ly','hoa phan tich']),('Sinh học',['sinh hoc']),('Địa lý và môi trường',['moi truong','trai dat','dia ly','dia hoa','thuy van','trac dia']),('Khoa học chính trị',['chinh tri']),('Lịch sử và văn hóa',['lich su']),('Khoa học xã hội và nhân văn',['xa hoi','nhan van'])]
    # Match complete words: "hoa hoc" must never match "khoa hoc".
    def matches(terms):
        return any(re.search(r'(?<!\w)'+re.escape(term)+r'(?!\w)',s) for term in terms)
    if matches(['thu y','chan nuoi','thuy san']):return 'Nông nghiệp và thú y'
    if matches(['tam than hoc']):return 'Y dược và sức khỏe'
    if matches(['dia hoa hoc']):return 'Địa lý và môi trường'
    if matches(['ky thuat dien','ky thuat thong tin']):return 'Kỹ thuật và công nghệ'
    for name,terms in rules:
        if matches(terms):return name
    if 'khoa hoc tu nhien' in s:return 'Khoa học tự nhiên'
    return 'Chưa phân loại'
# Exclude direct school textbooks/lesson plans, not teacher-training university texts.
excluded_ids={'6078','5659','5658','5660','5752','5731','5730','5259','5260','5271','4874','4851','4854','4853','4852','4875','5449','5291','5638'}
corrections={'6020':'Giáo trình Dữ liệu Liên kết','5443':'Cognitive Development and English Language Education for Young Language Learners'}
records=[]
for src in source:
    r={k:norm(v) for k,v in src.items()};r['original_title']=src['title'];r['original_author']=src['author'];r['original_subject']=src['subject'];r['original_publisher']=src['publisher']
    r['original_isbn_raw']=src['isbn_raw'];r['original_publication_year']=src['publication_year']
    review=enrichment.get(r['source_id'],{})
    for field,value in review.get('updates',{}).items():
        assert field in {'title','author','publisher','isbn_raw','publication_year'},field
        assert review.get('sources'), 'Every correction needs evidence'
        r[field]=norm(value)
    r['research_status']=review.get('research_status','NOT_REVIEWED')
    r['research_sources']='; '.join(review.get('sources',[]))
    r['research_notes']=review.get('notes','')
    changes=[]
    if r['source_id'] in corrections:r['title']=corrections[r['source_id']];changes.append('Sửa lỗi gõ theo bản ghi trùng/ảnh trang tên đã đối chiếu')
    if 'Sources and related content' in r['title']:r['title']=r['title'].replace('Sources and related content','').strip();changes.append('Bỏ chuỗi rác Sources and related content')
    r['author']=re.sub(r'\s*,\s*',', ',r['author']);r['author']=re.sub(r'(?<=\w)\(', ' (',r['author'])
    r['publisher']=re.sub(r'(?i)^nhà xuất bản\s+','NXB ',r['publisher'])
    raw=r['isbn_raw'];candidate=isbn(raw)
    if not candidate:
        m=re.search(r'ISBN\s*[:：]?\s*([0-9Xx -]{10,})',r['title'],re.I)
        if m:
            candidate=isbn(m[1]);changes.append('Lấy ISBN ghi rõ trong nhan đề nguồn')
            r['title']=re.sub(r',?\s*ISBN\s*[:：]?\s*[0-9Xx -]{10,}','',r['title'],flags=re.I).strip()
    r['isbn_normalized']=candidate;r['isbn_status']='VALID' if valid(candidate) else ('INVALID' if candidate else 'MISSING')
    r['original_isbn_checksum_valid']=src.get('isbn_checksum_valid','')
    r['isbn_checksum_valid']='true' if valid(candidate) else 'false'
    r['isbn']=isbn13(candidate) if valid(candidate) else ''
    r['category']=category(r['subject'],r['title'])
    r['scope']='EXCLUDE' if r['source_id'] in excluded_ids else 'UNIVERSITY_CANDIDATE'
    r['language_note']='Ưu tiên tiếng Việt; ngôn ngữ ấn bản chưa được xác minh'
    r['issues']=[]
    if r['isbn_status']!='VALID':r['issues'].append('ISBN_'+r['isbn_status'])
    for field in ['author','publisher']:
        if not r[field]:r['issues'].append('MISSING_'+field.upper())
    if not r['publication_year'].isdigit() or not 1000<=int(r['publication_year'])<=2026:r['issues'].append('INVALID_YEAR')
    for f in ['title','author','publisher']:
        if len(r[f])>255:r['issues'].append('TOO_LONG_'+f.upper())
    if r['category']=='Chưa phân loại':r['issues'].append('CATEGORY_REVIEW')
    # Already observed discrepancy between bibliography and attached title page.
    if r['source_id'] in ['5042','5231']:r['issues'].append('EDITION_YEAR_REVIEW')
    r['normalization_notes']='; '.join(changes);r['duplicate_of']='';r['related_source_ids']=r['source_id'];records.append(r)
groups=defaultdict(list)
for r in records:
    if r['isbn']:groups[r['isbn']].append(r)
for value,group in groups.items():
    if len(group)<2:continue
    related=';'.join(r['source_id'] for r in group)
    for r in group:r['related_source_ids']=related
    same=len({(titlekey(r['title']),r['publication_year'],key(r['publisher'])) for r in group})==1
    if same:
        canonical=min(group,key=lambda r:(-len(r['author']),len(r['issues']),int(r['source_id'])))
        if len({key(r['author']) for r in group})>1:
            canonical['issues'].append('AUTHOR_METADATA_REVIEW')
        for r in group:
            if r is not canonical:r['duplicate_of']=canonical['source_id']
    else:
        for r in group:r['issues'].append('ISBN_METADATA_CONFLICT')
# Similar titles without a shared valid ISBN remain pending; no invented edition merges.
titles=defaultdict(list)
for r in records:
    if not r['duplicate_of']:titles[(titlekey(r['title']),r['publication_year'])].append(r)
for group in titles.values():
    if len(group)>1 and len({r['isbn'] or r['source_id'] for r in group})>1:
        for r in group:r['issues'].append('POSSIBLE_DUPLICATE_TITLE')
for r in records:
    review=enrichment.get(r['source_id'],{})
    resolved=set(review.get('resolved_issues',[]))
    assert not resolved or review.get('sources'), 'Clearing issues requires evidence'
    # Never waive hard ISBN/length validation using a review annotation.
    assert not any(x.startswith(('ISBN_MISSING','ISBN_INVALID','TOO_LONG','MISSING_')) for x in resolved)
    r['issues']=[x for x in r['issues'] if x not in resolved]+review.get('additional_issues',[])
    r['status']='EXCLUDED' if r['scope']=='EXCLUDE' else 'DUPLICATE' if r['duplicate_of'] else 'REVIEW' if r['issues'] else 'READY'
    r['decision_reason']=('Tài liệu phổ thông/giáo án phổ thông hoặc chương sách, bài trong kỷ yếu; không chọn làm đầu sách đại học độc lập.' if r['status']=='EXCLUDED' else 'Trùng ISBN hợp lệ, nhan đề chuẩn hóa, năm và nhà xuất bản; giữ nguồn liên quan để truy vết, kiểm tra khác biệt tác giả ở dòng đại diện.' if r['status']=='DUPLICATE' else 'Cần kiểm tra: '+', '.join(r['issues']) if r['issues'] else 'Đạt kiểm tra định dạng và tiêu chí tuyển chọn; chưa xác minh thực tế mọi ấn bản.')
    r['issues']=';'.join(sorted(set(r['issues'])))
out=args.output;out.mkdir(parents=True,exist_ok=True)
def write(name,rows):
    with (out/name).open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(records[0]));w.writeheader();w.writerows(rows)
write('tat_ca_240_da_chuan_hoa.csv',records)
for status,name in [('READY','sach_de_xuat_nhap.csv'),('REVIEW','can_kiem_tra.csv'),('DUPLICATE','ban_ghi_trung.csv'),('EXCLUDED','khong_chon.csv')]:write(name,[r for r in records if r['status']==status])
mapping=sorted({(r['original_subject'],r['category']) for r in records})
with (out/'anh_xa_the_loai.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.writer(f);w.writerow(['linh_vuc_goc','the_loai_chuan']);w.writerows(mapping)
counts=dict(Counter(r['status'] for r in records));quality=dict(Counter(r['isbn_status'] for r in records))
report={'input_rows':len(source),'source_sha256':source_hash,'counts':counts,'isbn_status':quality,'categories':dict(Counter(r['category'] for r in records)),'researched_rows':len(enrichment),'database_modified':False}
(out/'bao_cao.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
(out/'DOC_TRUOC.md').write_text(f'''# Dữ liệu Đại học Huế đã làm sạch

Nguồn: bộ CSV 240 bản ghi đã tải. Không sửa file gốc và chưa nhập MySQL.

Phân loại: {counts}. Kiểm tra ISBN: {quality}.

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
''',encoding='utf8')
ready=[r for r in records if r['status']=='READY']
assert sum(counts.values())==240
assert len({r['isbn'] for r in ready})==len(ready)
assert all(valid(r['isbn']) and r['category']!='Chưa phân loại' for r in ready)
assert all(r['source_id']!=r['duplicate_of'] for r in records)
assert hashlib.sha256(args.input.read_bytes()).hexdigest()==report['source_sha256']
print(json.dumps(report,ensure_ascii=False,indent=2))
