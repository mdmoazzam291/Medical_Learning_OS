import copy
import unittest
from uncoded_dispositions import classify_text, preceding_identifier, inspect_bands, verify_packet
from row_body_audit import build_audit


class UncodedDispositionTests(unittest.TestCase):
    def test_heading_syntax_keeps_unnumbered_topic_unknown(self):
        self.assertEqual(classify_text('Topic: 73 Example'),('topic_heading_syntax',73))
        self.assertEqual(classify_text('Topic1: Example'),('topic_heading_syntax',1))
        self.assertEqual(classify_text('Topical treatment'),('continuation_candidate',None))
        self.assertEqual(classify_text('Topic: Example'),('topic_heading_syntax',None))
        self.assertEqual(classify_text('SUBJECT (Topics=12, Competencies=34)'),('subject_heading_syntax',None))
        self.assertEqual(classify_text('continued details'),('continuation_candidate',None))

    def test_parent_proposal_respects_subject_and_adjacent_page_scope(self):
        previous={'regionId':'a','prefix':'AN','pdfPage':1,'kind':'standard'}
        current={'regionId':'b','prefix':'AN','pdfPage':2,'kind':'empty'}
        self.assertEqual(preceding_identifier([previous,current],1),previous)
        for key,value in [('prefix','PY'),('pdfPage',4)]:
            changed=copy.deepcopy(current);changed[key]=value
            self.assertIsNone(preceding_identifier([previous,changed],1))

    def fixture(self):
        regions=[{'regionId':'a'*64,'pdfPage':1,'prefix':'AN','bbox':[0,0,10,10],'kind':'standard'},
                 {'regionId':'b'*64,'pdfPage':1,'prefix':'AN','bbox':[0,10,10,20],'kind':'empty'}]
        words={1:[[1,1,4,3,'ID'],[12,9,20,11,'continued']]}
        inventory={'sourceSha256':'c'*64,'regions':regions};audit=build_audit(inventory,words)
        return inventory,audit,words

    def test_continuation_is_a_proposal_and_crossing_word_is_retained_once(self):
        packet=inspect_bands(*self.fixture())
        self.assertEqual(len(packet['uncodedBands']),1)
        self.assertEqual(len(packet['boundaryWords']),1)
        self.assertEqual(packet['uncodedBands'][0]['parentRegionId'],'a'*64)
        self.assertFalse(packet['logicalMergesApproved'])
        self.assertFalse(packet['learnerActivation'])

    def test_changed_body_or_false_approval_invalidates_packet(self):
        inputs=self.fixture();packet=inspect_bands(*inputs)
        changed=copy.deepcopy(packet);changed['logicalMergesApproved']=True
        with self.assertRaises(ValueError):verify_packet(changed,packet)
        inputs[2][1][1][4]='changed'
        with self.assertRaises(ValueError):inspect_bands(*inputs)


if __name__=='__main__':unittest.main()
