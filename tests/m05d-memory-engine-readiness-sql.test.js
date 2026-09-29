import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260930010500_m05d_memory_engine_evidence_readiness.sql', import.meta.url),
  'utf8'
);

test('Memory Engine readiness is read-only, stable and service-only', () => {
  assert.match(sql, /study_memory_engine_evidence_readiness_v1/);
  assert.match(sql, /stable/);
  assert.match(sql, /security invoker/);
  assert.doesNotMatch(sql, /insert into|update public\.|delete from/i);
  assert.match(sql, /revoke all on function public\.study_memory_engine_evidence_readiness_v1\(\)[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.study_memory_engine_evidence_readiness_v1\(\)[\s\S]*service_role/);
});

test('readiness measures explicit memory evidence and rating timing without inventing timing eligibility', () => {
  assert.match(sql, /ratedAttempts/);
  assert.match(sql, /ratingCoverage/);
  assert.match(sql, /fullyRatedLearnerQuestionHistories/);
  assert.match(sql, /ratingLagMs/);
  assert.match(sql, /eligibilityRulePreregistered',false/);
  assert.match(sql, /rating-timing-eligibility-rule-not-preregistered/);
});

test('readiness measures paired bootstrap-vs-FSRS shadow decisions', () => {
  assert.match(sql, /pairedAuthoritativeShadowAttempts/);
  assert.match(sql, /learnersWithPairedAuthoritativeShadowEvidence/);
  assert.match(sql, /a\.role='authoritative'/);
  assert.match(sql, /s\.role='shadow'/);
  assert.match(sql, /fsrs-shadow-default-v1/);
});

test('readiness measures true delayed same-item retrieval coverage', () => {
  assert.match(sql, /sameItemFollowups/);
  assert.match(sql, /atLeast1Day/);
  assert.match(sql, /atLeast7Days/);
  assert.match(sql, /atLeast30Days/);
  assert.match(sql, /atLeast90Days/);
  assert.match(sql, /atLeast180Days/);
  assert.match(sql, /no-same-item-retrieval-at-or-beyond-1-day/);
  assert.match(sql, /no-same-item-retrieval-at-or-beyond-7-days/);
});

test('current experiment remains blocked when threshold and metric contract are not preregistered', () => {
  assert.match(sql, /experiment-population-threshold-not-preregistered/);
  assert.match(sql, /experiment-metric-contract-still-draft/);
  assert.match(sql, /minimumEligibleLearners/);
  assert.match(sql, /metricContractStatus/);
});

test('readiness cannot promote FSRS or alter scheduling authority', () => {
  assert.match(sql, /'fsrsControlsDueDates',false/);
  assert.match(sql, /'canRunCurrentExperiment',false/);
  assert.match(sql, /'canPromoteFsrsToProduction',false/);
  assert.match(sql, /'schedulerControl',false/);
  assert.match(sql, /'experimentArmAuthority',false/);
  assert.match(sql, /'productionPromotionAuthority',false/);
  assert.match(sql, /'masteryInferenceAuthority',false/);
  assert.match(sql, /'inventNumericThresholdNow',false/);
});
