import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260927143500_exam_dna_observations.sql', import.meta.url),
  'utf8'
);

test('Exam DNA is rebuilt from active immutable PYQ evidence', () => {
  assert.match(sql, /create or replace function public\.exam_dna_observations/);
  assert.match(sql, /from public\.question_exam_evidence_events e/);
  assert.match(sql, /r\.action = 'retracted'/);
  assert.match(sql, /r\.target_event_id = e\.id/);
  assert.match(sql, /join public\.exam_occurrences o/);
});

test('Exam DNA separates licensed exact, corroborated recall and single recall evidence', () => {
  assert.match(sql, /licensedExactItems/);
  assert.match(sql, /corroboratedRecallItems/);
  assert.match(sql, /singleRecallItems/);
  assert.match(sql, /licensed_primary_source/);
  assert.match(sql, /corroborated_recall/);
  assert.match(sql, /single_recall/);
});

test('Exam DNA reports breadth by exact question version and exam occurrence', () => {
  assert.match(sql, /distinctQuestionVersions/);
  assert.match(sql, /distinctExamOccurrences/);
  assert.match(sql, /count\(distinct c\.question_version_id\)/);
  assert.match(sql, /count\(distinct c\.exam_occurrence_id\)/);
  assert.match(sql, /subjectTags/);
});

test('Exam DNA refuses to turn historical frequency into prediction', () => {
  assert.match(sql, /predictiveInferenceEnabled', false/);
  assert.match(sql, /historical-evidence-is-not-a-future-exam-probability/);
  assert.match(sql, /absence-of-evidence-is-not-evidence-of-absence/);
  assert.doesNotMatch(sql, /forecastScore|predictedChance|likelihoodScore|highYieldScore|confidenceScore/);
});

test('Exam DNA exposes explicit sparse-evidence uncertainty', () => {
  assert.match(sql, /no-pyq-evidence/);
  assert.match(sql, /single-occurrence-only/);
  assert.match(sql, /recalled-evidence-only/);
  assert.match(sql, /sparse-concept-sample/);
  assert.match(sql, /unresolvedQuestionVersions/);
});

test('Exam DNA is service-only', () => {
  assert.match(sql, /revoke all on function public\.exam_dna_observations\(text\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.exam_dna_observations\(text\)[\s\S]*service_role/);
});
