import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch


class VaultRecoveryTests(unittest.TestCase):
    def module(self):
        path = Path(__file__).with_name('vault_recovery.py')
        self.assertTrue(path.exists(), 'encrypted Vault recovery helper missing')
        spec = importlib.util.spec_from_file_location('vault_recovery', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def payload(self):
        return {'format': 'mlos-vault-recovery-v1', 'project': 'iyapppmeieqhflnzslao',
                'snapshot': '20261021T131907Z', 'secrets': [
                    {'name': 'synthetic_monitor', 'description': 'fixture',
                     'secret': "fixture-only ' \\ \n $mlos_check$ α"}]}

    def test_payload_rejects_wrong_source_snapshot_duplicate_or_unnamed_secrets(self):
        m = self.module()
        payload = self.payload()
        self.assertEqual(m.validate_payload(payload, payload['snapshot']), payload)
        for field, value in [('project', 'wrong'), ('snapshot', '20261020T131907Z'),
                             ('format', 'unknown'), ('secrets', [{'name': None, 'secret': 'x', 'description': None}]),
                             ('secrets', payload['secrets'] * 2)]:
            with self.subTest(field=field), self.assertRaises(ValueError):
                m.validate_payload({**payload, field: value}, payload['snapshot'])

    def test_sql_uses_transaction_empty_target_guard_and_exact_value_check(self):
        m = self.module()
        sql = m.restore_sql(self.payload())
        self.assertTrue(sql.startswith('BEGIN;'))
        self.assertTrue(sql.endswith('COMMIT;'))
        self.assertIn('vault_target_not_empty', sql)
        self.assertIn('vault_value_mismatch', sql)
        self.assertIn('vault.create_secret', sql)
        self.assertIn('fixture-only \'\'', sql)
        self.assertNotIn('ALTER SYSTEM', sql)

    def test_restore_rejects_other_target_before_decryption(self):
        m = self.module()
        with self.assertRaisesRegex(ValueError, 'disposable_target_required'):
            m.restore_vault('/missing', '20261021T131907Z', 'production')

    def test_real_age_roundtrip_wrong_identity_tampering_and_no_output(self):
        m = self.module()
        age = os.environ.get('AGE_BIN')
        if not age:
            self.skipTest('AGE_BIN not configured for real cryptographic test')
        keygen = str(Path(age).with_name('age-keygen'))
        keys = [subprocess.run([keygen], capture_output=True, check=True).stdout for _ in range(2)]
        recipient = subprocess.run([keygen, '-y'], input=keys[0], capture_output=True, check=True).stdout.decode().strip()
        with tempfile.TemporaryDirectory() as directory, contextlib.redirect_stdout(io.StringIO()) as output:
            cipher = Path(directory) / 'vault.json.age'
            cipher.write_bytes(m.encrypt_payload(self.payload(), recipient, age))
            self.assertNotIn(b'fixture-only', cipher.read_bytes())
            self.assertEqual(m.decrypt_payload(cipher, keys[0].decode(), self.payload()['snapshot'], age), self.payload())
            with self.assertRaisesRegex(ValueError, 'vault_decryption_failed'):
                m.decrypt_payload(cipher, keys[1].decode(), self.payload()['snapshot'], age)
            data = bytearray(cipher.read_bytes()); data[-1] ^= 1; cipher.write_bytes(data)
            with self.assertRaisesRegex(ValueError, 'vault_decryption_failed'):
                m.decrypt_payload(cipher, keys[0].decode(), self.payload()['snapshot'], age)
            self.assertEqual(output.getvalue(), '')

    def test_bad_recipient_and_missing_identity_fail_closed(self):
        m = self.module()
        with self.assertRaisesRegex(ValueError, 'vault_recipient_invalid'):
            m.encrypt_payload(self.payload(), '--not-a-recipient', '/missing-age')
        with self.assertRaisesRegex(ValueError, 'vault_recovery_identity_missing'):
            m.decrypt_payload('/missing', '', self.payload()['snapshot'], '/missing-age')

    def test_networked_or_cron_enabled_target_rejected(self):
        m = self.module()
        with patch.object(m, 'run_private', return_value=b'1'):
            with self.assertRaisesRegex(ValueError, 'vault_target_networked'):
                m.assert_isolated(m.TARGET)
        with patch.object(m, 'run_private', side_effect=[b'0', b'on']):
            with self.assertRaisesRegex(ValueError, 'vault_target_cron_enabled'):
                m.assert_isolated(m.TARGET)

    def test_private_process_errors_do_not_escape(self):
        m = self.module()
        result = subprocess.CompletedProcess([], 1, stdout=b'private value', stderr=b'private value')
        with patch('subprocess.run', return_value=result):
            with self.assertRaisesRegex(ValueError, '^controlled_failure$'):
                m.run_private(['synthetic'], stage='controlled_failure')

    def test_unconfigured_export_never_queries_source(self):
        m = self.module()
        with patch.dict(os.environ, {'MLOS_RECOVERY_AGE_RECIPIENT': ''}), patch('subprocess.run') as process:
            with self.assertRaisesRegex(ValueError, 'vault_recipient_invalid'):
                m.export_vault('/unused', self.payload()['snapshot'])
            process.assert_not_called()


if __name__ == '__main__':
    unittest.main()
