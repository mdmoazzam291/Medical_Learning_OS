// Versioned exam-rule boundary.
// Exam rules are configuration, not learner state. Simulation must pin an exact verified ruleset.

const VERIFY_STATES = ['draft', 'verified', 'retired'];
const DELIVERY_MODES = ['computer_based', 'paper_based'];
const ITEM_TYPES = ['single_best_answer', 'mixed'];

function fail(message) { throw new TypeError(message); }
function text(value, label) {
  if (typeof value !== 'string' || !value.trim()) fail(`Invalid ${label}`);
  return value.trim();
}
function nullableText(value, label) {
  if (value === null) return null;
  return text(value, label);
}
function integer(value, min, field) {
  if (!Number.isSafeInteger(value) || value < min) fail(`Invalid ${field}`);
  return value;
}
function nullableInteger(value, min, field) {
  if (value === null) return null;
  return integer(value, min, field);
}
function nullableNumber(value, field) {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(`Invalid ${field}`);
  return value;
}
function nullableBoolean(value, field) {
  if (value !== null && typeof value !== 'boolean') fail(`Invalid ${field}`);
  return value;
}
function date(value, field) {
  text(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))) {
    fail(`Invalid ${field}`);
  }
  return value;
}
function nullableDate(value, field) {
  if (value === null) return null;
  return date(value, field);
}
function exactShape(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    fail(`Invalid ${label} fields`);
  }
}
function unique(values, label) {
  if (new Set(values).size !== values.length) fail(`Duplicate ${label}`);
}
function deepFreeze(value) {
  const copy = structuredClone(value);
  const freeze = object => {
    if (object && typeof object === 'object') {
      Object.values(object).forEach(freeze);
      Object.freeze(object);
    }
    return object;
  };
  return freeze(copy);
}

function validateSource(source) {
  exactShape(source, ['sourceId', 'title', 'authority', 'url', 'publishedDate', 'kind'], 'source');
  text(source.sourceId, 'sourceId');
  text(source.title, 'source title');
  text(source.authority, 'source authority');
  text(source.url, 'source URL');
  let parsed;
  try { parsed = new URL(source.url); } catch { fail('Invalid source URL'); }
  if (!['https:', 'http:'].includes(parsed.protocol)) fail('Invalid source URL protocol');
  date(source.publishedDate, 'source publishedDate');
  if (!['official', 'secondary'].includes(source.kind)) fail('Invalid source kind');
}

function validateSection(section) {
  exactShape(section, ['sectionId', 'label', 'questionCount', 'durationSeconds'], 'section');
  text(section.sectionId, 'sectionId');
  text(section.label, 'section label');
  nullableInteger(section.questionCount, 1, 'section questionCount');
  nullableInteger(section.durationSeconds, 1, 'section durationSeconds');
}

function validateScoring(scoring) {
  exactShape(scoring, ['correct', 'incorrect', 'unanswered', 'markedForReviewScored'], 'scoring');
  nullableNumber(scoring.correct, 'correct score');
  nullableNumber(scoring.incorrect, 'incorrect score');
  nullableNumber(scoring.unanswered, 'unanswered score');
  nullableBoolean(scoring.markedForReviewScored, 'markedForReviewScored');
}

function validateNavigation(navigation) {
  exactShape(navigation, [
    'earlySectionAdvanceAllowed',
    'revisitClosedSectionsAllowed',
    'timeCarryForwardAllowed',
    'reviewWithinOpenSectionAllowed'
  ], 'navigation');
  for (const key of Object.keys(navigation)) nullableBoolean(navigation[key], key);
}

export function validateExamRuleSet(input) {
  exactShape(input, [
    'examId', 'ruleSetId', 'version', 'supersedes', 'label', 'session',
    'effectiveFrom', 'effectiveUntil', 'verification', 'sources', 'rules'
  ], 'exam ruleset');

  text(input.examId, 'examId');
  text(input.ruleSetId, 'ruleSetId');
  integer(input.version, 1, 'version');
  nullableText(input.supersedes, 'supersedes');
  text(input.label, 'label');
  text(input.session, 'session');
  date(input.effectiveFrom, 'effectiveFrom');
  nullableDate(input.effectiveUntil, 'effectiveUntil');
  if (input.effectiveUntil && input.effectiveUntil < input.effectiveFrom) fail('Invalid effective range');

  exactShape(input.verification, ['status', 'verifiedBy', 'verifiedDate', 'notes'], 'verification');
  if (!VERIFY_STATES.includes(input.verification.status)) fail('Invalid verification status');
  nullableText(input.verification.verifiedBy, 'verifiedBy');
  if (input.verification.verifiedDate !== null) date(input.verification.verifiedDate, 'verifiedDate');
  text(input.verification.notes, 'verification notes');
  if (input.verification.status === 'verified' &&
      (!input.verification.verifiedBy || !input.verification.verifiedDate)) {
    fail('Verified rules require reviewer and date');
  }
  if (input.verification.status === 'draft' &&
      (input.verification.verifiedBy !== null || input.verification.verifiedDate !== null)) {
    fail('Draft rules cannot carry verification identity');
  }

  if (!Array.isArray(input.sources)) fail('Invalid sources');
  input.sources.forEach(validateSource);
  unique(input.sources.map(source => source.sourceId), 'sourceId');

  exactShape(input.rules, [
    'deliveryMode', 'itemType', 'totalQuestions', 'totalDurationSeconds',
    'sections', 'scoring', 'navigation'
  ], 'rules');
  if (!DELIVERY_MODES.includes(input.rules.deliveryMode)) fail('Invalid delivery mode');
  if (!ITEM_TYPES.includes(input.rules.itemType)) fail('Invalid item type');
  nullableInteger(input.rules.totalQuestions, 1, 'totalQuestions');
  nullableInteger(input.rules.totalDurationSeconds, 1, 'totalDurationSeconds');
  if (!Array.isArray(input.rules.sections)) fail('Invalid sections');
  input.rules.sections.forEach(validateSection);
  unique(input.rules.sections.map(section => section.sectionId), 'sectionId');
  validateScoring(input.rules.scoring);
  validateNavigation(input.rules.navigation);

  const knownSectionQuestionCounts = input.rules.sections.every(section => section.questionCount !== null);
  if (input.rules.totalQuestions !== null && knownSectionQuestionCounts &&
      input.rules.sections.reduce((sum, section) => sum + section.questionCount, 0) !== input.rules.totalQuestions) {
    fail('Section question counts do not match totalQuestions');
  }

  const knownSectionDurations = input.rules.sections.every(section => section.durationSeconds !== null);
  if (input.rules.totalDurationSeconds !== null && knownSectionDurations &&
      input.rules.sections.reduce((sum, section) => sum + section.durationSeconds, 0) !== input.rules.totalDurationSeconds) {
    fail('Section durations do not match totalDurationSeconds');
  }

  return deepFreeze(input);
}

export function examSimulationReadiness(input) {
  const ruleSet = validateExamRuleSet(input);
  const missing = [];
  if (ruleSet.verification.status !== 'verified') missing.push('verified-ruleset');
  if (!ruleSet.sources.some(source => source.kind === 'official')) missing.push('official-source');
  if (ruleSet.rules.totalQuestions === null) missing.push('total-questions');
  if (ruleSet.rules.totalDurationSeconds === null) missing.push('total-duration');
  if (!ruleSet.rules.sections.length) missing.push('sections');
  ruleSet.rules.sections.forEach((section, index) => {
    if (section.questionCount === null) missing.push(`section-${index + 1}-question-count`);
    if (section.durationSeconds === null) missing.push(`section-${index + 1}-duration`);
  });
  for (const [key, value] of Object.entries(ruleSet.rules.scoring)) {
    if (value === null) missing.push(`scoring-${key}`);
  }
  for (const [key, value] of Object.entries(ruleSet.rules.navigation)) {
    if (value === null) missing.push(`navigation-${key}`);
  }
  return Object.freeze({
    ruleSetId: ruleSet.ruleSetId,
    ready: missing.length === 0,
    missing: Object.freeze(missing)
  });
}

export function toExamSimulationPreset(input) {
  const ruleSet = validateExamRuleSet(input);
  const readiness = examSimulationReadiness(ruleSet);
  if (!readiness.ready) {
    throw new Error(`Exam ruleset is not simulator-ready: ${readiness.missing.join(', ')}`);
  }
  return deepFreeze({
    examId: ruleSet.examId,
    ruleSetId: ruleSet.ruleSetId,
    session: ruleSet.session,
    totalQuestions: ruleSet.rules.totalQuestions,
    totalDurationSeconds: ruleSet.rules.totalDurationSeconds,
    sections: ruleSet.rules.sections,
    scoring: ruleSet.rules.scoring,
    navigation: ruleSet.rules.navigation
  });
}

export function validateExamRuleRegistry(input) {
  exactShape(input, ['schemaVersion', 'ruleSets'], 'exam rule registry');
  if (input.schemaVersion !== 1) fail('Unsupported exam rule registry version');
  if (!Array.isArray(input.ruleSets)) fail('Invalid ruleSets');
  const ruleSets = input.ruleSets.map(validateExamRuleSet);
  unique(ruleSets.map(ruleSet => ruleSet.ruleSetId), 'ruleSetId');

  const byId = new Map(ruleSets.map(ruleSet => [ruleSet.ruleSetId, ruleSet]));
  for (const ruleSet of ruleSets) {
    if (ruleSet.version === 1 && ruleSet.supersedes !== null) fail('Version 1 cannot supersede another ruleset');
    if (ruleSet.version > 1) {
      const prior = byId.get(ruleSet.supersedes);
      if (!prior) fail('Missing superseded ruleset');
      if (prior.examId !== ruleSet.examId) fail('Ruleset cannot supersede a different exam');
      if (prior.version !== ruleSet.version - 1) fail('Ruleset versions must be sequential');
    }
  }

  return deepFreeze({ schemaVersion: 1, ruleSets });
}

export function simulatorReadyRuleSets(registry) {
  return validateExamRuleRegistry(registry).ruleSets
    .filter(ruleSet => examSimulationReadiness(ruleSet).ready);
}
