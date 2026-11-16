"""Extract every competency row from the pinned NMC CBME 2024 PDF (tables), preserving pages and continuations.

Usage: python ops/nmc/extract_competency_tables.py /path/to/pinned.pdf /tmp/out.json
Output contains official description text: keep it out of this public repository
(DECISIONS 2026-11-03 / 2026-11-16). Uses pdfplumber 0.11.10 because PyMuPDF 1.26.6
was unavailable; validated by reproducing the repo-pinned row hashes.
"""
import pdfplumber,re,json,hashlib,sys
PDF=sys.argv[1]; OUT=sys.argv[2]
SHA='aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c'
assert hashlib.sha256(open(PDF,'rb').read()).hexdigest()==SHA
VOL=[(75,241,'Volume I-2024','Competency based Undergraduate Curriculum in Phase 1 & Phase 2 subjects'),
     (242,370,'Volume II-2024','Competency based Undergraduate Curriculum in Medicine & Allied subjects'),
     (371,467,'Volume III-2024','Competency based Undergraduate Curriculum in Surgery & Allied subjects')]
SUBJ=[(107,'AN','anatomy','ANATOMY'),(149,'PY','physiology','PHYSIOLOGY'),(161,'BC','biochemistry','BIOCHEMISTRY'),(173,'PH','pharmacology','PHARMACOLOGY'),
 (186,'PA','pathology','PATHOLOGY'),(205,'MI','microbiology','MICROBIOLOGY'),(214,'FM','forensic-medicine','FORENSIC MEDICINE & TOXICOLOGY'),
 (268,'CM','community-medicine','COMMUNITY MEDICINE'),(280,'GM','medicine','GENERAL MEDICINE'),(328,'PE','pediatrics','PEDIATRICS'),(351,'PS','psychiatry','PSYCHIATRY'),
 (355,'DR','dermatology','DERMATOLOGY, VENEREOLOGY & LEPROSY'),(402,'SU','surgery','GENERAL SURGERY'),(413,'OP','ophthalmology','OPHTHALMOLOGY'),
 (419,'EN','ent','OTORHINOLARYNGOLOGY (ENT)'),(426,'OG','obstetrics-gynaecology','OBSTETRICS & GYNAECOLOGY'),(443,'OR','orthopaedics','ORTHOPEDICS'),
 (451,'AS','anaesthesia','ANAESTHESIOLOGY'),(456,'RD','radiology','RADIODIAGNOSIS')]
ENDS={'FM':241,'DR':370,'RD':465}
def vol(p): return next(v for v in VOL if v[0]<=p<=v[1])
def subj(p):
    s=None
    for i,x in enumerate(SUBJ):
        end=ENDS.get(x[1]) or (SUBJ[i+1][0]-1 if i+1<len(SUBJ) else 467)
        if x[0]<=p<=end: s=x
    return s
COLS=['code','description','domain','level','core','teachingMethod','assessmentMethod','numberToCertify']
def norm(c): return (c or '').strip()
def printed_page(P):
    lines=[l.strip() for l in (P.extract_text(x_tolerance=1) or '').split('\n') if l.strip()]
    nums=[l for l in lines[-3:] if re.fullmatch(r'\d{1,3}',l)]
    return int(nums[-1]) if nums else None
CODE=re.compile(r'^\s*(?:[A-Z]{1,4}\s*[.:]?\s*\d|\d{1,2}\.\d)')
rows=[];topics=[];issues=[];declared=[];cur=None;curTopic=None
pdf=pdfplumber.open(PDF)
for pn in range(106,468):
    P=pdf.pages[pn-1]; s=subj(pn)
    if s is None: continue
    pp=printed_page(P)
    for ti,T in enumerate(P.extract_tables({'text_x_tolerance':1.5})):
        hdr=None
        if T and re.match(r'(?i)^number\b',norm(T[0][0])): hdr=[norm(c) for c in T[0]]
        for ri,r in enumerate(T):
            cells=[norm(c) for c in r]
            m=re.search(r'\(Topics\s*=\s*(\d+),\s*Competencies\s*=\s*(\d+)\)',' '.join(' '.join(cells).split()))
            if m and not CODE.match(cells[0] or 'x'):
                declared.append({'subjectCode':s[1],'pdfPage':pn,'topics':int(m[1]),'competencies':int(m[2])}); continue
            merged=False
            if hdr and len(cells)!=8 and len(hdr)==len(cells):
                named=[i for i,h in enumerate(hdr) if h]
                out=['']*len(cells)
                for i,c in enumerate(cells):
                    if i in named: out[i]=(out[i]+'\n'+c).strip() if c else out[i]; continue
                    if not c: continue
                    L=max([j for j in named if j<i],default=None); R=min([j for j in named if j>i],default=None)
                    cand=[j for j in (L,R) if j is not None and not cells[j]]
                    tgt=cand[0] if len(cand)==1 else (L if L is not None else R)
                    if len(cand)==2:
                        if re.fullmatch(r'[YyNn]',c): tgt=next(j for j in (L,R) if re.search('Core',hdr[j]))  if any(re.search('Core',hdr[j]) for j in (L,R)) else L
                        elif re.fullmatch(r'(?:K|KH|SH|P|K/H)(?:\s*[/,]\s*(?:K|KH|SH|P))*',c): tgt=next((j for j in (L,R) if re.search('Level',hdr[j])),L)
                    out[tgt]=(out[tgt]+'\n'+c).strip(); merged=True
                cells=[out[i] for i in named] if len(named)==8 else cells
                if len(named)!=8: issues.append({'pdfPage':pn,'type':'header-not-8','hdr':hdr})
            if not any(cells): continue
            first=cells[0]
            if re.match(r'(?i)^number\b',first) or re.match(r'(?i)^competency',cells[1] if len(cells)>1 else ''): continue
            if re.match(r'(?i)^topic',first) and not any(cells[1:]):
                curTopic={'subjectCode':s[1],'heading':' '.join(first.split()),'pdfPage':pn,'printedPage':pp}; topics.append(curTopic); cur=None; continue
            if len(cells)!=8:
                issues.append({'pdfPage':pn,'type':'column-count','count':len(cells),'cells':cells}); 
                if len(cells)<8: cells=cells+['']*(8-len(cells))
                else: cells=cells[:7]+[' '.join(cells[7:])]
            rec=dict(zip(COLS,cells))
            if first:
                cur={'extractionIndex':len(rows)+1,'subjectCode':s[1],'subjectId':s[2],'subjectHeading':s[3],'volume':vol(pn)[2],'volumeGrouping':vol(pn)[3],
                     'topicHeading':curTopic['heading'] if curTopic and curTopic['subjectCode']==s[1] else None,
                     'printedCode':first,'pdfPages':[pn],'printedPages':[pp],**{k:rec[k] for k in COLS[1:]},'continuations':0,'flags':(['column-merged'] if merged else [])}
                if not CODE.match(first): cur['flags'].append('code-cell-not-identifier-shaped')
                rows.append(cur)
            else:
                if cur is None: issues.append({'pdfPage':pn,'type':'orphan-continuation','cells':cells}); continue
                for k in COLS[1:]:
                    if rec[k]: cur[k]=(cur[k]+'\n'+rec[k]).strip()
                if merged and 'column-merged' not in cur['flags']: cur['flags'].append('column-merged')
                if pn not in cur['pdfPages']: cur['pdfPages'].append(pn); cur['printedPages'].append(pp)
                cur['continuations']+=1
json.dump({'rows':rows,'topics':topics,'issues':issues,'declared':declared},open(OUT,'w'),ensure_ascii=False,indent=1)
from collections import Counter
print('declared',declared[:3],len(declared));print('rows',len(rows),'topics',len(topics),'issues',Counter(i['type'] for i in issues))
print(Counter(r['subjectCode'] for r in rows))
print('flags',Counter(f for r in rows for f in r['flags']), 'multipage',sum(len(r['pdfPages'])>1 for r in rows))
