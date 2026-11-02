import unittest
from topic_count_audit import headers


class TopicHeaderTests(unittest.TestCase):
    def test_optional_number_colon_and_wrapped_count(self):
        rows = headers('Topic: 24 synthetic\nNumber of competencies:\n(05)\nZZ24.1 secret', 'ZZ')
        self.assertEqual((rows[0]['topic'], rows[0]['declaredCount']), (24, 5))
        self.assertNotIn('synthetic', str(rows)); self.assertNotIn('secret', str(rows))

    def test_joined_topic_number_is_found_but_subject_topics_label_is_not(self):
        rows = headers('Subject (Topics: 10)\nTopic2: synthetic\nNumber of competencies:(03)\nZZ2.1', 'ZZ')
        self.assertEqual(len(rows), 1); self.assertEqual(rows[0]['topic'], 2)

    def test_malformed_count_is_not_silently_corrected(self):
        row = headers('Topic 21: synthetic\nNumber of competencies: (050\nZZ21.1', 'ZZ')[0]
        self.assertIsNone(row['declaredCount'])
        self.assertEqual(row['countSyntax'], 'malformed_or_unlocated')

    def test_unnumbered_topic_is_preserved_without_invented_identity(self):
        row = headers('Topic: synthetic\nNumberofcompetencies:(02)\nZZ22.1', 'ZZ')[0]
        self.assertIsNone(row['topic']); self.assertEqual(row['declaredCount'], 2)

    def test_certification_count_cannot_replace_missing_total(self):
        row = headers('Topic 1: synthetic\nNumber of competencies that require certification: (9)\nZZ1.1', 'ZZ')[0]
        self.assertIsNone(row['declaredCount'])

    def test_next_header_or_row_does_not_supply_previous_missing_count(self):
        rows = headers('Topic 1: synthetic\nZZ1.1\nNumber of competencies: (99)\nTopic 2: synthetic\nNumberofCompetencies(03)\nZZ2.1', 'ZZ')
        self.assertIsNone(rows[0]['declaredCount']); self.assertEqual(rows[1]['declaredCount'], 3)


if __name__ == '__main__': unittest.main()
