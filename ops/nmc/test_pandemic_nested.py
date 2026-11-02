import unittest
from pandemic_nested import locate_sections, REFERENCE


class NestedLocatorTests(unittest.TestCase):
    def test_numbered_items_continue_across_pages_without_counting_teaching_steps(self):
        pages = [(1, '1\nLearning objectives\n1. secret one\n'), (2, '2\n2. secret two\nLearning experience\n1. activity\n')]
        rows = locate_sections(pages, '3.2', 'a' * 64)
        self.assertEqual(len(rows), 2); self.assertEqual([r['ordinal'] for r in rows], [1, 2])
        self.assertEqual([r['segments'][0]['pdfPage'] for r in rows], [1, 2])
        self.assertNotIn('secret', str(rows)); self.assertNotIn('activity', str(rows))

    def test_unnumbered_subcompetency_preserves_null_ordinal(self):
        rows = locate_sections([(1, 'Sub competency\nsecret\nLearning objectives\n1. other\nLearning experience\n')], '3.2', 'a' * 64)
        self.assertEqual(len(rows), 2); self.assertIsNone(rows[0]['ordinal'])
        self.assertEqual(rows[0]['sectionKind'], 'subcompetency')

    def test_missing_or_duplicate_numbers_fail_closed(self):
        for items in ['1. first\n3. third', '1. first\n1. repeated']:
            with self.assertRaisesRegex(ValueError, 'nested_numbering_unresolved'):
                locate_sections([(1, 'Sub-competencies addressed\n' + items)], '3.3', 'a' * 64)

    def test_source_identity_change_invalidates_appearance(self):
        pages = [(1, 'Sub competency\nsecret')]
        self.assertNotEqual(locate_sections(pages, '3.2', 'a' * 64)[0]['appearanceId'], locate_sections(pages, '3.2', 'b' * 64)[0]['appearanceId'])

    def test_reference_matcher_does_not_treat_module_numbers_as_subject_codes(self):
        self.assertEqual(REFERENCE.findall('Module 3.2; 1. item; GM 1.2'), ['GM 1.2'])


if __name__ == '__main__': unittest.main()
