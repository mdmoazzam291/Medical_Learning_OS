"""Metadata-only October 2024 amendment observations; never a learner syllabus."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import re

from codecell_inventory import canonical, digest
from review_package import no_duplicates

SOURCES={'base':{'sha256':'aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c','pages':467},
         'clarification':{'sha256':'62a60b29a1fd5a97f2fcac4a1c3761286f2dac2c371e76047f5ea8cbccb13db0','pages':4}}
PROFILE=[('section_title_and_deletion',['PS9.2']),('replace_wording',['PY9.1']),
         ('disability_competencies_under_review',[]),('replace_wording',['PE6.4']),
         ('existing_global_history_context',[]),('textbook_and_disability_context',[]),
         ('existing_wording_clarification',[]),('scope_statement',[])]
TARGETS={'PS9.2':353,'PY9.1':157,'PE6.4':331}
FLAGS=['clinicalApproval','rightsApproval','cohortApplicabilityApproved','completeCoverageClaim','learnerActivation']


def build_metadata(spans,targets):
    if len(spans)!=8:raise ValueError('eight_clause_spans_required')
    packet={'schemaVersion':1,'kind':'selected-source-amendment-projection','sources':copy.deepcopy(SOURCES),
            'sourceRights':'citation_only','sourceTextStored':False,'effectiveCompetencyTotal':None,
            'clauses':[{'clause':i,'operation':operation,'competencyReferences':list(codes),'spans':copy.deepcopy(span),
                        'status':'AI_source_observation_pending','decision':None}
                       for i,((operation,codes),span) in enumerate(zip(PROFILE,spans),1)],
            'baseReferences':copy.deepcopy(targets),**{flag:False for flag in FLAGS}}
    validate_metadata(packet)
    return packet


def check_span(span,source,page=None):
    if not isinstance(span,dict) or set(span)!={'source','pdfPage','startChar','endChar','bodySha256'}:
        raise ValueError('span_shape')
    if span['source']!=source or type(span['pdfPage']) is not int or not 1<=span['pdfPage']<=SOURCES[source]['pages']:
        raise ValueError('span_source_page')
    if page is not None and span['pdfPage']!=page:raise ValueError('unexpected_page')
    if type(span['startChar']) is not int or type(span['endChar']) is not int or not 0<=span['startChar']<span['endChar']:
        raise ValueError('span_bounds')
    if not isinstance(span['bodySha256'],str) or not re.fullmatch('[0-9a-f]{64}',span['bodySha256']):
        raise ValueError('span_hash')


def validate_metadata(packet):
    keys={'schemaVersion','kind','sources','sourceRights','sourceTextStored','effectiveCompetencyTotal','clauses','baseReferences',*FLAGS}
    if not isinstance(packet,dict) or set(packet)!=keys:raise ValueError('packet_shape')
    if type(packet['schemaVersion']) is not int or packet['schemaVersion']!=1 or packet['kind']!='selected-source-amendment-projection':raise ValueError('packet_version')
    if canonical(packet['sources'])!=canonical(SOURCES) or packet['sourceRights']!='citation_only' or packet['sourceTextStored'] is not False:raise ValueError('source_binding')
    if packet['effectiveCompetencyTotal'] is not None or any(packet[f] is not False for f in FLAGS):raise ValueError('unapproved_projection')
    clauses=packet['clauses']
    if not isinstance(clauses,list) or len(clauses)!=8:raise ValueError('eight_clauses_required')
    for i,(clause,(operation,codes)) in enumerate(zip(clauses,PROFILE),1):
        if not isinstance(clause,dict) or set(clause)!={'clause','operation','competencyReferences','spans','status','decision'}:raise ValueError('clause_shape')
        if type(clause['clause']) is not int or clause['clause']!=i or clause['operation']!=operation or canonical(clause['competencyReferences'])!=canonical(codes):raise ValueError('clause_profile')
        if clause['status']!='AI_source_observation_pending' or clause['decision'] is not None:raise ValueError('unapproved_clause')
        pages=[3] if i<=5 else ([3,4] if i==6 else [4])
        if not isinstance(clause['spans'],list) or len(clause['spans'])!=len(pages):raise ValueError('physical_clause_spans')
        for span,page in zip(clause['spans'],pages):check_span(span,'clarification',page)
    if not isinstance(packet['baseReferences'],dict) or set(packet['baseReferences'])!=set(TARGETS):raise ValueError('base_reference_set')
    for code,page in TARGETS.items():check_span(packet['baseReferences'][code],'base',page)
    return True


def project_reference(packet,code):
    validate_metadata(packet)
    if code not in TARGETS:raise ValueError('outside_selected_amendment_scope')
    clause=next(c for c in packet['clauses'] if code in c['competencyReferences'])
    return {'code':code,'sourceState':'deletion_observed' if code=='PS9.2' else 'replacement_observed',
            'useBaseWording':False,'updatedWordingStored':False,'learnerEligible':False,
            'sourceAcceptance':'pending','cohortApplicability':'pending','amendmentSpans':clause['spans']}


def source_packet(base_texts,clar_texts):
    t=clar_texts[2];u=clar_texts[3]
    starts=[re.search(r'(?m)^\s*'+str(i)+r'\.\s+',t).start() for i in range(1,7)]
    next_starts=[re.search(r'(?m)^\s*'+str(i)+r'\.\s+',u).start() for i in [7,8]]
    def span(source,page,text,a,b):
        return {'source':source,'pdfPage':page,'startChar':a,'endChar':b,'bodySha256':digest(text[a:b])}
    spans=[[span('clarification',3,t,starts[i],starts[i+1])] for i in range(5)]
    spans += [[span('clarification',3,t,starts[5],t.index('D-11011',starts[5])),span('clarification',4,u,0,next_starts[0])],
              [span('clarification',4,u,next_starts[0],next_starts[1])],
              [span('clarification',4,u,next_starts[1],u.index('************************'))]]
    targets={}
    for code,page in TARGETS.items():
        prefix,tail=code[:2],code[2:];a,b=tail.split('.')
        matches=list(re.finditer(r'(?m)^\s*'+prefix+r'\s*'+a+r'\s*\.\s*'+b+r'(?!\d)',base_texts[page-1]))
        if len(matches)!=1:raise ValueError('base_reference_not_unique')
        match=matches[0];targets[code]=span('base',page,base_texts[page-1],match.start(),match.end())
    return build_metadata(spans,targets)


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('base_pdf',type=Path);p.add_argument('clarification_pdf',type=Path)
    p.add_argument('--verify',type=Path);p.add_argument('--out',type=Path);args=p.parse_args()
    import fitz
    if fitz.VersionBind!='1.26.6':raise ValueError('pymupdf_version_mismatch')
    texts={}
    for name,path in [('base',args.base_pdf),('clarification',args.clarification_pdf)]:
        data=path.read_bytes()
        if hashlib.sha256(data).hexdigest()!=SOURCES[name]['sha256']:raise ValueError('source_hash_mismatch')
        with fitz.open(stream=data,filetype='pdf') as doc:
            if len(doc)!=SOURCES[name]['pages']:raise ValueError('page_count_mismatch')
            texts[name]=[page.get_text() for page in doc]
    result=source_packet(texts['base'],texts['clarification'])
    if args.verify:
        old=json.loads(args.verify.read_bytes(),object_pairs_hook=no_duplicates)
        if canonical(old)!=canonical(result):raise ValueError('stale_or_modified_amendment_evidence')
    if args.out:
        with args.out.open('x') as f:f.write(canonical(result)+'\n')
    print(json.dumps({'clauses':8,'physicalClauseSpans':9,'changedCompetencyReferences':3,'effectiveTotal':None,'learnerActivation':False}))


if __name__=='__main__':main()
