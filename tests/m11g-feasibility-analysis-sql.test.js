import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260930002000_m11g_feasibility_analysis.sql', import.meta.url),
  'utf8'
);

test('M11g report is read-only, stable and service-only', () => {
  assert.match(sql, /study_retention_probe_feasibility_report_v1/);
  assert.match(sql, /language sql/);
  assert.match(sql, /stable/);
  assert.match(sql, /security invoker/);
  assert.doesNotMatch(sql, /insert into|update public\.|delete from/i);
  assert.match(sql, /revoke all on function public\.study_retention_probe_feasibility_report_v1[\s\S]*authenticated/);
  assert.match(sql, /grant execute on function public\.study_retention_probe_feasibility_report_v1[\s\S]*service_role/);
});

test('M11g preserves assignment, serve, response and clean-analysis funnel separately', () => {
  assert.match(sql, /'assignmentCount'/);
  assert.match(sql, /'serverServedCount'/);
  assert.match(sql, /'responseCount'/);
  assert.match(sql, /'cleanResponseCount'/);
  assert.match(sql, /'servedWithoutResponseCount'/);
  assert.match(sql, /'expiredUnservedAssignmentCount'/);
  assert.match(sql, /'expiredServedWithoutResponseCount'/);
});

test('primary outcome is descriptive and returns null rather than fake accuracy with zero clean responses', () => {
  assert.match(sql, /alternate_item_correct_within_6_to_8_day_window/);
  assert.match(sql, /when c\.clean_response_count=0 then null/);
  assert.match(sql, /'descriptiveOnly',true/);
});

test('secondary outcomes preserve uncertainty and do not infer transport failure from nonresponse', () => {
  assert.match(sql, /medianResponseTimeMs/);
  assert.match(sql, /meanResponseTimeMs/);
  assert.match(sql, /observedContaminationRate/);
  assert.match(sql, /contaminationReasonCounts/);
  assert.match(sql, /'transportFailureRate',null/);
  assert.match(sql, /'transportFailureMeasurementAvailable',false/);
  assert.match(sql, /transport-failure-not-identifiable-from-nonresponse/);
});

test('M11g explicitly forbids causal, hypothesis, mastery and forgetting claims', () => {
  assert.match(sql, /descriptive-feasibility-only/);
  assert.match(sql, /no-causal-inference/);
  assert.match(sql, /no-hypothesis-testing/);
  assert.match(sql, /no-mastery-or-forgetting-model-fitting/);
  assert.match(sql, /'causalInferenceAuthority',false/);
  assert.match(sql, /'hypothesisTestingPerformed',false/);
  assert.match(sql, /'masteryInferenceAuthority',false/);
});

test('pair-level reporting remains explicit rather than pooled opaquely', () => {
  assert.match(sql, /'pairValidationId'/);
  assert.match(sql, /'pairValidationSha256'/);
  assert.match(sql, /'conceptId'/);
  assert.match(sql, /'originQuestionVersionId'/);
  assert.match(sql, /'targetQuestionVersionId'/);
  assert.match(sql, /'cleanAccuracy'/);
});
