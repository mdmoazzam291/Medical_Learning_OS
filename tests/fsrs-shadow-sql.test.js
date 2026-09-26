import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260927101000_fsrs_shadow_evidence.sql', import.meta.url),
  'utf8'
);

test('FSRS shadow evidence joins attempts to explicit memory judgments only', () => {
  assert.match(sql, /study_fsrs_shadow_evidence/);
  assert.match(sql, /from public\.study_attempts a/);
  assert.match(sql, /left join public\.study_memory_judgments j/);
  assert.match(sql, /j\.attempt_id = a\.attempt_id/);
  assert.match(sql, /hasReplayableEvidence/);
  assert.match(sql, /reviews/);
});

test('shadow readiness exposes missingness and discordance without scheduling authority', () => {
  assert.match(sql, /ratingCoverage/);
  assert.match(sql, /unratedAttempts/);
  assert.match(sql, /correctAgain/);
  assert.match(sql, /incorrectGoodOrEasy/);
  assert.match(sql, /fsrsControlsDueDates', false/);
  assert.match(sql, /livePolicyId', 'bootstrap-binary-v1'/);
});

test('shadow evidence function remains service-only', () => {
  assert.match(sql, /revoke all on function public\.study_fsrs_shadow_evidence\(uuid\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.study_fsrs_shadow_evidence\(uuid\)[\s\S]*service_role/);
});


test('shadow readiness exposes per-question rating completeness before scheduling', () => {
  assert.match(sql, /question_coverage as/);
  assert.match(sql, /fullyRated/);
  assert.match(sql, /fullyRatedQuestionCount/);
  assert.match(sql, /unratedAttempts/);
});
