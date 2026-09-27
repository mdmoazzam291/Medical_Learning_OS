import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260927132000_mistake_evidence_projection.sql', import.meta.url),
  'utf8'
);

test('mistake evidence is rebuilt from immutable attempts and explicit ratings', () => {
  assert.match(sql, /create or replace function public\.study_mistake_evidence/);
  assert.match(sql, /from public\.study_attempts a/);
  assert.match(sql, /left join public\.study_memory_judgments j/);
  assert.match(sql, /mistake-observation-v1/);
});

test('mistake evidence classifies only observable longitudinal patterns', () => {
  assert.match(sql, /incorrect-response/);
  assert.match(sql, /repeat-error-same-question/);
  assert.match(sql, /repeat-same-distractor/);
  assert.match(sql, /incorrect-with-good-easy-recall/);
  assert.match(sql, /recovered-next-retrieval/);
  assert.match(sql, /repeated-error-next-retrieval/);
  assert.match(sql, /awaiting-retest/);
  assert.match(sql, /nextRetrieval/);
});

test('mistake evidence does not invent causal labels', () => {
  assert.doesNotMatch(sql, /careless|guessing|knowledge[-_ ]gap|poor attention|did not study/i);
  assert.match(sql, /revoke all on function public\.study_mistake_evidence\(uuid\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.study_mistake_evidence\(uuid\)[\s\S]*service_role/);
});
