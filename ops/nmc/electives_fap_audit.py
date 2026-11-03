"""Version-bound Electives clauses and FAP source observations, never release authority."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess

from codecell_inventory import ELIGIBILITY, canonical, digest, raw_cell

BASE_SHA='aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c'
ELECTIVES_SHA='a7fb3507e3c76fae9e2be017e4ee589c994c4c05aafaeeed2a9ecd0a22d85cb4'
METHOD='electives-fap-source-observations-v1'


def text_rows(text,page,pattern,source_sha,scope,stop=None):
    if stop:
        end=re.search(stop,text,re.I)
        if end:text=text[:end.start()]
    markers=list(re.finditer(pattern,text,re.M));rows=[]
    for i,marker in enumerate(markers):
        a=marker.start();b=markers[i+1].start() if i+1<len(markers) else len(text)
        selected=text[a:b];b=a+len(selected.rstrip())
        row={'scope':scope,'pdfPage':page,'localOrdinal':i+1,'startChar':a,'endChar':b,'bodySha256':digest(text[a:b])}
        row['appearanceId']=digest(canonical(dict(row,sourceSha256=source_sha,method=METHOD)));rows.append(row)
    return rows


def fap_rows(words,page,groups,stop_ys,right=552):
    markers=sorted([w for w in words if re.fullmatch(r'\d{1,2}\.',w[4])],key=lambda w:(w[1],w[0]))
    expected=[n for _,numbers in groups for n in numbers]
    if [int(w[4][:-1]) for w in markers]!=expected:raise ValueError('fap_number_sequence_unresolved')
    labels=[name for name,numbers in groups for _ in numbers];rows=[]
    for i,marker in enumerate(markers):
        top=marker[1]-0.1;bottom=markers[i+1][1]-0.1 if i+1<len(markers) else 700
        bottom=min([bottom]+[y-0.1 for y in stop_ys if y>top])
        bbox=[round(float(v),3) for v in [marker[0]-0.1,top,right,bottom]]
        selected=[w for w in words if bbox[0]<=(w[0]+w[2])/2<bbox[2] and bbox[1]<=(w[1]+w[3])/2<bbox[3]]
        text=raw_cell(selected)
        if not text:raise ValueError('fap_paragraph_unlocated')
        row={'candidateSourceGroup':labels[i],'pdfPage':page,'sourceOrdinal':expected[i],
             'bbox':bbox,'bodySha256':digest(text)}
        row['appearanceId']=digest(canonical(dict(row,sourceSha256=BASE_SHA,method=METHOD)));rows.append(row)
    return rows


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('base_pdf',type=Path);parser.add_argument('legacy_electives_pdf',type=Path)
    parser.add_argument('output',type=Path);parser.add_argument('--ocr',action='store_true')
    args=parser.parse_args()
    base=args.base_pdf.read_bytes();legacy=args.legacy_electives_pdf.read_bytes()
    if hashlib.sha256(base).hexdigest()!=BASE_SHA or hashlib.sha256(legacy).hexdigest()!=ELECTIVES_SHA:raise ValueError('source_hash_mismatch')
    if args.output.suffix!='.json':raise ValueError('invalid_output_path')
    import fitz
    if fitz.VersionBind!='1.26.6':raise ValueError('pymupdf_version_mismatch')
    legacy_rows=[];fap=[];images=[];constraints=[]
    ocr_version=subprocess.run(['tesseract','--version'],capture_output=True,check=True).stdout.decode().splitlines()[0] if args.ocr else None
    with fitz.open(stream=base,filetype='pdf') as current,fitz.open(stream=legacy,filetype='pdf') as old:
        if len(current)!=467 or len(old)!=30:raise ValueError('page_count_mismatch')
        for page in [10,11]:
            text=old[page-1].get_text()
            legacy_rows.extend(text_rows(text,page,r'^\s*9\.3\.\d+\s+',ELECTIVES_SHA,'legacy_2019_extract',r'Description of Curricular program'))
        if len(legacy_rows)!=9:raise ValueError('legacy_clause_scope_unresolved')
        text=current[36].get_text();start=re.search(r'3\)\s*Electives',text);end=re.search(r'4\)\s*Attitude',text)
        if not start or not end:raise ValueError('base_electives_section_unlocated')
        # Keep offsets relative to the complete original page text.
        masked=' '*start.end()+text[start.end():end.start()]
        current_rows=text_rows(masked,37,r'^[ \t]*\uf0b7',BASE_SHA,'base2024_electives_bullet')
        if len(current_rows)!=7:raise ValueError('base_electives_bullet_scope_unresolved')
        for document,page,pattern,values in [
            (old,10,r'Two months are designated',{'months':2}),
            (old,10,r'two elective blocks of 04 weeks each',{'blocks':2,'weeksPerBlock':4}),
            (current,32,r'Electives\s*\(1 month\).*?2 blocks of 15 days each',{'months':1,'blocks':2,'daysPerBlock':15})]:
            text=document[page-1].get_text();match=re.search(pattern,text,re.I|re.S)
            if not match:raise ValueError('duration_evidence_unlocated')
            constraints.append({'sourceSha256':ELECTIVES_SHA if document is old else BASE_SHA,'pdfPage':page,
                                'startChar':match.start(),'endChar':match.end(),'spanSha256':digest(match.group()),'observedValues':values})
        specifications={65:[('phase1',list(range(1,7)))],66:[('phase2',list(range(1,6))),('phase3',list(range(1,7))),('final_report',[1,2])],67:[('final_report',list(range(3,11)))]}
        for page,groups in specifications.items():
            pg=current[page-1];words=[list(w[:5]) for w in pg.get_text('words')]
            stops=[w[1] for w in words if (page==66 and w[4]=='Final') or (page==67 and w[4]=='Phase')]
            fap.extend(fap_rows(words,page,groups,stops))
        for page in range(67,71):
            blocks=[b for b in current[page-1].get_text('dict')['blocks'] if b['type']==1]
            if len(blocks)!=1:raise ValueError('fap_image_scope_unresolved')
            block=blocks[0];data=block['image']
            record={'pdfPage':page,'bbox':[round(float(v),3) for v in block['bbox']],
                    'pixelWidth':block['width'],'pixelHeight':block['height'],'embeddedImageSha256':hashlib.sha256(data).hexdigest(),
                    'plainTextWordCount':len(current[page-1].get_text('words')),'ocrStatus':'not_run',
                    'tableRowsAdjudicated':False}
            if args.ocr:
                output=subprocess.run(['tesseract','stdin','stdout','-l','eng','--psm','6'],input=data,capture_output=True,check=True).stdout
                record.update(ocrStatus='local_candidate_unreviewed',ocrTextSha256=hashlib.sha256(output).hexdigest(),ocrWordCount=len(output.decode().split()))
            images.append(record)
    result={'schemaVersion':1,'kind':'electives-fap-source-observations','method':METHOD,
            'sources':{'base2024':BASE_SHA,'legacyElectives':ELECTIVES_SHA},'sourceRights':'citation_only','sourceTextStored':False,
            'engine':{'pymupdf':fitz.VersionBind,'mupdf':fitz.VersionFitz,'tesseract':ocr_version,'ocrLanguage':'eng' if args.ocr else None,'ocrPsm':6 if args.ocr else None},
            'legacyElectivesClauses':legacy_rows,'baseElectivesBullets':current_rows,'durationEvidence':constraints,
            'fapNumberedParagraphs':fap,'fapTableImages':images,
            'totals':{'legacyClauses':len(legacy_rows),'baseBullets':len(current_rows),'fapPhaseTargets':sum(r['candidateSourceGroup']!='final_report' for r in fap),
                      'fapFinalReportItems':sum(r['candidateSourceGroup']=='final_report' for r in fap),'imageTableAppearances':len(images)},
            'fapPhaseGroupsBasedOnInspectedSpatialLayout':True,'imageOnlyPagesTreatedAsBlank':False,
            'electivesPhasePlacementResolved':False,'cohortApplicabilityApproved':False,'allRequirementsEnumerated':False,'eligibility':dict(ELIGIBILITY)}
    with args.output.open('x',encoding='utf-8') as output:output.write(canonical(result)+'\n')
    print(json.dumps(result['totals']))


if __name__=='__main__':main()
