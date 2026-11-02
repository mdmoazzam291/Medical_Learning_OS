import unittest
from foundation_regions import code_from_words
from pandemic_rows import scan_rows


class FoundationRegionTests(unittest.TestCase):
    def test_split_source_code_is_read_only_from_its_row_first_column(self):
        row = {'bbox': [140, 20, 440, 60]}
        self.assertEqual(code_from_words(row, [[90,30,110,40,'FC'],[115,30,135,40,'4.5'],[160,30,210,40,'FC1.1']]), 'FC4.5')

    def test_nested_identifier_is_not_replaced_by_an_invented_one(self):
        row = {'bbox': [160,20,370,60]}
        self.assertEqual(code_from_words(row, [[170,30,210,40,'4.5.8']], True), '4.5.8')
        with self.assertRaises(ValueError): code_from_words(row, [[170,30,210,40,'4.5.9']], True)

    def test_wide_gap_requires_explicit_layout_setting(self):
        words = [[170,30,300,40,'synthetic'],[480,30,500,40,'KH']]
        borders = [[160,20,370,20.5],[160,60,370,60.5]]
        with self.assertRaises(ValueError): scan_rows(words,borders,'a'*64,'foundation',1)
        self.assertEqual(len(scan_rows(words,borders,'a'*64,'foundation',1,maximum_level_gap=130)),1)

    def test_multiple_nested_codes_fail_closed(self):
        with self.assertRaises(ValueError): code_from_words({'bbox':[160,20,370,60]}, [[170,30,210,40,'4.5.1'],[170,45,210,55,'4.5.2']],True)


if __name__ == '__main__': unittest.main()
