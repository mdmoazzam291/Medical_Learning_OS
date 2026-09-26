import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(new URL('../supabase/migrations/20260926140000_reviewer_grant_governance.sql', import.meta.url), 'utf8');

test('reviewer grants are auditable, revocable and optionally expiring', () => {
  assert.match(sql, /create table public\.content_reviewer_grant_events/i);
  assert.match(sql, /action text not null check \(action in \('granted', 'revoked'\)\)/i);
  assert.match(sql, /granted_by uuid not null references auth\.users/i);
  assert.match(sql, /expires_at timestamptz null/i);
  assert.match(sql, /set_content_reviewer_grant/);
  assert.match(sql, /reviewer_grant_exists/);
  assert.match(sql, /reviewer_grant_not_found/);
});

test('active review authorization expires server-side', () => {
  assert.match(sql, /has_active_reviewer_grant/);
  assert.match(sql, /expires_at is null or g\.expires_at > now\(\)/);
  assert.match(sql, /get_active_reviewer_grants/);
  assert.match(sql, /not public\.has_active_reviewer_grant\(p_reviewer, p_review_kind\)/);
  assert.match(sql, /not public\.has_active_reviewer_grant\(p_reviewer, 'rights'\)/);
});

test('reviewer grant mutation stays service-only and browser roles see no audit log', () => {
  assert.match(sql, /revoke all on table public\.content_reviewer_grant_events from public, anon, authenticated, service_role/i);
  assert.match(sql, /grant select on table public\.content_reviewer_grant_events to service_role/i);
  assert.match(sql, /revoke all on function public\.set_content_reviewer_grant[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.set_content_reviewer_grant[\s\S]*to service_role/i);
});
