const MODES = Object.freeze([
  'blocked',
  'shadow_only',
  'eligible_for_controlled_experiment'
]);

const CHECK_KEYS = Object.freeze([
  'targetIsObservedOutcome',
  'holdoutFrozenBeforeEvaluation',
  'leakageCheckPassed',
  'uncertaintyOutputDefined',
  'missingnessPolicyDefined',
  'subgroupEvaluationDefined',
  'retentionOutcomeDefined',
  'transferOutcomeDefined',
  'prospectiveShadowCompleted',
  'subgroupGuardrailsPassed',
  'rollbackPlanDefined',
  'monitoringPlanDefined',
  'modelVersionPinned',
  'interventionAttributionReady',
  'policyAuthorityDisabled'
]);

function fail(message) {
  throw new TypeError(message);
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function exactKeys(value, expected, label) {
  if (!isPlainObject(value)) fail(`Invalid ${label}`);
  const keys = Object.keys(value);
  if (keys.length !== expected.length || expected.some(key => !Object.hasOwn(value, key))) {
    fail(`Invalid ${label}`);
  }
}

function text(value, label, max = 240) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`Invalid ${label}`);
  return value;
}

function canonicalTimestamp(value, label) {
  text(value, label, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString() !== value) {
    fail(`Invalid ${label}`);
  }
  return value;
}

function finite(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`Invalid ${label}`);
  return value;
}

function deepFreezeCopy(value) {
  const copy = structuredClone(value);
  const freeze = item => {
    if (item && typeof item === 'object') {
      Object.values(item).forEach(freeze);
      Object.freeze(item);
    }
    return item;
  };
  return freeze(copy);
}

function validateCriterion(value, label) {
  exactKeys(value, ['criterionId', 'direction', 'threshold', 'observed'], label);
  text(value.criterionId, `${label} criterionId`, 160);
  if (!['minimum', 'maximum'].includes(value.direction)) fail(`Invalid ${label} direction`);
  finite(value.threshold, `${label} threshold`);
  finite(value.observed, `${label} observed`);
}

function criterionPasses(value) {
  return value.direction === 'minimum'
    ? value.observed >= value.threshold
    : value.observed <= value.threshold;
}

function validateCriteria(values, label, { allowEmpty = false } = {}) {
  if (!Array.isArray(values) || (!allowEmpty && values.length === 0)) fail(`Invalid ${label}`);
  const seen = new Set();
  values.forEach((value, index) => {
    validateCriterion(value, `${label}[${index}]`);
    if (seen.has(value.criterionId)) fail(`Duplicate ${label} criterionId`);
    seen.add(value.criterionId);
  });
}

function validateChecks(value) {
  exactKeys(value, CHECK_KEYS, 'checks');
  for (const key of CHECK_KEYS) {
    if (typeof value[key] !== 'boolean') fail(`Invalid check: ${key}`);
  }
}

function validateClaims(value) {
  exactKeys(value, ['knowledge', 'retention', 'transfer'], 'claim scope');
  for (const key of ['knowledge', 'retention', 'transfer']) {
    if (typeof value[key] !== 'boolean') fail(`Invalid claim scope: ${key}`);
  }
  if (!value.knowledge && !value.retention && !value.transfer) {
    fail('Inference candidate must declare at least one claim scope');
  }
}

export const INFERENCE_ACTIVATION_MODES = MODES;

export function validateInferenceActivationPacket(value) {
  exactKeys(value, [
    'schemaVersion',
    'gateId',
    'model',
    'preregistration',
    'claimScope',
    'evidenceCriteria',
    'offlineValidationMetrics',
    'prospectiveValidationMetrics',
    'checks'
  ], 'inference activation packet');

  if (value.schemaVersion !== 1 ||
      value.gateId !== 'digital-twin-inference-activation-v1') {
    fail('Unsupported inference activation contract');
  }

  exactKeys(value.model, ['modelId', 'modelVersion'], 'model');
  text(value.model.modelId, 'modelId', 160);
  text(value.model.modelVersion, 'modelVersion', 160);

  exactKeys(value.preregistration, [
    'planId',
    'planDigestSha256',
    'lockedAt',
    'targetContractId',
    'baselineId',
    'lockedBeforeEvaluation'
  ], 'preregistration');
  text(value.preregistration.planId, 'planId', 160);
  if (typeof value.preregistration.planDigestSha256 !== 'string' ||
      !/^[0-9a-f]{64}$/.test(value.preregistration.planDigestSha256)) {
    fail('Invalid preregistration digest');
  }
  canonicalTimestamp(value.preregistration.lockedAt, 'lockedAt');
  text(value.preregistration.targetContractId, 'targetContractId', 160);
  text(value.preregistration.baselineId, 'baselineId', 160);
  if (typeof value.preregistration.lockedBeforeEvaluation !== 'boolean') {
    fail('Invalid preregistration lock');
  }

  validateClaims(value.claimScope);
  validateCriteria(value.evidenceCriteria, 'evidence criteria');
  validateCriteria(value.offlineValidationMetrics, 'offline validation metrics');
  validateCriteria(value.prospectiveValidationMetrics, 'prospective validation metrics', { allowEmpty: true });
  validateChecks(value.checks);

  return deepFreezeCopy(value);
}

function failingCriteria(values) {
  return values
    .filter(value => !criterionPasses(value))
    .map(value => Object.freeze({
      criterionId: value.criterionId,
      direction: value.direction,
      threshold: value.threshold,
      observed: value.observed
    }));
}

export function evaluateInferenceActivationGate(input) {
  const packet = validateInferenceActivationPacket(input);
  const blockers = [];
  const evidenceFailures = failingCriteria(packet.evidenceCriteria);
  const offlineFailures = failingCriteria(packet.offlineValidationMetrics);
  const prospectiveFailures = failingCriteria(packet.prospectiveValidationMetrics);

  if (!packet.preregistration.lockedBeforeEvaluation) {
    blockers.push('preregistration_not_locked_before_evaluation');
  }

  for (const key of [
    'targetIsObservedOutcome',
    'holdoutFrozenBeforeEvaluation',
    'leakageCheckPassed',
    'uncertaintyOutputDefined',
    'missingnessPolicyDefined',
    'subgroupEvaluationDefined',
    'policyAuthorityDisabled'
  ]) {
    if (!packet.checks[key]) blockers.push(`check_failed:${key}`);
  }

  if (packet.claimScope.retention && !packet.checks.retentionOutcomeDefined) {
    blockers.push('retention_claim_without_observed_outcome');
  }
  if (packet.claimScope.transfer && !packet.checks.transferOutcomeDefined) {
    blockers.push('transfer_claim_without_observed_outcome');
  }

  for (const failure of evidenceFailures) {
    blockers.push(`evidence_below_preregistered_gate:${failure.criterionId}`);
  }
  for (const failure of offlineFailures) {
    blockers.push(`offline_metric_failed:${failure.criterionId}`);
  }

  let mode = blockers.length ? 'blocked' : 'shadow_only';

  const experimentBlockers = [];
  if (mode !== 'blocked') {
    if (!packet.checks.prospectiveShadowCompleted) {
      experimentBlockers.push('prospective_shadow_not_completed');
    }
    if (packet.prospectiveValidationMetrics.length === 0) {
      experimentBlockers.push('prospective_metrics_missing');
    }
    for (const failure of prospectiveFailures) {
      experimentBlockers.push(`prospective_metric_failed:${failure.criterionId}`);
    }
    for (const key of [
      'subgroupGuardrailsPassed',
      'rollbackPlanDefined',
      'monitoringPlanDefined',
      'modelVersionPinned',
      'interventionAttributionReady'
    ]) {
      if (!packet.checks[key]) experimentBlockers.push(`check_failed:${key}`);
    }
    if (experimentBlockers.length === 0) {
      mode = 'eligible_for_controlled_experiment';
    }
  }

  return deepFreezeCopy({
    contractId: 'digital-twin-inference-activation-result-v1',
    modelId: packet.model.modelId,
    modelVersion: packet.model.modelVersion,
    mode,
    shadowInferenceAllowed: mode !== 'blocked',
    controlledExperimentEligible: mode === 'eligible_for_controlled_experiment',
    generalProductionAuthorized: false,
    policyAuthorityOwnedByModel: false,
    preregistrationPlanId: packet.preregistration.planId,
    preregistrationDigestSha256: packet.preregistration.planDigestSha256,
    blockers,
    experimentBlockers,
    failedEvidenceCriteria: evidenceFailures,
    failedOfflineMetrics: offlineFailures,
    failedProspectiveMetrics: prospectiveFailures
  });
}
