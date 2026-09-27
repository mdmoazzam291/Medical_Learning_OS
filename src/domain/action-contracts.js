import { getCapability } from './capabilities.js';
import { validateDigestEnvelope } from './canonical-integrity.js';

const actorTypes = new Set([
  'human_learner',
  'system',
  'staff',
  'agent',
  'external_service',
  'institution'
]);

const statuses = new Set(['succeeded', 'rejected', 'failed']);

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

function text(value, label, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`Invalid ${label}`);
  return value;
}

function timestamp(value, label) {
  text(value, label, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString() !== value) {
    fail(`Invalid ${label}`);
  }
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

function actor(value) {
  exactKeys(value, ['type', 'id'], 'actor');
  if (!actorTypes.has(value.type)) fail('Invalid actor type');
  text(value.id, 'actor id', 200);
}

function reference(value, label) {
  exactKeys(value, ['type', 'id', 'version'], label);
  text(value.type, `${label} type`, 120);
  text(value.id, `${label} id`, 240);
  if (value.version !== null) text(value.version, `${label} version`, 120);
}

function stringList(value, label, maxItems = 100) {
  if (!Array.isArray(value) || value.length > maxItems) fail(`Invalid ${label}`);
  const seen = new Set();
  for (const item of value) {
    text(item, label, 200);
    if (seen.has(item)) fail(`Duplicate ${label}`);
    seen.add(item);
  }
}

function jsonObject(value, label) {
  if (!isPlainObject(value)) fail(`Invalid ${label}`);
  try {
    structuredClone(value);
  } catch {
    fail(`Invalid ${label}`);
  }
}

function provider(value) {
  if (value === null) return;
  exactKeys(value, ['providerId', 'implementationId', 'version'], 'provider metadata');
  text(value.providerId, 'provider id', 160);
  text(value.implementationId, 'implementation id', 160);
  if (value.version !== null) text(value.version, 'provider version', 160);
}

function errorInfo(value) {
  if (value === null) return;
  exactKeys(value, ['category', 'code'], 'error');
  text(value.category, 'error category', 120);
  text(value.code, 'error code', 160);
}

export function validateActionEnvelope(value) {
  exactKeys(value, [
    'schemaVersion',
    'actionId',
    'actor',
    'capability',
    'target',
    'inputRefs',
    'requestedAt',
    'permissions',
    'metadata'
  ], 'action envelope');

  if (value.schemaVersion !== 1) fail('Unsupported action envelope version');
  text(value.actionId, 'action id', 200);
  actor(value.actor);
  getCapability(value.capability);
  if (value.target !== null) reference(value.target, 'target');
  if (!Array.isArray(value.inputRefs) || value.inputRefs.length > 100) fail('Invalid inputRefs');
  value.inputRefs.forEach(item => reference(item, 'input reference'));
  timestamp(value.requestedAt, 'requestedAt');
  stringList(value.permissions, 'permission');
  jsonObject(value.metadata, 'metadata');
  return deepFreezeCopy(value);
}

export function validateActionReceipt(value) {
  exactKeys(value, [
    'schemaVersion',
    'actionId',
    'actor',
    'capability',
    'policyVersion',
    'inputDigest',
    'outputDigest',
    'provider',
    'status',
    'startedAt',
    'completedAt',
    'error',
    'metadata'
  ], 'action receipt');

  if (value.schemaVersion !== 1) fail('Unsupported action receipt version');
  text(value.actionId, 'action id', 200);
  actor(value.actor);
  getCapability(value.capability);
  text(value.policyVersion, 'policy version', 160);
  if (value.inputDigest !== null) validateDigestEnvelope(value.inputDigest);
  if (value.outputDigest !== null) validateDigestEnvelope(value.outputDigest);
  provider(value.provider);
  if (!statuses.has(value.status)) fail('Invalid receipt status');
  timestamp(value.startedAt, 'startedAt');
  timestamp(value.completedAt, 'completedAt');
  if (Date.parse(value.completedAt) < Date.parse(value.startedAt)) fail('Receipt chronology is invalid');
  errorInfo(value.error);
  if (value.status === 'succeeded' && value.error !== null) fail('Successful receipt cannot carry an error');
  if (value.status !== 'succeeded' && value.error === null) fail('Non-success receipt requires an error');
  jsonObject(value.metadata, 'metadata');
  return deepFreezeCopy(value);
}
