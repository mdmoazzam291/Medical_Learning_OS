import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260929032000_single_content_admin.sql', import.meta.url),
  'utf8'
);

test('beta content authority is a singleton server-side account', () => {
  assert.match(sql, /create table if not exists public\.content_admin_account/);
  assert.match(sql, /singleton boolean primary key default true check \(singleton\)/);
  assert.match(sql, /admin_user_id uuid not null unique references auth\.users/);
  assert.match(sql, /alter table public\.content_admin_account enable row level security/);
  assert.match(sql, /revoke all on table public\.content_admin_account from public, anon, authenticated, service_role/);
  assert.match(sql, /grant select on table public\.content_admin_account to service_role/);
});

test('bootstrap requires exactly one existing reviewer with all three gates', () => {
  assert.match(sql, /having count\(distinct review_kind\) = 3/);
  assert.match(sql, /having count\(\*\) = 1/);
  assert.match(sql, /on conflict \(singleton\) do nothing/);
});

test('reviewer grants only authorize the singleton content admin during beta', () => {
  assert.match(sql, /create or replace function public\.is_content_admin/);
  assert.match(sql, /create or replace function public\.get_active_reviewer_grants/);
  assert.match(sql, /join public\.content_admin_account/);
  assert.match(sql, /create or replace function public\.has_active_reviewer_grant/);
  assert.match(sql, /a\.admin_user_id=p_reviewer/);
});

test('M11c validation insert is additionally admin-gated', () => {
  assert.match(sql, /study_transfer_pair_validations_admin_only/);
  assert.match(sql, /before insert on public\.study_transfer_pair_validations/);
  assert.match(sql, /content_admin_required/);
});
