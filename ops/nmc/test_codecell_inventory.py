import copy
import hashlib
import unittest
from codecell_inventory import build_inventory

SHA='a'*64

def manifest():
 return {'schemaVersion':1,'kind':'geometry-codecell-extraction-receipts','status':'candidate_extraction_not_no_omission_proof','sourceSha256':SHA,'sourceRights':'citation_only','pageTupleFields':['pdfPage','prefix','standardCellCount','nonstandardCellCount','emptyRegionCount','headerOrUnclassifiedRegionCount','detailedCellReceiptSha256','firstColumnXBounds'],'pageReceipts':[[1,'ZZ',1,0,0,0,'b'*64,[10,80]]],'eligibility':{'noOmissionCertified':False,'clinicalApproval':False,'completeCoverageClaim':False,'learnerActivation':False}}

def geometry(text='ZZ1.1'):
 return {1:{'rectangles':[[10,20,80,20.6],[10,60,80,60.6]],'words':[[15,30,55,40,text]]}}

class InventoryTests(unittest.TestCase):
 def test_region_metadata_is_deterministic_and_contains_no_raw_text(self):
  a=build_inventory(manifest(),SHA,2,geometry());b=build_inventory(manifest(),SHA,2,geometry())
  self.assertEqual(a,b);self.assertEqual(a['totals']['standard'],1)
  row=a['regions'][0];self.assertEqual(row['rawCellSha256'],hashlib.sha256(b'ZZ1.1').hexdigest());self.assertEqual(len(row['regionId']),64)
  self.assertNotIn('ZZ1.1',str(a));self.assertFalse(any(a['eligibility'].values()))
 def test_every_physical_region_including_empty_and_header_is_retained(self):
  g=geometry();g[1]['rectangles'] += [[10,100,80,100.6],[10,140,80,140.6]];g[1]['words'] += [[15,110,75,120,'Synthetic heading']]
  a=build_inventory(manifest(),SHA,2,g);self.assertEqual(len(a['regions']),3);self.assertEqual([r['kind'] for r in a['regions']],['standard','empty','header'])
  self.assertNotIn('Synthetic heading',str(a));self.assertEqual(len(a['comparison']['pageDifferences']),1)
 def test_wrapped_and_malformed_cells_are_not_silently_normalized(self):
  g=geometry();g[1]['words']=[[15,30,35,40,'ZZ'],[15,45,50,55,'1.1']]
  a=build_inventory(manifest(),SHA,2,g);self.assertEqual(a['totals']['nonstandard'],1);self.assertEqual(a['regions'][0]['rawCellSha256'],hashlib.sha256(b'ZZ\n1.1').hexdigest())
  self.assertEqual(build_inventory(manifest(),SHA,2,geometry('ZZ1:1'))['totals']['nonstandard'],1)
 def test_changed_source_or_geometry_cannot_reuse_region_identity(self):
  a=build_inventory(manifest(),SHA,2,geometry());g=geometry();g[1]['rectangles'][1][1:4:2]=[61,61.6]
  b=build_inventory(manifest(),SHA,2,g);self.assertNotEqual(a['regions'][0]['regionId'],b['regions'][0]['regionId'])
  m=manifest();m['sourceSha256']='c'*64;c=build_inventory(m,'c'*64,2,geometry());self.assertNotEqual(a['regions'][0]['regionId'],c['regions'][0]['regionId'])
 def test_wrong_source_hash_or_scope_is_rejected(self):
  for digest,count,g in [('c'*64,2,geometry()),(SHA,0,geometry()),(SHA,2,{})]:
   with self.subTest(digest=digest,count=count):
    with self.assertRaises(ValueError):build_inventory(manifest(),digest,count,g)
 def test_duplicate_reordered_or_out_of_range_pages_are_rejected(self):
  for rows in [[manifest()['pageReceipts'][0]]*2,[[2,'ZZ',1,0,0,0,'b'*64,[10,80]],manifest()['pageReceipts'][0]],[[3,'ZZ',1,0,0,0,'b'*64,[10,80]]]]:
   m=manifest();m['pageReceipts']=rows
   with self.subTest(rows=rows):
    with self.assertRaises(ValueError):build_inventory(m,SHA,2,geometry())
 def test_approval_or_invalid_geometry_is_rejected(self):
  m=manifest();m['eligibility']['learnerActivation']=True
  with self.assertRaises(ValueError):build_inventory(m,SHA,2,geometry())
  for bad in [float('nan'),float('inf'),True]:
   g=geometry();g[1]['words'][0][0]=bad
   with self.subTest(bad=bad):
    with self.assertRaises(ValueError):build_inventory(manifest(),SHA,2,g)
 def test_empty_missing_or_duplicate_boundaries_fail_closed(self):
  g=geometry();g[1]['rectangles']=[]
  with self.assertRaises(ValueError):build_inventory(manifest(),SHA,2,g)

class StrictInputTests(unittest.TestCase):
 def test_schema_numbers_cannot_be_boolean_or_float(self):
  for value in [True,1.0]:
   m=manifest();m['schemaVersion']=value
   with self.subTest(value=value):
    with self.assertRaises(ValueError):build_inventory(m,SHA,2,geometry())
 def test_word_order_and_duplicate_vector_borders_do_not_change_receipt(self):
  g=geometry();g[1]['words']=[[40,30,55,40,'1.1'],[15,30,35,40,'ZZ']]
  a=build_inventory(manifest(),SHA,2,g);g[1]['words'].reverse();g[1]['rectangles']+=g[1]['rectangles']
  self.assertEqual(a,build_inventory(manifest(),SHA,2,g))
 def test_equivalent_integer_and_float_coordinates_keep_physical_identity(self):
  a=build_inventory(manifest(),SHA,2,geometry())
  m=manifest();m['pageReceipts'][0][7]=[10.0,80.0];g=geometry()
  g[1]['rectangles']=[[float(v) for v in r] for r in g[1]['rectangles']]
  g[1]['words']=[[float(v) for v in r[:4]]+[r[4]] for r in g[1]['words']]
  b=build_inventory(m,SHA,2,g)
  self.assertEqual(a['regions'][0]['regionId'],b['regions'][0]['regionId'])
 def test_declared_column_order_must_match_the_receipt_contract(self):
  m=manifest();m['pageTupleFields'][2:4]=list(reversed(m['pageTupleFields'][2:4]))
  with self.assertRaises(ValueError):build_inventory(m,SHA,2,geometry())
 def test_extra_geometry_page_and_invalid_counts_are_rejected(self):
  g=geometry();g[2]=copy.deepcopy(g[1])
  with self.assertRaises(ValueError):build_inventory(manifest(),SHA,2,g)
  m=manifest();m['pageReceipts'][0][2]=True
  with self.assertRaises(ValueError):build_inventory(m,SHA,2,geometry())

if __name__=='__main__':unittest.main()
