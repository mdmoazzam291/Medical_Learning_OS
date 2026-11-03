import copy
import unittest
from row_engineering_closeout import classify_header,account_bands,verify_closeout


class RowCloseoutTests(unittest.TestCase):
    def test_only_recognised_header_syntax_is_dispositioned(self):
        self.assertEqual(classify_header('Topic1: Example'),('topic_heading_syntax',1))
        self.assertEqual(classify_header('Topic: Example'),('topic_heading_syntax',None))
        self.assertEqual(classify_header('Number COMPETENCY Level'),('column_header_syntax',None))
        with self.assertRaises(ValueError):classify_header('unrecognised content')

    def test_every_physical_band_must_be_accounted_once(self):
        rows=[{'regionId':'a','candidateRole':'identifier_bearing_band'},
              {'regionId':'b','candidateRole':'header_classified_text_band'},
              {'regionId':'c','candidateRole':'uncoded_text_band'},
              {'regionId':'d','candidateRole':'no_words_band'}]
        result=account_bands(rows,[{'regionId':'b','candidateRole':'column_header_syntax'}],
                             [{'regionId':'c','candidateRole':'continuation_candidate'}])
        self.assertEqual(sum(result.values()),4)
        with self.assertRaises(ValueError):account_bands(rows,[],[{'regionId':'c','candidateRole':'continuation_candidate'}])
        with self.assertRaises(ValueError):account_bands(rows,[{'regionId':'a','candidateRole':'column_header_syntax'}],[])

    def test_an_engineering_closeout_cannot_be_turned_into_source_acceptance(self):
        expected={'engineeringReconciliationComplete':True,'packageOneAccepted':False}
        changed=copy.deepcopy(expected);changed['packageOneAccepted']=True
        with self.assertRaises(ValueError):verify_closeout(changed,expected)


if __name__=='__main__':unittest.main()
