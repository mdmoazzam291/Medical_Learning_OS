"""Provisional structural roles and boundary-word locators; never source approval."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

from codecell_inventory import raw_cell,digest,canonical,checked_boxes
from review_package import no_duplicates
from row_body_audit import SOURCE_SHA


def classify_text(text):
    if re.match(r'^Topic(?=\s|:|\d)',text,re.I):
        match=re.match(r'^Topic\s*:?\s*(\d+)\b',text,re.I)
        return 'topic_heading_syntax',int(match.group(1)) if match else None
    if re.search(r'\bTopics\s*[=:]',text,re.I) and re.search(r'\bCompetencies\s*[=:]',text,re.I):
        return 'subject_heading_syntax',None
    return 'continuation_candidate',None


def preceding_identifier(regions,index):
    current=regions[index]
    for previous in reversed(regions[:index]):
        if previous['prefix']!=current['prefix'] or current['pdfPage']-previous['pdfPage']>1:return None
        if previous['kind'] in ['standard','nonstandard']:return previous
    return None


def inspect_bands(inventory,audit,geometry):
    regions=inventory['regions'];bodies={r[0]:dict(zip(audit['rowFields'],r)) for r in audit['rows']}
    if len(bodies)!=len(regions) or set(bodies)!={r['regionId'] for r in regions}:raise ValueError('region_scope_mismatch')
    if set(geometry)!={r['pdfPage'] for r in regions}:raise ValueError('page_scope_mismatch')
    for words in geometry.values():checked_boxes({'words':words,'rectangles':[]})
    records=[];crossings=[]
    for index,region in enumerate(regions):
        top,bottom=region['bbox'][1],region['bbox'][3];words=geometry[region['pdfPage']]
        selected=[(i,w) for i,w in enumerate(words) if top<=(w[1]+w[3])/2<bottom]
        body=raw_cell([w for _,w in selected]);saved=bodies[region['regionId']]
        if digest(body)!=saved['bodySha256']:raise ValueError('changed_row_body')
        for word_index,word in selected:
            if word[1]<top or word[3]>bottom:
                crossings.append({'pdfPage':region['pdfPage'],'wordIndex':word_index,'bbox':word[:4],
                    'wordSha256':digest(word[4]),'assignedRegionId':region['regionId'],
                    'crossesTop':word[1]<top,'crossesBottom':word[3]>bottom,
                    'handling':'retain_once_in_midpoint_assigned_band','logicalMergeApproved':False})
        if saved['candidateRole']!='uncoded_text_band':continue
        role,topic=classify_text(body);parent=preceding_identifier(regions,index) if role=='continuation_candidate' else None
        records.append({'regionId':region['regionId'],'pdfPage':region['pdfPage'],'bodySha256':saved['bodySha256'],
            'candidateRole':role,'topicNumber':topic,'parentRegionId':parent['regionId'] if parent else None,
            'parentBodySha256':bodies[parent['regionId']]['bodySha256'] if parent else None,
            'parentRelation':('same_page' if parent['pdfPage']==region['pdfPage'] else 'previous_page') if parent else None,
            'status':'AI_structural_proposal_pending','decision':None})
    counts=Counter(r['candidateRole'] for r in records)
    if len(crossings)!=audit['totals']['boundaryCrossingWordCount']:raise ValueError('crossing_count_mismatch')
    return {'schemaVersion':1,'kind':'nmc-uncoded-band-structural-proposals','sourceSha256':inventory['sourceSha256'],
        'sourceRights':'citation_only','sourceTextStored':False,'imageOcrIncluded':False,
        'uncodedBands':records,'boundaryWords':crossings,'candidateCounts':dict(sorted(counts.items())),
        'unnumberedTopicHeadings':sum(r['candidateRole']=='topic_heading_syntax' and r['topicNumber'] is None for r in records),
        'parentProposals':sum(r['parentRegionId'] is not None for r in records),
        'logicalMergesApproved':False,'sourceExclusionsApproved':False,'completeCoverageClaim':False,'learnerActivation':False}


def verify_packet(packet,expected):
    if canonical(packet)!=canonical(expected):raise ValueError('stale_or_modified_structural_proposals')
    return True


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('pdf',type=Path)
    root=Path(__file__).resolve().parents[2]/'docs/evidence'
    p.add_argument('--inventory',type=Path,default=root/'nmc-row-region-inventory-v1.json')
    p.add_argument('--audit',type=Path,default=root/'nmc-full-row-band-observations-v1.json')
    p.add_argument('--out',type=Path);p.add_argument('--verify',type=Path);args=p.parse_args()
    data=args.pdf.read_bytes()
    if hashlib.sha256(data).hexdigest()!=SOURCE_SHA:raise ValueError('source_hash_mismatch')
    # Rebuild and verify the frozen source/geometry inventory and companion
    # audit before interpreting any cached rows. No source words are printed.
    subprocess.run([sys.executable,str(Path(__file__).with_name('row_body_audit.py')),str(args.pdf),
                    '--inventory',str(args.inventory),'--verify',str(args.audit)],check=True,capture_output=True)
    inventory=json.loads(args.inventory.read_bytes(),object_pairs_hook=no_duplicates)
    audit=json.loads(args.audit.read_bytes(),object_pairs_hook=no_duplicates)
    import fitz
    if fitz.VersionBind!='1.26.6':raise ValueError('pymupdf_version_mismatch')
    with fitz.open(stream=data,filetype='pdf') as doc:
        geometry={}
        for n in sorted({r['pdfPage'] for r in inventory['regions']}):
            page=doc[n-1];geometry[n]=[list(fitz.Rect(w[:4])*page.rotation_matrix)+[w[4]] for w in page.get_text('words')]
    packet=inspect_bands(inventory,audit,geometry)
    packet['inventoryFileSha256']=hashlib.sha256(args.inventory.read_bytes()).hexdigest()
    packet['rowAuditFileSha256']=hashlib.sha256(args.audit.read_bytes()).hexdigest()
    if args.verify:verify_packet(json.loads(args.verify.read_bytes(),object_pairs_hook=no_duplicates),packet)
    if args.out:
        with args.out.open('x') as f:f.write(canonical(packet)+'\n')
    print(json.dumps({'candidateCounts':packet['candidateCounts'],'parentProposals':packet['parentProposals'],
                      'boundaryWordLocators':len(packet['boundaryWords']),'unnumberedTopicHeadings':packet['unnumberedTopicHeadings'],
                      'logicalMergesApproved':False}))


if __name__=='__main__':main()
