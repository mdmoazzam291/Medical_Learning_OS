import unittest
from skills_examples import references,objective_blocks


class SkillsExampleTests(unittest.TestCase):
    def test_split_reference_preserves_prefix_and_hash_without_exporting_code(self):
        rows=references('FM\n4.19; IM12.14','sample',1)
        self.assertEqual([r['sourcePrefix'] for r in rows],['FM','IM'])
        self.assertNotIn('IM12.14',str(rows))
        self.assertEqual(rows[0]['whitespaceCollapsedCodeSha256'],references('FM4.19','sample',1)[0]['whitespaceCollapsedCodeSha256'])

    def test_repeated_references_retain_distinct_physical_appearances(self):
        rows=references('SU29.7 and SU29.7','sample',1)
        self.assertEqual(len(rows),2);self.assertNotEqual(rows[0]['appearanceId'],rows[1]['appearanceId'])
        self.assertEqual(rows[0]['whitespaceCollapsedCodeSha256'],rows[1]['whitespaceCollapsedCodeSha256'])

    def test_objectives_remain_one_block_and_exclude_background(self):
        text='2. Objectives:\na. first\nb. second\n3. Background Knowledge:\nSU29.7'
        rows=objective_blocks([(1,text)],'sample')
        self.assertEqual(len(rows),1);self.assertIsNone(rows[0]['ordinal'])
        self.assertEqual(rows[0]['bodySha256'],objective_blocks([(1,'Objectives:\na. first\nb. second')],'sample')[0]['bodySha256'])

    def test_no_objective_heading_does_not_invent_a_block(self):
        self.assertEqual(objective_blocks([(1,'Relevant competencies:\nSU29.7\nTask training activities')],'sample'),[])


if __name__=='__main__':unittest.main()
