import unittest
from aetcom_appendix import comparison_digest, number_in_region
from pandemic_rows import scan_rows


class AppendixTests(unittest.TestCase):
    def test_number_selection_uses_first_column_and_vertical_region(self):
        row = {'bbox': [100, 20, 450, 60]}
        self.assertEqual(number_in_region(row, [[80,30,90,40,'39'],[200,30,220,40,'10'],[80,70,90,80,'40']]), 39)

    def test_missing_or_multiple_numbers_are_not_guessed(self):
        for words in [[], [[80,30,90,40,'1'],[80,45,90,55,'2']]]:
            with self.assertRaises(ValueError): number_in_region({'bbox':[100,20,450,60]}, words)

    def test_comparison_collapses_only_whitespace(self):
        self.assertEqual(comparison_digest('example\n words'), comparison_digest('example words'))
        self.assertNotEqual(comparison_digest('example words'), comparison_digest('example word'))

    def test_domain_column_does_not_become_a_level_anchor(self):
        words = [[110,30,200,40,'synthetic'],[490,30,500,40,'K'],[530,30,550,40,'KH']]
        rows = scan_rows(words, [[100,20,475,20.5],[100,60,475,60.5]], 'a'*64, 'appendix', 1, minimum_level_x=510)
        self.assertEqual(rows[0]['displayedLevels'], ['KH'])


if __name__ == '__main__': unittest.main()
