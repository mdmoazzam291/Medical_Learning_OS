import copy
import unittest
from support_scope_review import validate_packet, seal, verify_page_bbox
from codecell_inventory import digest


class SupportScopeTests(unittest.TestCase):
    def fixture(self):
        row={'sourceId':'sample','pdfPage':1,'startChar':0,'endChar':1,'bodySha256':digest('x'),
             'candidateKind':'sample_objective','parentContextSha256':None,'decision':None}
        row=seal(row)
        return {'schemaVersion':1,'kind':'nmc-full-support-ai-scope-proposals','sourceRights':'citation_only',
            'sourceTextStored':False,'reviewAuthority':'AI_source_investigation',
            'sources':[{'sourceId':'sample','sourceSha256':'a'*64,'pageCount':1,
                        'pageJudgments':[{'pdfPage':1,'category':'teaching_example','pageTextSha256':digest('x'),'decision':None}]}],
            'textCandidates':[row],'rasterCandidates':[],'reviewPacketBindings':[],
            'clinicalApproval':False,'semanticEquivalenceApproved':False,'cohortApplicabilityApproved':False,
            'qualifiedHumanApproval':False,'completeCoverageClaim':False,'learnerActivation':False,
            'allAtomicMedicalRequirementsAccepted':False}

    def test_metadata_cannot_acquire_approval_or_source_prose(self):
        p=self.fixture();profiles={'sample':('a'*64,1)};self.assertTrue(validate_packet(p,profiles))
        for mutate in [lambda q:q.__setitem__('clinicalApproval',True),
                       lambda q:q.__setitem__('sourceTextStored',0),
                       lambda q:q['textCandidates'][0].__setitem__('rawSourceText','protected text'),
                       lambda q:q['sources'][0]['pageJudgments'].clear()]:
            q=copy.deepcopy(p);mutate(q)
            with self.assertRaises(ValueError):validate_packet(q,profiles)

    def test_changed_locator_digest_is_rejected(self):
        p=self.fixture();p['textCandidates'][0]['endChar']=2
        with self.assertRaises(ValueError):validate_packet(p,{'sample':('a'*64,1)})

    def test_source_page_box_must_match_verified_pixel_transform(self):
        self.assertTrue(verify_page_bbox([10,20,30,40],[[10.000001,20,30,40]]))
        with self.assertRaises(ValueError):verify_page_bbox([1,1,2,2],[[10,20,30,40]])


if __name__=='__main__':unittest.main()
