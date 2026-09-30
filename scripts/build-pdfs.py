"""Build the synthetic PDF corpus and render matching previews. Requires reportlab, PyMuPDF and Pillow."""
import json, pathlib, textwrap
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
import fitz
from PIL import Image, ImageEnhance

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / 'fixtures/sample.json').read_text(encoding='utf-8'))
OUT = ROOT / 'public/samples'
(OUT / 'previews').mkdir(parents=True, exist_ok=True)
W, H = 595, 842

def text(c,x,y,value,size=10,color='#475f56',bold=False):
    c.setFont('Helvetica-Bold' if bold else 'Helvetica',size)
    c.setFillColor(HexColor(color));c.drawString(x,y,value)

def header(c,doc,mine,page):
    text(c,48,791,'CoalSMART',22,'#137b69',True)
    text(c,390,793,'SYNTHETIC SAMPLE REPORT',8,'#80978b')
    c.setStrokeColor(HexColor('#dfe8e0'));c.line(48,770,547,770)
    text(c,48,735,mine['name'],20,'#294b3e',True)
    text(c,48,709,doc['title'].replace('\u00b7','-'),11)
    text(c,48,689,mine['subsidiary']+' / '+mine['state'],9,'#87998d')
    text(c,48,57,'Fictional mine and figures. Prepared extraction for demonstration only.',8,'#91a38f')
    text(c,48,40,doc['filename'],8,'#91a38f');text(c,510,40,'Page '+str(page),8,'#91a38f')

for doc in DATA['documents']:
    if doc['format']=='Excel':continue
    mine=next(m for m in DATA['mines'] if m['id']==doc['mineId'])
    output=OUT/doc['filename'];c=canvas.Canvas(str(output),pagesize=(W,H))
    c.setTitle(doc['title']);c.setAuthor('CoalSMART synthetic sample')
    header(c,doc,mine,1)
    text(c,48,650,'Annual operating return',13,'#294b3e',True)
    text(c,48,628,'Calendar-year values. Recoverable reserves are balances at 31 December.',9)
    facts=[f for f in DATA['facts'] if next(e for e in DATA['evidence'] if e['id']==f['evidenceId'])['documentId']==doc['id']]
    c.setFillColor(HexColor('#edf5ef'));c.rect(48,584,499,27,fill=1,stroke=0)
    for x,label in [(58,'Year'),(110,'Metric'),(365,'Source value'),(467,'Unit')]:text(c,x,594,label,9,'#678776',True)
    y=563
    for f in facts:
        c.setStrokeColor(HexColor('#eef2ea'));c.line(48,y-11,547,y-11)
        metric={'production':'Production','reserves':'Recoverable reserves','overburden':'Overburden','target':'Production target'}[f['metric']]
        if 'revised' in f['id']:metric+=' (revised)'
        text(c,58,y,str(f['year']),9);text(c,110,y,metric,9)
        text(c,365,y,f"{f['originalValue']:,.2f}",10,'#345b45',True)
        text(c,467,y,f['originalUnit'].replace('³','3'),9)
        y-=31
    if mine['id']=='m02' and doc['year']==2022:
        text(c,48,y-12,'Production value is absent from this source return.',9,'#a18553')
    text(c,48,min(y-40,330),'Source definitions',11,'#294b3e',True)
    y=min(y-61,309)
    for line in ['Mt: million tonnes. kt: thousand tonnes. Mm3: million cubic metres.',
                 'Production targets and actual production share the same annual period.',
                 'Conflicting historical returns are deliberately included for demo review.',
                 'Aliases identify the same fictional mine; they are not separate entities.']:
        text(c,48,y,line,9);y-=20
    c.showPage();header(c,doc,mine,2)
    text(c,48,649,'Documented operational observations',13,'#294b3e',True)
    issue=next(e for e in DATA['evidence'] if e['documentId']==doc['id'] and e['id'].endswith('issue'))
    y=611
    for line in textwrap.wrap(issue['excerpt'],77):text(c,48,y,line,12);y-=23
    text(c,48,y-38,'Interpretation',11,'#294b3e',True);y-=63
    for line in textwrap.wrap('These observations describe reported operating conditions. They do not establish a causal explanation for changes in production.',90):text(c,48,y,line,10);y-=21
    text(c,48,y-42,'Sample source confidence is metadata, not measured OCR accuracy.',9,'#8b9d85')
    c.save()
    pdf=fitz.open(output)
    rendered=[]
    for i,page in enumerate(pdf):
        preview=OUT/'previews'/f"{doc['id']}-{i+1}.png"
        page.get_pixmap(matrix=fitz.Matrix(1.7,1.7)).save(preview)
        if doc['format']=='Scanned PDF':
            im=Image.open(preview).convert('L');im=ImageEnhance.Contrast(im).enhance(.85);im.save(preview)
        rendered.append(preview)
    pdf.close()
    if doc['format']=='Scanned PDF':
        # A true image-only PDF: its original pages intentionally have no text layer.
        scan=fitz.open()
        for preview in rendered:
            page=scan.new_page(width=W,height=H);page.insert_image(page.rect,filename=str(preview))
        scan.save(str(output),garbage=4,deflate=True);scan.close()
print('19 PDFs and 38 exact page previews generated.')
