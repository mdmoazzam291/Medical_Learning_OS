"""Build factual navigation metadata, never competency descriptions or source tables.

Owner-authorised catalogue-first scope, 2026-11-03. Requires pinned local PDF.
Repeated/malformed source identifiers remain separate edition-bound references.
"""
import argparse,hashlib,json,re,sys
from pathlib import Path
from codecell_inventory import raw_cell

ROOT=Path(__file__).resolve().parents[2]
SHA='aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c'
SUBJECTS=dict(zip(['AN','PY','BC','PH','PA','MI','FM','CM','GM','PE','PS','DR','SU','OP','EN','OG','OR','AS','RD'],['anatomy','physiology','biochemistry','pharmacology','pathology','microbiology','forensic-medicine','community-medicine','medicine','pediatrics','psychiatry','dermatology','surgery','ophthalmology','ent','obstetrics-gynaecology','orthopaedics','anaesthesia','radiology']))

def heading(text):
    m=re.search(r'(?i)^Topic\s*:?\s*(\d+)?\s*[:.\-]?\s*(.*?)\s*Number\s*of\s*competenc',text)
    if not m:return None
    label=re.sub(r'\s+',' ',m[2]).strip(' :-')
    # Keep short factual headings only. Unusable text remains an unresolved topic.
    if not 2<=len(label)<=180 or re.search(r'(?i)\b(describe|demonstrate|student should)\b',label):return None
    return (int(m[1]) if m[1] else None,label)

def build(pdf):
    import fitz
    data=pdf.read_bytes()
    if hashlib.sha256(data).hexdigest()!=SHA or fitz.VersionBind!='1.26.6':raise ValueError('pinned_source_and_engine_required')
    inventory=json.loads((ROOT/'docs/evidence/nmc-row-region-inventory-v1.json').read_text())
    doc=fitz.open(stream=data,filetype='pdf');cache={};topics=[];rows=[];active={}
    for r in inventory['regions']:
        pg=doc[r['pdfPage']-1]
        if r['pdfPage'] not in cache:cache[r['pdfPage']]=[list(fitz.Rect(w[:4])*pg.rotation_matrix)+[w[4]] for w in pg.get_text('words')]
        words=[w for w in cache[r['pdfPage']] if r['bbox'][1]<=(w[1]+w[3])/2<r['bbox'][3]]
        if r['kind'] not in ['standard','nonstandard']:
            h=heading(raw_cell(words))
            if h:
                number,label=h
                topic={'topicId':'nmc-2024-topic:'+r['regionId'],'subjectId':SUBJECTS[r['prefix']],'number':number,'label':label,'pdfPage':r['pdfPage']}
                topics.append(topic);active[r['prefix']]=topic['topicId']
            continue
        code=raw_cell([w for w in words if r['bbox'][0]-1<=(w[0]+w[2])/2<=r['bbox'][2]+1])
        if hashlib.sha256(code.encode()).hexdigest()!=r['rawCellSha256']:raise ValueError('raw_identifier_mismatch')
        token=re.sub(r'\s+','',code)
        valid=bool(re.fullmatch(r'[A-Z]{2,4}\d{1,3}\.\d{1,3}',token))
        current=next((t for t in reversed(topics) if t['topicId']==active.get(r['prefix'])),None)
        code_topic=re.match(r'[A-Z]+(\d+)\.',token)
        topic_id=active.get(r['prefix'])
        if current and current['number'] is not None and code_topic and int(code_topic[1])!=current['number']:topic_id=None
        rows.append({'referenceId':'nmc-2024-ref:'+r['regionId'],'subjectId':SUBJECTS[r['prefix']],
            'observedCode':code,'searchCode':token,'pdfPage':r['pdfPage'],'topicId':topic_id,
            'identifierState':'standard' if valid else 'unresolved',
            'amendmentNotice':token in ['PS9.2','PY9.1','PE6.4']})
    if len(rows)!=2634 or len({r['referenceId'] for r in rows})!=2634:raise ValueError('reference_accounting')
    return {'schemaVersion':1,'edition':'nmc-cbme-2024-09-12','sourceSha256':SHA,
        'sourceUrl':'https://nmc.org.in/rules-regulation-nmc/33/file',
        'clarificationUrl':'https://nmc.org.in/rules-regulation-nmc/34/file',
        'scope':'core-defining-reference-navigation','completeCompetencyCoverage':False,
        'clinicalContentIncluded':False,'topics':topics,'references':rows}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('pdf',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
    result=build(a.pdf);a.output.write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False)+'\n')
    print(json.dumps({'references':len(result['references']),'topicAppearances':len(result['topics']),'unresolvedIdentifiers':sum(r['identifierState']=='unresolved' for r in result['references']),'unassignedReferences':sum(r['topicId'] is None for r in result['references'])}))
