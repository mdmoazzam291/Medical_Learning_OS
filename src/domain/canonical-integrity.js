const PROFILE = Object.freeze({
  profileVersion: 1,
  canonicalizationAlgorithm: 'JCS-RFC8785',
  digestAlgorithm: 'SHA-256'
});

function fail(message) {
  throw new TypeError(message);
}

function assertUnicodeScalarString(value, label = 'string') {
  if (typeof value !== 'string') fail(`Invalid ${label}`);
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    if (code >= 0xD800 && code <= 0xDBFF) {
      const next = value.charCodeAt(i + 1);
      if (!(next >= 0xDC00 && next <= 0xDFFF)) fail(`Invalid Unicode in ${label}`);
      i += 1;
    } else if (code >= 0xDC00 && code <= 0xDFFF) {
      fail(`Invalid Unicode in ${label}`);
    }
  }
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function serialize(value, stack) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('Canonical JSON requires finite numbers');
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    assertUnicodeScalarString(value);
    return JSON.stringify(value);
  }
  if (typeof value === 'bigint' || typeof value === 'undefined' ||
      typeof value === 'function' || typeof value === 'symbol') {
    fail('Unsupported canonical JSON value');
  }
  if (typeof value !== 'object') fail('Unsupported canonical JSON value');
  if (stack.has(value)) fail('Canonical JSON cannot contain cycles');

  stack.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getOwnPropertySymbols(value).length) fail('Canonical JSON arrays cannot carry symbol properties');
      const visibleKeys = Object.keys(value);
      if (visibleKeys.some(key => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) {
        fail('Canonical JSON arrays cannot carry custom properties');
      }
      for (let i = 0; i < value.length; i += 1) {
        if (!Object.hasOwn(value, i)) fail('Canonical JSON arrays cannot be sparse');
        const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
        if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) {
          fail('Canonical JSON arrays require ordinary data elements');
        }
      }
      return `[${value.map(item => serialize(item, stack)).join(',')}]`;
    }

    if (!isPlainObject(value) || Object.getOwnPropertySymbols(value).length) {
      fail('Canonical JSON requires plain JSON objects');
    }

    const ownNames = Object.getOwnPropertyNames(value);
    const keys = Object.keys(value);
    if (ownNames.length !== keys.length) fail('Canonical JSON objects cannot carry hidden properties');
    for (const key of keys) {
      assertUnicodeScalarString(key, 'object key');
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !Object.hasOwn(descriptor, 'value') || descriptor.enumerable !== true) {
        fail('Canonical JSON objects require ordinary data properties');
      }
      if (value[key] === undefined || typeof value[key] === 'function' || typeof value[key] === 'symbol') {
        fail('Canonical JSON object values must be JSON values');
      }
    }

    keys.sort();
    return `{${keys.map(key => `${JSON.stringify(key)}:${serialize(value[key], stack)}`).join(',')}}`;
  } finally {
    stack.delete(value);
  }
}

function exactKeys(value, expected, label) {
  if (!isPlainObject(value)) fail(`Invalid ${label}`);
  const keys = Object.keys(value);
  if (keys.length !== expected.length || expected.some(key => !Object.hasOwn(value, key))) {
    fail(`Invalid ${label}`);
  }
}

function hex(bytes) {
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export const DEFAULT_INTEGRITY_PROFILE = PROFILE;

export function canonicalize(value) {
  return serialize(value, new Set());
}

export function validateIntegrityProfile(value) {
  exactKeys(value, ['profileVersion', 'canonicalizationAlgorithm', 'digestAlgorithm'], 'integrity profile');
  if (value.profileVersion !== PROFILE.profileVersion ||
      value.canonicalizationAlgorithm !== PROFILE.canonicalizationAlgorithm ||
      value.digestAlgorithm !== PROFILE.digestAlgorithm) {
    fail('Unsupported integrity profile');
  }
  return Object.freeze({ ...value });
}

export function validateDigestEnvelope(value) {
  exactKeys(value, ['profileVersion', 'canonicalizationAlgorithm', 'digestAlgorithm', 'digestHex'], 'digest envelope');
  validateIntegrityProfile({
    profileVersion: value.profileVersion,
    canonicalizationAlgorithm: value.canonicalizationAlgorithm,
    digestAlgorithm: value.digestAlgorithm
  });
  if (typeof value.digestHex !== 'string' || !/^[0-9a-f]{64}$/.test(value.digestHex)) {
    fail('Invalid SHA-256 digest');
  }
  return Object.freeze({ ...value });
}

export async function digestCanonical(value, { cryptoImpl = globalThis.crypto } = {}) {
  if (!cryptoImpl?.subtle?.digest) fail('Web Crypto digest is unavailable');
  const canonical = canonicalize(value);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await cryptoImpl.subtle.digest(PROFILE.digestAlgorithm, bytes);
  return Object.freeze({
    ...PROFILE,
    digestHex: hex(digest)
  });
}

export async function verifyCanonicalDigest(value, envelope, options) {
  const expected = validateDigestEnvelope(envelope);
  const actual = await digestCanonical(value, options);
  return actual.digestHex === expected.digestHex;
}
