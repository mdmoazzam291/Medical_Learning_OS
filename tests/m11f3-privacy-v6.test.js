import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260930000500_m11f3_privacy_scope_v6.sql', import.meta.url),
  'utf8'
);

test('privacy scope v6 includes served and response-binding evidence', () => {
  assert.match(sql, /alter column scope_version set default 6/);
  assert.match(sql, /learner-privacy-scope-v6/);
  assert.match(sql, /\('study_retention_probe_served_events'\)/);
  assert.match(sql, /\('study_retention_probe_response_bindings'\)/);
  assert.match(sql, /'scopeVersion',6/);
});

test('privacy preview counts both delivery evidence tables', () => {
  assert.match(sql, /'study_retention_probe_served_events',[\s\S]*count\(\*\) from public\.study_retention_probe_served_events/);
  assert.match(sql, /'study_retention_probe_response_bindings',[\s\S]*count\(\*\) from public\.study_retention_probe_response_bindings/);
});

test('erasure respects response -> served -> assignment foreign-key order', () => {
  const response = sql.indexOf('delete from public.study_retention_probe_response_bindings');
  const served = sql.indexOf('delete from public.study_retention_probe_served_events');
  const assignment = sql.indexOf('delete from public.study_retention_probe_assignments');
  const attempt = sql.indexOf('delete from public.study_attempts');
  assert.ok(response >= 0);
  assert.ok(served > response);
  assert.ok(assignment > served);
  assert.ok(attempt > assignment);
  assert.match(sql, /privacy_erasure_incomplete/);
});
