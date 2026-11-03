import unittest
from source_applicability import reference_key, preflight, validate_rule


class ApplicabilityTests(unittest.TestCase):
    def rule(self):
        return {'sourceId':'base2024','sourceSha256':'a'*64,'program':'MBBS','purpose':'curriculum',
                'documentState':'published','minAdmissionYear':2024,'maxAdmissionYear':None,'policyCycle':None,
                'conditions':['qualified_acceptance_required'],'accepted':False,'enforcementAllowed':False}

    def context(self,year=2024,purpose='curriculum'):
        return {'program':'MBBS','admissionYear':year,'purpose':purpose,'policyYear':2026}

    def test_same_token_across_editions_never_implies_same_identity(self):
        self.assertNotEqual(reference_key('a'*64,'DE','c'*64),reference_key('b'*64,'DE','c'*64))
        self.assertNotEqual(reference_key('a'*64,'RT','c'*64),reference_key('a'*64,'RD','c'*64))

    def test_unknown_cohort_or_wrong_purpose_cannot_default_to_latest(self):
        self.assertEqual(preflight(self.rule(),self.context(None))['scopeResult'],'unknown_cohort')
        self.assertEqual(preflight(self.rule(),self.context(2021))['scopeResult'],'outside_observed_cohort')
        self.assertEqual(preflight(self.rule(),self.context(2024,'admission_accessibility'))['scopeResult'],'different_purpose')

    def test_draft_or_withdrawn_document_cannot_be_effective(self):
        for state in ['draft','withdrawn']:
            rule=self.rule();rule['documentState']=state
            self.assertEqual(preflight(rule,self.context())['scopeResult'],'not_effective_candidate')

    def test_scope_match_never_grants_learner_or_admission_eligibility(self):
        result=preflight(self.rule(),self.context())
        self.assertEqual(result['scopeResult'],'observed_scope_candidate')
        self.assertFalse(result['enforcementAllowed']);self.assertIsNone(result['admissionEligibility'])
        rule=self.rule();rule['accepted']=True
        with self.assertRaises(ValueError):validate_rule(rule)
        with self.assertRaises(ValueError):preflight(self.rule(),self.context(True))


if __name__=='__main__':unittest.main()
