"""Synthetic-only acceptance against the disconnected disposable Supabase DB."""
import os
from pathlib import Path
import subprocess
import tempfile
from vault_recovery import TARGET, PROJECT, assert_isolated, encrypt_payload, restore_vault, run_private


def check():
    assert_isolated(TARGET)
    age = os.environ['AGE_BIN']
    keygen = str(Path(age).with_name('age-keygen'))
    key = subprocess.run([keygen], check=True, capture_output=True).stdout
    recipient = subprocess.run([keygen, '-y'], input=key, check=True, capture_output=True).stdout.decode().strip()
    payload = {'format': 'mlos-vault-recovery-v1', 'project': PROJECT, 'snapshot': '20261021T000000Z',
               'secrets': [
                   {'name': 'mlos_recovery_fixture_one', 'description': "fixture ' α", 'secret': "synthetic ' \\ \n $mlos_check$ α"},
                   {'name': 'mlos_recovery_fixture_two', 'description': None, 'secret': 'synthetic-two'}]}
    previous = os.environ.get('MLOS_RECOVERY_AGE_IDENTITY')
    try:
        os.environ['MLOS_RECOVERY_AGE_IDENTITY'] = key.decode()
        with tempfile.TemporaryDirectory() as directory:
            cipher = Path(directory) / 'vault.json.age'
            cipher.write_bytes(encrypt_payload(payload, recipient, age))
            assert restore_vault(cipher, payload['snapshot'], TARGET)['vaultValuesMatched']
            try:
                restore_vault(cipher, payload['snapshot'], TARGET)
            except ValueError as error:
                assert str(error) == 'vault_provisioning_failed'
            else:
                raise AssertionError('existing target secrets must not be overwritten')
    finally:
        if previous is None:
            os.environ.pop('MLOS_RECOVERY_AGE_IDENTITY', None)
        else:
            os.environ['MLOS_RECOVERY_AGE_IDENTITY'] = previous
        run_private(['docker', 'exec', TARGET, 'psql', '-U', 'supabase_admin', '-d', 'postgres',
                     '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c',
                     "delete from vault.secrets where name in ('mlos_recovery_fixture_one','mlos_recovery_fixture_two')"],
                    stage='synthetic_vault_cleanup_failed')
    print('Synthetic Vault recovery passed: real age encryption, target-key provisioning, exact values and overwrite rejection. No production secrets used.')


if __name__ == '__main__':
    try:
        check()
    except Exception:
        # Exceptions may carry private process details; never render them.
        raise SystemExit('Synthetic Vault recovery failed; private details suppressed') from None
