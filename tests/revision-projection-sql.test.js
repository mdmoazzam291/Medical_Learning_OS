import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260926172500_revision_projection.sql', import.meta.url),
  'utf8'
);

test('M05b persists a learner-scoped rebuildable revision projection', () => {
  assert.match(sql, /create table if not exists public\.study_revision_state/);
  assert.match(sql, /primary key \(learner_id, question_version_id\)/);
  assert.match(sql, /study_revision_state_learner_due/);
  assert.match(sql, /policy_id text not null/);
  assert.match(sql, /policy_version integer not null/);
  assert.match(sql, /projection_version integer not null/);
  assert.match(sql, /evidence_last_event_id uuid not null/);
});

test('revision rebuild is serialized with learner study writes and replays attempts', () => {
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /from public\.study_attempts a/);
  assert.match(sql, /order by e\.occurred_at desc, e\.event_id desc/);
  assert.match(sql, /revision_evidence_concept_conflict/);
  assert.match(sql, /bootstrap-binary-v1/);
});

test('browser roles cannot mutate revision projection', () => {
  assert.match(sql, /enable row level security/);
  assert.match(sql, /study_revision_state_read_own/);
  assert.match(sql, /revoke all on table public\.study_revision_state from public, anon, authenticated/);
  assert.match(sql, /grant select on table public\.study_revision_state to authenticated/);
  assert.match(sql, /revoke all on function public\.study_rebuild_revision_state\(uuid, text\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.study_rebuild_revision_state\(uuid, text\)[\s\S]*service_role/);
});
