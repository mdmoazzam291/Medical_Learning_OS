import unittest
from pandemic_rows import scan_rows


class PandemicRowsTests(unittest.TestCase):
    def fixture(self):
        return [[80, 30, 200, 40, 'synthetic-secret'], [480, 30, 500, 40, 'KH']], [[70, 20, 450, 20.5], [70, 60, 450, 60.5]]

    def test_source_bound_metadata_contains_no_source_words(self):
        words, rectangles = self.fixture()
        a = scan_rows(words, rectangles, 'a' * 64, '1.1', 1)
        self.assertEqual(len(a), 1); self.assertNotIn('synthetic-secret', str(a))
        self.assertEqual(a, scan_rows(list(reversed(words)), rectangles * 2, 'a' * 64, '1.1', 1))
        self.assertNotEqual(a[0]['appearanceId'], scan_rows(words, rectangles, 'b' * 64, '1.1', 1)[0]['appearanceId'])

    def test_missing_border_or_missing_body_fails_closed(self):
        words, rectangles = self.fixture()
        with self.assertRaises(ValueError): scan_rows(words, rectangles[:1], 'a' * 64, '1.1', 1)
        with self.assertRaises(ValueError): scan_rows(words[1:], rectangles, 'a' * 64, '1.1', 1)

    def test_duplicate_level_anchor_cannot_double_count_one_row(self):
        words, rectangles = self.fixture()
        with self.assertRaisesRegex(ValueError, 'duplicate_level_anchor'):
            scan_rows(words + [words[1]], rectangles, 'a' * 64, '1.1', 1)

    def test_merged_cell_keeps_distinct_level_anchors_without_inventing_rows(self):
        words, rectangles = self.fixture(); words.append([480, 45, 500, 55, 'SH'])
        rows = scan_rows(words, rectangles, 'a' * 64, '1.1', 1)
        self.assertEqual(len(rows), 1); self.assertEqual(rows[0]['displayedLevels'], ['KH', 'SH'])

    def test_text_level_in_body_does_not_create_a_candidate(self):
        words, rectangles = self.fixture(); words.append([100, 45, 120, 55, 'SH'])
        self.assertEqual(len(scan_rows(words, rectangles, 'a' * 64, '1.1', 1)), 1)


if __name__ == '__main__': unittest.main()
