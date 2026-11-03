import copy
import json
from pathlib import Path
import unittest
from codecell_inventory import canonical,digest
from validate_online_assessment import validate_metadata,build_scan,verify_scan


class OnlineAssessmentTests(unittest.TestCase):
    def setUp(self):
        self.packet=json.loads((Path(__file__).resolve().parents[2]/'docs/evidence/nmc-online-assessment-access-observations-v1.json').read_bytes())

    def test_selected_guidance_never_approves_learner_policy(self):
        self.assertTrue(validate_metadata(self.packet));self.assertEqual(len(self.packet['records']),31)
        self.assertFalse(self.packet['learnerEligibilityRulesApproved'])
        r=self.packet['records'][0];r['candidateRole']='learner_requirement';r['recordDigest']=digest(canonical({k:v for k,v in r.items() if k!='recordDigest'}))
        with self.assertRaises(ValueError):validate_metadata(self.packet)

    def test_literal_matcher_is_bounded_and_not_semantic_permission(self):
        scan=build_scan(['Privacy and consent.','confidentiality and data\nprotection; nonconfidential'])
        self.assertTrue(all(v==1 for v in scan['totals'].values()))
        self.assertFalse(scan['recordingOrMonitoringPermissionGranted'])
        empty=build_scan(['No searched terms.']);self.assertTrue(all(v==0 for v in empty['totals'].values()))
        self.assertFalse(empty['literalAbsenceProvesNoPrivacyObligations'])

    def test_changed_page_or_approval_flag_invalidates_diagnostic(self):
        scan=build_scan(['source']);self.assertTrue(verify_scan(scan,['source']))
        with self.assertRaises(ValueError):verify_scan(scan,['changed source'])
        changed=copy.deepcopy(scan);changed['sharingPermissionGranted']=True
        with self.assertRaises(ValueError):verify_scan(changed,['source'])


if __name__=='__main__':unittest.main()
