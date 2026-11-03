"""Close mechanical row investigation while preserving pending source acceptance."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

from codecell_inventory import canonical,digest,raw_cell
from review_package import no_duplicates
from row_body_audit import SOURCE_SHA,verify_case_bindings
from uncoded_dispositions import classify_text


def classify_header(text):
    role,topic=classify_text(text)
    if role=='topic_heading_syntax':return role,topic
    if re.search(r'\bCOMPETENCY\b',text,re.I) and re.search(r'\bNumber\b',text,re.I):
        return 'column_header_syntax',None
    raise ValueError('unrecognised_header_band')


def account_bands(rows,headers,uncoded):
    ids=[r['regionId'] for r in rows]
    if len(ids)!=len(set(ids)):raise ValueError('duplicate_physical_band')
    original={r['regionId']:r['candidateRole'] for r in rows}
    header_ids=[r['regionId'] for r in headers];uncoded_ids=[r['regionId'] for r in uncoded]
    if len(header_ids)!=len(set(header_ids)) or len(uncoded_ids)!=len(set(uncoded_ids)):raise ValueError('duplicate_disposition')
    if set(header_ids)!={i for i,role in original.items() if role=='header_classified_text_band'}:raise ValueError('header_scope_mismatch')
    if set(uncoded_ids)!={i for i,role in original.items() if role=='uncoded_text_band'}:raise ValueError('uncoded_scope_mismatch')
    roles={r['regionId']:r['candidateRole'] for r in headers+uncoded}
    for r in headers:
        if r['candidateRole'] not in ['column_header_syntax','topic_heading_syntax']:raise ValueError('header_role')
    for r in uncoded:
        if r['candidateRole'] not in ['subject_heading_syntax','topic_heading_syntax','continuation_candidate']:raise ValueError('uncoded_role')
    counts=Counter()
    for key,role in original.items():
        if role=='identifier_bearing_band':counts['identifier_appearance_retained']+=1
        elif role=='no_words_band':counts['empty_physical_band_retained']+=1
        elif key in roles:counts[roles[key]]+=1
        else:raise ValueError('unaccounted_band')
    if sum(counts.values())!=len(rows):raise ValueError('physical_accounting_mismatch')
    return dict(sorted(counts.items()))


def verify_closeout(packet,expected):
    if canonical(packet)!=canonical(expected):raise ValueError('stale_or_modified_engineering_closeout')
    return True


def build_closeout(root,pdf):
    root=Path(root);e=root/'docs/evidence'
    def read(name):return json.loads((e/name).read_bytes(),object_pairs_hook=no_duplicates)
    # This transitively verifies the pinned PDF, inventory, full-width body
    # audit and uncoded packet before considering any engineering closeout.
    subprocess.run([sys.executable,str(Path(__file__).with_name('uncoded_dispositions.py')),str(pdf),
                    '--inventory',str(e/'nmc-row-region-inventory-v1.json'),
                    '--audit',str(e/'nmc-full-row-band-observations-v1.json'),
                    '--verify',str(e/'nmc-uncoded-band-structural-proposals-v1.json')],capture_output=True,check=True)
    inventory=read('nmc-row-region-inventory-v1.json');audit=read('nmc-full-row-band-observations-v1.json')
    proposals=read('nmc-uncoded-band-structural-proposals-v1.json');cases=read('nmc-source-row-case-bindings-v1.json')
    verify_case_bindings(cases,e)
    rows=[dict(zip(audit['rowFields'],r)) for r in audit['rows']];row_map={r['regionId']:r for r in rows}
    import fitz
    data=Path(pdf).read_bytes()
    if hashlib.sha256(data).hexdigest()!=SOURCE_SHA or fitz.VersionBind!='1.26.6':raise ValueError('source_or_engine_mismatch')
    headers=[]
    with fitz.open(stream=data,filetype='pdf') as doc:
        cache={}
        for region in inventory['regions']:
            if region['kind']!='header':continue
            n=region['pdfPage'];page=doc[n-1]
            if n not in cache:cache[n]=[list(fitz.Rect(w[:4])*page.rotation_matrix)+[w[4]] for w in page.get_text('words')]
            top,bottom=region['bbox'][1],region['bbox'][3]
            text=raw_cell([w for w in cache[n] if top<=(w[1]+w[3])/2<bottom])
            body_sha=digest(text)
            if body_sha!=row_map[region['regionId']]['bodySha256']:raise ValueError('changed_header_body')
            role,topic=classify_header(text)
            headers.append({'regionId':region['regionId'],'pdfPage':n,'bodySha256':body_sha,
                            'candidateRole':role,'topicNumber':topic,'sourceExclusionApproved':False})
    counts=account_bands(rows,headers,proposals['uncodedBands'])
    register=read('nmc-foundation-completion-register-v1.json')
    next_task=next(t for t in register['tasks'] if t['id']=='global-supplement-scope')
    case_dispositions=[]
    for case in cases['cases']:
        kind=case['resolutionClass']
        action=('retain_raw_appearance_and_unapplied_identity_proposal' if case.get('focusedRegion') else
                'retain_source_gap_without_invented_record' if kind=='source_gap_preserved' else
                'retain_edition_specific_prefix_and_contents_conflict' if kind=='contents_defining_prefix_conflict' else
                'retain_observed_rows_and_publisher_count_conflict')
        case_dispositions.append({'caseId':case['caseId'],'engineeringDisposition':action,
                                  'acceptedSourceDecision':None,'proposedCorrectionApplied':False})
    paths=['nmc-row-region-inventory-v1.json','nmc-full-row-band-observations-v1.json',
           'nmc-uncoded-band-structural-proposals-v1.json','nmc-source-row-case-bindings-v1.json',
           'nmc-foundation-completion-register-v1.json']
    return {'schemaVersion':1,'kind':'nmc-source-row-mechanical-engineering-closeout','sourceSha256':SOURCE_SHA,
        'engineeringScope':'physical_band_accounting_and_explicit_retained_anomaly_dispositions',
        'sourceRights':'citation_only','sourceTextStored':False,'imageOcrIncluded':False,
        'headerBands':headers,'physicalBandCounts':counts,'physicalBandsAccounted':sum(counts.values()),
        'sourceCaseDispositions':case_dispositions,'pendingSourceCaseCount':len(case_dispositions),
        'effectiveUniqueCompetencyTotal':None,'engineeringReconciliationComplete':True,
        'logicalRowsAccepted':False,'allSourceCasesAccepted':False,'packageOneAccepted':False,
        'packageTwoCanProceed':next_task['dependsOn']==[],'packageTwoId':next_task['id'],
        'completeCoverageClaim':False,'learnerActivation':False,
        'bindings':[{'path':p,'sha256':hashlib.sha256((e/p).read_bytes()).hexdigest()} for p in paths]}


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('pdf',type=Path)
    p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[2]);p.add_argument('--out',type=Path);p.add_argument('--verify',type=Path);args=p.parse_args()
    result=build_closeout(args.root,args.pdf)
    if args.verify:verify_closeout(json.loads(args.verify.read_bytes(),object_pairs_hook=no_duplicates),result)
    if args.out:
        with args.out.open('x') as f:f.write(canonical(result)+'\n')
    print(json.dumps({k:result[k] for k in ['physicalBandCounts','physicalBandsAccounted','pendingSourceCaseCount',
                                          'engineeringReconciliationComplete','packageOneAccepted','packageTwoCanProceed']}))


if __name__=='__main__':main()
