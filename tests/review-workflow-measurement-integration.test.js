import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [sql, api, adapter, ui, serve, experiment] = await Promise.all([
  readFile(new URL('../supabase/migrations/20260928145039_m02c_review_workflow_measurement.sql', import.meta.url),'utf8'),
  readFile(new URL('../supabase/functions/review-api/index.ts', import.meta.url),'utf8'),
  readFile(new URL('../src/adapters/cloud-review.js', import.meta.url),'utf8'),
  readFile(new URL('../web/review.js', import.meta.url),'utf8'),
  readFile(new URL('../scripts/serve.js', import.meta.url),'utf8'),
  readFile(new URL('../src/domain/review-workflow-experiment.js', import.meta.url),'utf8')
]);

test('review workflow measurement is append-only, service-only and non-authoritative', () => {
  assert.match(sql,/create table public\.content_review_workflow_measurements/);
  assert.match(sql,/enable row level security/);
  assert.match(sql,/revoke all on table public\.content_review_workflow_measurements[\s\S]*from public, anon, authenticated, service_role/);
  assert.match(sql,/grant select on table public\.content_review_workflow_measurements[\s\S]*to service_role/);
  assert.match(sql,/content_review_workflow_measurements_immutable/);
  assert.match(sql,/content_review_measurement_append_only/);
  assert.match(sql,/'causal',false/);
  assert.match(sql,/descriptive operational measurement; matched clusters are not randomized/);
});

test('measurement write derives review identity from immutable review receipt', () => {
  assert.match(sql,/where id=p_review_id/);
  assert.match(sql,/v_review\.reviewer_id <> p_reviewer/);
  assert.match(sql,/v_review\.target_sha256/);
  assert.match(sql,/v_review\.question_version_id/);
  assert.match(sql,/on conflict \(review_id\) do nothing/);
  assert.match(sql,/conflicting_review_measurement_retry/);
});

test('review API derives reviewer from JWT and accepts only bounded timing intent', () => {
  assert.match(api,/path === "\/review-measurements"/);
  assert.match(api,/p_reviewer: reviewerId/);
  assert.match(api,/foregroundActiveMs/);
  assert.match(api,/elapsedWallMs/);
  assert.match(api,/queueSize/);
  assert.match(api,/14400000/);
  assert.match(api,/21600000/);
  assert.doesNotMatch(api,/reviewerId\s*=\s*input\./);
});

test('browser measures only explicit pilot arms after a real review receipt', () => {
  assert.match(ui,/referencesExperimentArm: 'all'/);
  assert.match(ui,/M02C REVIEW-WORKFLOW PILOT/);
  assert.match(ui,/REFERENCES_WORKFLOW_EXPERIMENT_V1/);
  assert.match(experiment,/label: 'CO claim-first'/);
  assert.match(experiment,/label: 'ASA standard'/);
  assert.match(ui,/const workflowMeasurement = noteVersionId \? null : reviewMeasurementForQuestion/);
  const reviewWrite=ui.indexOf('await review.record({');
  const metricWrite=ui.indexOf('await review.recordMeasurement({');
  assert.ok(reviewWrite >= 0 && metricWrite > reviewWrite);
  assert.match(ui,/record_review_workflow_measurement/);
  assert.match(ui,/never used for reviewer scoring or publication authority/);
});

test('client adapter does not send reviewer identity in measurement payload', () => {
  assert.match(adapter,/recordMeasurement\(\{/);
  const start=adapter.indexOf('recordMeasurement({');
  const end=adapter.indexOf('measurementSummary(',start);
  const section=adapter.slice(start,end);
  assert.doesNotMatch(section,/reviewerId/);
  assert.match(section,/reviewId/);
  assert.match(section,/workflowMode/);
  assert.match(section,/clientSessionId/);
});

test('preview server exposes the new experiment module explicitly', () => {
  assert.match(serve,/src\/domain\/review-workflow-experiment\.js/);
});


test('browser displays descriptive pilot progress without choosing a winner', () => {
  assert.match(ui,/REFERENCES_WORKFLOW_EXPERIMENT_V1/);
  assert.match(ui,/review\.measurementSummary\(REFERENCES_WORKFLOW_EXPERIMENT_V1\.experimentId\)/);
  assert.match(ui,/content-review-workflow-measurement-summary-v1/);
  assert.match(ui,/summary\?\.causal !== false/);
  assert.match(ui,/Descriptive only · not causal/);
  assert.match(ui,/Median foreground-active/);
  assert.match(ui,/Median elapsed wall/);
  assert.match(ui,/Rejection proxy/);
  assert.match(ui,/No winner is inferred automatically/);
  assert.match(ui,/Do not interpret partial timing as a workflow verdict/);
  assert.doesNotMatch(ui,/winner:\s*(claim_first|standard|CO|ASA)|best workflow:|reviewer score:/i);
});

test('measurement summary failure is non-blocking and never reuses stale results', () => {
  assert.match(ui,/referencesMeasurementSummary: null/);
  assert.match(ui,/referencesMeasurementError: null/);
  assert.match(ui,/review_measurement_summary_unavailable/);
  assert.match(ui,/Measurement summary unavailable/);
  assert.match(ui,/Review remains usable and no prior summary is reused/);
});
