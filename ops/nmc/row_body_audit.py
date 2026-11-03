"""Full-width text-band evidence supplementing the frozen code-column inventory.

Physical bands are not accepted logical rows. Words outside those bands remain
accounted for; boundary crossings remain explicit. No source prose is emitted.
"""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

from codecell_inventory import checked_boxes,raw_cell,digest,canonical,number,build_inventory,ELIGIBILITY
from review_package import no_duplicates

SOURCE_SHA='aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c'
FIELDS=['regionId','bodySha256','wordCount','outsideColumnWordCount','boundaryCrossingWordCount','candidateRole','reviewStatus']
OTHER_CASES={'institutional-fragment','global-granularity','aetcom-class','aetcom-similarity','aetcom-partial','amendment-effects'}
FOCUSED_REGIONS={
 'bc-prefix-omitted':'7d2a706c29651248b0969c62397ce58085b93028bc5cc506bb05880fa47ce87d',
 'bc-wrapped':'dd155e72232d241179091da804b1df75b67eba19a6603fc1fe6d150cf98bdde9',
 'pa-extra-dot':'9de3e1ec33225578059e682461dfb57af836448a7c3094162d33c1304b745a0c',
 'fm-colon':'a633e0e38517ce646a2585414fc6ca07db22feb87d5ca656d7f64f0a13b59d1b',
 'mi-suffix-absent':'7c3da9599fe21ecdf3f44ebf749d07a7b141114ac3870725edf6cd648f11431d',
 'as-topic-malformed':'26cf4470eeb4d6f2e04a07bdb89f4509fc6cca6aef0aef7a045616984406364e',
 'or-malformed-cell':'172395b810d311752ac505364212c1b4cf33366933dce90dbf07cec098e5cbf9'}
CASE_CLASSES={'bc-prefix-omitted':'contextual_prefix_proposal','bc-wrapped':'same_cell_wrap_observation',
 'pa-extra-dot':'separator_anomaly','fm-colon':'separator_anomaly',
 'mi-suffix-absent':'missing_suffix_inference_unaccepted','as-topic-malformed':'malformed_topic_inference_unaccepted',
 'or-malformed-cell':'repeated_topic_segment_unaccepted','su-numbering-gap':'source_gap_preserved',
 'op-headline-total':'publisher_count_conflict','pe-headline':'publisher_count_conflict',
 'gm-headline':'publisher_count_conflict_with_repeats','og-headline':'publisher_count_conflict',
 'gm-gap':'source_gap_preserved','gm-topic-counts':'topic_count_conflicts',
 'dr-prefix':'contents_defining_prefix_conflict','rd-prefix':'contents_defining_prefix_conflict'}


def audit_page(page,regions,words):
    checked_boxes({'rectangles':[],'words':words})
    if type(page) is not int or page<1 or not regions:raise ValueError('page_scope')
    previous=None;seen=set()
    for region in regions:
        box=region['bbox']
        if (region['pdfPage']!=page or region['regionId'] in seen or region['kind'] not in ['standard','nonstandard','header','empty']
            or len(box)!=4 or not all(number(v) for v in box) or not box[0]<box[2] or not box[1]<box[3]
            or previous is not None and box[1]<previous):raise ValueError('invalid_region_geometry')
        seen.add(region['regionId']);previous=box[3]
    buckets=[[] for _ in regions];outside=[]
    for word in words:
        center=(word[1]+word[3])/2
        assigned=next((i for i,r in enumerate(regions) if r['bbox'][1]<=center<r['bbox'][3]),None)
        if assigned is None:outside.append(word)
        else:buckets[assigned].append(word)
    rows=[]
    for region,body in zip(regions,buckets):
        left,top,right,bottom=region['bbox']
        column=[w for w in body if left-1<=(w[0]+w[2])/2<=right+1]
        crossings=sum(w[1]<top or w[3]>bottom for w in body)
        role=('identifier_bearing_band' if region['kind'] in ['standard','nonstandard'] else
              'header_classified_text_band' if region['kind']=='header' else
              'uncoded_text_band' if body else 'no_words_band')
        rows.append({'regionId':region['regionId'],'bodySha256':digest(raw_cell(body)),
                     'wordCount':len(body),'outsideColumnWordCount':len(body)-len(column),
                     'boundaryCrossingWordCount':crossings,'candidateRole':role,
                     'reviewStatus':'AI_source_observation_pending'})
    count=sum(r['wordCount'] for r in rows)+len(outside)
    if count!=len(words):raise ValueError('word_accounting_mismatch')
    return {'pdfPage':page,'pageWordCount':len(words),'pageWordGeometrySha256':digest(canonical(words)),
            'outsideBandWordCount':len(outside),'outsideBandWordGeometrySha256':digest(canonical(outside)),
            'accountedWordCount':count,'rowBandSequenceSha256':digest(canonical(rows)),
            'noOmissionCertified':False},rows


def build_audit(inventory,geometry):
    regions=inventory['regions'];pages=sorted({r['pdfPage'] for r in regions})
    if set(geometry)!=set(pages) or any(type(p) is not int for p in geometry):raise ValueError('exact_page_scope_required')
    ids=[r['regionId'] for r in regions]
    if len(ids)!=len(set(ids)):raise ValueError('duplicate_region_identity')
    receipts=[];rows=[]
    for page in pages:
        receipt,bands=audit_page(page,[r for r in regions if r['pdfPage']==page],geometry[page]);receipts.append(receipt);rows.extend(bands)
    counts=Counter(r['candidateRole'] for r in rows)
    return {'schemaVersion':1,'kind':'nmc-full-width-row-band-observations','sourceSha256':inventory['sourceSha256'],
            'sourceRights':'citation_only','sourceTextStored':False,'logicalRowsCertified':False,
            'extractionScope':'rotation_adjusted_PDF_plain_text_words','imageOcrIncluded':False,
            'rowFields':FIELDS,'rows':[[r[k] for k in FIELDS] for r in rows],'pages':receipts,
            'totals':{'pages':len(pages),'physicalBands':len(rows),'candidateRoles':dict(sorted(counts.items())),
                      'boundaryCrossingWordCount':sum(r['boundaryCrossingWordCount'] for r in rows),
                      'outsideBandWordCount':sum(p['outsideBandWordCount'] for p in receipts)},
            'eligibility':dict(ELIGIBILITY)}


def verify_case_bindings(packet,root):
    root=Path(root)
    def read(name):return json.loads((root/name).read_bytes(),object_pairs_hook=no_duplicates)
    paths={'nmc-source-adjudication-packet.json','nmc-full-row-band-observations-v1.json','nmc-five-subject-topic-count-audit-v1.json'}
    keys={'schemaVersion','kind','sourceRights','sourceTextStored','bindings','cases','otherPackagesStillTrack',
          'originalCasesChanged','acceptedDecisions','completeCoverageClaim','learnerActivation'}
    if not isinstance(packet,dict) or set(packet)!=keys or type(packet['schemaVersion']) is not int or packet['schemaVersion']!=1:raise ValueError('case_packet_shape')
    if (packet.get('kind')!='nmc-source-row-case-evidence-bindings' or packet.get('sourceRights')!='citation_only'
        or any(packet.get(k) is not False for k in ['sourceTextStored','originalCasesChanged','completeCoverageClaim','learnerActivation'])
        or type(packet.get('acceptedDecisions')) is not int or packet['acceptedDecisions']!=0):raise ValueError('unapproved_case_evidence')
    bindings=packet['bindings']
    if not isinstance(bindings,list) or len(bindings)!=3 or any(not isinstance(b,dict) or set(b)!={'path','sha256'} for b in bindings) or {b['path'] for b in bindings}!=paths:raise ValueError('case_evidence_binding_set')
    for binding in bindings:
        if hashlib.sha256((root/binding['path']).read_bytes()).hexdigest()!=binding['sha256']:raise ValueError('stale_case_evidence_binding')
    source=read('nmc-source-adjudication-packet.json');audit=read('nmc-full-row-band-observations-v1.json')
    original={c['id']:c for c in source['cases']};expected=set(original)-OTHER_CASES
    cases=packet['cases']
    if len(cases)!=16 or {c['caseId'] for c in cases}!=expected or canonical(packet['otherPackagesStillTrack'])!=canonical(sorted(OTHER_CASES)):
        raise ValueError('case_partition_mismatch')
    receipts={p['pdfPage']:p for p in audit['pages']}
    rows={r[0]:dict(zip(audit['rowFields'],r)) for r in audit['rows']}
    inventory=read('nmc-row-region-inventory-v1.json');regions={r['regionId']:r for r in inventory['regions']}
    for case in cases:
        keys={'caseId','resolutionClass','definingPageBindings','nonDefiningSourcePages','engineeringStatus','qualifiedDecision','normalizationApplied'}
        if case['caseId'] in FOCUSED_REGIONS:keys.add('focusedRegion')
        if set(case)!=keys or not isinstance(case['resolutionClass'],str) or case['resolutionClass']!=CASE_CLASSES[case['caseId']]:raise ValueError('case_classification_profile')
        base=original[case['caseId']]
        if case['qualifiedDecision'] is not None or case['normalizationApplied'] is not False or case['engineeringStatus']!='source_context_bound_not_adjudicated':raise ValueError('unapproved_case_decision')
        pages=[{'pdfPage':p,'rowBandSequenceSha256':receipts[p]['rowBandSequenceSha256']} for p in base['pdfPages'] if p in receipts]
        if canonical(case['definingPageBindings'])!=canonical(pages) or canonical(case['nonDefiningSourcePages'])!=canonical([p for p in base['pdfPages'] if p not in receipts]):raise ValueError('case_page_binding')
        if ('focusedRegion' in case)!=(case['caseId'] in FOCUSED_REGIONS):raise ValueError('focused_case_binding_set')
        if 'focusedRegion' in case:
            region=case['focusedRegion'];key=region['regionId']
            if key!=FOCUSED_REGIONS[case['caseId']] or key not in rows or canonical(region)!=canonical(rows[key]) or regions[key]['pdfPage'] not in base['pdfPages']:raise ValueError('focused_region_evidence')
    return True


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('pdf',type=Path)
    root=Path(__file__).resolve().parents[2]/'docs/evidence'
    p.add_argument('--inventory',type=Path,default=root/'nmc-row-region-inventory-v1.json')
    p.add_argument('--manifest',type=Path,default=root/'nmc-codecell-page-receipts.json')
    p.add_argument('--out',type=Path);p.add_argument('--verify',type=Path);p.add_argument('--case-bindings',type=Path);args=p.parse_args()
    data=args.pdf.read_bytes()
    if hashlib.sha256(data).hexdigest()!=SOURCE_SHA:raise ValueError('source_hash_mismatch')
    inventory=json.loads(args.inventory.read_bytes(),object_pairs_hook=no_duplicates)
    manifest=json.loads(args.manifest.read_bytes(),object_pairs_hook=no_duplicates)
    import fitz
    if fitz.VersionBind!='1.26.6':raise ValueError('pymupdf_version_mismatch')
    with fitz.open(stream=data,filetype='pdf') as doc:
        if len(doc)!=467:raise ValueError('source_page_count_mismatch')
        geometry={}
        for row in manifest['pageReceipts']:
            page=doc[row[0]-1]
            geometry[row[0]]={'rectangles':[list(d['rect']*page.rotation_matrix) for d in page.get_drawings()],
                              'words':[list(fitz.Rect(w[:4])*page.rotation_matrix)+[w[4]] for w in page.get_text('words')]}
    rebuilt=build_inventory(manifest,SOURCE_SHA,467,geometry)
    expected={k:v for k,v in inventory.items() if k!='engine'}
    if canonical(rebuilt)!=canonical(expected):raise ValueError('source_inventory_rebuild_mismatch')
    audit=build_audit(inventory,{page:g['words'] for page,g in geometry.items()})
    audit['inventoryFileSha256']=hashlib.sha256(args.inventory.read_bytes()).hexdigest()
    audit['manifestFileSha256']=hashlib.sha256(args.manifest.read_bytes()).hexdigest()
    if args.verify:
        old=json.loads(args.verify.read_bytes(),object_pairs_hook=no_duplicates)
        if canonical(old)!=canonical(audit):raise ValueError('stale_or_modified_row_audit')
    if args.out:
        with args.out.open('x') as f:f.write(canonical(audit)+'\n')
    if args.case_bindings:
        verify_case_bindings(json.loads(args.case_bindings.read_bytes(),object_pairs_hook=no_duplicates),args.case_bindings.parent)
    print(json.dumps(audit['totals']))


if __name__=='__main__':main()
