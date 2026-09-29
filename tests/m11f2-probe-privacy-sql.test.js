import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260929235100_m11f2_privacy_scope_v5.sql', import.meta.url),
  'utf8'
);

test('privacy scope v5 includes retention probe assignments', () => {
  assert.match(sql, /alter column scope_version set default 5/);
  assert.match(sql, /learner-privacy-scope-v5/);
  assert.match(sql, /\('study_retention_probe_assignments'\)/);
  assert.match(sql, /'scopeVersion',5/);
});

test('privacy preview counts scheduled probe assignments', () => {
  assert.match(sql, /'study_retention_probe_assignments',[\s\S]*count\(\*\) from public\.study_retention_probe_assignments where learner_id=p_learner/);
});

test('trusted learner erasure deletes assignments before attempts and verifies zero residue', () => {
  const assignmentDelete = sql.indexOf('delete from public.study_retention_probe_assignments');
  const attemptDelete = sql.indexOf('delete from public.study_attempts');
  assert.ok(assignmentDelete >= 0);
  assert.ok(attemptDelete > assignmentDelete);
  assert.match(sql, /jsonb_build_object\('study_retention_probe_assignments',v_count\)/);
  assert.match(sql, /select 1 from public\.study_retention_probe_assignments where learner_id=p_learner/);
  assert.match(sql, /mlos\.privacy_erasure/);
});
