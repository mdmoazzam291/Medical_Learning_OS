import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260926192000_study_recommendation_outcomes.sql', import.meta.url),
  'utf8'
);

test('Study Now outcomes are rebuildable from recommendation, session and attempt evidence', () => {
  assert.match(sql, /create or replace function public\.study_recommendation_outcomes/);
  assert.match(sql, /from public\.study_recommendation_events r/);
  assert.match(sql, /join public\.study_sessions s/);
  assert.match(sql, /left join public\.study_attempts a/);
  assert.match(sql, /actualAnswerMs/);
  assert.match(sql, /attemptedCount/);
  assert.match(sql, /correctCount/);
  assert.match(sql, /candidateMix/);
});

test('outcomes preserve explainable candidate classes and first later retrieval', () => {
  assert.match(sql, /mistake-repair/);
  assert.match(sql, /due-revision/);
  assert.match(sql, /new-learning/);
  assert.match(sql, /a\.session_id <> r\.session_id/);
  assert.match(sql, /followupObservedCount/);
  assert.match(sql, /followupAccuracy/);
});

test('outcome projection is service-only and does not create a mastery score', () => {
  assert.match(sql, /revoke all on function public\.study_recommendation_outcomes\(uuid\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.study_recommendation_outcomes\(uuid\)[\s\S]*service_role/);
  assert.doesNotMatch(sql, /mastery_score|masteryScore|causal_effect|causalEffect/);
});
