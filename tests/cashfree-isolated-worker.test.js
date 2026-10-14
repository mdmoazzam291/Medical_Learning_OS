import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import staging, { inspectCashfreeStagingWorker } from '../cloudflare/cashfree-sandbox-worker.js';
import { publicFileSet } from '../scripts/public-surface.js';
import { resolveConsumerAccess } from '../src/domain/consumer-entitlements.js';

function env(extra = {}) {
  return {
    CASHFREE_SANDBOX_MODE: 'sandbox',
    CASHFREE_SANDBOX_ENABLED: 'false',
    CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED: 'false',
    CASHFREE_SANDBOX_RUN_MODE: 'disabled',
    CASHFREE_TEST_APP_ID: { async get() { return 'mock-test-id'; } },
    CASHFREE_TEST_SECRET_KEY: { async get() { return 'mock-test-secret'; } },
    ...extra
  };
}
test('separate worker refuses every public HTTP path and method', async () => {
  for (const method of ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const res = await staging.fetch(new Request('https://example.invalid/internal/pay', { method }), env());
    assert.equal(res.status, 404);
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    assert.doesNotMatch(await res.text(), /cashfree|secret|sandbox/i);
  }
  assert.equal(resolveConsumerAccess().plan, 'free');
});
test('isolated wrangler config does not touch production Worker, schedule or secret files', async () => {
  const isolated = JSON.parse(await readFile(new URL('../wrangler.cashfree-sandbox.jsonc', import.meta.url), 'utf8'));
  const primary = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.equal(isolated.name, 'mlos-cashfree-sandbox');
  assert.equal(isolated.main, 'cloudflare/cashfree-sandbox-worker.js');
  assert.equal(primary.name, 'medical-learning-os-web');
  assert.notEqual(isolated.main, primary.main);
  assert.equal(isolated.workers_dev, false);
  assert.equal(isolated.preview_urls, false);
  assert.deepEqual(isolated.triggers.crons, []);
  assert.equal(isolated.vars.CASHFREE_SANDBOX_ENABLED, 'false');
  assert.equal(isolated.vars.CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED, 'false');
  assert.equal(isolated.vars.CASHFREE_SANDBOX_RUN_MODE, 'disabled');
  // Store IDs, binding names and secret names are non-credential metadata.
  // Neither Cashfree TEST credential VALUE is ever embedded in repo configs.
  assert.deepEqual(
    isolated.secrets_store_secrets.map(({ binding, secret_name }) => ({ binding, secret_name })),
    [
      { binding: 'CASHFREE_TEST_APP_ID', secret_name: 'CASHFREE_TEST_APP_ID' },
      { binding: 'CASHFREE_TEST_SECRET_KEY', secret_name: 'CASHFREE_TEST_SECRET_KEY' }
    ]
  );
  assert.equal(new Set(isolated.secrets_store_secrets.map(x => x.store_id)).size, 1);
  for (const binding of isolated.secrets_store_secrets) {
    assert.match(binding.store_id, /^[a-f0-9]{32}$/);
    assert.deepEqual(Object.keys(binding).sort(), ['binding', 'secret_name', 'store_id']);
  }
  assert.doesNotMatch(JSON.stringify(isolated), /rzp_live_|cfsk_|CASHFREE_TEST_(?:APP_ID|SECRET_KEY)"\\s*:\\s*"[^"]*secret/i);
  for (const p of ['cloudflare/cashfree-sandbox-worker.js', 'src/adapters/cashfree-sandbox-bindings.js'])
    assert.equal(publicFileSet.has(p), false);
});
test('diagnostics never load secrets or perform requests with default flags', async () => {
  let calls = 0, reads = 0;
  const base = env({
    CASHFREE_TEST_APP_ID: { async get() { reads++; return 'mock-key'; } },
    CASHFREE_TEST_SECRET_KEY: { async get() { reads++; return 'mock-secret'; } }
  });
  const transport = () => { calls++; throw Error('unexpected network'); };
  assert.deepEqual(await inspectCashfreeStagingWorker(base, { fetchImpl: transport }), { outcome: 'disabled' });
  assert.deepEqual(await inspectCashfreeStagingWorker(env({ CASHFREE_SANDBOX_ENABLED: 'true' }), { fetchImpl: transport }), { outcome: 'bindings_present_network_disabled' });
  assert.equal(calls, 0);
  assert.equal(reads, 0);
});
test('network mode requires an existing test subscription ID, never creates a mandate', async () => {
  let calls = 0;
  const network = env({
    CASHFREE_SANDBOX_ENABLED: 'true',
    CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED: 'true',
    CASHFREE_SANDBOX_RUN_MODE: 'read_only'
  });
  const transport = async (url, init) => {
    calls++;
    assert.equal(init.method, 'GET');
    assert.equal(url, 'https://sandbox.cashfree.com/pg/subscriptions/test_subscription_123');
    assert.match(init.headers['x-client-id'], /^mock-/);
    assert.match(init.headers['x-client-secret'], /^mock-/);
    return {
      ok: true, async json() {
        return { subscription_id: 'test_subscription_123', subscription_status: 'INITIALIZED' };
      }
    };
  };
  assert.deepEqual(await inspectCashfreeStagingWorker(network, { fetchImpl: transport }), { outcome: 'test_subscription_id_required' });
  assert.equal(calls, 0);
  assert.deepEqual(await inspectCashfreeStagingWorker({
    ...network, CASHFREE_SANDBOX_TEST_SUBSCRIPTION_ID: 'test_subscription_123'
  }, { fetchImpl: transport }), { outcome: 'test_status_read', statusRecognized: true });
  assert.equal(calls, 1);
  assert.equal(resolveConsumerAccess().plan, 'free');
});
test('transport failure is sanitized and does not imply verified Cashfree account', async () => {
  const network = env({
    CASHFREE_SANDBOX_ENABLED: 'true',
    CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED: 'true',
    CASHFREE_SANDBOX_RUN_MODE: 'read_only',
    CASHFREE_SANDBOX_TEST_SUBSCRIPTION_ID: 'test_sub_1'
  });
  assert.deepEqual(await inspectCashfreeStagingWorker(network, {
    fetchImpl: async () => ({ ok: false, status: 401 })
  }), { outcome: 'sandbox_request_failed' });
});
test('scheduled dispatch only emits coarse result and disallows retry', async () => {
  const previous = console.info;
  const seen = [];
  let noRetryCalls = 0;
  console.info = (...args) => seen.push(args);
  try {
    await staging.scheduled({ noRetry() { noRetryCalls++; } }, env());
  } finally {
    console.info = previous;
  }
  assert.equal(noRetryCalls, 1);
  assert.deepEqual(seen, [['cashfree_sandbox_probe', 'disabled']]);
});
