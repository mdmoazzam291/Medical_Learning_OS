import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260927145500_exam_run_ledger.sql', import.meta.url),
  'utf8'
);

test('exam persistence separates current projection from append-only history', () => {
  assert.match(sql, /create table if not exists public\.exam_runs/);
  assert.match(sql, /state_revision integer/);
  assert.match(sql, /state jsonb/);
  assert.match(sql, /create table if not exists public\.exam_run_events/);
  assert.match(sql, /create table if not exists public\.exam_run_receipts/);
});

test('one learner cannot silently fork two open full-exam runs', () => {
  assert.match(sql, /exam_runs_one_open_per_learner/);
  assert.match(sql, /where status = 'in_progress'/);
  assert.match(sql, /exam_run_already_open/);
});

test('transition ledger is immutable, revisioned and request-idempotent', () => {
  assert.match(sql, /exam_ledger_is_immutable/);
  assert.match(sql, /before update or delete on public\.exam_run_events/);
  assert.match(sql, /unique \(run_id, request_key\)/);
  assert.match(sql, /unique \(run_id, revision_after\)/);
  assert.match(sql, /exam_revision_conflict/);
  assert.match(sql, /exam_request_key_collision/);
  assert.match(sql, /transition_sha256/);
});

test('browser roles cannot directly mutate exam state or receipts', () => {
  assert.match(sql, /revoke all on table public\.exam_runs[\s\S]*authenticated/);
  assert.match(sql, /revoke all on table public\.exam_run_events[\s\S]*authenticated/);
  assert.match(sql, /revoke all on table public\.exam_run_receipts[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.exam_apply_transition[\s\S]*service_role/);
});

test('completion receipt is atomic, immutable and pinned to run ruleset', () => {
  assert.match(sql, /p_event_type = 'run\.completed'/);
  assert.match(sql, /p_completion_receipt->>'ruleSetId' <> v_run\.rule_set_id/);
  assert.match(sql, /insert into public\.exam_run_receipts/);
  assert.match(sql, /before update or delete on public\.exam_run_receipts/);
});

test('answer keys are forbidden from the persisted live-state envelope', () => {
  assert.match(sql, /p_state \? 'answerKey'/);
  assert.match(sql, /p_next_state \? 'answerKey'/);
});
