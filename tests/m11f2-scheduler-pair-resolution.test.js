import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/migrations/20260930105000_m11f2_fix_scheduler_pair_resolution.sql', import.meta.url), 'utf8');

test('scheduler resolves both validated pair members from one catalog expansion', () => {
  assert.match(sql, /catalog_questions as \(/);
  assert.match(sql, /join catalog_questions qa/);
  assert.match(sql, /join catalog_questions qb/);
  assert.match(sql, /qa\.q->>'questionVersionId'=p\.question_a_version_id/);
  assert.match(sql, /qb\.q->>'questionVersionId'=p\.question_b_version_id/);
  assert.doesNotMatch(sql, /join lateral \(\s*select q[\s\S]*question_a_version_id[\s\S]*join lateral \(\s*select q[\s\S]*question_b_version_id/);
});

test('scheduler preserves exact current-content gates', () => {
  assert.match(sql, /qa\.q->>'status'='published'/);
  assert.match(sql, /qb\.q->>'status'='published'/);
  assert.match(sql, /current_review_target_sha256\(p\.question_a_version_id,'medical'\)=p\.question_a_medical_sha256/);
  assert.match(sql, /current_review_target_sha256\(p\.question_b_version_id,'medical'\)=p\.question_b_medical_sha256/);
});

test('scheduler preserves prospective timing, contamination, priority and burden gates', () => {
  assert.match(sql, /o\.consent_recorded_at <= o\.origin_attempted_at/);
  assert.match(sql, /o\.authorization_recorded_at <= o\.origin_attempted_at/);
  assert.match(sql, /window_start_days/);
  assert.match(sql, /window_end_days/);
  assert.match(sql, /target\.event->>'questionVersionId'=o\.target_question_version_id/);
  assert.match(sql, /contamination\.event->>'conceptId'=o\.concept_id/);
  assert.match(sql, /r\.due_at <= p_now or r\.latest_correct=false/);
  assert.match(sql, /s\.closed=false/);
  assert.match(sql, /prior\.scheduled_at > p_now - interval '7 days'/);
});

test('scheduler remains service-only and creates no evidence by reading candidates', () => {
  assert.match(sql, /revoke all on function public\.study_retention_probe_scheduler_candidates_v1\(timestamptz\)\s+from public, anon, authenticated/);
  assert.match(sql, /grant execute on function public\.study_retention_probe_scheduler_candidates_v1\(timestamptz\)\s+to service_role/);
  assert.doesNotMatch(sql, /insert into/);
  assert.doesNotMatch(sql, /update public\./);
  assert.doesNotMatch(sql, /delete from/);
});
