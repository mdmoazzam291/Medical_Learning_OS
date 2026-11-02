import unittest
from aetcom_modules import module_heading, match_appendix


class ModuleComparisonTests(unittest.TestCase):
    def test_only_line_heading_binds_module_not_inline_reference(self):
        self.assertEqual(module_heading('Module 2.6: title\nCompetency addressed\nSee Module 2.5 for context.'), '2.6')
        self.assertIsNone(module_heading('See Module 2.5\nCompetencies addressed'))

    def test_module_without_table_heading_is_not_assumed_to_have_rows(self):
        self.assertIsNone(module_heading('Module 2.5: teaching activity'))

    def test_multiple_module_headings_fail_closed(self):
        with self.assertRaisesRegex(ValueError, 'module_heading_ambiguous'):
            module_heading('Module 2.5: title\nModule 2.6: title\nCompetencies addressed')

    def test_exact_comparison_preserves_conflicting_class_and_level(self):
        candidate = {'whitespaceCollapsedBodySha256': 'a'*64, 'appearanceId': 'b'*64,
                     'sourceNumber': 37, 'sourceDeclaredClass': 'core', 'displayedLevels': ['KH']}
        row = {'whitespaceCollapsedBodySha256': 'a'*64, 'displayedLevels': ['SH']}
        matches = match_appendix(row, {'numbered': [candidate], 'additional': []})
        self.assertEqual(matches[0]['sourceDeclaredClass'], 'core')
        self.assertFalse(matches[0]['displayedLevelsMatch'])
        row['whitespaceCollapsedBodySha256'] = 'c'*64
        self.assertEqual(match_appendix(row, {'numbered': [candidate], 'additional': []}), [])


if __name__ == '__main__': unittest.main()
