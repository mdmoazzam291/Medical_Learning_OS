import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260927111500_schedule_policy_decisions.sql', import.meta.url),
  'utf8'
);

test('schedule decisions are immutable keyed policy proposals linked to exact attempts', () => {
  assert.match(sql, /create table if not exists public\.study_schedule_decision_events/);
  assert.match(sql, /attempt_id uuid not null/);
  assert.match(sql, /question_version_id text not null/);
  assert.match(sql, /role text not null check \(role in \('authoritative', 'shadow'\)\)/);
  assert.match(sql, /unique \(attempt_id, policy_id, policy_version, config_version\)/);
  assert.match(sql, /foreign key \(attempt_id\) references public\.study_attempts\(id\)/);
});

test('schedule decision recorder is idempotent, learner-bound and service-only', () => {
  assert.match(sql, /study_record_schedule_decision/);
  assert.match(sql, /where id = p_attempt[\s\S]*learner_id = p_learner/);
  assert.match(sql, /conflicting_schedule_decision/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /grant execute on function public\.study_record_schedule_decision[\s\S]*service_role/);
});

test('current authoritative bootstrap decisions are backfilled without inventing intermediate history', () => {
  assert.match(sql, /from public\.study_revision_state r/);
  assert.match(sql, /r\.evidence_last_event_id/);
  assert.match(sql, /'authoritative'/);
  assert.match(sql, /on conflict \(attempt_id, policy_id, policy_version, config_version\) do nothing/);
});

test('policy outcome projection links each proposal only to the first later real retrieval', () => {
  assert.match(sql, /study_schedule_policy_outcomes/);
  assert.match(sql, /left join lateral/);
  assert.match(sql, /questionVersionId/);
  assert.match(sql, /observedNextAttemptId/);
  assert.match(sql, /retrievalOffsetMs/);
  assert.match(sql, /observedAfterProposedDue/);
  assert.match(sql, /comparisonGroupId/);
});

test('policy outcome projection remains descriptive and service-only', () => {
  assert.match(sql, /revoke all on function public\.study_schedule_policy_outcomes\(uuid\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.study_schedule_policy_outcomes\(uuid\)[\s\S]*service_role/);
  assert.doesNotMatch(sql, /causal_effect|causalEffect|winner|bestPolicy/);
});
