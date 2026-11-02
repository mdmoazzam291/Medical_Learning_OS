import unittest
from audit_empty_regions import inspect_region


class EmptyRegionDiagnosticTests(unittest.TestCase):
    def region(self):
        return {'regionId': 'a' * 64, 'pdfPage': 1, 'bbox': [10, 20, 80, 60]}

    def test_wide_intersecting_word_is_detected_without_exporting_text(self):
        result = inspect_region(self.region(), [[75, 30, 115, 40, 'synthetic-secret']])
        self.assertEqual(result['intersectionWordCount'], 1)
        self.assertNotIn('synthetic-secret', str(result))
        self.assertIsNone(result['decision'])

    def test_empty_column_does_not_imply_empty_row_band(self):
        result = inspect_region(self.region(), [[100, 30, 140, 40, 'body']])
        self.assertEqual(result['intersectionWordCount'], 0)
        self.assertEqual(result['rowBandWordCount'], 1)

    def test_selected_word_contradicts_empty_claim(self):
        with self.assertRaisesRegex(ValueError, 'v1_empty_region_has_selected_words'):
            inspect_region(self.region(), [[15, 30, 40, 40, 'candidate']])

    def test_boundary_touch_and_bottom_midpoint_are_not_intersections(self):
        result = inspect_region(self.region(), [[80, 30, 110, 40, 'edge'], [75, 55, 115, 65, 'bottom']])
        self.assertEqual(result['intersectionWordCount'], 0)
        self.assertEqual(result['rowBandWordCount'], 1)


if __name__ == '__main__':
    unittest.main()
