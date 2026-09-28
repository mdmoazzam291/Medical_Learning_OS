import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createIntelligenceProvider,
  validateIntelligenceProviderDescriptor,
  validateIntelligenceResult,
  validateIntelligenceTask
} from '../src/domain/intelligence-provider.js';
import { getCapability } from '../src/domain/capabilities.js';

const grounding = [
  { type: 'content-source', id: 'source:guideline:1', version: '2026' }
];

const task = () => ({
  schemaVersion: 1,
  taskId: 'task:teaching:1',
  capability: 'learning.teaching.render',
  instructionSet: { id: 'grounded-teaching', version: '1' },
  input: {
    teachingAction: 'contrastive_explanation',
    conceptId: 'concept:example',
    learnerEvidenceRef: 'evidence-slice:test'
  },
  grounding,
  groundingMode: 'required',
  outputContract: { id: 'grounded-teaching-output', version: '1' },
  constraints: {
    maxLatencyMs: 5000,
    maxEstimatedCostMicrousd: 25000
  },
  requestedAt: '2026-09-28T05:00:00.000Z',
  metadata: {
    policyVersion: 'adaptive-teaching-deterministic-v1'
  }
});

const providerDescriptor = {
  providerId: 'test-provider',
  implementationId: 'fake-structured-provider',
  version: '1',
  capabilities: ['learning.teaching.render']
};

const success = () => ({
  schemaVersion: 1,
  taskId: 'task:teaching:1',
  provider: {
    providerId: 'test-provider',
    implementationId: 'fake-structured-provider',
    version: '1'
  },
  status: 'succeeded',
  output: {
    explanation: 'Synthetic test output.',
    nextPrompt: 'Synthetic next step.'
  },
  citationRefs: grounding,
  usage: {
    inputUnits: 120,
    outputUnits: 48,
    unit: 'token',
    estimatedCostMicrousd: 1200
  },
  startedAt: '2026-09-28T05:00:00.100Z',
  completedAt: '2026-09-28T05:00:00.900Z',
  error: null,
  metadata: {
    cached: false
  }
});

test('teaching render is a stable semantic capability, not a vendor name', () => {
  const capability = getCapability('learning.teaching.render');
  assert.equal(capability.version, 1);
  assert.equal(capability.risk, 'medium');
  assert.throws(() => getCapability('openai.chat.completions'), /Unknown capability/);
});

test('intelligence task is structured, grounded, versioned and deeply immutable', () => {
  const value = validateIntelligenceTask(task());
  assert.ok(Object.isFrozen(value));
  assert.ok(Object.isFrozen(value.input));
  assert.ok(Object.isFrozen(value.grounding[0]));
  assert.equal(value.groundingMode, 'required');
  assert.equal(value.instructionSet.id, 'grounded-teaching');
  assert.equal(value.outputContract.id, 'grounded-teaching-output');
  assert.equal(Object.hasOwn(value, 'provider'), false);
  assert.equal(Object.hasOwn(value, 'conversationMemory'), false);
});

test('task rejects missing required grounding, unknown capability and provider-owned memory fields', () => {
  assert.throws(() => validateIntelligenceTask({
    ...task(),
    grounding: []
  }), /Required grounding/);

  assert.throws(() => validateIntelligenceTask({
    ...task(),
    capability: 'vendor.model.generate'
  }), /Unknown capability/);

  assert.throws(() => validateIntelligenceTask({
    ...task(),
    conversationMemory: { threadId: 'provider-thread' }
  }), /Invalid intelligence task/);
});

test('provider descriptor advertises only registered semantic capabilities', () => {
  const descriptor = validateIntelligenceProviderDescriptor(providerDescriptor);
  assert.ok(Object.isFrozen(descriptor));
  assert.ok(Object.isFrozen(descriptor.capabilities));
  assert.throws(() => validateIntelligenceProviderDescriptor({
    ...providerDescriptor,
    capabilities: ['learning.teaching.render', 'vendor.secret.capability']
  }), /Unknown capability/);
});

test('intelligence result requires structured output and citations inside supplied grounding', () => {
  const value = validateIntelligenceResult(task(), success());
  assert.ok(Object.isFrozen(value));
  assert.ok(Object.isFrozen(value.output));
  assert.equal(value.status, 'succeeded');
  assert.equal(Object.hasOwn(value, 'reasoning'), false);
  assert.equal(Object.hasOwn(value, 'providerMemory'), false);

  assert.throws(() => validateIntelligenceResult(task(), {
    ...success(),
    citationRefs: [{ type: 'content-source', id: 'source:invented', version: '1' }]
  }), /outside task grounding/);

  assert.throws(() => validateIntelligenceResult(task(), {
    ...success(),
    citationRefs: []
  }), /requires at least one citation/);

  assert.throws(() => validateIntelligenceResult(task(), {
    ...success(),
    reasoning: 'hidden chain'
  }), /Invalid intelligence result/);
});

test('failed provider result carries no output and requires a normalized error', () => {
  const failed = validateIntelligenceResult(task(), {
    ...success(),
    status: 'failed',
    output: null,
    citationRefs: [],
    error: { category: 'provider_unavailable', code: 'timeout' }
  });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.output, null);

  assert.throws(() => validateIntelligenceResult(task(), {
    ...success(),
    status: 'failed',
    error: { category: 'provider_unavailable', code: 'timeout' }
  }), /cannot carry output/);
});

test('provider wrapper enforces supported capability and exact provider attribution', async () => {
  let seenTask = null;
  const provider = createIntelligenceProvider({
    descriptor: providerDescriptor,
    execute: async value => {
      seenTask = value;
      return success();
    }
  });

  assert.equal(provider.supports('learning.teaching.render'), true);
  assert.equal(provider.supports('knowledge.search'), false);

  const result = await provider.execute(task());
  assert.equal(result.provider.providerId, 'test-provider');
  assert.ok(Object.isFrozen(seenTask));
  assert.ok(Object.isFrozen(seenTask.input));

  await assert.rejects(() => provider.execute({
    ...task(),
    capability: 'knowledge.search'
  }), /does not support capability/);
});

test('provider wrapper rejects adapter results that misattribute implementation identity', async () => {
  const provider = createIntelligenceProvider({
    descriptor: providerDescriptor,
    execute: async () => ({
      ...success(),
      provider: {
        providerId: 'another-provider',
        implementationId: 'fake-structured-provider',
        version: '1'
      }
    })
  });

  await assert.rejects(() => provider.execute(task()), /provider mismatch/);
});
