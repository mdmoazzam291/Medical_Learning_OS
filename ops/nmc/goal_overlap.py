"""Exact source goal spans and bounded literal-overlap investigation, not a syllabus."""
import argparse
from collections import Counter,defaultdict
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile

from codecell_inventory import canonical,digest,raw_cell
from review_package import no_duplicates
from row_body_audit import SOURCE_SHA


class SourceText:
    def __init__(self,texts):
        self.raw=texts;self.parts=[];chunks=[];offset=0
        for page,text in enumerate(texts,1):
            folio=re.match(r'^\s*\d{1,3}[ \t]*\n[ \t\r\n]*',text);start=folio.end() if folio else 0
            part=text[start:];self.parts.append((page,offset,start,len(part)));chunks.append(part);offset+=len(part)+1
        self.full='\n'.join(chunks)

    def spans(self,a,b):
        result=[]
        for page,offset,raw_start,length in self.parts:
            lo=max(a,offset);hi=min(b,offset+length)
            if lo<hi:result.append({'pdfPage':page,'startChar':raw_start+lo-offset,'endChar':raw_start+hi-offset})
        return result

    def body(self,spans):
        return '\n'.join(self.raw[s['pdfPage']-1][s['startChar']:s['endChar']] for s in spans)


def record(source,a,b,scope,ordinal,marker='',parent=None):
    segments=source.spans(a,b);body=source.body(segments)
    if not body.strip():raise ValueError('empty_goal_body')
    result={'scope':scope,'ordinal':ordinal,'segments':segments,'bodySha256':digest(body),
            'formattingSha256':digest(' '.join(body.split())),'markerSha256':digest(marker),
            'parentAppearanceId':parent,'status':'AI_source_observation_pending','decision':None}
    result['appearanceId']=digest(canonical(result));return result


def partition(source,a,b,pattern,scope,parent=None):
    matches=list(re.finditer(pattern,source.full[a:b]));result=[]
    for i,match in enumerate(matches):
        end=a+matches[i+1].start() if i+1<len(matches) else b
        result.append(record(source,a+match.end(),end,scope,i+1,match.group(1),parent))
    return result


def ordered_letters(source,a,b,labels,scope):
    matches=[];cursor=a
    for label in labels:
        match=re.search(r'(?m)^[ \t]*'+label+r'[.)]\s*',source.full[cursor:b])
        if not match:raise ValueError('missing_ordered_letter_'+scope+'_'+label)
        matches.append((cursor+match.start(),cursor+match.end(),label));cursor+=match.end()
    return [record(source,end,matches[i+1][0] if i+1<len(matches) else b,scope,i+1,label)
            for i,(_,end,label) in enumerate(matches)]


def exact_groups(records):
    groups=defaultdict(list)
    for row in records:groups[row['formattingSha256']].append(row['appearanceId'])
    return [{'formattingSha256':key,'appearanceIds':sorted(ids),'semanticEquivalenceApproved':False}
            for key,ids in sorted(groups.items())]


def verify_packet(packet,expected):
    if canonical(packet)!=canonical(expected):raise ValueError('stale_or_modified_goal_overlap')
    return True


def heading_match(text,title):
    match=re.search(r'(?im)^[ \t]*(?:\d+(?:\.\d+)?\.?\s*)?'+title,text)
    if not match:raise ValueError('missing_section_heading')
    return match


def goal_records(source,goals,framework,queue):
    full=source.full;records=[];counts={}
    for name,first,last,inst_count in [('opening',4,6,11),('volume1',83,85,11),('volume2',250,252,12),('volume3',379,381,11)]:
        a=source.parts[first-1][1];b=source.parts[last-1][1]+source.parts[last-1][3]
        text=full[a:b];national=a+heading_match(text,r'National\s+Goals').end()
        institutional_heading=heading_match(text,r'Institutional\s+Goals')
        institution=a+institutional_heading.end();national_end=a+institutional_heading.start()
        learner_match=heading_match(full[institution:b],r'Goals for the Learner')
        end=institution+learner_match.start();postscript=re.search(r'All efforts must be made',full[institution:end],re.I)
        if postscript:end=institution+postscript.start()
        ns=ordered_letters(source,national,national_end,'abcde',name+':national')
        ins=ordered_letters(source,institution,end,'abcdefghijkl'[:inst_count],name+':institutional')
        records+=ns+ins
        f=ins[5];seg=f['segments'];fa=next(offset+s['startChar']-raw for s in seg[:1] for page,offset,raw,_ in source.parts if page==s['pdfPage'])
        fb=next(offset+s['endChar']-raw for s in seg[-1:] for page,offset,raw,_ in source.parts if page==s['pdfPage'])
        nested=partition(source,fa,fb,r'(?m)^[ \t]*([ivx]+)[.)]\s*',name+':institutional:nested',f['appearanceId'])
        if len(nested)!=8:raise ValueError('nested_institutional_count_'+name)
        records+=nested;counts[name+':national']=len(ns);counts[name+':institutional']=len(ins)
    start=source.parts[10][1];end=source.parts[27][1]+source.parts[27][3]
    headings=list(re.finditer(r'(?im)^[ \t]*Subject\s+Goals?\s*:?\s*$',full[start:end]))
    if len(headings)!=19:raise ValueError('subject_heading_count')
    for index,(heading,subject) in enumerate(zip(headings,goals['subjectGoals'])):
        a=start+heading.end();limit=start+headings[index+1].start() if index+1<19 else end
        if index+1<19:
            title=list(re.finditer(r'(?m)^[ \t]*'+str(index+2)+r'\.\s*',full[a:limit]))
            if not title:raise ValueError('next_subject_title_missing')
            limit=a+title[-1].start()
        phase=re.search(r'(?im)^.*(?:Phase\s+[1-4]|PHASE\s*WISE).*$',full[a:limit])
        if phase:limit=a+phase.start()
        items=partition(source,a,limit,r'(?m)^[ \t]*([ivxlcdm]+)\.\s*','subject:'+subject['subjectId'])
        if len(items)!=len(subject['goalItems']):raise ValueError('subject_goal_count_'+subject['subjectId']+'_'+str(len(items)))
        for row,expected in zip(items,subject['goalItems']):
            if row['markerSha256']!=digest(expected['sourceLabel']) or row['segments'][0]['pdfPage']!=expected['pdfPage']:
                raise ValueError('subject_goal_marker_or_page_drift')
        records+=items
    for volume in framework['volumes']:
        first,last=volume['pdfRange'];a=source.parts[first-1][1];b=source.parts[last-1][1]+source.parts[last-1][3]
        rows=partition(source,a,b,r'(?m)^[ \t]*(3\.[1-5]\.\d+)\b\s*','global:volume'+volume['volume'])
        if len(rows)!=35:raise ValueError('volume_global_count')
        if any(row['markerSha256']!=digest(code) for row,code in zip(rows,volume['sourceCodes'])):raise ValueError('volume_global_marker_drift')
        records+=rows
    a=source.parts[6][1];b=source.parts[10][1]+source.parts[10][3]
    a+=re.search(r'6\.\s*Competency Based Training',full[a:b],re.I).end()
    stop=re.search(r'(?m)^A\.\s*CURRICULUM',full[a:b]);b=a+stop.start()
    roles=ordered_letters(source,a,b,'abcdefg','opening:global:role')
    for role,expected in zip(roles,queue['globalImg']['roles']):
        segments=role['segments'];ra=next(offset+s['startChar']-raw for s in segments[:1] for page,offset,raw,_ in source.parts if page==s['pdfPage'])
        rb=next(offset+s['endChar']-raw for s in segments[-1:] for page,offset,raw,_ in source.parts if page==s['pdfPage'])
        rows=partition(source,ra,rb,r'(?m)^[ \t]*([\u2022\uf0b7])\s*','opening:global:'+expected['role'])
        if len(rows)!=expected['topLevelBulletCount']:raise ValueError('opening_role_count_'+expected['role']+'_'+str(len(rows)))
        records+=rows
    return records,counts


def build(root,base_pdf,supplement_dir):
    e=Path(root)/'docs/evidence'
    def read(name):return json.loads((e/name).read_bytes(),object_pairs_hook=no_duplicates)
    data=Path(base_pdf).read_bytes()
    if hashlib.sha256(data).hexdigest()!=SOURCE_SHA:raise ValueError('source_hash_mismatch')
    subprocess.run([sys.executable,str(Path(__file__).with_name('row_body_audit.py')),str(base_pdf),
        '--inventory',str(e/'nmc-row-region-inventory-v1.json'),'--manifest',str(e/'nmc-codecell-page-receipts.json'),
        '--verify',str(e/'nmc-full-row-band-observations-v1.json')],capture_output=True,check=True)
    import fitz
    if fitz.VersionBind!='1.26.6':raise ValueError('pymupdf_version_mismatch')
    with fitz.open(stream=data,filetype='pdf') as doc:
        texts=[p.get_text() for p in doc];source=SourceText(texts)
        records,counts=goal_records(source,read('nmc-2024-goal-locators.json'),read('nmc-volume-framework-comparison.json'),read('nmc-global-support-review-queue.json'))
        inventory=read('nmc-row-region-inventory-v1.json');base_codes=defaultdict(list);cache={}
        for region in inventory['regions']:
            if region['kind'] not in ['standard','nonstandard']:continue
            n=region['pdfPage'];page=doc[n-1]
            if n not in cache:cache[n]=[list(fitz.Rect(w[:4])*page.rotation_matrix)+[w[4]] for w in page.get_text('words')]
            left,top,right,bottom=region['bbox'];text=raw_cell([w for w in cache[n] if left-1<=(w[0]+w[2])/2<=right+1 and top<=(w[1]+w[3])/2<bottom])
            if digest(text)!=region['rawCellSha256']:raise ValueError('base_code_body_mismatch')
            base_codes[digest(re.sub(r'\s','',text))].append(region['regionId'])
    files={hashlib.sha256(p.read_bytes()).hexdigest():p for p in Path(supplement_dir).glob('*.pdf')}
    catalog=read('nmc-supplement-sources.json');support=[]
    for doc in catalog['documents']:
        if doc['sha256'] not in files:raise ValueError('missing_pinned_supplement_'+doc['id'])
        support.append({'sourceId':doc['id'],'sourceSha256':doc['sha256'],'currentCohortApplicabilityApproved':False,'allContentSemanticallyEnumerated':False})
    skill=read('nmc-skills-example-reference-locators-v1.json');links=[]
    with fitz.open(files[skill['sourceSha256']]) as doc:
        for ref in skill['references']:
            text=doc[ref['pdfPage']-1].get_text()[ref['startChar']:ref['endChar']]
            if digest(text)!=ref['rawSpanSha256']:raise ValueError('skill_reference_hash_mismatch')
            links.append({'referenceAppearanceId':ref['appearanceId'],'baseRegionCandidates':base_codes.get(digest(re.sub(r'\s','',text)),[]),
                          'relation':'literal_identifier_match_only','semanticEquivalenceApproved':False})
    framework=read('nmc-volume-framework-comparison.json');compound=[]
    for relationship in framework['candidateRelationships']:
        role,ordinal=relationship['opening'].split(':')[1:]
        opening=next(r for r in records if r['scope']=='opening:global:'+role and r['ordinal']==int(ordinal.replace('bullet','')))
        for volume in framework['volumes']:
            targets=[next(r for r in records if r['scope']=='global:volume'+volume['volume'] and r['ordinal']==volume['sourceCodes'].index(code)+1)['appearanceId'] for code in relationship['volumeCodes']]
            compound.append({'openingAppearanceId':opening['appearanceId'],'volume':volume['volume'],
                'volumeAppearanceIds':targets,'relation':'candidate_split_or_combined_clause','semanticEquivalenceApproved':False})
    fragment=[r['appearanceId'] for r in records if r['scope']=='volume2:institutional' and r['ordinal'] in [11,12]]
    if len(fragment)!=2:raise ValueError('institutional_fragment_scope')
    names=['nmc-2024-goal-locators.json','nmc-volume-framework-comparison.json','nmc-global-support-review-queue.json',
           'nmc-skills-example-reference-locators-v1.json','nmc-supplement-sources.json','nmc-aetcom-list-marker-comparison-v1.json',
           'nmc-aetcom-variant-triage-v1.json','nmc-row-region-inventory-v1.json','nmc-foundation-completion-register-v1.json']
    aetcom=read('nmc-aetcom-list-marker-comparison-v1.json')
    with tempfile.TemporaryDirectory(prefix='nmc-aetcom-verify-') as temporary:
        output=Path(temporary)/'comparison.json'
        subprocess.run([sys.executable,str(Path(__file__).with_name('aetcom_list_marker_audit.py')),
                        str(files[aetcom['sourceSha256']]),str(output)],capture_output=True,check=True)
        if canonical(json.loads(output.read_bytes(),object_pairs_hook=no_duplicates))!=canonical(aetcom):raise ValueError('aetcom_rebuild_mismatch')
    next_task=next(t for t in read('nmc-foundation-completion-register-v1.json')['tasks'] if t['id']=='current-cohort-applicability')
    return {'schemaVersion':1,'kind':'nmc-global-support-mechanical-overlap-investigation','sourceSha256':SOURCE_SHA,
        'sourceRights':'citation_only','sourceTextStored':False,'goalAppearances':records,'goalScopeCounts':dict(sorted(Counter(r['scope'] for r in records).items())),
        'literalGoalGroups':exact_groups(records),'skillsReferenceLinks':links,'supportSourceChecks':support,
        'candidateCompoundRelationships':compound,
        'institutionalFragmentCandidate':{'appearanceIds':fragment,'relation':'candidate_goal_split_into_two_source_labels','logicalMergeApproved':False},
        'aetcomExistingFormattingComparison':{'artifact':'nmc-aetcom-list-marker-comparison-v1.json','totals':aetcom['totals'],'reverifiedFromPdfThisRun':True},
        'selectedMechanicalAuditComplete':True,'allSupplementContentEnumerationComplete':False,
        'allCompoundClausesSemanticallyEnumerated':False,'semanticEquivalenceApproved':False,'supportUnionApproved':False,
        'effectiveUniqueRequirementTotal':None,'packageTwoAccepted':False,'packageThreeCanProceed':next_task['dependsOn']==[],'learnerActivation':False,
        'bindings':[{'path':n,'sha256':hashlib.sha256((e/n).read_bytes()).hexdigest()} for n in names]}


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('base_pdf',type=Path);p.add_argument('supplement_dir',type=Path)
    p.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[2]);p.add_argument('--out',type=Path);p.add_argument('--verify',type=Path);args=p.parse_args()
    packet=build(args.root,args.base_pdf,args.supplement_dir)
    if args.verify:verify_packet(json.loads(args.verify.read_bytes(),object_pairs_hook=no_duplicates),packet)
    if args.out:
        with args.out.open('x') as f:f.write(canonical(packet)+'\n')
    print(json.dumps({'goalAppearances':len(packet['goalAppearances']),'skillsReferenceAppearances':len(packet['skillsReferenceLinks']),
        'skillsWithLiteralBaseCandidate':sum(bool(r['baseRegionCandidates']) for r in packet['skillsReferenceLinks']),
        'supportSourcesHashChecked':len(packet['supportSourceChecks']),'uniqueRequirementsCertified':False}))


if __name__=='__main__':main()
