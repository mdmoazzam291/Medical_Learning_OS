import { canonicalize } from './canonical-integrity.js';
import { getCapability } from './capabilities.js';

const statuses = new Set(['succeeded', 'rejected', 'failed']);
const groundingModes = new Set(['required', 'optional', 'none']);

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
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    fail(`Invalid ${label}`);
  }
  return value.trim();
}

function integerOrNull(value, label, min = 0) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || value < min) fail(`Invalid ${label}`);
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

function references(value, label, maxItems = 100) {
  if (!Array.isArray(value) || value.length > maxItems) fail(`Invalid ${label}`);
  const seen = new Set();
  for (const item of value) {
    reference(item, label);
    const key = referenceKey(item);
    if (seen.has(key)) fail(`Duplicate ${label}`);
    seen.add(key);
  }
}

function versionedContract(value, label) {
  exactKeys(value, ['id', 'version'], label);
  text(value.id, `${label} id`, 160);
  text(value.version, `${label} version`, 120);
}

function constraints(value) {
  exactKeys(value, ['maxLatencyMs', 'maxEstimatedCostMicrousd'], 'intelligence constraints');
  integerOrNull(value.maxLatencyMs, 'maxLatencyMs', 1);
  integerOrNull(value.maxEstimatedCostMicrousd, 'maxEstimatedCostMicrousd', 0);
}

function providerMetadata(value, label = 'provider metadata') {
  exactKeys(value, ['providerId', 'implementationId', 'version'], label);
  text(value.providerId, `${label} providerId`, 160);
  text(value.implementationId, `${label} implementationId`, 160);
  if (value.version !== null) text(value.version, `${label} version`, 160);
}

function usage(value) {
  exactKeys(value, ['inputUnits', 'outputUnits', 'unit', 'estimatedCostMicrousd'], 'intelligence usage');
  integerOrNull(value.inputUnits, 'inputUnits', 0);
  integerOrNull(value.outputUnits, 'outputUnits', 0);
  text(value.unit, 'usage unit', 40);
  integerOrNull(value.estimatedCostMicrousd, 'estimatedCostMicrousd', 0);
}

function errorInfo(value) {
  if (value === null) return;
  exactKeys(value, ['category', 'code'], 'intelligence error');
  text(value.category, 'error category', 120);
  text(value.code, 'error code', 160);
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

export function validateIntelligenceProviderDescriptor(value) {
  exactKeys(value, ['providerId', 'implementationId', 'version', 'capabilities'], 'intelligence provider descriptor');
  providerMetadata({
    providerId: value.providerId,
    implementationId: value.implementationId,
    version: value.version
  });
  if (!Array.isArray(value.capabilities) || value.capabilities.length === 0 || value.capabilities.length > 100) {
    fail('Invalid intelligence provider capabilities');
  }
  const seen = new Set();
  for (const capability of value.capabilities) {
    text(capability, 'provider capability', 160);
    getCapability(capability);
    if (seen.has(capability)) fail('Duplicate provider capability');
    seen.add(capability);
  }
  return deepFreezeCopy(value);
}

export function validateIntelligenceTask(value) {
  exactKeys(value, [
    'schemaVersion',
    'taskId',
    'capability',
    'instructionSet',
    'input',
    'grounding',
    'groundingMode',
    'outputContract',
    'constraints',
    'requestedAt',
    'metadata'
  ], 'intelligence task');

  if (value.schemaVersion !== 1) fail('Unsupported intelligence task version');
  text(value.taskId, 'taskId', 200);
  getCapability(value.capability);
  versionedContract(value.instructionSet, 'instruction set');
  jsonObject(value.input, 'intelligence input');
  references(value.grounding, 'grounding reference');
  if (!groundingModes.has(value.groundingMode)) fail('Invalid grounding mode');
  if (value.groundingMode === 'required' && value.grounding.length === 0) {
    fail('Required grounding cannot be empty');
  }
  if (value.groundingMode === 'none' && value.grounding.length !== 0) {
    fail('Ungrounded task cannot carry grounding references');
  }
  versionedContract(value.outputContract, 'output contract');
  constraints(value.constraints);
  timestamp(value.requestedAt, 'requestedAt');
  jsonObject(value.metadata, 'intelligence metadata');
  return deepFreezeCopy(value);
}

export function validateIntelligenceResult(taskValue, resultValue) {
  const task = validateIntelligenceTask(taskValue);
  exactKeys(resultValue, [
    'schemaVersion',
    'taskId',
    'provider',
    'status',
    'output',
    'citationRefs',
    'usage',
    'startedAt',
    'completedAt',
    'error',
    'metadata'
  ], 'intelligence result');

  if (resultValue.schemaVersion !== 1) fail('Unsupported intelligence result version');
  if (text(resultValue.taskId, 'result taskId', 200) !== task.taskId) fail('Result task mismatch');
  providerMetadata(resultValue.provider);
  if (!statuses.has(resultValue.status)) fail('Invalid intelligence result status');

  if (resultValue.output !== null) jsonObject(resultValue.output, 'intelligence output');
  references(resultValue.citationRefs, 'citation reference');
  usage(resultValue.usage);
  timestamp(resultValue.startedAt, 'startedAt');
  timestamp(resultValue.completedAt, 'completedAt');
  if (Date.parse(resultValue.completedAt) < Date.parse(resultValue.startedAt)) {
    fail('Intelligence result chronology is invalid');
  }
  errorInfo(resultValue.error);
  jsonObject(resultValue.metadata, 'intelligence result metadata');

  if (resultValue.status === 'succeeded') {
    if (resultValue.output === null) fail('Successful intelligence result requires output');
    if (resultValue.error !== null) fail('Successful intelligence result cannot carry an error');
  } else {
    if (resultValue.output !== null) fail('Non-success intelligence result cannot carry output');
    if (resultValue.error === null) fail('Non-success intelligence result requires an error');
  }

  const allowedGrounding = new Set(task.grounding.map(referenceKey));
  for (const citation of resultValue.citationRefs) {
    if (!allowedGrounding.has(referenceKey(citation))) {
      fail('Citation is outside task grounding');
    }
  }
  if (task.groundingMode === 'required' &&
      resultValue.status === 'succeeded' &&
      resultValue.citationRefs.length === 0) {
    fail('Grounded success requires at least one citation');
  }
  if (task.groundingMode === 'none' && resultValue.citationRefs.length !== 0) {
    fail('Ungrounded task cannot return citations');
  }

  return deepFreezeCopy(resultValue);
}

export function createIntelligenceProvider({ descriptor, execute }) {
  const provider = validateIntelligenceProviderDescriptor(descriptor);
  if (typeof execute !== 'function') fail('Invalid intelligence provider execute function');
  const supported = new Set(provider.capabilities);

  return Object.freeze({
    descriptor: provider,
    supports(capability) {
      getCapability(capability);
      return supported.has(capability);
    },
    async execute(taskValue) {
      const task = validateIntelligenceTask(taskValue);
      if (!supported.has(task.capability)) {
        throw new TypeError(`Provider does not support capability: ${task.capability}`);
      }
      const rawResult = await execute(task);
      const result = validateIntelligenceResult(task, rawResult);
      if (result.provider.providerId !== provider.providerId ||
          result.provider.implementationId !== provider.implementationId ||
          result.provider.version !== provider.version) {
        fail('Intelligence result provider mismatch');
      }
      return result;
    }
  });
}
