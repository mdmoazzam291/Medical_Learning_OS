import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260929034600_m11d_privacy_scope_v4.sql', import.meta.url),
  'utf8'
);

test('privacy scope v4 includes retention consent evidence', () => {
  assert.match(sql, /alter column scope_version set default 4/);
  assert.match(sql, /learner-privacy-scope-v4/);
  assert.match(sql, /study_retention_probe_consent_events/);
  assert.match(sql, /'scopeVersion',4/);
});

test('privacy preview counts retention consent evidence', () => {
  assert.match(sql, /'study_retention_probe_consent_events',[\s\S]*count\(\*\) from public\.study_retention_probe_consent_events where learner_id=p_learner/);
});

test('trusted privacy erasure deletes and verifies retention consent evidence', () => {
  assert.match(sql, /delete from public\.study_retention_probe_consent_events where learner_id=p_learner/);
  assert.match(sql, /jsonb_build_object\('study_retention_probe_consent_events',v_count\)/);
  assert.match(sql, /select 1 from public\.study_retention_probe_consent_events where learner_id=p_learner/);
  assert.match(sql, /set_config\('mlos\.privacy_erasure','learner-erasure-v1',true\)/);
});
