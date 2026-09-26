import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const sql = await readFile(
  new URL('../supabase/migrations/20260927114500_policy_experiment_framework.sql', import.meta.url),
  'utf8'
);

test('policy experiment specs and assignments are immutable server-only evidence', () => {
  assert.match(sql, /study_policy_experiment_specs/);
  assert.match(sql, /study_policy_experiment_state_events/);
  assert.match(sql, /study_policy_experiment_assignments/);
  assert.match(sql, /randomization_unit text not null check \(randomization_unit = 'learner'\)/);
  assert.match(sql, /assignment_hash text not null/);
  assert.match(sql, /revoke all on table public\.study_policy_experiment_assignments from public, anon, authenticated/);
});

test('experiment spec is SHA-256 fingerprinted and duplicate version cannot be edited', () => {
  assert.match(sql, /extensions\.digest\(p_spec::text, 'sha256'\)/);
  assert.match(sql, /experiment_spec_immutable/);
  assert.match(sql, /spec_sha256/);
});

test('draft scheduler experiment cannot be armed until a future immutable version sets a threshold', () => {
  assert.match(sql, /'minimumEligibleLearners',null/);
  assert.match(sql, /populationThresholdConfigured/);
  assert.match(sql, /experiment_not_ready_to_arm/);
  assert.match(sql, /p_confirmation <> p_experiment_id \|\| ':ARM'/);
  assert.match(sql, /p_confirmation <> p_experiment_id \|\| ':RUN'/);
});

test('eligibility requires paired authoritative and shadow evidence from the same attempt', () => {
  assert.match(sql, /paired-scheduler-evidence-v1/);
  assert.match(sql, /group by d\.learner_id, d\.attempt_id/);
  assert.match(sql, /d\.role='authoritative'/);
  assert.match(sql, /d\.role='shadow'/);
});

test('assignment is deterministic, learner-level, immutable and only available while running', () => {
  assert.match(sql, /study_assign_policy_experiment/);
  assert.match(sql, /experiment_not_running/);
  assert.match(sql, /experiment_learner_not_eligible/);
  assert.match(sql, /extensions\.digest/);
  assert.match(sql, /% 10000/);
  assert.match(sql, /v_bucket < v_spec\.control_allocation_bps/);
  assert.match(sql, /primary key \(experiment_id, version, learner_id\)/);
});

test('framework never changes scheduling authority by itself', () => {
  assert.match(sql, /'schedulerAuthorityChange',false/);
  assert.match(sql, /'autoStart',false/);
  assert.doesNotMatch(sql, /update public\.study_revision_state/);
});
