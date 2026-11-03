import unittest
from skills_objective_detail import split_objectives,context_kind,CONTEXT


class SkillsDetailTests(unittest.TestCase):
    def test_bullets_letters_and_roman_markers_keep_distinct_items(self):
        for text,kind in [('intro\n\uf0b7 first\n\uf0b7 second','bullet'),('intro\na. first\nb. second','lettered'),('intro\ni.\nfirst\nii.\nsecond','roman')]:
            spans=split_objectives(text);self.assertEqual(len(spans),2);self.assertTrue(all(s[2]==kind for s in spans))
            self.assertNotIn('intro',text[spans[0][0]:spans[0][1]])

    def test_plain_statement_is_not_artificially_split(self):
        self.assertEqual(split_objectives('By completion, demonstrate a skill.'),[(0,35,'plain',None)])

    def test_missing_letter_or_roman_sequence_fails_closed(self):
        for text in ['a. first\nc. third','i. first\niii. third']:
            with self.assertRaises(ValueError):split_objectives(text)

    def test_reference_heading_is_source_context_not_implicit_semantic_role(self):
        match=CONTEXT.search('3. Background Knowledge:\nSU29.7')
        self.assertEqual(context_kind(match.group(1)),'background_heading')
        self.assertIsNone(CONTEXT.search('This sentence mentions Background Knowledge informally.'))


if __name__=='__main__':unittest.main()
