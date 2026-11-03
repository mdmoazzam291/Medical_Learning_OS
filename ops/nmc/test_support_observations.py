import copy
import json
from pathlib import Path
import unittest
from codecell_inventory import canonical,digest
from validate_support_observations import validate_metadata,validate_body


class SupportObservationTests(unittest.TestCase):
    def setUp(self):
        self.packet=json.loads((Path(__file__).resolve().parents[2]/'docs/evidence/nmc-logbook-assessment-observations-v1.json').read_bytes())

    def resign(self,record):record['recordDigest']=digest(canonical({k:v for k,v in record.items() if k!='recordDigest'}))

    def test_actual_metadata_preserves_selected_scope_without_rule_acceptance(self):
        self.assertTrue(validate_metadata(self.packet));self.assertEqual(len(self.packet['records']),22)
        self.assertFalse(self.packet['activityCompletionEqualsWholeCompetencyMastery'])
        self.assertFalse(self.packet['learnerEligibilityRulesApproved'])

    def test_body_offsets_are_unicode_character_bounds_not_byte_bounds(self):
        record={'startChar':1,'endChar':3,'bodySha256':digest('éβ')}
        self.assertTrue(validate_body(record,'xéβz'))
        with self.assertRaises(ValueError):validate_body(record,'xéγz')
        record['endChar']=99
        with self.assertRaises(ValueError):validate_body(record,'xéβz')

    def test_missing_duplicate_or_stale_observations_fail(self):
        for mode in ['missing','duplicate','changed']:
            self.setUp()
            if mode=='missing':self.packet['records'].pop()
            elif mode=='duplicate':self.packet['records'][1]=copy.deepcopy(self.packet['records'][0])
            else:self.packet['records'][0]['candidateRole']='changed'
            with self.assertRaises(ValueError):validate_metadata(self.packet)

    def test_resigned_decision_and_numeric_false_cannot_approve_rules(self):
        r=self.packet['records'][0];r['decision']='accepted';self.resign(r)
        with self.assertRaises(ValueError):validate_metadata(self.packet)
        self.setUp();self.packet['learnerEligibilityRulesApproved']=0
        with self.assertRaises(ValueError):validate_metadata(self.packet)

    def test_source_identity_and_page_bounds_are_enforced(self):
        self.packet['sources']['logbook2020']['sha256']='0'*64
        with self.assertRaises(ValueError):validate_metadata(self.packet)
        self.setUp();r=self.packet['records'][0];r['pdfPage']=999;self.resign(r)
        with self.assertRaises(ValueError):validate_metadata(self.packet)

    def test_resigned_classification_payloads_cannot_smuggle_prose_or_flags(self):
        for field,value in [('candidateKind',None),('candidateRole',{'rawSourceText':'synthetic prose','learnerActivation':True}),('candidateRole','arbitrary synthetic prose')]:
            self.setUp();record=self.packet['records'][0];record[field]=value;self.resign(record)
            with self.assertRaises(ValueError):validate_metadata(self.packet)
        self.setUp();self.packet['selectionScope']={'sourceText':'synthetic prose'}
        with self.assertRaises(ValueError):validate_metadata(self.packet)


if __name__=='__main__':unittest.main()
