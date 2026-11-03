"""Selected online assessment/access source evidence and bounded lexical diagnostics."""
import argparse
import hashlib
import json
from pathlib import Path
import re

from codecell_inventory import canonical,digest
from review_package import no_duplicates
from validate_support_observations import validate_selected_packet,validate_body

SOURCE_SHA='cf1e82b77aca65c3e4f8b3c6bdee048120616722dc01a78f520984c4dc313c35'
SOURCES={'online2020':{'sha256':SOURCE_SHA,'pageCount':57}}
IDS={'access-check-'+str(n) for n in range(1,7)}|{'assessment-stage-'+str(n) for n in range(1,4)}|{'assessment-stage-2-continuation',
     'camera-attendance-option','procedural-video-workflow','procedural-video-continuation','formative-feedback-workflow','group-feedback-visibility','institution-proctoring-guidance'}
IDS|={'quality-category-'+str(n) for n in range(1,7)}|{'quality-benchmark-'+str(n) for n in range(1,10)}
KINDS={'institution_access_check','assessment_stage_guidance','assessment_stage_continuation','attendance_option_observation',
       'video_workflow_guidance','video_workflow_continuation','formative_feedback_guidance','group_feedback_guidance',
       'institution_proctoring_guidance','institution_quality_category','institution_quality_benchmark'}
ROLES={'faculty_and_institution_context','teaching_feedback_context','institution_exam_context'}
SCOPE='selected online access checks, assessment stages, recording/feedback/proctoring context and quality guidance'
PATTERNS={'privacy':r'\bprivacy\b','consent':r'\bconsent\b','confidential_or_confidentiality':r'\bconfidential(?:ity)?\b','data_protection':r'\bdata\s+protection\b'}


def validate_metadata(packet):
    return validate_selected_packet(packet,SOURCES,IDS,KINDS,ROLES,SCOPE,'online-assessment-access-selected-source-observations')


def build_scan(texts):
    pages=[{'pdfPage':n,'pageTextSha256':digest(text),'termCounts':{key:len(re.findall(pattern,text,re.I)) for key,pattern in PATTERNS.items()}} for n,text in enumerate(texts,1)]
    return {'schemaVersion':1,'kind':'online-source-privacy-term-diagnostic','sourceSha256':SOURCE_SHA,
            'extractor':'PyMuPDF 1.26.6 plain page text','plainTextOnly':True,'imageOcrIncluded':False,
            'sourceTextStored':False,'patterns':PATTERNS,'pages':pages,
            'totals':{key:sum(p['termCounts'][key] for p in pages) for key in PATTERNS},
            'literalAbsenceProvesNoPrivacyObligations':False,'recordingOrMonitoringPermissionGranted':False,
            'sharingPermissionGranted':False,'learnerPolicyChanged':False}


def verify_scan(scan,texts):
    if canonical(scan)!=canonical(build_scan(texts)):raise ValueError('stale_or_modified_literal_diagnostic')
    return True


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('online_pdf',type=Path)
    parser.add_argument('--packet',type=Path,default=Path(__file__).resolve().parents[2]/'docs/evidence/nmc-online-assessment-access-observations-v1.json')
    group=parser.add_mutually_exclusive_group();group.add_argument('--scan',type=Path);group.add_argument('--scan-out',type=Path)
    args=parser.parse_args();packet=json.loads(args.packet.read_bytes(),object_pairs_hook=no_duplicates);validate_metadata(packet)
    data=args.online_pdf.read_bytes()
    if hashlib.sha256(data).hexdigest()!=SOURCE_SHA:raise ValueError('source_hash_mismatch')
    import fitz
    if fitz.VersionBind!='1.26.6':raise ValueError('pymupdf_version_mismatch')
    with fitz.open(stream=data,filetype='pdf') as document:
        if len(document)!=57:raise ValueError('source_page_count_mismatch')
        texts=[p.get_text() for p in document]
        for record in packet['records']:validate_body(record,texts[record['pdfPage']-1])
    scan=build_scan(texts)
    if args.scan:verify_scan(json.loads(args.scan.read_bytes(),object_pairs_hook=no_duplicates),texts)
    if args.scan_out:
        with args.scan_out.open('x',encoding='utf-8') as output:output.write(canonical(scan)+'\n')
    print(json.dumps({'sourceBodiesVerified':len(packet['records']),'plainTextPagesScanned':len(texts),'termCounts':scan['totals'],'permissionsGranted':0,'learnerPolicyChanged':False}))


if __name__=='__main__':main()
