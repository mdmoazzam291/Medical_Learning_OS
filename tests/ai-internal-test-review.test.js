import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL('../supabase/migrations/20260928030000_ai_internal_test_review.sql', import.meta.url);

test('AI review evidence is separate, immutable, test-only and service-controlled', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /create table if not exists public\.ai_content_review_events/i);
  assert.match(sql, /authority_scope text not null default 'internal_testing_only'/);
  assert.match(sql, /alter table public\.ai_content_review_events enable row level security/i);
  assert.match(sql, /revoke all on table public\.ai_content_review_events from public, anon, authenticated/i);
  assert.match(sql, /revoke insert, update, delete on table public\.ai_content_review_events from service_role/i);
  assert.match(sql, /before update or delete on public\.ai_content_review_events/i);
  assert.match(sql, /record_ai_content_review/);
  assert.match(sql, /question_not_in_review/);
  assert.doesNotMatch(sql, /update public\.study_catalog[\s\S]*record_ai_content_review/i);
});

test('AI review requires three current gate fingerprints before internal-test eligibility', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /exam_mock_internal_test_readiness/);
  assert.match(sql, /exam_assemble_internal_test_mock/);
  assert.match(sql, /select count\(\*\)[\s\S]*ai_content_review_events/i);
  assert.match(sql, /e\.target_sha256 = public\.current_review_target_sha256/);
  assert.match(sql, /\) = 3/);
  assert.match(sql, /human_published/);
  assert.match(sql, /ai_internal_test/);
  assert.match(sql, /'testOnly',true/);
  assert.match(sql, /'learnerFacing',false/);
  assert.match(sql, /'productionPublicationAuthority',false/);
});

test('production mock readiness and publication functions are not replaced', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.doesNotMatch(sql, /create or replace function public\.exam_mock_readiness\s*\(/i);
  assert.doesNotMatch(sql, /create or replace function public\.exam_assemble_mock\s*\(/i);
  assert.doesNotMatch(sql, /create or replace function public\.publish_verified_content\s*\(/i);
  assert.doesNotMatch(sql, /insert into public\.content_review_events/i);
  assert.doesNotMatch(sql, /insert into public\.source_rights_events/i);
});
