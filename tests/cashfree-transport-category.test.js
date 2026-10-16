import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/cashfree-sandbox-worker.js';

for (const [label, thrown] of [
  ['type_error', new TypeError('PRIVATE key / hostname')],
  ['error', new Error('PRIVATE key / hostname')],
  ['unknown', { name: 'PRIVATE', message: 'PRIVATE', toString(){throw Error('must not serialize');} }]
]) {
  test(`scheduled probe reports only fixed transport category ${label} without retry`, async () => {
    const originalFetch = globalThis.fetch;
    const originalInfo = console.info;
    const output = [];
    let calls = 0;
    globalThis.fetch = async () => { calls++; throw thrown; };
    console.info = (...args) => output.push(args);
    try {
      await worker.scheduled({noRetry(){}}, {
        CASHFREE_SANDBOX_MODE:'sandbox', CASHFREE_SANDBOX_ENABLED:'true',
        CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED:'true', CASHFREE_SANDBOX_RUN_MODE:'auth_probe',
        CASHFREE_TEST_APP_ID:'mock-client-id', CASHFREE_TEST_SECRET_KEY:'mock-client-secret'
      });
      assert.equal(calls, 1);
      assert.deepEqual(output, [
        ['cashfree_sandbox_probe', 'auth_probe_status', 'transport_failed'],
        ['cashfree_sandbox_transport', label]
      ]);
      assert.equal(JSON.stringify(output).includes('PRIVATE'), false);
    } finally { globalThis.fetch = originalFetch; console.info = originalInfo; }
  });
}
