import {
  validateIntelligenceResult,
  validateIntelligenceTask
} from './intelligence-provider.js';

const actions = new Set([
  'concise_explanation',
  'contrastive_explanation',
  'misconception_repair',
  'prerequisite_remediation'
]);

const claimRoles = new Set([
  'explanation',
  'correction',
  'discriminator',
  'prerequisite',
  'example'
]);

const renderStatuses = new Set(['ready', 'abstained']);
const sourceModes = new Set(['provider', 'canonical_fallback']);
const abstentionReasons = new Set(['insufficient_grounding', 'medical_uncertainty']);
const verbosityCaps = Object.freeze({
  concise_explanation: 120,
  contrastive_explanation: 160,
  misconception_repair: 160,
  prerequisite_remediation: 180
});

function fail(message) { throw new TypeError(message); }

function plain(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, expected, label) {
  if (!plain(value)) fail(`Invalid ${label}`);
  const keys = Object.keys(value);
  if (keys.length !== expected.length || expected.some(key => !Object.hasOwn(value, key))) {
    fail(`Invalid ${label}`);
  }
}

function text(value, label, max = 480) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`Invalid ${label}`);
  return value.trim();
}

function nullableText(value, label, max = 480) {
  if (value === null) return null;
  return text(value, label, max);
}

function deepFreezeCopy(value) {
  const copy = structuredClone(value);
  const visit = item => {
    if (item && typeof item === 'object') {
      Object.values(item).forEach(visit);
      Object.freeze(item);
    }
    return item;
  };
  return visit(copy);
}

function referenceKey(value) {
  return `${value.type}\u0000${value.id}\u0000${value.version ?? ''}`;
}

function validateReference(value, label) {
  exactKeys(value, ['type', 'id', 'version'], label);
  text(value.type, `${label} type`, 120);
  text(value.id, `${label} id`, 240);
  if (value.version !== null) text(value.version, `${label} version`, 120);
}

function validateReferences(values, label, allowed = null, requireOne = false) {
  if (!Array.isArray(values) || (requireOne && values.length === 0) || values.length > 20) {
    fail(`Invalid ${label}`);
  }
  const seen = new Set();
  for (const value of values) {
    validateReference(value, label);
    const key = referenceKey(value);
    if (seen.has(key)) fail(`Duplicate ${label}`);
    if (allowed && !allowed.has(key)) fail(`${label} outside task grounding`);
    seen.add(key);
  }
}

function validateClaim(value, allowedGrounding) {
  exactKeys(value, ['claimId', 'role', 'text', 'citationRefs'], 'teaching claim');
  text(value.claimId, 'claimId', 120);
  if (!claimRoles.has(value.role)) fail('Invalid teaching claim role');
  text(value.text, 'teaching claim text', 700);
  validateReferences(value.citationRefs, 'claim citation', allowedGrounding, true);
}

function validateCorrection(value, output, task) {
  if (value === null) return;
  exactKeys(value, [
    'learnerBelief',
    'correctionClaimId',
    'discriminatorClaimId'
  ], 'misconception correction');
  const belief = text(value.learnerBelief, 'learnerBelief', 300);
  text(value.correctionClaimId, 'correctionClaimId', 120);
  text(value.discriminatorClaimId, 'discriminatorClaimId', 120);

  if (!task.input.misconception) fail('Correction requires task misconception');
  if (belief !== task.input.misconception.observedBelief) {
    fail('Correction does not match observed learner belief');
  }

  const correction = output.claims.find(item => item.claimId === value.correctionClaimId);
  const discriminator = output.claims.find(item => item.claimId === value.discriminatorClaimId);
  if (!correction || correction.role !== 'correction') fail('Missing correction claim');
  if (!discriminator || discriminator.role !== 'discriminator') fail('Missing discriminator claim');
}

function countWords(value) {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

function outputWordCount(value) {
  if (value.renderStatus !== 'ready') return 0;
  return countWords(value.headline) +
    value.claims.reduce((sum, claim) => sum + countWords(claim.text), 0) +
    countWords(value.nextPrompt);
}

function validateTaskInput(input, grounding) {
  exactKeys(input, [
    'teachingAction',
    'conceptId',
    'learnerEvidenceRef',
    'misconception',
    'canonicalFallback'
  ], 'grounded teaching input');

  if (!actions.has(input.teachingAction)) fail('Unsupported teaching action');
  text(input.conceptId, 'conceptId', 240);
  text(input.learnerEvidenceRef, 'learnerEvidenceRef', 240);

  if (input.misconception !== null) {
    exactKeys(input.misconception, ['observedBelief'], 'teaching misconception');
    text(input.misconception.observedBelief, 'observedBelief', 300);
  }
  if (input.teachingAction === 'misconception_repair' && input.misconception === null) {
    fail('Misconception repair requires observed belief');
  }

  validateGroundedTeachingOutput(
    { ...input.canonicalFallback, sourceMode: 'canonical_fallback' },
    { task: { input, grounding }, requireProviderSource: false }
  );
}

export function validateGroundedTeachingTask(value) {
  const task = validateIntelligenceTask(value);
  if (task.capability !== 'learning.teaching.render') {
    fail('Grounded teaching requires learning.teaching.render');
  }
  if (task.groundingMode !== 'required') fail('Grounded teaching requires grounding');
  if (task.outputContract.id !== 'grounded-teaching-output' || task.outputContract.version !== '1') {
    fail('Grounded teaching output contract mismatch');
  }
  validateTaskInput(task.input, task.grounding);
  return deepFreezeCopy(task);
}

export function validateGroundedTeachingOutput(value, {
  task,
  requireProviderSource = true,
  allowedResultCitations = null
} = {}) {
  if (!task || !task.input || !Array.isArray(task.grounding)) fail('Grounded teaching task context required');

  const candidate = structuredClone(value);
  exactKeys(candidate, [
    'schemaVersion',
    'contractId',
    'contractVersion',
    'renderStatus',
    'sourceMode',
    'teachingAction',
    'conceptId',
    'headline',
    'claims',
    'misconceptionCorrection',
    'nextPrompt',
    'abstentionReason'
  ], 'grounded teaching output');

  if (candidate.schemaVersion !== 1 ||
      candidate.contractId !== 'grounded-teaching-output' ||
      candidate.contractVersion !== '1') {
    fail('Unsupported grounded teaching output');
  }
  if (!renderStatuses.has(candidate.renderStatus)) fail('Invalid teaching render status');
  if (!sourceModes.has(candidate.sourceMode)) fail('Invalid teaching source mode');
  if (requireProviderSource && candidate.sourceMode !== 'provider') fail('Provider output source mismatch');
  if (candidate.teachingAction !== task.input.teachingAction) fail('Teaching action mismatch');
  if (candidate.conceptId !== task.input.conceptId) fail('Teaching concept mismatch');

  const allowedGrounding = new Set(task.grounding.map(referenceKey));
  const allowedCitations = allowedResultCitations
    ? new Set(allowedResultCitations.map(referenceKey))
    : allowedGrounding;

  if (candidate.renderStatus === 'abstained') {
    if (candidate.headline !== null ||
        !Array.isArray(candidate.claims) || candidate.claims.length !== 0 ||
        candidate.misconceptionCorrection !== null ||
        candidate.nextPrompt !== null ||
        !abstentionReasons.has(candidate.abstentionReason)) {
      fail('Invalid teaching abstention');
    }
    return deepFreezeCopy(candidate);
  }

  if (candidate.abstentionReason !== null) fail('Ready teaching cannot carry abstention reason');
  text(candidate.headline, 'teaching headline', 180);
  if (!Array.isArray(candidate.claims) || candidate.claims.length === 0 || candidate.claims.length > 6) {
    fail('Invalid teaching claims');
  }
  const claimIds = new Set();
  for (const claim of candidate.claims) {
    validateClaim(claim, allowedGrounding);
    for (const citation of claim.citationRefs) {
      if (!allowedCitations.has(referenceKey(citation))) fail('Claim citation absent from result citations');
    }
    if (claimIds.has(claim.claimId)) fail('Duplicate teaching claimId');
    claimIds.add(claim.claimId);
  }
  text(candidate.nextPrompt, 'nextPrompt', 240);
  validateCorrection(candidate.misconceptionCorrection, candidate, task);

  if (candidate.teachingAction === 'misconception_repair') {
    if (candidate.misconceptionCorrection === null) fail('Misconception repair requires correction');
  }
  if (candidate.teachingAction === 'contrastive_explanation' &&
      !candidate.claims.some(item => item.role === 'discriminator')) {
    fail('Contrastive explanation requires discriminator claim');
  }
  if (candidate.teachingAction === 'prerequisite_remediation' &&
      !candidate.claims.some(item => item.role === 'prerequisite')) {
    fail('Prerequisite remediation requires prerequisite claim');
  }

  const words = outputWordCount(candidate);
  const cap = verbosityCaps[candidate.teachingAction];
  if (words > cap) fail('Teaching output exceeds verbosity cap');

  return deepFreezeCopy(candidate);
}

function evaluationFailure(code, detail) {
  return Object.freeze({ id: code, passed: false, detail });
}

function evaluationSuccess(id, detail) {
  return Object.freeze({ id, passed: true, detail });
}

export function evaluateGroundedTeachingResult(taskValue, resultValue) {
  let task;
  const checks = [];
  try {
    task = validateGroundedTeachingTask(taskValue);
    checks.push(evaluationSuccess('task.valid', 'Grounded teaching task is valid.'));
  } catch {
    return deepFreezeCopy({
      contractId: 'grounded-teaching-evaluation-v1',
      passed: false,
      checks: [evaluationFailure('task.invalid', 'Task contract failed validation.')],
      failureCodes: ['task.invalid']
    });
  }

  let result;
  try {
    result = validateIntelligenceResult(task, resultValue);
    checks.push(evaluationSuccess('result.envelope', 'Provider result envelope is valid.'));
  } catch {
    checks.push(evaluationFailure('result.envelope', 'Provider result envelope failed validation.'));
    return deepFreezeCopy({
      contractId: 'grounded-teaching-evaluation-v1',
      passed: false,
      checks,
      failureCodes: checks.filter(item => !item.passed).map(item => item.id)
    });
  }

  if (result.status !== 'succeeded') {
    checks.push(evaluationFailure('provider.success', `Provider status was ${result.status}.`));
    return deepFreezeCopy({
      contractId: 'grounded-teaching-evaluation-v1',
      passed: false,
      checks,
      failureCodes: checks.filter(item => !item.passed).map(item => item.id)
    });
  }

  let output;
  try {
    output = validateGroundedTeachingOutput(result.output, {
      task,
      requireProviderSource: true,
      allowedResultCitations: result.citationRefs
    });
    checks.push(evaluationSuccess('output.contract', 'Teaching output contract is valid.'));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Teaching output validation failed.';
    const code = /verbosity/i.test(message)
      ? 'output.verbosity'
      : /citation|grounding/i.test(message)
        ? 'output.grounding'
        : /correction|misconception|discriminator/i.test(message)
          ? 'output.misconception_correction'
          : 'output.contract';
    checks.push(evaluationFailure(code, message));
    return deepFreezeCopy({
      contractId: 'grounded-teaching-evaluation-v1',
      passed: false,
      checks,
      failureCodes: checks.filter(item => !item.passed).map(item => item.id)
    });
  }

  if (output.renderStatus === 'abstained') {
    checks.push(evaluationFailure('output.abstained', output.abstentionReason));
  } else {
    checks.push(evaluationSuccess('output.grounding', 'Every teaching claim is grounded inside supplied references.'));
    checks.push(evaluationSuccess(
      'output.verbosity',
      `Teaching output uses ${outputWordCount(output)} / ${verbosityCaps[output.teachingAction]} allowed words.`
    ));
    if (output.teachingAction === 'misconception_repair') {
      checks.push(evaluationSuccess(
        'output.misconception_correction',
        'Observed belief is explicitly bound to correction and discriminator claims.'
      ));
    }
  }

  const failureCodes = checks.filter(item => !item.passed).map(item => item.id);
  return deepFreezeCopy({
    contractId: 'grounded-teaching-evaluation-v1',
    passed: failureCodes.length === 0,
    checks,
    failureCodes
  });
}

export function canonicalGroundedTeachingFallback(taskValue) {
  const task = validateGroundedTeachingTask(taskValue);
  return validateGroundedTeachingOutput(
    { ...task.input.canonicalFallback, sourceMode: 'canonical_fallback' },
    { task, requireProviderSource: false }
  );
}

export function resolveGroundedTeachingDelivery(taskValue, resultValue = null) {
  const task = validateGroundedTeachingTask(taskValue);
  const fallback = canonicalGroundedTeachingFallback(task);

  if (resultValue === null) {
    return deepFreezeCopy({
      contractId: 'grounded-teaching-delivery-v1',
      source: 'canonical_fallback',
      fallbackReason: 'provider_unavailable',
      evaluation: null,
      teaching: fallback
    });
  }

  const evaluation = evaluateGroundedTeachingResult(task, resultValue);
  if (!evaluation.passed) {
    const reason = evaluation.failureCodes.includes('output.abstained')
      ? 'provider_abstained'
      : resultValue?.status && resultValue.status !== 'succeeded'
        ? 'provider_failed'
        : 'evaluation_failed';
    return deepFreezeCopy({
      contractId: 'grounded-teaching-delivery-v1',
      source: 'canonical_fallback',
      fallbackReason: reason,
      evaluation,
      teaching: fallback
    });
  }

  const result = validateIntelligenceResult(task, resultValue);
  const teaching = validateGroundedTeachingOutput(result.output, {
    task,
    requireProviderSource: true,
    allowedResultCitations: result.citationRefs
  });

  return deepFreezeCopy({
    contractId: 'grounded-teaching-delivery-v1',
    source: 'provider',
    fallbackReason: null,
    evaluation,
    teaching
  });
}

export function groundedTeachingVerbosityCap(action) {
  if (!actions.has(action)) fail('Unsupported teaching action');
  return verbosityCaps[action];
}
