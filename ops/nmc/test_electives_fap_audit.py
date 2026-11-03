import unittest
from electives_fap_audit import text_rows,fap_rows


class ElectivesFapTests(unittest.TestCase):
    def test_clause_boundary_excludes_following_guidance(self):
        rows=text_rows('9.3.1 first\n9.3.2 second\nDescription of Curricular program\nother',10,r'^9\.3\.\d+\s+','a'*64,'legacy',r'Description of Curricular program')
        self.assertEqual(len(rows),2);self.assertNotIn('first',str(rows));self.assertLess(rows[-1]['endChar'],30)

    def test_repeated_number_sequence_can_be_distinct_phase_groups(self):
        words=[[148,20,155,30,'1.'],[170,20,240,30,'first'],[148,50,155,60,'1.'],[170,50,240,60,'second']]
        rows=fap_rows(words,66,[('phase2',[1]),('phase3',[1])],[])
        self.assertEqual([r['candidateSourceGroup'] for r in rows],['phase2','phase3'])
        self.assertNotEqual(rows[0]['appearanceId'],rows[1]['appearanceId'])

    def test_missing_phase_marker_fails_closed(self):
        with self.assertRaises(ValueError):fap_rows([],66,[('phase2',[1])],[])

    def test_heading_at_left_of_paragraph_does_not_enter_body(self):
        words=[[148,20,155,30,'1.'],[170,20,240,30,'body']]
        a=fap_rows(words,66,[('phase3',[1])],[])
        b=fap_rows(words+[[99,25,125,35,'Phase']],66,[('phase3',[1])],[])
        self.assertEqual(a,b)


if __name__=='__main__':unittest.main()
