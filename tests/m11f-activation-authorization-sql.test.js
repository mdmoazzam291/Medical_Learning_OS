import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260929233000_m11f_activation_authorization.sql', import.meta.url),
  'utf8'
);

test('M11f authorization evidence is immutable and service-only', () => {
  assert.match(sql, /create table if not exists public\.study_retention_probe_activation_events/);
  assert.match(sql, /decision text not null check \(decision in \('authorize','revoke'\)\)/);
  assert.match(sql, /study_retention_probe_activation_events_append_only/);
  assert.match(sql, /retention_probe_activation_event_is_immutable/);
  assert.match(sql, /revoke all on table public\.study_retention_probe_activation_events[\s\S]*public, anon, authenticated, service_role/);
  assert.match(sql, /grant select, insert on table public\.study_retention_probe_activation_events[\s\S]*to service_role/);
});

test('authorization binds exact protocol, exact human pair validation and singleton admin', () => {
  assert.match(sql, /protocol_sha256 text not null/);
  assert.match(sql, /pair_validation_id uuid not null references public\.study_transfer_pair_validations/);
  assert.match(sql, /pair_validation_sha256 text not null/);
  assert.match(sql, /if not public\.is_content_admin\(p_authorizer\)/);
  assert.match(sql, /current_review_target_sha256/);
  assert.match(sql, /current_retention_comparable_pair_required/);
});

test('authorization requires a current opted-in learner and protocol-bounded caps', () => {
  assert.match(sql, /study_retention_probe_current_opt_in_population_v1/);
  assert.match(sql, /current_opted_in_learner_required/);
  assert.match(sql, /maxTotalAssignments/);
  assert.match(sql, /maxProbeAssignmentsPerLearnerPer7Days/);
  assert.match(sql, /retention_probe_assignment_cap_invalid/);
  assert.match(sql, /retention_probe_per_learner_cap_invalid/);
  assert.match(sql, /interval '56 days'/);
});

test('revocation remains possible even if pair content later becomes stale', () => {
  const authorizeIndex = sql.indexOf("if p_decision='authorize' then");
  const pairGateIndex = sql.indexOf("current_retention_comparable_pair_required");
  const revokeIndex = sql.indexOf("no_active_retention_probe_authorization");
  assert.ok(authorizeIndex >= 0 && pairGateIndex > authorizeIndex);
  assert.ok(revokeIndex > pairGateIndex);
});

test('M11f still cannot schedule probes or alter learning authority', () => {
  assert.match(sql, /'probeSchedulingEnabled',false/);
  assert.match(sql, /'studyNowAuthority',false/);
  assert.match(sql, /'masteryInferenceAuthority',false/);
  assert.match(sql, /'bounded-probe-scheduler-not-implemented'/);
  assert.match(sql, /'canActivate',false/);
});
