import copy
import unittest
import json
from pathlib import Path
from row_body_audit import audit_page, build_audit, verify_case_bindings


class RowBodyAuditTests(unittest.TestCase):
    def regions(self):
        return [{'regionId':'a'*64,'pdfPage':1,'prefix':'AN','bbox':[0,10,10,20],'kind':'standard'},
                {'regionId':'b'*64,'pdfPage':1,'prefix':'AN','bbox':[0,20,10,30],'kind':'empty'}]

    def words(self):
        return [[1,12,4,14,'CODE'],[12,12,19,14,'first'],[12,22,19,24,'uncoded'],
                [12,19,19,21,'boundary'],[2,1,6,3,'above'],[2,32,6,34,'below']]

    def test_uncoded_body_and_outside_words_are_retained(self):
        page,rows=audit_page(1,self.regions(),self.words())
        self.assertEqual([r['wordCount'] for r in rows],[2,2])
        self.assertEqual(rows[1]['candidateRole'],'uncoded_text_band')
        self.assertEqual(page['outsideBandWordCount'],2)
        self.assertEqual(page['accountedWordCount'],6)
        self.assertFalse(page['noOmissionCertified'])

    def test_boundary_crossing_is_flagged_without_double_counting(self):
        page,rows=audit_page(1,self.regions(),self.words())
        self.assertEqual([r['boundaryCrossingWordCount'] for r in rows],[0,1])
        self.assertEqual(sum(r['wordCount'] for r in rows)+page['outsideBandWordCount'],6)
        self.assertTrue(all(r['reviewStatus']=='AI_source_observation_pending' for r in rows))

    def test_overlapping_or_duplicate_regions_and_bad_geometry_fail(self):
        for mutate in [lambda rs:rs[1]['bbox'].__setitem__(1,19),
                       lambda rs:rs[1].__setitem__('regionId','a'*64)]:
            regions=copy.deepcopy(self.regions());mutate(regions)
            with self.assertRaises(ValueError):audit_page(1,regions,self.words())
        with self.assertRaises(ValueError):audit_page(1,self.regions(),[[0,0,float('nan'),1,'bad']])

    def test_build_requires_exact_page_scope(self):
        inventory={'regions':self.regions(),'sourceSha256':'c'*64}
        with self.assertRaises(ValueError):build_audit(inventory,{2:self.words()})

    def test_case_evidence_cannot_drop_cases_or_add_approval(self):
        root=Path(__file__).resolve().parents[2]/'docs/evidence'
        packet=json.loads((root/'nmc-source-row-case-bindings-v1.json').read_bytes())
        self.assertTrue(verify_case_bindings(packet,root))
        for mutate in [lambda p:p['cases'].pop(),
                       lambda p:p.__setitem__('schemaVersion',True),
                       lambda p:p['cases'][0].__setitem__('resolutionClass',{'clinicalApproval':True}),
                       lambda p:p.__setitem__('unexpected','unreviewed payload'),
                       lambda p:p['cases'][0].__setitem__('qualifiedDecision','accepted'),
                       lambda p:p['cases'][0]['focusedRegion'].__setitem__('bodySha256','0'*64),
                       lambda p:p['bindings'][0].__setitem__('sha256','0'*64)]:
            changed=copy.deepcopy(packet);mutate(changed)
            with self.assertRaises(ValueError):verify_case_bindings(changed,root)

    def test_focused_case_cannot_be_swapped_to_another_real_row_on_same_page(self):
        root=Path(__file__).resolve().parents[2]/'docs/evidence'
        packet=json.loads((root/'nmc-source-row-case-bindings-v1.json').read_bytes())
        audit=json.loads((root/'nmc-full-row-band-observations-v1.json').read_bytes())
        inventory=json.loads((root/'nmc-row-region-inventory-v1.json').read_bytes())
        current=packet['cases'][0]['focusedRegion']['regionId']
        other=next(r['regionId'] for r in inventory['regions'] if r['pdfPage']==169 and r['regionId']!=current)
        row=next(r for r in audit['rows'] if r[0]==other)
        packet['cases'][0]['focusedRegion']=dict(zip(audit['rowFields'],row))
        with self.assertRaises(ValueError):verify_case_bindings(packet,root)


if __name__=='__main__':unittest.main()
