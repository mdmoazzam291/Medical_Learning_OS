import { canonicalize } from './canonical-integrity.js';

const actionTypes = new Set([
  'micro_correction',
  'core_explanation',
  'contrastive_explanation',
  'worked_example',
  'hint'
]);

const renderModes = new Set(['provider_generated', 'canonical_fallback']);
const uncertaintyStatuses = new Set(['not_stated', 'explicit']);
const uncertaintyExpectations = new Set(['any', 'explicit']);
const learnerPromptPolicies = new Set(['allowed', 'required', 'forbidden']);

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

function text(value, label, max = 4000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    fail(`Invalid ${label}`);
  }
  return value.trim();
}

function jsonObject(value, label) {
  if (!isPlainObject(value)) fail(`Invalid ${label}`);
  try {
    canonicalize(value);
  } catch {
    fail(`Invalid ${label}`);
  }
}

function reference(value, label) {
  exactKeys(value, ['type', 'id', 'version'], label);
  text(value.type, `${label} type`, 120);
  text(value.id, `${label} id`, 240);
  if (value.version !== null) text(value.version, `${label} version`, 120);
}

function referenceKey(value) {
  return `${value.type}\u0000${value.id}\u0000${value.version ?? ''}`;
}

function referenceList(value, label, { min = 0, max = 100 } = {}) {
  if (!Array.isArray(value) || value.length < min || value.length > max) fail(`Invalid ${label}`);
  const seen = new Set();
  for (const item of value) {
    reference(item, label);
    const key = referenceKey(item);
    if (seen.has(key)) fail(`Duplicate ${label}`);
    seen.add(key);
  }
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

function actionType(value) {
  text(value, 'teaching action type', 80);
  if (!actionTypes.has(value)) fail('Invalid teaching action type');
}

function uncertainty(value) {
  exactKeys(value, ['status', 'note'], 'teaching uncertainty');
  if (!uncertaintyStatuses.has(value.status)) fail('Invalid teaching uncertainty status');
  if (value.status === 'explicit') {
    text(value.note, 'teaching uncertainty note', 1000);
  } else if (value.note !== null) {
    fail('Unstated uncertainty cannot carry a note');
  }
}

function teachingPoint(value, allowedGrounding) {
  exactKeys(value, ['pointId', 'text', 'sourceRefs'], 'teaching point');
  text(value.pointId, 'teaching point id', 120);
  text(value.text, 'teaching point text', 3000);
  referenceList(value.sourceRefs, 'teaching point source reference', { min: 1, max: 20 });

  for (const sourceRef of value.sourceRefs) {
    if (!allowedGrounding.has(referenceKey(sourceRef))) {
      fail('Teaching point citation is outside allowed grounding');
    }
  }
}

function wordCount(value) {
  const trimmed = String(value ?? '').trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function uniqueReferenceKeysFromPoints(points) {
  const keys = new Set();
  for (const point of points) {
    for (const sourceRef of point.sourceRefs) keys.add(referenceKey(sourceRef));
  }
  return keys;
}

export function validateGroundedTeachingOutput(value, { allowedGrounding }) {
  exactKeys(value, [
    'schemaVersion',
    'actionType',
    'renderMode',
    'teachingPoints',
    'learnerPrompt',
    'uncertainty',
    'metadata'
  ], 'grounded teaching output');

  if (value.schemaVersion !== 1) fail('Unsupported grounded teaching output version');
  actionType(value.actionType);
  if (!renderModes.has(value.renderMode)) fail('Invalid teaching render mode');
  referenceList(allowedGrounding, 'allowed grounding reference', { min: 1, max: 100 });
  const allowed = new Set(allowedGrounding.map(referenceKey));

  if (!Array.isArray(value.teachingPoints) || value.teachingPoints.length < 1 || value.teachingPoints.length > 12) {
    fail('Invalid teaching points');
  }
  const pointIds = new Set();
  for (const point of value.teachingPoints) {
    teachingPoint(point, allowed);
    if (pointIds.has(point.pointId)) fail('Duplicate teaching point id');
    pointIds.add(point.pointId);
  }

  if (value.learnerPrompt !== null) text(value.learnerPrompt, 'learner prompt', 1200);
  uncertainty(value.uncertainty);
  jsonObject(value.metadata, 'grounded teaching metadata');
  return deepFreezeCopy(value);
}

export function buildCanonicalTeachingFallback({
  actionType: selectedActionType,
  canonicalExplanation,
  sourceRefs,
  learnerPrompt = null
}) {
  actionType(selectedActionType);
  text(canonicalExplanation, 'canonical explanation', 3000);
  referenceList(sourceRefs, 'canonical fallback source reference', { min: 1, max: 20 });
  if (learnerPrompt !== null) text(learnerPrompt, 'learner prompt', 1200);

  return validateGroundedTeachingOutput({
    schemaVersion: 1,
    actionType: selectedActionType,
    renderMode: 'canonical_fallback',
    teachingPoints: [{
      pointId: 'canonical-explanation',
      text: canonicalExplanation.trim(),
      sourceRefs: structuredClone(sourceRefs)
    }],
    learnerPrompt: learnerPrompt === null ? null : learnerPrompt.trim(),
    uncertainty: {
      status: 'not_stated',
      note: null
    },
    metadata: {
      generated: false,
      source: 'canonical-reviewed-content'
    }
  }, { allowedGrounding: sourceRefs });
}

export function validateGroundedTeachingStructuralEvalCase(value) {
  exactKeys(value, [
    'schemaVersion',
    'caseId',
    'allowedGrounding',
    'expectedActionType',
    'requiredCitationRefs',
    'maxTeachingWords',
    'uncertaintyExpectation',
    'learnerPromptPolicy',
    'metadata'
  ], 'grounded teaching structural eval case');

  if (value.schemaVersion !== 1) fail('Unsupported grounded teaching eval version');
  text(value.caseId, 'evaluation case id', 200);
  referenceList(value.allowedGrounding, 'evaluation allowed grounding', { min: 1, max: 100 });
  actionType(value.expectedActionType);
  referenceList(value.requiredCitationRefs, 'required citation reference', { min: 0, max: 100 });
  if (!Number.isSafeInteger(value.maxTeachingWords) || value.maxTeachingWords < 1 || value.maxTeachingWords > 2000) {
    fail('Invalid maxTeachingWords');
  }
  if (!uncertaintyExpectations.has(value.uncertaintyExpectation)) {
    fail('Invalid uncertainty expectation');
  }
  if (!learnerPromptPolicies.has(value.learnerPromptPolicy)) {
    fail('Invalid learner prompt policy');
  }
  jsonObject(value.metadata, 'grounded teaching eval metadata');

  const allowed = new Set(value.allowedGrounding.map(referenceKey));
  for (const required of value.requiredCitationRefs) {
    if (!allowed.has(referenceKey(required))) {
      fail('Required citation is outside evaluation grounding');
    }
  }

  return deepFreezeCopy(value);
}

export function evaluateGroundedTeachingStructure(caseValue, outputValue) {
  const evalCase = validateGroundedTeachingStructuralEvalCase(caseValue);
  const failures = [];
  let output = null;

  try {
    output = validateGroundedTeachingOutput(outputValue, {
      allowedGrounding: evalCase.allowedGrounding
    });
  } catch (error) {
    return deepFreezeCopy({
      schemaVersion: 1,
      evaluationScope: 'structural_only',
      caseId: evalCase.caseId,
      pass: false,
      checks: {
        contractValid: false,
        actionMatches: false,
        requiredCitationsPresent: false,
        verbosityWithinLimit: false,
        uncertaintyExpectationMet: false,
        learnerPromptPolicyMet: false
      },
      teachingWordCount: null,
      failures: ['contract_invalid'],
      medicalCorrectnessAssessed: false,
      claimSupportSemanticsAssessed: false,
      misconceptionCorrectionAssessed: false
    });
  }

  const cited = uniqueReferenceKeysFromPoints(output.teachingPoints);
  const teachingWordCount = output.teachingPoints.reduce((total, point) => total + wordCount(point.text), 0);
  const actionMatches = output.actionType === evalCase.expectedActionType;
  const requiredCitationsPresent = evalCase.requiredCitationRefs.every(ref => cited.has(referenceKey(ref)));
  const verbosityWithinLimit = teachingWordCount <= evalCase.maxTeachingWords;
  const uncertaintyExpectationMet = evalCase.uncertaintyExpectation === 'any' ||
    output.uncertainty.status === 'explicit';

  let learnerPromptPolicyMet = true;
  if (evalCase.learnerPromptPolicy === 'required') learnerPromptPolicyMet = output.learnerPrompt !== null;
  if (evalCase.learnerPromptPolicy === 'forbidden') learnerPromptPolicyMet = output.learnerPrompt === null;

  if (!actionMatches) failures.push('action_mismatch');
  if (!requiredCitationsPresent) failures.push('required_citation_missing');
  if (!verbosityWithinLimit) failures.push('verbosity_limit_exceeded');
  if (!uncertaintyExpectationMet) failures.push('uncertainty_expectation_not_met');
  if (!learnerPromptPolicyMet) failures.push('learner_prompt_policy_not_met');

  const checks = {
    contractValid: true,
    actionMatches,
    requiredCitationsPresent,
    verbosityWithinLimit,
    uncertaintyExpectationMet,
    learnerPromptPolicyMet
  };

  return deepFreezeCopy({
    schemaVersion: 1,
    evaluationScope: 'structural_only',
    caseId: evalCase.caseId,
    pass: Object.values(checks).every(Boolean),
    checks,
    teachingWordCount,
    failures,
    medicalCorrectnessAssessed: false,
    claimSupportSemanticsAssessed: false,
    misconceptionCorrectionAssessed: false
  });
}
