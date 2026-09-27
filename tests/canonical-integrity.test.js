import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_INTEGRITY_PROFILE,
  canonicalize,
  digestCanonical,
  validateDigestEnvelope,
  verifyCanonicalDigest
} from '../src/domain/canonical-integrity.js';

test('canonicalization is independent of ordinary JSON property order', async () => {
  const a = { z: 1, a: { y: true, x: ['β', 2, null] } };
  const b = { a: { x: ['β', 2, null], y: true }, z: 1 };
  assert.equal(canonicalize(a), canonicalize(b));
  assert.deepEqual(await digestCanonical(a), await digestCanonical(b));
});

test('modified logical content changes the canonical digest', async () => {
  const first = await digestCanonical({ conceptId: 'cardio:shock', version: 1 });
  const second = await digestCanonical({ conceptId: 'cardio:shock', version: 2 });
  assert.notEqual(first.digestHex, second.digestHex);
  assert.equal(await verifyCanonicalDigest({ conceptId: 'cardio:shock', version: 1 }, first), true);
  assert.equal(await verifyCanonicalDigest({ conceptId: 'cardio:shock', version: 2 }, first), false);
});

test('digest envelope carries explicit algorithm/profile metadata', async () => {
  const envelope = await digestCanonical({ a: 1 });
  assert.deepEqual(
    Object.fromEntries(Object.entries(envelope).filter(([key]) => key !== 'digestHex')),
    DEFAULT_INTEGRITY_PROFILE
  );
  assert.match(envelope.digestHex, /^[0-9a-f]{64}$/);
  assert.deepEqual(validateDigestEnvelope(envelope), envelope);
});

test('canonical JSON rejects values that would serialize ambiguously or outside I-JSON', () => {
  for (const value of [
    { x: undefined },
    { x: Number.NaN },
    { x: Infinity },
    { x: 1n },
    new Date('2026-09-27T00:00:00.000Z'),
    (() => { const a = {}; a.self = a; return a; })(),
    [, 1],
    { bad: '\uD800' }
  ]) {
    assert.throws(() => canonicalize(value), TypeError);
  }
});

test('unsupported digest metadata fails safely', async () => {
  const envelope = await digestCanonical({ stable: true });
  assert.throws(() => validateDigestEnvelope({ ...envelope, digestAlgorithm: 'MD5' }), /Unsupported/);
  assert.throws(() => validateDigestEnvelope({ ...envelope, digestHex: 'xyz' }), /digest/);
});


test('canonical bytes and SHA-256 stay stable for a known vector', async () => {
  const value = { b: 1, a: 2 };
  assert.equal(canonicalize(value), '{"a":2,"b":1}');
  assert.equal(
    (await digestCanonical(value)).digestHex,
    'd3626ac30a87e6f7a6428233b3c68299976865fa5508e4267c5415c76af7a772'
  );
});


test('canonicalization rejects hidden, accessor and custom array properties', () => {
  const hidden = { a: 1 };
  Object.defineProperty(hidden, 'secret', { value: 2, enumerable: false });
  assert.throws(() => canonicalize(hidden), /hidden properties/);

  const accessor = {};
  Object.defineProperty(accessor, 'a', { enumerable: true, get() { return 1; } });
  assert.throws(() => canonicalize(accessor), /ordinary data properties/);

  const array = [1, 2];
  array.note = 'not-json';
  assert.throws(() => canonicalize(array), /custom properties/);
});
