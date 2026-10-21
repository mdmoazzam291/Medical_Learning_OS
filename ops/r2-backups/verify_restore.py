"""Verify private Supabase COPY data without printing rows or fingerprints."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

IDENT = r'"?([a-zA-Z_][a-zA-Z_0-9]*)"?'
COPY = re.compile(r'^COPY ' + IDENT + r'\.' + IDENT + r' \(([^)]+)\) FROM stdin;$')


def fingerprint(rows):
    hashes = sorted(hashlib.sha256(row.encode('utf-8')).digest() for row in rows)
    return {'rows': len(hashes), 'sha256': hashlib.sha256(b''.join(hashes)).hexdigest()}


def copy_inventory(lines):
    result = {}
    lines = iter(lines)
    for line in lines:
        if not line.startswith('COPY '):
            continue
        match = COPY.fullmatch(line)
        if not match:
            raise ValueError('unsupported_copy')
        schema, table, raw_columns = match.groups()
        columns = []
        for column in raw_columns.split(','):
            col = re.fullmatch(IDENT, column.strip())
            if not col:
                raise ValueError('unsafe_column')
            columns.append(col[1])
        if len(set(columns)) != len(columns) or (schema, table) in result:
            raise ValueError('duplicate_copy')
        rows = []
        for row in lines:
            if row == r'\.':
                break
            rows.append(row)
        else:
            raise ValueError('truncated_copy')
        result[(schema, table)] = {'columns': columns, **fingerprint(rows)}
    if not result:
        raise ValueError('missing_copy_data')
    return result


def compare_inventory(expected, actual, required_public):
    if set(expected) != set(actual) or {t for s, t in expected if s == 'public'} != required_public:
        raise ValueError('table_coverage_mismatch')
    if expected != actual:
        raise ValueError('table_data_mismatch')


def verify(data_path, migrations, container):
    if container != 'supabase_db_mlos-local-restore':
        raise ValueError('disposable_target_required')

    def query(sql, stage='disposable_query'):
        result = subprocess.run(['docker', 'exec', container, 'psql', '-U', 'supabase_admin',
                                 '-d', 'postgres', '-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1',
                                 '-c', sql], capture_output=True, text=True, timeout=120)
        if result.returncode:
            raise ValueError(stage + '_failed')
        return result.stdout

    with Path(data_path).open(encoding='utf-8') as source:
        expected = copy_inventory(line.rstrip('\n') for line in source)
    required = set()
    for path in Path(migrations).glob('*.sql'):
        required.update(re.findall(r'create\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)', path.read_text(), re.I))
    actual_tables = set(json.loads(query("select coalesce(json_agg(c.relname),'[]'::json) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p')")))
    if actual_tables != required:
        raise ValueError('restored_schema_coverage_mismatch')
    actual = {}
    for (schema, table), block in expected.items():
        columns = ','.join('"' + col + '"' for col in block['columns'])
        data = query(f"SET timezone='UTC'; SET datestyle='ISO, MDY'; SET bytea_output='hex'; SET extra_float_digits=3; COPY \"{schema}\".\"{table}\" ({columns}) TO STDOUT")
        # Split only the physical COPY newline; escaped newlines stay escaped.
        rows = data.split('\n')
        if rows[-1] == '':
            rows.pop()
        actual[(schema, table)] = {'columns': block['columns'], **fingerprint(rows)}
    compare_inventory(expected, actual, required)
    query(FK_AUDIT, 'foreign_key_audit')
    if not {('auth', 'users'), ('auth', 'identities'), ('auth', 'sessions')}.issubset(expected):
        raise ValueError('auth_backup_coverage_missing')
    print(json.dumps({'stage': 'database_data_verified', 'publicTables': len(required),
                      'copyTables': len(expected), 'allCopyDataMatched': True,
                      'foreignKeysChecked': True, 'authDataMatched': True}), flush=True)
    # Count only: decrypted secrets must never enter output or artifacts.
    if ('vault', 'secrets') not in expected:
        raise ValueError('vault_backup_coverage_missing')
    if query("select count(*) = count(decrypted_secret) from vault.decrypted_secrets", 'vault_decryption').strip() != 't':
        raise ValueError('vault_decryption_failed')
    if query("select current_setting('cron.launch_active_jobs')").strip() != 'off':
        raise ValueError('cron_not_disabled')
    return {'format': 'database-restore-verification-v1', 'publicTables': len(required),
            'copyTables': len(expected), 'copySchemas': sorted({s for s, _ in expected}),
            'allCopyDataMatched': True, 'foreignKeysChecked': True, 'cronDisabled': True,
            'authDataMatched': True, 'vaultReadable': True,
            'providerFailoverTested': False}


FK_AUDIT = """
do $audit$ declare r record; joins text; relevant text; bad boolean; begin
 for r in select c.oid,c.conrelid,c.confrelid,c.conkey,c.confkey,c.confmatchtype
   from pg_constraint c join pg_class t on t.oid=c.conrelid
   join pg_namespace n on n.oid=t.relnamespace
   where c.contype='f' and n.nspname in ('public','auth','storage') loop
  select string_agg(format('p.%I = d.%I',pa.attname,da.attname),' and ' order by k.ord),
         string_agg(format('d.%I is not null',da.attname),
                    case when r.confmatchtype='f' then ' or ' else ' and ' end order by k.ord)
    into joins,relevant
    from unnest(r.conkey,r.confkey) with ordinality k(d,p,ord)
    join pg_attribute da on da.attrelid=r.conrelid and da.attnum=k.d
    join pg_attribute pa on pa.attrelid=r.confrelid and pa.attnum=k.p;
  execute format('select exists(select 1 from %s d where (%s) and not exists(select 1 from %s p where %s))',
                 r.conrelid::regclass,relevant,r.confrelid::regclass,joins) into bad;
  if bad then raise exception 'restore_fk_violation'; end if;
 end loop;
end $audit$;
"""


if __name__ == '__main__':
    try:
        print(json.dumps(verify(*sys.argv[1:])))
    except Exception as error:
        # Never echo private rows, SQL payloads, stderr or local dump paths.
        code = str(error) if isinstance(error, ValueError) and re.fullmatch('[a-z_]+', str(error)) else 'verification_failed'
        print('Full database restore verification failed: ' + code, file=sys.stderr)
        sys.exit(1)
