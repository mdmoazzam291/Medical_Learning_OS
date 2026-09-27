import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260927125000_concept_evidence_projection.sql', import.meta.url),
  'utf8'
);

test('concept evidence is rebuilt from immutable attempts and explicit memory judgments', () => {
  assert.match(sql, /create or replace function public\.study_concept_evidence/);
  assert.match(sql, /from public\.study_attempts a/);
  assert.match(sql, /left join public\.study_memory_judgments j/);
  assert.match(sql, /concept-observation-v1/);
});

test('concept evidence preserves breadth, repetition, timing and rating discordance', () => {
  assert.match(sql, /distinctQuestionVersions/);
  assert.match(sql, /repeatAttemptCount/);
  assert.match(sql, /meanDurationMs/);
  assert.match(sql, /ratingCoverage/);
  assert.match(sql, /correctAgain/);
  assert.match(sql, /incorrectGoodOrEasy/);
});

test('concept evidence remains service-only and contains no mastery inference', () => {
  assert.match(sql, /revoke all on function public\.study_concept_evidence\(uuid\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.study_concept_evidence\(uuid\)[\s\S]*service_role/);
  assert.doesNotMatch(sql, /mastery_score|masteryScore|abilityScore|forgettingScore/);
});
