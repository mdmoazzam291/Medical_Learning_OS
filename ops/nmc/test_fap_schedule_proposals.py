import copy
from pathlib import Path
import unittest
from fap_schedule_proposals import build,verify


class FapProposalTests(unittest.TestCase):
    def setUp(self):
        self.data=(Path(__file__).resolve().parents[2]/'docs/evidence/nmc-fap-table-fragments-logbook-v1.json').read_bytes()

    def test_alternative_arithmetic_does_not_impose_single_visit_count(self):
        p=build(self.data);self.assertFalse(p['fixedVisitCountImposed'])
        self.assertEqual(p['nominalHoursSumArithmeticOnly'],84)
        for s in p['scheduleProposals']:
            a,b=s['alternatives'];self.assertEqual(a['nominalHoursPerVisit']*a['minimumVisitsVisualCandidate'],s['totalHoursVisualCandidate'])
            self.assertEqual(b['nominalHoursPerVisit']*b['visitsVisualCandidate'],s['totalHoursVisualCandidate'])
            self.assertFalse(s['ocrAloneSufficient']);self.assertIsNone(s['decision'])

    def test_modified_policy_flags_types_or_values_cannot_reuse_digest(self):
        original=build(self.data)
        for change in [lambda p:p.update(fixedVisitCountImposed=True),lambda p:p.update(schemaVersion=True),lambda p:p['scheduleProposals'][0].update(totalHoursVisualCandidate=48)]:
            p=copy.deepcopy(original);change(p)
            with self.assertRaises(ValueError):verify(p,self.data)

    def test_blank_template_is_not_mandatory_application_schema(self):
        p=build(self.data);self.assertEqual(len(p['templateRoleProposals']),12)
        self.assertTrue(all(f['sourceMandatoryStatus']=='not_determined' and f['appFieldImplemented'] is False and f['decision'] is None for f in p['templateRoleProposals']))
        self.assertFalse(p['templateMandatorySchemaApproved']);self.assertFalse(p['learnerPlansChanged'])

    def test_source_artifact_drift_invalidates_old_proposals(self):
        p=build(self.data);self.assertTrue(verify(p,self.data))
        with self.assertRaises(ValueError):verify(p,self.data+b' ')


if __name__=='__main__':unittest.main()
