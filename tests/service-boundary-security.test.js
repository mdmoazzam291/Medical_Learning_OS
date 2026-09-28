import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [migration, audit, workflow] = await Promise.all([
  readFile(new URL('../supabase/migrations/20260928164037_m14_revoke_trigger_function_browser_execute.sql', import.meta.url),'utf8'),
  readFile(new URL('../supabase/verification/service-boundary-audit.sql', import.meta.url),'utf8'),
  readFile(new URL('../.github/workflows/supabase-r2-backup.yml', import.meta.url),'utf8')
]);

test('review measurement trigger guard is not directly browser executable', () => {
  assert.match(migration,/revoke all on function public\.block_content_review_measurement_mutation\(\)/);
  assert.match(migration,/from public, anon, authenticated, service_role/);
  assert.match(migration,/grant execute[\s\S]*to service_role/);
});

test('live audit fails if RLS-no-policy tables gain browser DML grants', () => {
  assert.match(audit,/service_only_table_browser_grant_violation/);
  assert.match(audit,/has_table_privilege\('anon'/);
  assert.match(audit,/has_table_privilege\('authenticated'/);
  assert.match(audit,/not exists \([\s\S]*from pg_policy/);
});

test('live audit forbids every public SQL function from direct browser execution', () => {
  assert.match(audit,/browser_executable_public_function_violation/);
  assert.match(audit,/from pg_proc p/);
  assert.match(audit,/n\.nspname='public'/);
  assert.match(audit,/has_function_privilege\('anon', p\.oid, 'execute'\)/);
  assert.match(audit,/has_function_privilege\('authenticated', p\.oid, 'execute'\)/);
});

test('weekly backup fails closed on privilege drift before creating dumps', () => {
  const auditStep=workflow.indexOf('Verify live service-only privilege boundaries');
  const dumpStep=workflow.indexOf('Create Supabase logical dump set');
  assert.ok(auditStep >= 0 && dumpStep > auditStep);
  assert.match(workflow,/psql "\$SUPABASE_DB_URL" --no-psqlrc --file supabase\/verification\/service-boundary-audit\.sql/);
});
