import unittest
from ece_examples import extract


class EceExampleTests(unittest.TestCase):
    def test_numbered_competencies_and_parenthesized_objectives_are_separate(self):
        text='Expected Competency:\n1. secret\nObjectives:\nAt the end of the ECE module I MBBS student shall be able to:\n1) other\n2) next\nLearning Experiences:\n1. activity'
        rows=extract([(1,text)],'sample')
        self.assertEqual([r['sectionKind'] for r in rows],['sample_expected_competency','sample_learning_objective','sample_learning_objective'])
        self.assertNotIn('secret',str(rows));self.assertNotIn('activity',str(rows))

    def test_intro_line_supplies_objective_heading_only_when_label_absent(self):
        text='Expected Competency\n1. first\nAt the end of the ECE module I MBBS student shall be able to:\n1. objective\nLearning Experiences:'
        self.assertEqual(len(extract([(1,text)],'sample')),2)

    def test_teaching_note_is_not_appended_as_objective_content(self):
        prefix='Objectives\n1. first\n'
        a=extract([(1,prefix+'*Please note teaching details')],'sample')
        b=extract([(1,prefix)],'sample')
        self.assertEqual(a[0]['bodySha256'],b[0]['bodySha256'])

    def test_humanities_is_an_example_with_null_ordinal(self):
        rows=extract([(1,'Competency addressed\nexample\nLearning Session\nHours:8')],'humanities',True)
        self.assertIsNone(rows[0]['ordinal']);self.assertEqual(rows[0]['sectionKind'],'humanities_example_competency')


if __name__=='__main__':unittest.main()
