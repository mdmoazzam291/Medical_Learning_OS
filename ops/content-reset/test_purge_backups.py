import unittest
from purge_backups import select_keys
class PurgeTest(unittest.TestCase):
 def test_only_pre_reset_supabase_archive_and_checksum(self):
  keys=['supabase/2026/09/25/20260925T191515Z/backup.tar.gz','supabase/2026/10/04/20261004T100000Z/backup.tar.gz.sha256','unrelated/file']
  self.assertEqual(select_keys([{'Key':k} for k in keys]),keys[:1])
 def test_unknown_supabase_object_rejects_entire_plan(self):
  with self.assertRaises(ValueError):select_keys([{'Key':'supabase/unexpected'}])
 def test_duplicate_key_fails(self):
  with self.assertRaises(ValueError):select_keys([{'Key':'other'},{'Key':'other'}])
if __name__=='__main__':unittest.main()
