import { canonicalize, digestCanonical } from './canonical-integrity.js';

const SUPPORT = new Set(['supports', 'partially_supports', 'contradicts', 'not_found', 'ambiguous']);
const RISK = new Set(['low', 'moderate', 'high', 'critical']);
const RIGHTS = new Set(['unknown', 'owned', 'licensed', 'public_domain', 'citation_only', 'prohibited']);
const AUTHORITY = new Set([
  'standard_reference',
  'current_guideline',
  'regulator',
  'official_exam_authority',
  'jurisdiction_policy',
  'systematic_review',
  'primary_research',
  'historical_pyq_evidence',
  'other'
]);
const CLAIM_TYPES = new Set([
  'foundational_fact',
  'mechanism',
  'diagnostic_criterion',
  'investigation',
  'treatment_recommendation',
  'dose',
  'contraindication',
  'screening',
  'prevention',
  'regulatory_status',
  'exam_rule',
  'historical_exam_answer',
  'other'
]);

const REQUIRED_AUTHORITY = Object.freeze({
  treatment_recommendation: new Set(['current_guideline', 'regulator', 'jurisdiction_policy']),
  dose: new Set(['current_guideline', 'regulator', 'jurisdiction_policy']),
  contraindication: new Set(['current_guideline', 'regulator', 'jurisdiction_policy']),
  screening: new Set(['current_guideline', 'regulator', 'jurisdiction_policy']),
  prevention: new Set(['current_guideline', 'regulator', 'jurisdiction_policy']),
  regulatory_status: new Set(['regulator']),
  exam_rule: new Set(['official_exam_authority']),
  historical_exam_answer: new Set(['historical_pyq_evidence'])
});

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

function text(value, label, max = 1000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`Invalid ${label}`);
  return value.trim();
}

function nullableText(value, label, max = 1000) {
  if (value === null) return null;
  return text(value, label, max);
}

function jsonObject(value, label) {
  if (!isPlainObject(value)) fail(`Invalid ${label}`);
  try {
    canonicalize(value);
  } catch {
    fail(`Invalid ${label}`);
  }
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

function validateSourceEvidence(value) {
  exactKeys(value, [
    'sourceId',
    'sourceVersion',
    'authorityClass',
    'rightsMode',
    'locator',
    'support',
    'passageDigest',
    'note'
  ], 'source evidence');

  text(value.sourceId, 'sourceId', 240);
  text(value.sourceVersion, 'sourceVersion', 160);
  if (!AUTHORITY.has(value.authorityClass)) fail('Invalid authorityClass');
  if (!RIGHTS.has(value.rightsMode)) fail('Invalid rightsMode');
  jsonObject(value.locator, 'source locator');
  if (!SUPPORT.has(value.support)) fail('Invalid source support');
  if (typeof value.passageDigest !== 'string' || !/^[0-9a-f]{64}$/.test(value.passageDigest)) {
    fail('Invalid passageDigest');
  }
  nullableText(value.note, 'source evidence note', 2000);
  return value;
}

function evidenceKey(value) {
  return [
    value.sourceId,
    value.sourceVersion,
    canonicalize(value.locator),
    value.passageDigest
  ].join('\u0000');
}

export function validateAtomicClaimCandidate(value) {
  exactKeys(value, [
    'schemaVersion',
    'claimId',
    'conceptId',
    'claimType',
    'statement',
    'context',
    'riskClass',
    'evidence'
  ], 'atomic claim candidate');

  if (value.schemaVersion !== 1) fail('Unsupported atomic claim candidate version');
  text(value.claimId, 'claimId', 240);
  text(value.conceptId, 'conceptId', 240);
  if (!CLAIM_TYPES.has(value.claimType)) fail('Invalid claimType');
  text(value.statement, 'claim statement', 4000);
  jsonObject(value.context, 'claim context');
  if (!RISK.has(value.riskClass)) fail('Invalid riskClass');
  if (!Array.isArray(value.evidence) || value.evidence.length === 0 || value.evidence.length > 50) {
    fail('Invalid claim evidence');
  }

  const seen = new Set();
  for (const evidence of value.evidence) {
    validateSourceEvidence(evidence);
    const key = evidenceKey(evidence);
    if (seen.has(key)) fail('Duplicate source evidence');
    seen.add(key);
  }
  return deepFreezeCopy(value);
}

export function validateDeterministicContentCheck(value) {
  exactKeys(value, ['checkId', 'status', 'detail'], 'deterministic content check');
  text(value.checkId, 'checkId', 160);
  if (!['pass', 'warn', 'fail'].includes(value.status)) fail('Invalid deterministic check status');
  text(value.detail, 'check detail', 2000);
  return deepFreezeCopy(value);
}

function claimAuthoritySatisfied(claim) {
  const required = REQUIRED_AUTHORITY[claim.claimType];
  if (!required) return true;
  return claim.evidence.some(item => item.support === 'supports' && required.has(item.authorityClass));
}

function routeClaim(claim, blockers, focus) {
  const evidence = claim.evidence;
  const supportCount = evidence.filter(item => item.support === 'supports').length;

  for (const item of evidence) {
    if (item.rightsMode === 'prohibited') blockers.push(`${claim.claimId}: prohibited source rights`);
    if (item.rightsMode === 'unknown') blockers.push(`${claim.claimId}: unresolved source rights`);
    if (item.rightsMode === 'citation_only') focus.add('rights');
    if (item.support === 'contradicts') blockers.push(`${claim.claimId}: source contradiction`);
    if (item.support === 'not_found') blockers.push(`${claim.claimId}: source support not found`);
    if (['partially_supports', 'ambiguous'].includes(item.support)) focus.add('references');
  }

  if (!claimAuthoritySatisfied(claim)) {
    blockers.push(`${claim.claimId}: required authority class missing`);
  }
  if (supportCount === 0) blockers.push(`${claim.claimId}: no supporting source`);
  if (supportCount === 1) focus.add('references');
  if (claim.riskClass === 'moderate') focus.add('medical');
  if (['high', 'critical'].includes(claim.riskClass)) {
    blockers.push(`${claim.claimId}: high-risk medical claim`);
  }
}

export async function buildSourceGroundedVerificationPacket(value, options) {
  exactKeys(value, [
    'schemaVersion',
    'questionVersionId',
    'primaryConceptId',
    'claims',
    'deterministicChecks'
  ], 'source-grounded verification input');

  if (value.schemaVersion !== 1) fail('Unsupported source-grounded verification input version');
  text(value.questionVersionId, 'questionVersionId', 240);
  text(value.primaryConceptId, 'primaryConceptId', 240);
  if (!Array.isArray(value.claims) || value.claims.length === 0 || value.claims.length > 100) {
    fail('Invalid verification claims');
  }
  if (!Array.isArray(value.deterministicChecks) || value.deterministicChecks.length === 0 ||
      value.deterministicChecks.length > 100) {
    fail('Invalid deterministicChecks');
  }

  const claims = value.claims.map(validateAtomicClaimCandidate);
  const claimIds = claims.map(item => item.claimId);
  if (new Set(claimIds).size !== claimIds.length) fail('Duplicate claimId');
  if (claims.some(item => item.conceptId !== value.primaryConceptId && !item.context.allowSecondaryConcept)) {
    fail('Claim concept must match primary concept unless context explicitly allows secondary concept');
  }

  const deterministicChecks = value.deterministicChecks.map(validateDeterministicContentCheck);
  const checkIds = deterministicChecks.map(item => item.checkId);
  if (new Set(checkIds).size !== checkIds.length) fail('Duplicate checkId');

  const blockers = [];
  const reviewFocus = new Set();

  for (const check of deterministicChecks) {
    if (check.status === 'fail') blockers.push(`${check.checkId}: deterministic check failed`);
    if (check.status === 'warn') reviewFocus.add('editorial');
  }
  for (const claim of claims) routeClaim(claim, blockers, reviewFocus);

  const unresolvedSemanticEvidence = claims.some(claim =>
    claim.evidence.some(item => ['partially_supports', 'ambiguous'].includes(item.support))
  );
  const lane = blockers.length
    ? 'expert'
    : (reviewFocus.size || unresolvedSemanticEvidence ? 'focused' : 'routine');

  const target = {
    schemaVersion: 1,
    questionVersionId: value.questionVersionId,
    primaryConceptId: value.primaryConceptId,
    claims,
    deterministicChecks
  };
  const targetDigest = await digestCanonical(target, options);

  return deepFreezeCopy({
    schemaVersion: 1,
    packetType: 'source-grounded-review-assist',
    questionVersionId: value.questionVersionId,
    primaryConceptId: value.primaryConceptId,
    claims,
    deterministicChecks,
    targetDigest,
    riskLane: lane,
    blockers: [...new Set(blockers)].sort(),
    reviewFocus: [...reviewFocus].sort(),
    productionHumanReviewRequired: true,
    publicationAuthority: false
  });
}

export const SOURCE_GROUNDED_VERIFICATION_ENUMS = Object.freeze({
  support: Object.freeze([...SUPPORT]),
  risk: Object.freeze([...RISK]),
  rights: Object.freeze([...RIGHTS]),
  authority: Object.freeze([...AUTHORITY]),
  claimTypes: Object.freeze([...CLAIM_TYPES])
});
