import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/migrations/20260930102000_m11c_fix_pair_readiness_lookup.sql', import.meta.url), 'utf8');

test('M11c readiness expands the catalog once and resolves both exact pair members explicitly', () => {
  assert.match(sql, /with catalog_questions as \(/);
  assert.match(sql, /left join catalog_questions qa/);
  assert.match(sql, /left join catalog_questions qb/);
  assert.match(sql, /qa\.q->>'questionVersionId'=v\.question_a_version_id/);
  assert.match(sql, /qb\.q->>'questionVersionId'=v\.question_b_version_id/);
});

test('activation readiness uses the same exact-version lookup and preserves hash + publication gates', () => {
  assert.match(sql, /create or replace function public\.study_retention_probe_activation_authorization_readiness_v1\(\)/);
  assert.match(sql, /join catalog_questions qa/);
  assert.match(sql, /join catalog_questions qb/);
  assert.match(sql, /qa\.q->>'status'='published'/);
  assert.match(sql, /qb\.q->>'status'='published'/);
  assert.match(sql, /current_review_target_sha256\(v\.question_a_version_id,'medical'\)=v\.question_a_medical_sha256/);
  assert.match(sql, /current_review_target_sha256\(v\.question_b_version_id,'medical'\)=v\.question_b_medical_sha256/);
});

test('readiness repair does not widen learning or browser authority', () => {
  assert.match(sql, /'probeSchedulingEnabled',false/);
  assert.match(sql, /'studyNowAuthority',false/);
  assert.match(sql, /'masteryInferenceAuthority',false/);
  assert.match(sql, /revoke all on function public\.study_transfer_pair_validation_readiness_v1\(\)\s+from public, anon, authenticated/);
  assert.match(sql, /revoke all on function public\.study_retention_probe_activation_authorization_readiness_v1\(\)\s+from public, anon, authenticated/);
  assert.doesNotMatch(sql, /insert into public\.study_transfer_pair_validations/);
  assert.doesNotMatch(sql, /update public\.study_transfer_pair_validations/);
  assert.doesNotMatch(sql, /delete from public\.study_transfer_pair_validations/);
});
