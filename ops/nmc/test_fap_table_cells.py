import unittest
from fap_table_cells import centres,bands,template_fields,FIELDS


class FapCellTests(unittest.TestCase):
    def test_thick_duplicate_rules_cluster_deterministically(self):
        self.assertEqual(centres([11,10,10,30]),[10.5,30.0])

    def test_missing_bottom_rule_is_an_open_fragment_not_a_closed_row(self):
        self.assertEqual(bands([0,20],50),[(0.0,20.0,False,False),(20.0,49.0,False,True)])
        self.assertEqual(bands([],50),[(0.0,49.0,True,True)])

    def test_narrow_border_margin_does_not_create_an_extra_cell(self):
        self.assertEqual(bands([6,20,49],50),[(6.0,20.0,False,False),(20.0,49.0,False,False)])

    def test_blank_template_labels_are_not_populated_personal_data(self):
        text='\n'.join(label+':' for label in FIELDS.values())
        rows=template_fields(text);self.assertEqual(len(rows),12);self.assertNotIn('Name of the Student',str(rows))
        with self.assertRaises(ValueError):template_fields(text+'\nInstitute:')
        with self.assertRaises(ValueError):template_fields(text.replace('Institute:','Institute: Synthetic value'))


if __name__=='__main__':unittest.main()
