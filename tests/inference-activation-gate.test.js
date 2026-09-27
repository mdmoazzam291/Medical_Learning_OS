import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateInferenceActivationGate,
  validateInferenceActivationPacket
} from '../src/domain/inference-activation-gate.js';

const criterion = (criterionId, observed, threshold = 1, direction = 'minimum') => ({
  criterionId,
  direction,
  threshold,
  observed
});

const packet = (overrides = {}) => ({
  schemaVersion: 1,
  gateId: 'digital-twin-inference-activation-v1',
  model: {
    modelId: 'digital-twin-retention-model',
    modelVersion: 'candidate-v1'
  },
  preregistration: {
    planId: 'm07c-plan-v1',
    planDigestSha256: 'a'.repeat(64),
    lockedAt: '2026-09-28T00:00:00.000Z',
    targetContractId: 'delayed-retrieval-outcome-v1',
    baselineId: 'simple-frequency-recency-baseline-v1',
    lockedBeforeEvaluation: true
  },
  claimScope: {
    knowledge: true,
    retention: true,
    transfer: false
  },
  evidenceCriteria: [
    criterion('eligible-learners', 500, 500),
    criterion('delayed-outcome-coverage', 0.7, 0.6)
  ],
  offlineValidationMetrics: [
    criterion('brier-score', 0.18, 0.2, 'maximum'),
    criterion('ece', 0.04, 0.05, 'maximum'),
    criterion('baseline-improvement', 0.03, 0.02)
  ],
  prospectiveValidationMetrics: [],
  checks: {
    targetIsObservedOutcome: true,
    holdoutFrozenBeforeEvaluation: true,
    leakageCheckPassed: true,
    uncertaintyOutputDefined: true,
    missingnessPolicyDefined: true,
    subgroupEvaluationDefined: true,
    retentionOutcomeDefined: true,
    transferOutcomeDefined: false,
    prospectiveShadowCompleted: false,
    subgroupGuardrailsPassed: false,
    rollbackPlanDefined: false,
    monitoringPlanDefined: false,
    modelVersionPinned: false,
    interventionAttributionReady: false,
    policyAuthorityDisabled: true
  },
  ...overrides
});

test('offline-qualified model can enter hidden shadow inference but not production', () => {
  const result = evaluateInferenceActivationGate(packet());
  assert.equal(result.mode, 'shadow_only');
  assert.equal(result.inferenceAuthority, true);
  assert.equal(result.generalProductionAuthorized, false);
  assert.equal(result.policyAuthorityOwnedByModel, false);
  assert.deepEqual(result.blockers, []);
  assert.ok(result.experimentBlockers.includes('prospective_shadow_not_completed'));
});

test('preregistered thresholds are supplied by the model plan rather than hardcoded by the gate', () => {
  const custom = packet({
    evidenceCriteria: [
      criterion('eligible-learners', 41, 40),
      criterion('delayed-outcome-coverage', 0.51, 0.5)
    ],
    offlineValidationMetrics: [
      criterion('custom-calibration-loss', 7, 8, 'maximum')
    ]
  });
  assert.equal(evaluateInferenceActivationGate(custom).mode, 'shadow_only');
});

test('evidence below preregistered minima blocks inference', () => {
  const result = evaluateInferenceActivationGate(packet({
    evidenceCriteria: [
      criterion('eligible-learners', 499, 500),
      criterion('delayed-outcome-coverage', 0.7, 0.6)
    ]
  }));
  assert.equal(result.mode, 'blocked');
  assert.equal(result.inferenceAuthority, false);
  assert.ok(result.blockers.includes('evidence_below_preregistered_gate:eligible-learners'));
});

test('offline metric failure blocks inference even when evidence volume is sufficient', () => {
  const result = evaluateInferenceActivationGate(packet({
    offlineValidationMetrics: [
      criterion('brier-score', 0.21, 0.2, 'maximum')
    ]
  }));
  assert.equal(result.mode, 'blocked');
  assert.ok(result.blockers.includes('offline_metric_failed:brier-score'));
});

test('retention and transfer claims require observed outcome contracts', () => {
  const retention = packet({
    checks: { ...packet().checks, retentionOutcomeDefined: false }
  });
  assert.ok(
    evaluateInferenceActivationGate(retention).blockers
      .includes('retention_claim_without_observed_outcome')
  );

  const transfer = packet({
    claimScope: { knowledge: true, retention: false, transfer: true },
    checks: { ...packet().checks, transferOutcomeDefined: false }
  });
  assert.ok(
    evaluateInferenceActivationGate(transfer).blockers
      .includes('transfer_claim_without_observed_outcome')
  );
});

test('controlled experiment eligibility requires prospective shadow evidence and operational guardrails', () => {
  const ready = packet({
    prospectiveValidationMetrics: [
      criterion('prospective-brier-score', 0.17, 0.2, 'maximum'),
      criterion('prospective-ece', 0.03, 0.05, 'maximum')
    ],
    checks: {
      ...packet().checks,
      prospectiveShadowCompleted: true,
      subgroupGuardrailsPassed: true,
      rollbackPlanDefined: true,
      monitoringPlanDefined: true,
      modelVersionPinned: true,
      interventionAttributionReady: true
    }
  });
  const result = evaluateInferenceActivationGate(ready);
  assert.equal(result.mode, 'eligible_for_controlled_experiment');
  assert.equal(result.generalProductionAuthorized, false);
  assert.deepEqual(result.experimentBlockers, []);
});

test('model can never authorize general production or own Study Now policy authority', () => {
  const ready = packet({
    prospectiveValidationMetrics: [criterion('prospective-loss', 0.1, 0.2, 'maximum')],
    checks: {
      ...packet().checks,
      prospectiveShadowCompleted: true,
      subgroupGuardrailsPassed: true,
      rollbackPlanDefined: true,
      monitoringPlanDefined: true,
      modelVersionPinned: true,
      interventionAttributionReady: true
    }
  });
  const result = evaluateInferenceActivationGate(ready);
  assert.equal(result.generalProductionAuthorized, false);
  assert.equal(result.policyAuthorityOwnedByModel, false);
});

test('contract rejects moving-goalpost and malformed packets', () => {
  const unlocked = packet({
    preregistration: {
      ...packet().preregistration,
      lockedBeforeEvaluation: false
    }
  });
  assert.equal(evaluateInferenceActivationGate(unlocked).mode, 'blocked');

  assert.throws(() => validateInferenceActivationPacket({
    ...packet(),
    preregistration: {
      ...packet().preregistration,
      planDigestSha256: 'not-a-digest'
    }
  }), /digest/);

  assert.throws(() => validateInferenceActivationPacket({
    ...packet(),
    extra: true
  }), /Invalid inference activation packet/);
});
