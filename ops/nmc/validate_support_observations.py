"""Validate selected support-source observations; never adopt regulatory rules."""
import argparse
import hashlib
import json
from pathlib import Path
import re

from codecell_inventory import ELIGIBILITY,canonical,digest
from review_package import no_duplicates

SOURCES={'logbook2020':{'sha256':'8fa1280d3efa18d9f621d84e69f294dd2a3fa960b3c9425865ea10df7917010f','pageCount':32},
         'assessment2019':{'sha256':'a0bfd45c9424d90b254605fc118b9c630681e7d455f37c41a3c1239d3e7e384c','pageCount':36}}
IDS={'logbook-format-flexibility','portfolio-desirability','faculty-entry-selection','institution-logbook-format',
     'activity-not-whole-competency','faculty-completion-criteria','performance-record-transfer','phase-logbook-organisation','summary-percentage-scope'}
IDS|={'logbook-column-'+str(n) for n in range(1,9)}|{'sample-template-'+str(n) for n in [10,11,12]}|{'proposed-regulation-marker-'+str(n) for n in [20,25]}
KINDS={'institution_format_discretion','portfolio_format_alternative','entry_selection','format_discretion',
       'activity_scope_limit','completion_criteria_and_remediation','administrative_record_transfer',
       'phase_record_organisation','administrative_summary_not_mastery','sample_column_explanation',
       'illustrative_template_projection','quoted_proposed_regulation_marker'}
ROLES={'institution_context','mixed_context','faculty_context','learner_evidence_context',
       'competency_reference','activity','completion_date','attempt','rating','faculty_decision',
       'faculty_signoff','learner_feedback_acknowledgement','sample_not_fixed_schema','not_current_rule_acceptance'}
SCOPE='selected core logbook guidance, eight sample-column explanations, three template projections and two proposed-regulation markers'


def require(condition):
    if not condition:raise ValueError('invalid_selected_support_observations')


def validate_body(record,text):
    a,b=record['startChar'],record['endChar']
    require(type(a) is int and type(b) is int and 0<=a<b<=len(text))
    require(digest(text[a:b])==record['bodySha256'])
    return True


def validate_metadata(packet):
    require(set(packet)=={'schemaVersion','kind','authorRole','sourceRights','sourceTextStored','sources','records','selectionScope','allRequirementsEnumerated','activityCompletionEqualsWholeCompetencyMastery','sourceRatingAlternativesResolved','learnerEligibilityRulesApproved','eligibility'})
    require(type(packet['schemaVersion']) is int and packet['schemaVersion']==1)
    require(packet['kind']=='logbook-assessment-selected-source-observations' and packet['authorRole']=='AI_source_investigation')
    require(packet['sourceRights']=='citation_only' and packet['sourceTextStored'] is False)
    require(type(packet['selectionScope']) is str and packet['selectionScope']==SCOPE)
    require(canonical(packet['sources'])==canonical(SOURCES) and canonical(packet['eligibility'])==canonical(ELIGIBILITY))
    require(all(packet[key] is False for key in ['allRequirementsEnumerated','activityCompletionEqualsWholeCompetencyMastery','sourceRatingAlternativesResolved','learnerEligibilityRulesApproved']))
    require(len(packet['records'])==len(IDS) and {r['id'] for r in packet['records']}==IDS)
    for record in packet['records']:
        require(set(record)=={'id','source','pdfPage','startChar','endChar','bodySha256','candidateKind','candidateRole','status','decision','recordDigest'})
        require(record['source'] in SOURCES)
        require(type(record['pdfPage']) is int and 1<=record['pdfPage']<=SOURCES[record['source']]['pageCount'])
        require(type(record['startChar']) is int and type(record['endChar']) is int and 0<=record['startChar']<record['endChar'])
        require(isinstance(record['bodySha256'],str) and re.fullmatch('[0-9a-f]{64}',record['bodySha256']))
        require(record['status']=='AI_source_observation_pending' and record['decision'] is None)
        require(type(record['candidateKind']) is str and record['candidateKind'] in KINDS)
        require(type(record['candidateRole']) is str and record['candidateRole'] in ROLES)
        require(record['recordDigest']==digest(canonical({k:v for k,v in record.items() if k!='recordDigest'})))
    return True


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('logbook_pdf',type=Path);parser.add_argument('assessment_pdf',type=Path)
    parser.add_argument('--packet',type=Path,default=Path(__file__).resolve().parents[2]/'docs/evidence/nmc-logbook-assessment-observations-v1.json')
    args=parser.parse_args();packet=json.loads(args.packet.read_bytes(),object_pairs_hook=no_duplicates);validate_metadata(packet)
    import fitz
    if fitz.VersionBind!='1.26.6':raise ValueError('pymupdf_version_mismatch')
    checked=0
    for source,path in [('logbook2020',args.logbook_pdf),('assessment2019',args.assessment_pdf)]:
        data=path.read_bytes()
        if hashlib.sha256(data).hexdigest()!=SOURCES[source]['sha256']:raise ValueError('source_hash_mismatch')
        with fitz.open(stream=data,filetype='pdf') as document:
            require(len(document)==SOURCES[source]['pageCount'])
            for record in packet['records']:
                if record['source']==source:validate_body(record,document[record['pdfPage']-1].get_text());checked+=1
    print(json.dumps({'selectedObservationBodiesVerified':checked,'acceptedRules':0,'learnerEligibilityChanged':False}))


if __name__=='__main__':main()
