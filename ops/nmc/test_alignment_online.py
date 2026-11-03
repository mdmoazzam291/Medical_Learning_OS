import json
from pathlib import Path
import unittest
from codecell_inventory import canonical,digest
from validate_alignment_online import validate_metadata
from validate_support_observations import validate_metadata as validate_other_scope


class AlignmentOnlineTests(unittest.TestCase):
    def setUp(self):
        self.packet=json.loads((Path(__file__).resolve().parents[2]/'docs/evidence/nmc-alignment-online-observations-v1.json').read_bytes())

    def test_selected_scope_does_not_add_teacher_capabilities_as_learner_competencies(self):
        self.assertTrue(validate_metadata(self.packet));self.assertEqual(len(self.packet['records']),43)
        self.assertTrue(all(r['candidateRole'] in {'teaching_design_context','faculty_and_institution_context'} and r['decision'] is None for r in self.packet['records']))
        self.assertFalse(self.packet['allRequirementsEnumerated'])

    def test_cross_scope_packet_is_not_accepted_by_other_profile(self):
        with self.assertRaises(ValueError):validate_other_scope(self.packet)

    def test_resigned_raw_payload_or_learner_role_cannot_enter_classification(self):
        for value in [{'rawSourceText':'synthetic prose'},'learner_competency']:
            self.setUp();r=self.packet['records'][0];r['candidateRole']=value;r['recordDigest']=digest(canonical({k:v for k,v in r.items() if k!='recordDigest'}))
            with self.assertRaises(ValueError):validate_metadata(self.packet)


if __name__=='__main__':unittest.main()
