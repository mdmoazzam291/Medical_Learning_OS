"""Evidence-bound AI schedule/template proposals; no learner-policy authority."""
import argparse
import hashlib
import json
from pathlib import Path

from codecell_inventory import ELIGIBILITY,canonical,digest
from review_package import no_duplicates

PARENT_SHA='a8f06cc82542fc23c78b71457199042c3894a703b888724270032d6bea5501a4'
METHOD='fap-visual-schedule-template-proposals-v1'
ROLES={'institution':'institution_context','university':'institution_context',
       'student_name':'learner_identifier_context','roll_number':'learner_identifier_context','batch':'learner_identifier_context',
       'community_address':'community_context','family_count':'community_context',
       'household_head_names':'household_identification_candidate','screening_dates':'activity_evidence_candidate',
       'faculty_mentor':'supervision_context','pg_sr_mentors':'supervision_context','paramedical_mentors':'supervision_context'}


def build(parent_bytes):
    if hashlib.sha256(parent_bytes).hexdigest()!=PARENT_SHA:raise ValueError('source_fragment_version_mismatch')
    parent=json.loads(parent_bytes,object_pairs_hook=no_duplicates)
    def fragment(page,column,ordinal):
        rows=[r for r in parent['cellFragments'] if (r['pdfPage'],r['columnIndex'],r['localFragmentOrdinal'])==(page,column,ordinal)]
        if len(rows)!=1:raise ValueError('source_fragment_unresolved')
        r=rows[0]
        return {k:r[k] for k in ['fragmentId','pdfPage','columnIndex','pixelBBox','cropPixelSha256','ocrTextSha256']}
    # AI visual readings of the pinned source, not automatic OCR correction.
    specs=[(1,24,4,8,[1,4],[(67,0,2),(68,0,1)],[(67,5,2)]),
           (2,24,4,8,[5,8],[(68,0,2),(69,0,1)],[(68,5,2),(69,5,1)]),
           (3,36,6,12,[9,14],[(69,0,2),(70,0,1)],[(69,5,2),(70,5,1)])]
    schedules=[]
    for year,hours,full,short,topics,year_refs,hour_refs in specs:
        if full*6!=hours or short*3!=hours:raise ValueError('proposal_arithmetic_inconsistent')
        proposal={'sourceYearLabelCandidate':year,'totalHoursVisualCandidate':hours,
                  'visitTopicLabelRangeCandidate':topics,
                  'alternatives':[{'nominalHoursPerVisit':6,'durationQualifier':'around','minimumVisitsVisualCandidate':full},
                                  {'nominalHoursPerVisit':3,'durationQualifier':'if_three_hour_visit','visitsVisualCandidate':short}],
                  'yearContextEvidence':[fragment(*ref) for ref in year_refs],
                  'hoursEvidence':[fragment(*ref) for ref in hour_refs],
                  'candidateHoursContinuationAcrossImages':len(hour_refs)>1,
                  'ocrAloneSufficient':False,'visualNumericReadingRequired':True,
                  'status':'AI_source_interpretation_pending','decision':None}
        proposal['proposalDigest']=digest(canonical(proposal));schedules.append(proposal)
    fields=[]
    if set(ROLES)!={f['localFieldKey'] for f in parent['logbookTemplateFields']}:raise ValueError('template_scope_mismatch')
    for field in parent['logbookTemplateFields']:
        fields.append({'sourceFieldEvidence':field,'candidateRole':ROLES[field['localFieldKey']],
                       'sourceMandatoryStatus':'not_determined','appFieldImplemented':False,'decision':None})
    payload={'schemaVersion':1,'kind':'fap-ai-schedule-and-template-proposals','method':METHOD,
             'authorRole':'AI_visual_source_interpretation','sourceRights':'citation_only','sourceTextStored':False,
             'sourceSha256':parent['sourceSha256'],'parentArtifactSha256':PARENT_SHA,
             'scheduleProposals':schedules,'templateRoleProposals':fields,
             'sourceTemplateModificationNote':parent['institutionModificationNote'],
             'nominalHoursSumArithmeticOnly':sum(s['totalHoursVisualCandidate'] for s in schedules),
             'fixedVisitCountImposed':False,'clinicalTableRowsApproved':False,'templateMandatorySchemaApproved':False,
             'cohortApplicabilityApproved':False,'learnerPlansChanged':False,'eligibility':dict(ELIGIBILITY)}
    return dict(payload,packageDigest=digest(canonical(payload)))


def verify(packet,parent_bytes):
    if canonical(packet)!=canonical(build(parent_bytes)):raise ValueError('stale_or_modified_ai_proposals')
    return True


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['build','verify']);parser.add_argument('packet',type=Path)
    args=parser.parse_args();root=Path(__file__).resolve().parents[2]/'docs/evidence'
    data=(root/'nmc-fap-table-fragments-logbook-v1.json').read_bytes()
    if args.action=='verify':verify(json.loads(args.packet.read_bytes(),object_pairs_hook=no_duplicates),data)
    else:
        packet=build(data)
        with args.packet.open('x',encoding='utf-8') as output:output.write(canonical(packet)+'\n')
    print(json.dumps({'scheduleProposals':3,'templateRoleProposals':12,'acceptedDecisions':0,'learnerPlansChanged':False}))


if __name__=='__main__':main()
