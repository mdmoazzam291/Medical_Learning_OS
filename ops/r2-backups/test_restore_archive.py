"""Execute the actual workflow archive gate against synthetic v2/v3 archives."""
from datetime import datetime, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile
import textwrap
import unittest


class RestoreArchiveTests(unittest.TestCase):
    def gate(self, *, vault=False, declared_vault=None, corrupt=False, extra=False):
        path = Path(__file__).resolve().parents[2] / '.github/workflows/supabase-r2-restore-drill.yml'
        match = re.search(r"^          python3 - <<'PY'\n(.*?)^          PY$", path.read_text(), re.M | re.S)
        self.assertIsNotNone(match)
        script = textwrap.dedent(match[1])
        now = datetime.now(timezone.utc)
        timestamp = now.strftime('%Y%m%dT%H%M%SZ')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'mlos-restore'; root.mkdir()
            files = {name: b'-- synthetic SQL\n' for name in ('roles.sql', 'schema.sql', 'data.sql', 'access.sql')}
            if vault:
                files['vault.json.age'] = b'synthetic ciphertext bytes'
            checksums = ''.join(hashlib.sha256(data).hexdigest() + '  ' + name + '\n' for name, data in files.items())
            if corrupt:
                files['access.sql'] += b'changed'
            files['SHA256SUMS'] = checksums.encode()
            declared_vault = vault if declared_vault is None else declared_vault
            files['manifest.json'] = json.dumps({
                'format': 'supabase-cli-sql-vault-v3' if declared_vault else 'supabase-cli-sql-access-v2',
                'project_ref': 'iyapppmeieqhflnzslao', 'repository': 'mdmoazzam291/Medical_Learning_OS',
                'workflow_run_id': '1', 'workflow_run_attempt': '1', 'created_at_utc': now.isoformat()}).encode()
            if extra:
                files['unexpected'] = b'not allowed'
            archive = root / 'backup.tar.gz'
            with tarfile.open(archive, 'w:gz') as tar:
                for name, data in files.items():
                    member = tarfile.TarInfo(name); member.size = len(data)
                    tar.addfile(member, io.BytesIO(data))
            (root / 'backup.tar.gz.sha256').write_text(hashlib.sha256(archive.read_bytes()).hexdigest() + '  backup.tar.gz\n')
            env = {**os.environ, 'RUNNER_TEMP': directory, 'MLOS_BACKUP_PREFIX': 'supabase/' + now.strftime('%Y/%m/%d/') + timestamp}
            return subprocess.run(['python3', '-c', script], env=env, capture_output=True).returncode

    def test_current_v2_and_encrypted_v3_are_accepted_without_claiming_recovery(self):
        self.assertEqual(self.gate(), 0)
        self.assertEqual(self.gate(vault=True), 0)

    def test_format_member_mismatch_is_rejected(self):
        self.assertNotEqual(self.gate(declared_vault=True), 0)
        self.assertNotEqual(self.gate(vault=True, declared_vault=False), 0)

    def test_modified_inner_file_and_unexpected_member_are_rejected(self):
        self.assertNotEqual(self.gate(vault=True, corrupt=True), 0)
        self.assertNotEqual(self.gate(extra=True), 0)


if __name__ == '__main__':
    unittest.main()
