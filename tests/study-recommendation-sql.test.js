import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260926190000_study_recommendation_events.sql', import.meta.url),
  'utf8'
);

test('Study Now recommendation receipts bind plans to sessions', () => {
  assert.match(sql, /create table if not exists public\.study_recommendation_events/);
  assert.match(sql, /session_id uuid not null unique/);
  assert.match(sql, /foreign key \(session_id\) references public\.study_sessions\(id\)/);
  assert.match(sql, /strategy text not null/);
  assert.match(sql, /available_minutes integer not null/);
  assert.match(sql, /plan jsonb not null/);
});

test('Study Now session and recommendation receipt are created atomically', () => {
  assert.match(sql, /create or replace function public\.study_start_recommendation_session/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /insert into public\.study_sessions/);
  assert.match(sql, /insert into public\.study_recommendation_events/);
  assert.match(sql, /study_now_plan_session_mismatch/);
  assert.match(sql, /'resumed', true/);
  assert.match(sql, /'resumed', false/);
});

test('browser roles can read only their own recommendation receipts and cannot create them', () => {
  assert.match(sql, /enable row level security/);
  assert.match(sql, /study_recommendation_events_read_own/);
  assert.match(sql, /revoke all on table public\.study_recommendation_events[\s\S]*authenticated/);
  assert.match(sql, /grant select on table public\.study_recommendation_events[\s\S]*authenticated/);
  assert.match(sql, /revoke all on function public\.study_start_recommendation_session[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.study_start_recommendation_session[\s\S]*service_role/);
});
