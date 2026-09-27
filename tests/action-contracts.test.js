import test from 'node:test';
import assert from 'node:assert/strict';
import { digestCanonical } from '../src/domain/canonical-integrity.js';
import { validateActionEnvelope, validateActionReceipt } from '../src/domain/action-contracts.js';

const actor = { type: 'human_learner', id: 'learner:test-1' };
const envelope = () => ({
  schemaVersion: 1,
  actionId: 'action:test-1',
  actor,
  capability: 'learning.study.recommend',
  target: { type: 'learner', id: 'learner:test-1', version: null },
  inputRefs: [{ type: 'learning-event-stream', id: 'stream:test-1', version: 'v1' }],
  requestedAt: '2026-09-27T18:00:00.000Z',
  permissions: ['learning.study.recommend'],
  metadata: { source: 'test' }
});

test('valid action envelope is deeply immutable and vendor-neutral', () => {
  const result = validateActionEnvelope(envelope());
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.actor));
  assert.ok(Object.isFrozen(result.inputRefs));
  assert.equal(result.capability, 'learning.study.recommend');
});

test('action envelope rejects unknown capabilities, unexpected fields and malformed timestamps', () => {
  assert.throws(() => validateActionEnvelope({ ...envelope(), capability: 'openai.chat' }), /Unknown capability/);
  assert.throws(() => validateActionEnvelope({ ...envelope(), secret: 'x' }), /Invalid action envelope/);
  assert.throws(() => validateActionEnvelope({ ...envelope(), requestedAt: 'yesterday' }), /requestedAt/);
});

test('receipt binds action semantics to digest metadata without storing hidden reasoning', async () => {
  const inputDigest = await digestCanonical({ eventIds: ['event-1'] });
  const outputDigest = await digestCanonical({ selected: ['question@1'] });
  const receipt = validateActionReceipt({
    schemaVersion: 1,
    actionId: 'action:test-1',
    actor,
    capability: 'learning.study.recommend',
    policyVersion: 'study-now-v2',
    inputDigest,
    outputDigest,
    provider: null,
    status: 'succeeded',
    startedAt: '2026-09-27T18:00:00.000Z',
    completedAt: '2026-09-27T18:00:01.000Z',
    error: null,
    metadata: { deterministic: true }
  });
  assert.ok(Object.isFrozen(receipt));
  assert.equal(Object.hasOwn(receipt, 'reasoning'), false);
  assert.equal(receipt.inputDigest.digestAlgorithm, 'SHA-256');
});

test('receipt fails closed on chronology, unsupported capability or inconsistent error status', () => {
  const base = {
    schemaVersion: 1,
    actionId: 'action:test-2',
    actor: { type: 'system', id: 'mlos' },
    capability: 'assessment.evaluate',
    policyVersion: 'scoring-v1',
    inputDigest: null,
    outputDigest: null,
    provider: null,
    status: 'succeeded',
    startedAt: '2026-09-27T18:00:02.000Z',
    completedAt: '2026-09-27T18:00:01.000Z',
    error: null,
    metadata: {}
  };
  assert.throws(() => validateActionReceipt(base), /chronology/);
  assert.throws(() => validateActionReceipt({ ...base, capability: 'vendor.model.run' }), /Unknown capability/);
  assert.throws(() => validateActionReceipt({
    ...base,
    completedAt: '2026-09-27T18:00:03.000Z',
    status: 'failed',
    error: null
  }), /requires an error/);
});


test('action metadata must remain canonical JSON and portable', () => {
  assert.throws(() => validateActionEnvelope({
    ...envelope(),
    metadata: { generatedAt: new Date('2026-09-27T18:00:00.000Z') }
  }), /metadata/);
  assert.throws(() => validateActionEnvelope({
    ...envelope(),
    metadata: { transient: undefined }
  }), /metadata/);
});
