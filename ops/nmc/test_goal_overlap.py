import copy
import unittest
from goal_overlap import SourceText, partition, exact_groups, verify_packet, heading_match


class GoalOverlapTests(unittest.TestCase):
    def test_cross_page_spans_preserve_raw_offsets_and_exclude_folio(self):
        source=SourceText(['1\n\na. first body','2\n\ncontinued\nb. next'])
        records=partition(source,0,len(source.full),r'(?m)^([a-b])\.\s*','goal')
        self.assertEqual(len(records),2)
        self.assertEqual(len(records[0]['segments']),2)
        self.assertEqual(source.body(records[0]['segments']),'first body\ncontinued\n')
        self.assertEqual(records[0]['segments'][1]['startChar'],3)

    def test_repeated_labels_remain_distinct_appearances(self):
        source=SourceText(['a. body\nb. body'])
        first=partition(source,0,len(source.full),r'(?m)^([a-b])\.\s*','one')
        second=partition(source,0,len(source.full),r'(?m)^([a-b])\.\s*','two')
        self.assertEqual(len({r['appearanceId'] for r in first+second}),4)
        self.assertEqual(len(exact_groups(first+second)[0]['appearanceIds']),4)

    def test_formatting_match_does_not_normalise_medical_words(self):
        source=SourceText(['a. same body\nb. same   body\nc. different body'])
        records=partition(source,0,len(source.full),r'(?m)^([a-c])\.\s*','goal')
        groups=exact_groups(records)
        self.assertEqual(sorted(len(g['appearanceIds']) for g in groups),[1,2])

    def test_changed_evidence_or_approval_rejects_old_packet(self):
        expected={'semanticEquivalenceApproved':False,'rows':[1]}
        changed=copy.deepcopy(expected);changed['semanticEquivalenceApproved']=True
        with self.assertRaises(ValueError):verify_packet(changed,expected)

    def test_heading_boundary_excludes_number_on_same_or_previous_line(self):
        for text in ['body\n4. Institutional Goals\nnext','body\n2.2\nInstitutional Goals\nnext']:
            match=heading_match(text,r'Institutional\s+Goals')
            self.assertEqual(match.start(),5)


if __name__=='__main__':unittest.main()
