import copy
import unittest

from amendment_projection import build_metadata, project_reference, validate_metadata


class AmendmentProjectionTests(unittest.TestCase):
    def packet(self):
        spans=[[{'source':'clarification','pdfPage':page,
                 'startChar':i*10,'endChar':i*10+9,'bodySha256':'a'*64} for page in pages]
               for i,pages in enumerate([[3]]*5+[[3,4],[4],[4]])]
        targets={code:{'source':'base','pdfPage':page,'startChar':0,'endChar':5,'bodySha256':'b'*64}
                 for code,page in [('PS9.2',353),('PY9.1',157),('PE6.4',331)]}
        return build_metadata(spans,targets)

    def test_deleted_reference_cannot_use_old_wording(self):
        result=project_reference(self.packet(),'PS9.2')
        self.assertEqual(result['sourceState'],'deletion_observed')
        self.assertFalse(result['useBaseWording'])
        self.assertFalse(result['learnerEligible'])

    def test_replacements_preserve_source_version_without_copying_wording(self):
        for code in ['PY9.1','PE6.4']:
            result=project_reference(self.packet(),code)
            self.assertEqual(result['sourceState'],'replacement_observed')
            self.assertFalse(result['useBaseWording'])
            self.assertFalse(result['updatedWordingStored'])
        with self.assertRaisesRegex(ValueError,'outside_selected_amendment_scope'):
            project_reference(self.packet(),'AN1.1')

    def test_all_eight_clauses_required_without_duplicate_or_false_approval(self):
        p=self.packet();self.assertEqual(len(p['clauses']),8);self.assertTrue(validate_metadata(p))
        mutations=[lambda x:x['clauses'].pop(),lambda x:x['clauses'].__setitem__(1,copy.deepcopy(x['clauses'][0])),
                   lambda x:x.__setitem__('clinicalApproval',True),lambda x:x['sources']['base'].__setitem__('sha256','0'*64),
                   lambda x:x['clauses'][0].__setitem__('operation','approved')]
        for mutate in mutations:
            q=copy.deepcopy(p);mutate(q)
            with self.assertRaises(ValueError):validate_metadata(q)

    def test_builder_does_not_expose_global_source_profile_for_mutation(self):
        packet=self.packet();packet['sources']['base']['sha256']='0'*64
        self.assertEqual(self.packet()['sources']['base']['sha256'],
                         'aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c')
        packet['clauses'][0]['competencyReferences'][0]='changed'
        self.assertEqual(self.packet()['clauses'][0]['competencyReferences'],['PS9.2'])


if __name__=='__main__':unittest.main()
