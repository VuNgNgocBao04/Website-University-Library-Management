"""Read public Hue record pages and bibliography attachments; never write MySQL.

Evidence cache is local. Extracted candidates require human review before applying.
Uses requests, beautifulsoup4 and the existing local pypdfium2 installation.
"""
import csv, json, re, sys, hashlib
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urljoin, quote
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.local/pdf-cover-tools'))
import pypdfium2 as pdfium
CACHE = ROOT / '.local/hue-research'
CACHE.mkdir(exist_ok=True)
baseline = CACHE / 'review-93-original.csv'
if not baseline.exists():
    baseline.write_bytes((ROOT / 'docs/du_lieu_hue_da_lam_sach/can_kiem_tra.csv').read_bytes())
rows = list(csv.DictReader(baseline.open(encoding='utf-8-sig')))

def fetch(url, dest):
    if dest.exists(): return dest.read_bytes()
    with requests.get(url, timeout=(10, 25), stream=True) as response:
        response.raise_for_status()
        data = bytearray()
        for chunk in response.iter_content(65536):
            data.extend(chunk)
            if len(data) > 25 * 1024 * 1024: raise ValueError('Attachment exceeds 25 MiB')
    dest.write_bytes(data)
    return bytes(data)

def research(row):
    sid = row['source_id']
    result = {'source_id': sid, 'title': row['title'], 'source_url': row['source_url'], 'attachments': [], 'errors': []}
    try:
        html = fetch(row['source_url'], CACHE / (sid + '.html')).decode('utf-8', errors='replace')
        soup = BeautifulSoup(html, 'html.parser')
        tables = '\n'.join(t.get_text(' ', strip=True) for t in soup.select('table'))
        (CACHE / (sid + '-record.txt')).write_text(tables, encoding='utf8')
        result['record_text'] = tables
        urls = list(dict.fromkeys(urljoin(row['source_url'], a['href']) for a in soup.select('a[href]') if re.search(r'\.(pdf|jpg|png|jpeg)(?:$|\?)', a['href'], re.I)))
        for url in urls:
            if not url.lower().endswith('.pdf'): continue
            name = sid + '-' + hashlib.sha256(url.encode()).hexdigest()[:10]
            item = {'url': url}
            try:
                data = fetch(url, CACHE / (name + '.pdf'))
                doc = pdfium.PdfDocument(data)
                pages = list(dict.fromkeys(list(range(min(6,len(doc)))) + list(range(max(0,len(doc)-6),len(doc)))))
                text = ''
                for index in pages:
                    page = doc[index]; tp = page.get_textpage()
                    text += '\n--- PAGE '+str(index+1)+' ---\n'+tp.get_text_range()
                    tp.close();page.close()
                item['pages'] = len(doc);doc.close()
                (CACHE / (name + '.txt')).write_text(text,encoding='utf8')
                item['text_file'] = name + '.txt'
                item['isbn_lines'] = [line.strip() for line in text.splitlines() if re.search(r'ISBN|97[89][\d\s-]{9,}',line,re.I)]
            except Exception as exc: item['error'] = str(exc)[:200]
            result['attachments'].append(item)
    except Exception as exc: result['errors'].append(str(exc)[:200])
    (CACHE / (sid + '.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    print(sid, 'PDFs', len(result['attachments']), 'errors', len(result['errors']), flush=True)
    return result

if __name__ == '__main__':
    if '--nlv' in sys.argv:
        import time
        def lookup(row):
            sid=row['source_id'];fallback='--nlv-fallback' in sys.argv;targeted='--nlv-targeted' in sys.argv
            target=CACHE/(('nlv-target-' if targeted else 'nlv-alt-' if fallback else 'nlv-')+sid+'.json')
            if target.exists():
                cached=json.loads(target.read_text(encoding='utf8'))
                if not cached.get('error'):return cached
            query=re.sub(r'\s*\(.*','',row['title']).strip()
            search_by=None
            if fallback or targeted:
                queries=json.loads((CACHE/('query-targets.json' if targeted else 'query-overrides.json')).read_text(encoding='utf8'))
                if sid not in queries:return {'source_id':sid,'skipped':True}
                if isinstance(queries[sid],list):search_by=queries[sid];query=json.dumps(search_by,ensure_ascii=False)
                else:query=queries[sid]
            request={'type':'basic','page':1,'pageSize':10,'hasFacetFilter':False,'request':{'searchBy':search_by or [['ti',query]],'sortBy':[['year_pub','desc']],'filterBy':[]}}
            url='https://opac.nlv.gov.vn/tim-kiem?data='+quote(json.dumps(request,ensure_ascii=False))
            result={'source_id':sid,'query':query,'search_url':url,'candidates':[]}
            try:
                session=requests.Session()
                landing=session.get(url,timeout=(10,25));landing.raise_for_status()
                token=BeautifulSoup(landing.text,'html.parser').select_one('#requestVerificationToken')['value']
                response=session.post('https://opac.nlv.gov.vn/Search',json=request,headers={'RequestVerificationToken':token,'Referer':url},timeout=(10,30));response.raise_for_status()
                (CACHE/(target.stem+'-search.html')).write_text(response.text,encoding='utf8')
                soup=BeautifulSoup(response.text,'html.parser')
                links=list(dict.fromkeys(urljoin(url,a['href']).split('?')[0] for a in soup.select('a[href]') if '/chi-tiet-tai-lieu/' in a['href']))
                for index,link in enumerate(links[:5]):
                    # Cache by URL, not result index: fallback queries have different ordering.
                    html=fetch(link,CACHE/('nlv-detail-'+hashlib.sha256(link.encode()).hexdigest()[:16]+'.html')).decode('utf8',errors='replace')
                    detail=BeautifulSoup(html,'html.parser')
                    for tag in detail(['script','style']):tag.decompose()
                    text=detail.get_text(' ',strip=True)
                    result['candidates'].append({'url':link,'text':text})
                time.sleep(.25)
            except Exception as exc:result['error']=str(exc)[:200]
            target.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
            print(sid,'NLV candidates',len(result['candidates']),result.get('error',''),flush=True)
            return result
        selected=rows[:3] if '--sample' in sys.argv else rows
        with ThreadPoolExecutor(max_workers=2) as pool:found=list(pool.map(lookup,selected))
        (CACHE/('nlv-target-results.json' if '--nlv-targeted' in sys.argv else 'nlv-alt-results.json' if '--nlv-fallback' in sys.argv else 'nlv-results.json')).write_text(json.dumps(found,ensure_ascii=False,indent=2),encoding='utf8');sys.exit()
    if '--render' in sys.argv:
        from PIL import Image, ImageDraw
        entries=[]
        for f in CACHE.glob('*.pdf'):
            doc=pdfium.PdfDocument(f)
            for i in sorted(set([0, min(1,len(doc)-1), len(doc)-1])):
                im=doc[i].render(scale=1.8).to_pil().convert('RGB')
                im.save(CACHE/(f.stem+'-p'+str(i+1)+'.jpg'))
                entries.append((f.stem[:4]+' p'+str(i+1),im))
            doc.close()
        for start in range(0,len(entries),12):
            batch=entries[start:start+12];sheet=Image.new('RGB',(1600,460*((len(batch)+3)//4)),'white');draw=ImageDraw.Draw(sheet)
            for n,(label,im) in enumerate(batch):
                im.thumbnail((390,420));sheet.paste(im,(n%4*400,n//4*460));draw.text((n%4*400+5,n//4*460+425),label,fill='black')
            sheet.save(CACHE/('contact-'+str(start//12)+'.jpg'))
        print('Rendered',len(entries));sys.exit()
    if '--sources' in sys.argv:
        manifest=json.loads((CACHE/'external-urls.json').read_text(encoding='utf8'))
        for name,url in manifest.items():
            try:
                data=fetch(url,CACHE/(name+('.pdf' if '.pdf' in url else '.html')))
                if data.startswith(b'%PDF'):
                    doc=pdfium.PdfDocument(data);parts=[]
                    for i in range(len(doc)):
                        page=doc[i];tp=page.get_textpage();parts.append('\nPAGE '+str(i+1)+'\n'+tp.get_text_range());tp.close();page.close()
                    doc.close();text='\n'.join(parts)
                else:
                    soup=BeautifulSoup(data.decode('utf8',errors='replace'),'html.parser')
                    for tag in soup(['script','style']):tag.decompose()
                    text=soup.get_text(' ',strip=True)
                (CACHE/(name+'.txt')).write_text(text,encoding='utf8');print(name,len(text),flush=True)
            except Exception as exc:print(name,'ERROR',str(exc)[:150],flush=True)
        sys.exit()
    with ThreadPoolExecutor(max_workers=3) as pool: results = list(pool.map(research, rows))
    (CACHE / 'results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
    print('Researched records:',len(results))
