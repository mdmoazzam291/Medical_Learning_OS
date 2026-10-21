"""Encrypted Supabase Vault provisioning; plaintext stays in private processes/target.

Logical names and values are restored through the supported create_secret API.
Vault row UUIDs/root keys are not transferred. Never run against a live target.
"""
import json
import os
from pathlib import Path
import re
import subprocess
import sys

PROJECT = 'iyapppmeieqhflnzslao'
TARGET = 'supabase_db_mlos-local-restore'
MAX_BYTES = 1_000_000


def validate_payload(payload, snapshot):
    if not re.fullmatch(r'\d{8}T\d{6}Z', snapshot):
        raise ValueError('vault_snapshot_invalid')
    if not isinstance(payload, dict) or set(payload) != {'format', 'project', 'snapshot', 'secrets'}:
        raise ValueError('vault_payload_invalid')
    if (payload['format'], payload['project'], payload['snapshot']) != ('mlos-vault-recovery-v1', PROJECT, snapshot):
        raise ValueError('vault_source_mismatch')
    entries = payload['secrets']
    if not isinstance(entries, list) or len(entries) > 1024:
        raise ValueError('vault_entries_invalid')
    names = set()
    for entry in entries:
        if not isinstance(entry, dict) or set(entry) != {'name', 'description', 'secret'}:
            raise ValueError('vault_entry_invalid')
        if not isinstance(entry['name'], str) or not entry['name'] or entry['name'] in names:
            raise ValueError('vault_names_invalid')
        if not isinstance(entry['secret'], str) or not entry['secret']:
            raise ValueError('vault_secret_invalid')
        if not isinstance(entry['description'], str):
            raise ValueError('vault_description_invalid')
        if any('\0' in value for value in entry.values() if isinstance(value, str)):
            raise ValueError('vault_text_invalid')
        names.add(entry['name'])
    if len(json.dumps(payload).encode()) > MAX_BYTES:
        raise ValueError('vault_payload_too_large')
    return payload


def run_private(command, *, data=None, env=None, stage, sqlstate=False):
    try:
        result = subprocess.run(command, input=data, capture_output=True, env=env, timeout=120)
    except (OSError, subprocess.TimeoutExpired):
        raise ValueError(stage) from None
    if result.returncode:
        if sqlstate:
            code = re.search(rb'ERROR:\s+([A-Z0-9]{5})(?:\s|$)', result.stderr)
            if code:
                raise ValueError(stage + '_sqlstate_' + code[1].decode().lower())
        raise ValueError(stage)
    return result.stdout


def encrypt_payload(payload, recipient, age):
    if not re.fullmatch(r'age1[023456789acdefghjklmnpqrstuvwxyz]{58}', recipient or ''):
        raise ValueError('vault_recipient_invalid')
    validate_payload(payload, payload['snapshot'])
    return run_private([age, '--encrypt', '--recipient', recipient],
                       data=json.dumps(payload, ensure_ascii=False).encode(), stage='vault_encryption_failed')


def decrypt_payload(cipher, identity, snapshot, age):
    if not identity:
        raise ValueError('vault_recovery_identity_missing')
    lines = [line.strip() for line in identity.splitlines() if line.strip() and not line.startswith('#')]
    if len(identity) > 8192 or len(lines) != 1 or not re.fullmatch(r'AGE-SECRET-KEY-1[0-9A-Z]+', lines[0]):
        raise ValueError('vault_recovery_identity_invalid')
    if not Path(cipher).is_file() or Path(cipher).stat().st_size > MAX_BYTES * 2:
        raise ValueError('vault_ciphertext_invalid')
    raw = run_private([age, '--decrypt', '--identity', '-', str(cipher)],
                      data=identity.encode(), stage='vault_decryption_failed')
    if len(raw) > MAX_BYTES:
        raise ValueError('vault_payload_too_large')
    try:
        payload = json.loads(raw)
    except (ValueError, UnicodeDecodeError):
        raise ValueError('vault_payload_invalid') from None
    return validate_payload(payload, snapshot)


def restore_sql(payload):
    validate_payload(payload, payload['snapshot'])
    def literal(value):
        return 'NULL' if value is None else "'" + value.replace("'", "''") + "'"
    inserts = ''.join('INSERT INTO pg_temp.mlos_vault_expected VALUES (' +
                      ','.join(literal(entry[key]) for key in ('name', 'description', 'secret')) + ');\n'
                      for entry in payload['secrets'])
    return """BEGIN;
SET LOCAL standard_conforming_strings=on;
LOCK TABLE vault.secrets IN EXCLUSIVE MODE;
DO $mlos_check$ BEGIN
 IF EXISTS (SELECT 1 FROM vault.secrets) THEN RAISE EXCEPTION 'vault_target_not_empty'; END IF;
END $mlos_check$;
CREATE TEMP TABLE mlos_vault_expected(name text PRIMARY KEY,description text,secret text NOT NULL) ON COMMIT DROP;
""" + inserts + """SELECT vault.create_secret(secret,name,description) FROM pg_temp.mlos_vault_expected;
DO $mlos_check$ BEGIN
 IF EXISTS (
  SELECT 1 FROM pg_temp.mlos_vault_expected e FULL JOIN vault.decrypted_secrets a ON a.name=e.name
  WHERE e.name IS NULL OR a.name IS NULL OR a.description IS DISTINCT FROM e.description
     OR a.decrypted_secret IS DISTINCT FROM e.secret
 ) THEN RAISE EXCEPTION 'vault_value_mismatch'; END IF;
END $mlos_check$;
COMMIT;"""


def export_vault(output, snapshot):
    recipient = os.environ.get('MLOS_RECOVERY_AGE_RECIPIENT', '')
    age = os.environ.get('AGE_BIN', 'age')
    # Validate the public recipient before querying any decrypted value.
    empty = {'format': 'mlos-vault-recovery-v1', 'project': PROJECT, 'snapshot': snapshot, 'secrets': []}
    encrypt_payload(empty, recipient, age)
    source = os.environ.get('SUPABASE_DB_URL', '')
    if not source:
        raise ValueError('vault_source_connection_missing')
    sql = "BEGIN READ ONLY; SELECT json_build_object('format','mlos-vault-recovery-v1','project','" + PROJECT + "','snapshot','" + snapshot + "','secrets',coalesce(json_agg(json_build_object('name',name,'description',description,'secret',decrypted_secret) ORDER BY name),'[]'::json)) FROM vault.decrypted_secrets; COMMIT;"
    # libpq expands a connection-string dbname before adding PGDATABASE defaults.
    raw = run_private(['psql', '-d', source, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
                       '-v', 'VERBOSITY=sqlstate', '-c', sql],
                      stage='vault_export_failed', sqlstate=True)
    try:
        payload = validate_payload(json.loads(raw), snapshot)
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise ValueError('vault_payload_invalid') from None
    ciphertext = encrypt_payload(payload, recipient, age)
    descriptor = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'wb') as target:
        target.write(ciphertext)
    return {'vaultEncrypted': True}


def assert_isolated(container):
    if container != TARGET:
        raise ValueError('disposable_target_required')
    networks = run_private(['docker', 'inspect', '--format', '{{len .NetworkSettings.Networks}}', container],
                           stage='vault_isolation_check_failed').strip()
    if networks != b'0':
        raise ValueError('vault_target_networked')
    state = run_private(['docker', 'exec', container, 'psql', '-U', 'supabase_admin', '-d', 'postgres',
                         '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', "select current_setting('cron.launch_active_jobs')"],
                        stage='vault_cron_check_failed').strip()
    if state != b'off':
        raise ValueError('vault_target_cron_enabled')


def restore_vault(cipher, snapshot, container):
    assert_isolated(container)
    payload = decrypt_payload(cipher, os.environ.get('MLOS_RECOVERY_AGE_IDENTITY', ''), snapshot,
                              os.environ.get('AGE_BIN', 'age'))
    run_private(['docker', 'exec', '-i', container, 'psql', '-U', 'supabase_admin', '-d', 'postgres',
                 '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-v', 'VERBOSITY=sqlstate'],
                data=restore_sql(payload).encode(), stage='vault_provisioning_failed', sqlstate=True)
    return {'vaultReadable': True, 'vaultValuesMatched': True, 'vaultRecovery': 'encrypted-named-provisioning'}


if __name__ == '__main__':
    try:
        if len(sys.argv) != 4 or sys.argv[1] != 'export':
            raise ValueError('vault_arguments_invalid')
        print(json.dumps(export_vault(sys.argv[2], sys.argv[3])))
    except Exception as error:
        code = str(error) if isinstance(error, ValueError) and re.fullmatch('[a-z_][a-z_0-9]*', str(error)) else 'vault_recovery_failed'
        print('Vault recovery failed: ' + code, file=sys.stderr)
        sys.exit(1)
