import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260928192031_m11a_delayed_retrieval_observation_projection.sql', import.meta.url),
  'utf8'
);

test('M11a links each origin attempt to the first later same-item retrieval', () => {
  assert.match(sql, /study_delayed_retrieval_observations_v1/);
  assert.match(sql, /a\.event->>'questionVersionId' = o\.question_version_id/);
  assert.match(sql, /order by a\.recorded_at, a\.id/);
  assert.match(sql, /limit 1/);
  assert.match(sql, /sameItemNextRetrieval/);
  assert.match(sql, /delayMs/);
});

test('M11a preserves learner context required for later scheduler and Study Now evaluation', () => {
  assert.match(sql, /study_memory_judgments/);
  assert.match(sql, /study_recommendation_events/);
  assert.match(sql, /recommendationReason|recommendation_reason/);
  assert.match(sql, /study_schedule_decision_events/);
  assert.match(sql, /observedOffsetMs/);
  assert.match(sql, /observedAfterProposedDue/);
});

test('M11a distinguishes same-item retention evidence from transfer candidates', () => {
  assert.match(sql, /a\.event->>'conceptId' = o\.concept_id/);
  assert.match(sql, /a\.event->>'questionVersionId' <> o\.question_version_id/);
  assert.match(sql, /interveningSameItemAttempts/);
  assert.match(sql, /uncontaminatedBySameItemRetrieval/);
  assert.match(sql, /transfer-candidate-is-descriptive-until-item-novelty-and-comparability-are-validated/);
});

test('M11a exposes retention-delay coverage without inventing a forgetting model', () => {
  assert.match(sql, /atLeast7Days/);
  assert.match(sql, /atLeast30Days/);
  assert.match(sql, /atLeast90Days/);
  assert.match(sql, /atLeast180Days/);
  assert.match(sql, /masteryInferenceEnabled', false/);
  assert.match(sql, /causalEffectClaimed', false/);
  assert.doesNotMatch(sql, /retentionProbability|forgettingRate|halfLife|masteryScore/);
});

test('M11a is derived service-only evidence, not a browser authority', () => {
  assert.match(sql, /security invoker/);
  assert.match(sql, /revoke all on function public\.study_delayed_retrieval_observations_v1\(uuid\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.study_delayed_retrieval_observations_v1\(uuid\)[\s\S]*service_role/);
  assert.doesNotMatch(sql, /insert into|update public|delete from/);
});
