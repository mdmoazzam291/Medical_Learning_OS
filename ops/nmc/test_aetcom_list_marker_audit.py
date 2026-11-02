import unittest
from aetcom_list_marker_audit import comparison


class ListMarkerComparisonTests(unittest.TestCase):
    def test_list_prefix_and_whitespace_only_variants_match(self):
        expected, _ = comparison('Enumerate synthetic words')
        for text in ['1. Enumerate synthetic words', '1.Enumerate synthetic words', '2.\nEnumerate\nsynthetic words']:
            self.assertEqual(comparison(text)[0], expected)

    def test_decimals_and_other_punctuation_are_preserved(self):
        self.assertIsNone(comparison('1.5 mg')[1])
        self.assertNotEqual(comparison('1.5 mg')[0], comparison('5 mg')[0])
        self.assertNotEqual(comparison('word-word')[0], comparison('word word')[0])

    def test_negation_and_spelling_changes_cannot_be_formatting_matches(self):
        self.assertNotEqual(comparison('1. Do not act')[0], comparison('Do act')[0])
        self.assertNotEqual(comparison('judgment')[0], comparison('judgement')[0])

    def test_marker_is_separately_retained_and_internal_numbers_unchanged(self):
        key, marker = comparison('12. Describe 2 groups')
        self.assertEqual(marker, 12); self.assertEqual(key, comparison('Describe 2 groups')[0])
        self.assertNotEqual(key, comparison('Describe groups')[0])


if __name__ == '__main__': unittest.main()
