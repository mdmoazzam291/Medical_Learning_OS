"""Version-qualified source preflight, never admission or learner eligibility."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path
import re

from review_package import no_duplicates
from codecell_inventory import canonical

PURPOSES={'curriculum','admission_accessibility','progression','institutional_governance','faculty_staffing',
          'postgraduate_training','annual_disclosure','guideline_overlay','version_notice'}


def sha(x):return isinstance(x,str) and re.fullmatch('[0-9a-f]{64}',x) is not None


def reference_key(source_sha,prefix,token_sha):
    if not sha(source_sha) or not sha(token_sha) or not isinstance(prefix,str) or not re.fullmatch('[A-Z]{2,4}',prefix):raise ValueError('versioned_reference')
    return source_sha+':'+prefix+':'+token_sha


def validate_rule(rule):
    keys={'sourceId','sourceSha256','program','purpose','documentState','minAdmissionYear','maxAdmissionYear',
          'policyCycle','conditions','accepted','enforcementAllowed'}
    if not isinstance(rule,dict) or set(rule)!=keys:raise ValueError('rule_shape')
    if not isinstance(rule['sourceId'],str) or not re.fullmatch('[a-zA-Z0-9:_-]{1,80}',rule['sourceId']) or not sha(rule['sourceSha256']):raise ValueError('rule_identity')
    if rule['program'] not in ['MBBS','PG','ALL'] or rule['purpose'] not in PURPOSES or rule['documentState'] not in ['published','historical','draft','withdrawn']:raise ValueError('rule_scope')
    for key in ['minAdmissionYear','maxAdmissionYear','policyCycle']:
        if rule[key] is not None and (type(rule[key]) is not int or not 1900<=rule[key]<=2100):raise ValueError('rule_year')
    if rule['minAdmissionYear'] is not None and rule['maxAdmissionYear'] is not None and rule['minAdmissionYear']>rule['maxAdmissionYear']:raise ValueError('rule_year_order')
    if not isinstance(rule['conditions'],list) or any(not isinstance(c,str) or not re.fullmatch('[a-z][a-z0-9_]{0,99}',c) for c in rule['conditions']) or len(set(rule['conditions']))!=len(rule['conditions']):raise ValueError('condition_tags')
    if rule['accepted'] is not False or rule['enforcementAllowed'] is not False:raise ValueError('unapproved_rule')
    return True


def preflight(rule,context):
    validate_rule(rule)
    if not isinstance(context,dict) or set(context)!={'program','admissionYear','purpose','policyYear'}:raise ValueError('context_shape')
    if context['program'] not in ['MBBS','PG'] or context['purpose'] not in PURPOSES:raise ValueError('context_scope')
    for key in ['admissionYear','policyYear']:
        if context[key] is not None and (type(context[key]) is not int or not 1900<=context[key]<=2100):raise ValueError('context_year')
    result='observed_scope_candidate'
    if rule['documentState'] in ['draft','withdrawn']:result='not_effective_candidate'
    elif rule['program']!='ALL' and context['program']!=rule['program']:result='different_program'
    elif context['purpose']!=rule['purpose']:result='different_purpose'
    elif context['admissionYear'] is None:result='unknown_cohort'
    elif rule['policyCycle'] is not None and context['policyYear'] is None:result='unknown_policy_cycle'
    elif rule['policyCycle'] is not None and context['policyYear']!=rule['policyCycle']:result='different_policy_cycle'
    elif rule['minAdmissionYear'] is None and rule['maxAdmissionYear'] is None:result='cohort_scope_requires_review'
    elif rule['minAdmissionYear'] is not None and context['admissionYear']<rule['minAdmissionYear'] or rule['maxAdmissionYear'] is not None and context['admissionYear']>rule['maxAdmissionYear']:result='outside_observed_cohort'
    return {'sourceId':rule['sourceId'],'scopeResult':result,'reviewState':'qualified_acceptance_required',
            'conditions':list(rule['conditions']),'enforcementAllowed':False,'admissionEligibility':None,'learnerActivation':False}


def verify_packet(packet,directory):
    keys={'schemaVersion','kind','sourceRights','sourceTextStored','sources','rules','relations','ocrReceipts',
          'allLaterNoticesExhaustivelyCovered','cohortApplicabilityApproved','clinicalApproval','learnerActivation'}
    if not isinstance(packet,dict) or set(packet)!=keys or type(packet['schemaVersion']) is not int or packet['schemaVersion']!=1 or packet['kind']!='nmc-source-version-applicability-proposals':raise ValueError('packet_shape')
    if packet['sourceRights']!='citation_only' or any(packet[k] is not False for k in ['sourceTextStored','allLaterNoticesExhaustivelyCovered','cohortApplicabilityApproved','clinicalApproval','learnerActivation']):raise ValueError('unapproved_packet')
    import fitz
    if fitz.VersionBind!='1.26.6':raise ValueError('engine_version')
    directory=Path(directory);sources={};needed_ocr=set()
    for source in packet['sources']:
        source_keys={'sourceId','filename','url','sourceSha256','pageCount','archivePublicationDate','printedNoticeDate','gazettePublicationDate','scopeEvidencePages'}
        if not isinstance(source,dict) or set(source)!=source_keys or source['sourceId'] in sources or not re.fullmatch(r'[a-zA-Z0-9_.-]+\.pdf',source['filename']):raise ValueError('source_filename_or_duplicate')
        if not sha(source['sourceSha256']) or not re.fullmatch(r'https://(?:www\.)?nmc\.org\.in/[^\s]+',source['url']) or type(source['pageCount']) is not int or not 1<=source['pageCount']<=2000:raise ValueError('source_provenance')
        for key in ['archivePublicationDate','printedNoticeDate','gazettePublicationDate']:
            if source[key] is not None:
                if not isinstance(source[key],str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}',source[key]):raise ValueError('source_date')
                datetime.date.fromisoformat(source[key])
        pages=source['scopeEvidencePages']
        if not isinstance(pages,list) or not pages or any(type(n) is not int or not 1<=n<=source['pageCount'] for n in pages) or len(set(pages))!=len(pages):raise ValueError('scope_evidence_pages')
        path=directory/source['filename'];data=path.read_bytes()
        if hashlib.sha256(data).hexdigest()!=source['sourceSha256']:raise ValueError('source_hash')
        with fitz.open(stream=data,filetype='pdf') as doc:
            if len(doc)!=source['pageCount']:raise ValueError('source_page_count')
            if source['sourceId'].startswith(('notice:','rules:')):
                needed_ocr.update((source['sourceSha256'],n) for n,page in enumerate(doc,1) if not page.get_text().strip())
        sources[source['sourceId']]=source
    if len(packet['rules'])!=len(sources) or {r['sourceId'] for r in packet['rules']}!=set(sources):raise ValueError('rule_source_set')
    for rule in packet['rules']:
        validate_rule(rule)
        if rule['sourceSha256']!=sources[rule['sourceId']]['sourceSha256']:raise ValueError('rule_source_hash')
    receipt_ids=set();covered_ocr=set()
    for receipt in packet['ocrReceipts']:
        if not isinstance(receipt,dict) or set(receipt)!={'sourceId','pdfPage','renderFile','renderSha256','ocrFile','ocrSha256'}:raise ValueError('ocr_receipt_shape')
        sid=receipt['sourceId']
        if sid not in sources or type(receipt['pdfPage']) is not int or not 1<=receipt['pdfPage']<=sources[sid]['pageCount']:raise ValueError('ocr_source_page')
        pair=(sid,receipt['pdfPage'])
        if pair in receipt_ids:raise ValueError('duplicate_ocr_page')
        receipt_ids.add(pair);covered_ocr.add((sources[sid]['sourceSha256'],receipt['pdfPage']))
        for filename_key,hash_key in [('renderFile','renderSha256'),('ocrFile','ocrSha256')]:
            name=receipt[filename_key]
            if not re.fullmatch('[a-zA-Z0-9_.-]+',name) or hashlib.sha256((directory/name).read_bytes()).hexdigest()!=receipt[hash_key]:raise ValueError('ocr_receipt_hash')
        with fitz.open(directory/sources[sid]['filename']) as doc:
            pix=doc[receipt['pdfPage']-1].get_pixmap(matrix=fitz.Matrix(1.6,1.6))
            if hashlib.sha256(pix.tobytes('png')).hexdigest()!=receipt['renderSha256']:raise ValueError('ocr_render_source_mismatch')
    if not needed_ocr<=covered_ocr:raise ValueError('uncovered_textless_policy_pages')
    for relation in packet['relations']:
        if not isinstance(relation,dict) or set(relation)!={'fromSourceId','toSourceId','relation','accepted'} or relation['fromSourceId'] not in sources or relation['toSourceId'] not in sources or relation['accepted'] is not False or not re.fullmatch('[a-z][a-z0-9_]{0,99}',relation['relation']):raise ValueError('source_relation')
    return True


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source_directory',type=Path);p.add_argument('--packet',type=Path,default=Path(__file__).resolve().parents[2]/'docs/evidence/nmc-source-applicability-proposals-v1.json');args=p.parse_args()
    packet=json.loads(args.packet.read_bytes(),object_pairs_hook=no_duplicates);verify_packet(packet,args.source_directory)
    print(json.dumps({'sourceUrls':len(packet['sources']),'distinctPdfHashes':len({s['sourceSha256'] for s in packet['sources']}),
                      'ocrPageReceipts':len(packet['ocrReceipts']),'enforcementAllowed':False,'cohortApplicabilityApproved':False}))


if __name__=='__main__':main()
