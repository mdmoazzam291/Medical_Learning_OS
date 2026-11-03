"""Split pinned sample objective blocks and observe reference heading context."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

from codecell_inventory import ELIGIBILITY, canonical, digest
from skills_examples import SOURCE_SHA

ARTIFACT_SHA='d61833c323f04b5f278258b5ec2463c61ff740e6ee15ea6893eed33c39f05b0a'
METHOD='legacy-skills-objective-and-heading-detail-v1'
MARKER=re.compile(r'(?m)^[ \t]*(\uf0b7|•|▪|[a-z]+\.)(?:[ \t]+|\n)')
CONTEXT=re.compile(r'(?im)^[ \t]*(?:\d+\.[ \t]*)?(Related Competenc[^\n]*|Relevant Competenc[^\n]*|Prior competencies|Background Knowledge|Background Information|Competency in Phase[^\n]*|Competency No[^\n]*|Objectives|Skill training[^\n]*|Suggested Teaching Learning Methods?[^\n]*|Equipment[^\n]*|Setting/Equipment[^\n]*|Skill assessment[^\n]*|Assessment[^\n]*)[ \t]*:?[ \t]*$')


def split_objectives(text):
    markers=list(MARKER.finditer(text))
    if not markers:return [(0,len(text),'plain',None)]
    raw=[m.group(1) for m in markers]
    if all(s in {'\uf0b7','•','▪'} for s in raw):kind='bullet'
    elif raw==[c+'.' for c in 'abcdefghijklmnopqrstuvwxyz'[:len(raw)]]:kind='lettered'
    elif raw==[c+'.' for c in ['i','ii','iii','iv','v','vi','vii','viii','ix','x'][:len(raw)]]:kind='roman'
    else:raise ValueError('objective_marker_sequence_unresolved')
    return [(m.start(),markers[i+1].start() if i+1<len(markers) else len(text),kind,digest(m.group(1))) for i,m in enumerate(markers)]


def context_kind(label):
    label=label.lower()
    for prefix,kind in [('related competenc','related_heading'),('relevant competenc','relevant_heading'),
                        ('prior competenc','prior_heading'),('background','background_heading'),
                        ('competency','competency_heading'),('objectives','objective_heading'),
                        ('skill training','training_heading'),('suggested','teaching_heading'),
                        ('equipment','equipment_heading'),('setting','equipment_heading'),
                        ('skill assessment','assessment_heading'),('assessment','assessment_heading')]:
        if label.startswith(prefix):return kind
    raise ValueError('heading_context_unclassified')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf',type=Path);parser.add_argument('output',type=Path)
    args=parser.parse_args();data=args.pdf.read_bytes()
    if hashlib.sha256(data).hexdigest()!=SOURCE_SHA:raise ValueError('source_hash_mismatch')
    if args.output.suffix!='.json':raise ValueError('invalid_output_path')
    path=Path(__file__).resolve().parents[2]/'docs/evidence/nmc-skills-example-reference-locators-v1.json'
    raw=path.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=ARTIFACT_SHA:raise ValueError('parent_artifact_mismatch')
    parent=json.loads(raw)
    import fitz
    if fitz.VersionBind!='1.26.6':raise ValueError('pymupdf_version_mismatch')
    objectives,contexts=[],[]
    with fitz.open(stream=data,filetype='pdf') as document:
        if len(document)!=56:raise ValueError('page_count_mismatch')
        pages={n:document[n-1].get_text() for n in range(31,57)}
        for block in parent['objectiveSectionBlocks']:
            if len(block['segments'])!=1:raise ValueError('cross_page_block_requires_new_method')
            segment=block['segments'][0];page=segment['pdfPage'];start=segment['startChar']
            text=pages[page][start:segment['endChar']]
            if digest(text)!=block['bodySha256']:raise ValueError('parent_body_mismatch')
            for ordinal,(a,b,kind,marker_hash) in enumerate(split_objectives(text),1):
                selected=text[a:b];a+=len(selected)-len(selected.lstrip());b=a+len(selected.strip())
                if a>=b:raise ValueError('objective_body_missing')
                row={'moduleId':block['moduleId'],'parentBlockAppearanceId':block['appearanceId'],
                     'pdfPage':page,'startChar':start+a,'endChar':start+b,'localOrdinal':ordinal,
                     'sourceMarkerKind':kind,'sourceMarkerSha256':marker_hash,'bodySha256':digest(text[a:b])}
                row['appearanceId']=digest(canonical(dict(row,sourceSha256=SOURCE_SHA,method=METHOD)));objectives.append(row)
        for scope in parent['scopes']:
            previous=None
            for page in range(scope['pdfRange'][0],scope['pdfRange'][1]+1):
                text=pages[page];headings=list(CONTEXT.finditer(text))
                for ref in [r for r in parent['references'] if r['moduleId']==scope['localScopeId'] and r['pdfPage']==page]:
                    if digest(text[ref['startChar']:ref['endChar']])!=ref['rawSpanSha256']:raise ValueError('reference_body_mismatch')
                    local=[h for h in headings if h.end()<=ref['startChar']]
                    heading=({'pdfPage':page,'startChar':local[-1].start(),'endChar':local[-1].end(),
                              'spanSha256':digest(local[-1].group()),'context':context_kind(local[-1].group(1))} if local else previous)
                    contexts.append({'referenceAppearanceId':ref['appearanceId'],'moduleId':ref['moduleId'],
                                     'pdfPage':page,'nearestRecognisedHeading':heading,
                                     'contextCarriedAcrossPage':bool(heading and heading['pdfPage']!=page),
                                     'semanticRoleApproved':False})
                if headings:
                    h=headings[-1];previous={'pdfPage':page,'startChar':h.start(),'endChar':h.end(),
                                             'spanSha256':digest(h.group()),'context':context_kind(h.group(1))}
    result={'schemaVersion':1,'kind':'legacy-skills-objective-and-reference-context-detail','method':METHOD,
            'sourceSha256':SOURCE_SHA,'parentArtifactSha256':ARTIFACT_SHA,'sourceRights':'citation_only','sourceTextStored':False,
            'engine':{'pymupdf':fitz.VersionBind,'mupdf':fitz.VersionFitz},'objectiveAppearances':objectives,'referenceContexts':contexts,
            'totals':{'explicitObjectiveAppearances':len(objectives),'referenceContexts':len(contexts),
                      'objectiveMarkerCounts':dict(sorted(Counter(r['sourceMarkerKind'] for r in objectives).items())),
                      'unlocatedHeadingContexts':sum(r['nearestRecognisedHeading'] is None for r in contexts)},
            'allObjectivesEnumerated':False,'semanticReferenceRolesApproved':False,'examplesAreUniversalAdditions':False,
            'effective2024ApplicabilityApproved':False,'eligibility':dict(ELIGIBILITY)}
    with args.output.open('x',encoding='utf-8') as output:output.write(canonical(result)+'\n')
    print(json.dumps(result['totals']))


if __name__=='__main__':main()
