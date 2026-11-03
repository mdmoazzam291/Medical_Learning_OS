"""Selected teaching-design observations; no learner-competency or policy adoption."""
import argparse
import hashlib
import json
from pathlib import Path

from review_package import no_duplicates
from validate_support_observations import validate_selected_packet,validate_body,require

SOURCES={'alignment2019':{'sha256':'e5cf0a04271ee77f126ee2d991509b6a3481019eda81c3206abda6fa46eb07c9','pageCount':34},
         'online2020':{'sha256':'cf1e82b77aca65c3e4f8b3c6bdee048120616722dc01a78f520984c4dc313c35','pageCount':57}}
IDS={'alignment-definition','integration-definition','linker-definition','legacy-integration-proportion','phase-objective-primacy','unaligned-topic-coverage','subject-assessment-context'}
IDS|={'design-step-'+str(n) for n in range(1,7)}|{'online-principle-'+str(n) for n in range(1,13)}|{'online-role-'+str(n) for n in range(1,9)}|{'online-capability-'+str(n) for n in range(1,6)}|{'online-skill-'+str(n) for n in range(1,6)}
KINDS={'alignment_definition','legacy_curriculum_design_guidance','legacy_assessment_guidance','curriculum_design_step',
       'online_teaching_principle','teacher_role','teacher_capability','teacher_skill_category'}
ROLES={'teaching_design_context','faculty_and_institution_context'}
SCOPE='selected alignment definitions/design guidance/steps and online teaching principles/faculty capabilities'


def validate_metadata(packet):
    return validate_selected_packet(packet,SOURCES,IDS,KINDS,ROLES,SCOPE,'alignment-online-selected-source-observations')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('alignment_pdf',type=Path);parser.add_argument('online_pdf',type=Path)
    parser.add_argument('--packet',type=Path,default=Path(__file__).resolve().parents[2]/'docs/evidence/nmc-alignment-online-observations-v1.json')
    args=parser.parse_args();packet=json.loads(args.packet.read_bytes(),object_pairs_hook=no_duplicates);validate_metadata(packet)
    import fitz
    if fitz.VersionBind!='1.26.6':raise ValueError('pymupdf_version_mismatch')
    checked=0
    for source,path in [('alignment2019',args.alignment_pdf),('online2020',args.online_pdf)]:
        data=path.read_bytes()
        if hashlib.sha256(data).hexdigest()!=SOURCES[source]['sha256']:raise ValueError('source_hash_mismatch')
        with fitz.open(stream=data,filetype='pdf') as document:
            require(len(document)==SOURCES[source]['pageCount'])
            for record in packet['records']:
                if record['source']==source:validate_body(record,document[record['pdfPage']-1].get_text());checked+=1
    print(json.dumps({'selectedTeachingDesignBodiesVerified':checked,'learnerCompetenciesAdded':0,'acceptedRules':0}))


if __name__=='__main__':main()
