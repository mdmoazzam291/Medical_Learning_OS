import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('M04c review migration keeps browser roles out and review evidence immutable', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20260926120000_content_review_evidence.sql', import.meta.url), 'utf8');

  assert.match(sql, /create table public\.content_reviewer_grants/i);
  assert.match(sql, /create table public\.content_review_events/i);
  assert.match(sql, /alter table public\.content_reviewer_grants enable row level security/i);
  assert.match(sql, /alter table public\.content_review_events enable row level security/i);

  assert.match(sql, /revoke all on table public\.content_reviewer_grants from public, anon, authenticated, service_role/i);
  assert.match(sql, /revoke all on table public\.content_review_events from public, anon, authenticated, service_role/i);
  assert.match(sql, /grant select on table public\.content_reviewer_grants to service_role/i);
  assert.match(sql, /grant select on table public\.content_review_events to service_role/i);
  assert.doesNotMatch(sql, /grant\s+(?:insert|update|delete|all)[^;]*content_review_events[^;]*service_role/i);

  assert.match(sql, /security definer/i);
  assert.match(sql, /reviewer_not_authorized/);
  assert.match(sql, /author_cannot_self_review/);
  assert.match(sql, /question_not_in_review/);
  assert.match(sql, /target_sha256/);
  assert.match(sql, /extensions\.digest/);
  assert.match(sql, /unique \(question_version_id, review_kind\)/i);

  assert.match(sql, /revoke all on function public\.record_content_review[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.record_content_review[\s\S]*to service_role/i);
});
