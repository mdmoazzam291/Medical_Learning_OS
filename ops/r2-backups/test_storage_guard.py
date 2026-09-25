import json
from datetime import datetime, timedelta, timezone
import os
from unittest import TestCase, main
from unittest.mock import patch
from types import SimpleNamespace
import storage_guard as guard

NOW = datetime(2026, 9, 26, tzinfo=timezone.utc)


def snapshot(when, size=100, modified=None):
    prefix = when.strftime('supabase/%Y/%m/%d/%Y%m%dT%H%M%SZ')
    return [{'Key': prefix + '/' + name, 'Size': size,
             'LastModified': (modified or when).isoformat()}
            for name in ['backup.tar.gz', 'backup.tar.gz.sha256']]


class GuardTests(TestCase):
    def test_only_old_pairs_outside_newest_seven_are_candidates(self):
        objects = sum((snapshot(NOW - timedelta(days=i)) for i in range(1, 41)), [])
        report = guard.plan(objects, NOW)
        self.assertEqual(report['retention_candidate_count'], 10)
        self.assertEqual(report['bucket_bytes'], 8000)

    def test_newest_seven_survive_even_when_all_old(self):
        objects = sum((snapshot(NOW - timedelta(days=i)) for i in range(50, 60)), [])
        self.assertEqual(guard.plan(objects, NOW)['retention_candidate_count'], 3)

    def test_verified_snapshot_pinned_even_after_many_newer_backups(self):
        verified = datetime(2026, 9, 25, 19, 15, 15, tzinfo=timezone.utc)
        objects = snapshot(verified) + sum((snapshot(verified + timedelta(days=i)) for i in range(1, 12)), [])
        report = guard.plan(objects, verified + timedelta(days=100))
        self.assertTrue(report['protected_verified_snapshot_present'])
        self.assertNotIn(guard.PINNED, report['retention_candidates'])

    def test_unknown_incomplete_and_recently_modified_are_retained(self):
        objects = snapshot(NOW - timedelta(days=80))[:1]
        objects += snapshot(NOW - timedelta(days=90), modified=NOW)
        objects += [{'Key': 'other.bin', 'Size': 300}]
        objects += sum((snapshot(NOW - timedelta(days=i)) for i in range(40, 48)), [])
        report = guard.plan(objects, NOW)
        self.assertEqual(report['retention_candidate_count'], 1)
        self.assertEqual(report['bucket_bytes'], 2200)

    def test_projected_cap_and_archive_cap(self):
        self.assertFalse(guard.upload_allowed({'bucket_bytes': guard.STOP_BYTES - 100}, 99, 1))
        self.assertTrue(guard.upload_allowed({'bucket_bytes': guard.STOP_BYTES - 101}, 99, 1))
        self.assertFalse(guard.upload_allowed({'bucket_bytes': 0}, guard.MAX_ARCHIVE_BYTES + 1, 100))

    def test_bad_inventory_fails_closed(self):
        for objects in [[{'Key': 'x', 'Size': -1}], [{'Key': 'x', 'Size': True}],
                        [{'Key': 'x', 'Size': 1}] * 2]:
            with self.assertRaises(ValueError):
                guard.plan(objects, NOW)

    @patch.dict(os.environ, {'R2_BUCKET': 'test', 'R2_ENDPOINT': 'https://account.r2.cloudflarestorage.com'})
    @patch('storage_guard.subprocess.run')
    def test_pagination_and_empty_bucket(self, run):
        run.side_effect = [SimpleNamespace(returncode=0, stdout=json.dumps(p)) for p in [
            {'Contents': [{'Key': 'a', 'Size': 1}], 'IsTruncated': True, 'NextContinuationToken': 'next'},
            {'Contents': [{'Key': 'b', 'Size': 2}], 'IsTruncated': False}]]
        self.assertEqual(len(guard.inventory()), 2)
        self.assertIn('--continuation-token', run.call_args.args[0])
        run.side_effect = None
        run.return_value = SimpleNamespace(returncode=0, stdout='{"IsTruncated": false}')
        self.assertEqual(guard.inventory(), [])

    @patch.dict(os.environ, {'R2_BUCKET': 'test', 'R2_ENDPOINT': 'https://account.r2.cloudflarestorage.com'})
    @patch('storage_guard.subprocess.run')
    def test_incomplete_listing_and_api_failure_block(self, run):
        for page in ['{}', '{"IsTruncated": true}', '{"IsTruncated": true, "NextContinuationToken": "same"}']:
            run.return_value = SimpleNamespace(returncode=0, stdout=page)
            with self.assertRaises(ValueError):
                guard.inventory()
        run.return_value = SimpleNamespace(returncode=1, stdout='')
        with self.assertRaises(ValueError):
            guard.inventory()


if __name__ == '__main__':
    main()
