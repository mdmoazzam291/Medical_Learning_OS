import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260929034500_m11d_retention_probe_learner_opt_in.sql', import.meta.url),
  'utf8'
);

test('M11d stores retention pilot decisions as append-only protocol-bound learner evidence', () => {
  assert.match(sql, /create table if not exists public\.study_retention_probe_consent_events/);
  assert.match(sql, /learner_id uuid not null references auth\.users\(id\) on delete cascade/);
  assert.match(sql, /protocol_sha256 text not null/);
  assert.match(sql, /decision text not null check \(decision in \('opt_in','withdraw'\)\)/);
  assert.match(sql, /study_retention_probe_consent_events_append_only/);
  assert.match(sql, /retention_probe_consent_is_append_only/);
});

test('browser roles cannot read or write consent evidence directly', () => {
  assert.match(sql, /alter table public\.study_retention_probe_consent_events enable row level security/);
  assert.match(sql, /revoke all on table public\.study_retention_probe_consent_events[\s\S]*authenticated/);
  assert.match(sql, /grant select, insert on table public\.study_retention_probe_consent_events[\s\S]*service_role/);
  assert.match(sql, /revoke all on function public\.study_retention_probe_learner_consent_v1\(uuid\)[\s\S]*authenticated/);
  assert.match(sql, /revoke all on function public\.record_retention_probe_learner_consent_v1\(uuid,text,text,text\)[\s\S]*authenticated/);
});

test('consent is bound to the exact preregistered protocol hash and supports withdrawal', () => {
  assert.match(sql, /retention-probe-feasibility-v1/);
  assert.match(sql, /p_protocol_sha256 <> v_protocol\.protocol_sha256/);
  assert.match(sql, /retention_probe_protocol_changed/);
  assert.match(sql, /retention-probe-learner-consent-v1/);
  assert.match(sql, /p_decision not in \('opt_in','withdraw'\)/);
  assert.match(sql, /v_latest\.decision=p_decision/);
});

test('consent receipts never grant scheduling, activation or mastery authority', () => {
  assert.match(sql, /'activationAuthority',false/);
  assert.match(sql, /'probeSchedulingEnabled',false/);
  assert.match(sql, /'masteryInferenceAuthority',false/);
});

test('global activation readiness recognizes the opt-in path but remains blocked', () => {
  assert.match(sql, /'learnerOptInPathAvailable',true/);
  assert.match(sql, /'canActivate',false/);
  assert.match(sql, /separate-activation-authorization-required/);
  assert.doesNotMatch(sql, /learner-opt-in-path-not-yet-implemented/);
});
