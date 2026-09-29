import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260929235900_m11f3_delivery_evidence_kernel.sql', import.meta.url),
  'utf8'
);

test('served and response evidence are separate immutable learner-scoped ledgers', () => {
  assert.match(sql, /study_retention_probe_served_events/);
  assert.match(sql, /study_retention_probe_response_bindings/);
  assert.match(sql, /prevent_learner_evidence_mutation/);
  assert.match(sql, /revoke all on table public\.study_retention_probe_served_events[\s\S]*authenticated/);
  assert.match(sql, /revoke all on table public\.study_retention_probe_response_bindings[\s\S]*authenticated/);
});

test('server-served evidence binds the exact learner-safe payload and content version', () => {
  assert.match(sql, /target_medical_sha256/);
  assert.match(sql, /catalog_version bigint not null/);
  assert.match(sql, /learner_question jsonb not null/);
  assert.match(sql, /learner_question_sha256/);
  assert.match(sql, /'learnerQuestion',v_served\.learner_question/);
  assert.match(sql, /'semanticClaim','server-served-not-confirmed-seen'/);
});

test('served receipt never claims rendering or viewing', () => {
  assert.match(sql, /'serverServed',true/);
  assert.match(sql, /'learnerRenderedConfirmed',false/);
  assert.match(sql, /'learnerViewedConfirmed',false/);
  assert.match(sql, /'serverServedMeansLearnerSeen',false/);
});

test('served write and idempotent replay both recheck delivery readiness at server time', () => {
  assert.match(sql, /clock_timestamp\(\)/);
  assert.match(sql, /study_retention_probe_delivery_readiness_v1/);
  assert.match(sql, /retention_probe_delivery_not_ready/);
  assert.match(sql, /retention_probe_delivery_replay_not_ready/);
  assert.doesNotMatch(sql, /p_served_at|p_now timestamptz/);
});

test('response binding requires exact target and preserves contaminated outcomes instead of erasing them', () => {
  assert.match(sql, /retention_probe_response_target_mismatch/);
  assert.match(sql, /retention_probe_response_precedes_server_delivery/);
  assert.match(sql, /response-after-preregistered-window/);
  assert.match(sql, /same-concept-attempt-between-serve-and-response/);
  assert.match(sql, /consent-not-active-at-response/);
  assert.match(sql, /authorization-not-active-at-response/);
  assert.match(sql, /clean_for_primary_analysis/);
  assert.match(sql, /contamination_reasons/);
});

test('delivery evidence kernel remains service-only and has no learner route', () => {
  assert.match(sql, /grant execute on function public\.study_record_retention_probe_served_v1[\s\S]*service_role/);
  assert.match(sql, /grant execute on function public\.study_bind_retention_probe_response_v1[\s\S]*service_role/);
  assert.match(sql, /'learnerRouteEnabled',false/);
  assert.match(sql, /'automaticExecutionEnabled',false/);
  assert.match(sql, /'canActivate',false/);
});
