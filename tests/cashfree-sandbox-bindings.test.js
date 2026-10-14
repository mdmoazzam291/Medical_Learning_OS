import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  CASHFREE_SANDBOX_BINDING_NAMES, inspectCashfreeSandboxReadiness, createCashfreeSandboxService
} from '../src/adapters/cashfree-sandbox-bindings.js';
import { publicFileSet } from '../scripts/public-surface.js';
import { CONSUMER_PAYMENT_PROVIDER_POLICY } from '../src/domain/consumer-payment-providers.js';
import { resolveConsumerAccess } from '../src/domain/consumer-entitlements.js';

const sandbox = (extra = {}) => ({
  CASHFREE_SANDBOX_MODE: 'sandbox',
  CASHFREE_SANDBOX_ENABLED: 'true',
  CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED: 'false',
  CASHFREE_TEST_APP_ID: 'fictional-test-id-1234',
  CASHFREE_TEST_SECRET_KEY: 'fictional-test-secret-value',
  CASHFREE_TEST_WEBHOOK_SECRET: 'fictional-test-hook-secret',
  CASHFREE_SANDBOX_RETURN_ORIGIN: 'https://staging.example.invalid',
  ...extra
});
const subscription = {
  subscriptionId: 'test_secret_binding_1',
  idempotencyKey: 'ed926524-5284-457a-a8d4-710c726c3ee2',
  customerDetails: {
    customer_name: 'Test Learner', customer_email: 'test@example.invalid',
    customer_phone: '9999999999'
  },
  planDetails: {
    plan_name: 'MLOS Sandbox Pro', plan_type: 'PERIODIC', plan_currency: 'INR',
    plan_interval_type: 'MONTH', plan_intervals: 1, plan_max_cycles: 12,
    amountMinor: 49900
  }
};
test('default runtime is off even with generated key-shaped values', () => {
  const env = sandbox({ CASHFREE_SANDBOX_ENABLED: 'false' });
  const status = inspectCashfreeSandboxReadiness(env);
  assert.equal(status.configured, false);
  assert.equal(status.networkTestsEnabled, false);
  assert.equal(status.productionCheckoutEnabled, false);
  assert.equal(status.grantsEnabled, false);
  assert.throws(() => createCashfreeSandboxService(env), /sandbox_disabled/);
  assert.equal(resolveConsumerAccess().plan, 'free');
  assert.equal(CONSUMER_PAYMENT_PROVIDER_POLICY.productionCheckoutEnabled, false);
});
test('server-side readiness reports only presence, never key values', () => {
  const env = sandbox();
  const status = inspectCashfreeSandboxReadiness(env);
  assert.equal(status.appIdBindingPresent, true);
  assert.equal(status.secretBindingPresent, true);
  assert.equal(status.webhookBindingPresent, true);
  assert.equal(status.networkTestsEnabled, false);
  for (const secret of [env.CASHFREE_TEST_APP_ID, env.CASHFREE_TEST_SECRET_KEY]) {
    assert.equal(JSON.stringify(status).includes(secret), false);
  }
  assert.equal(CASHFREE_SANDBOX_BINDING_NAMES.appId, 'CASHFREE_TEST_APP_ID');
  assert.equal(Object.isFrozen(status), true);
});
test('network test remains separately disabled; no secret resolves or requests made', async () => {
  let reads = 0, calls = 0;
  const binding = { async get() { reads++; return 'fictional-test-secret'; } };
  const env = sandbox({ CASHFREE_TEST_APP_ID: binding, CASHFREE_TEST_SECRET_KEY: binding });
  const svc = createCashfreeSandboxService(env, {
    fetchImpl() { calls++; throw new Error('network should be blocked'); }
  });
  await assert.rejects(svc.createTestSubscription(subscription), /network_tests_disabled/);
  await assert.rejects(svc.fetchTestSubscription('my_subscription'), /network_tests_disabled/);
  assert.equal(calls, 0);
  assert.equal(reads, 0);
});
test('sandbox secret store bindings flow through existing server adapter without publishing keys', async () => {
  let reads = 0;
  const env = sandbox({
    CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED: 'true',
    CASHFREE_TEST_APP_ID: { async get() { reads++; return 'fictional-test-app-id'; } },
    CASHFREE_TEST_SECRET_KEY: { async get() { reads++; return 'fictional-test-secret'; } }
  });
  let calls = 0;
  const svc = createCashfreeSandboxService(env, {
    async fetchImpl(url, options) {
      calls++;
      assert.equal(url, 'https://sandbox.cashfree.com/pg/subscriptions');
      assert.equal(options.headers['x-client-id'], 'fictional-test-app-id');
      assert.equal(options.headers['x-client-secret'], 'fictional-test-secret');
      assert.equal(options.headers['x-api-version'], '2025-01-01');
      return {
        ok: true, async json() {
          return {
            subscription_id: 'test_secret_binding_1',
            subscription_session_id: 'fake_test_session_token',
            subscription_status: 'INITIALIZED'
          };
        }
      };
    }
  });
  assert.deepEqual(Object.keys(svc), ['createTestSubscription', 'fetchTestSubscription', 'probeTestPlanAccess', 'verifyTestWebhook']);
  assert.equal(JSON.stringify(svc), '{}', 'service JSON serialization cannot expose secret values');
  const receipt = await svc.createTestSubscription(subscription);
  assert.equal(receipt.environment, 'sandbox');
  assert.equal(receipt.status, 'INITIALIZED');
  assert.equal('grant' in receipt, false);
  assert.equal(JSON.stringify(receipt).includes('fictional-test-secret'), false);
  assert.equal(calls, 1);
  assert.equal(reads, 2);
});
test('secrets are unavailable and production env / absent binding fail closed', async () => {
  for (const env of [
    sandbox({ CASHFREE_SANDBOX_MODE: 'production' }),
    sandbox({ CASHFREE_SANDBOX_ENABLED: undefined })
  ]) assert.throws(() => createCashfreeSandboxService(env), /sandbox_disabled/);
  const svc = createCashfreeSandboxService(sandbox({
    CASHFREE_SANDBOX_NETWORK_TESTS_ENABLED: 'true',
    CASHFREE_TEST_APP_ID: { async get() { return null; } }
  }), { fetchImpl() { throw new Error('network should not run'); } });
  await assert.rejects(svc.fetchTestSubscription('test_one'), /secret_unavailable/);
});
test('webhook verification requires separate secret binding but never grants entitlements', async () => {
  const env = sandbox({ CASHFREE_TEST_WEBHOOK_SECRET: undefined });
  const svc = createCashfreeSandboxService(env);
  await assert.rejects(svc.verifyTestWebhook({
    rawBody: '{"type":"SUBSCRIPTION_PAYMENT_SUCCESS"}',
    timestamp: '1791970000', signature: 'bad'
  }), /secret_unavailable/);
  assert.equal(resolveConsumerAccess().plan, 'free');
});
test('sandbox modules and secrets remain excluded from every learner-facing public asset', async () => {
  for (const name of ['src/adapters/cashfree-test.js', 'src/adapters/cashfree-sandbox-bindings.js', 'src/domain/consumer-payment-providers.js']) {
    assert.equal(publicFileSet.has(name), false);
  }
  const pages = await readFile(new URL('../web/plans.html', import.meta.url), 'utf8');
  assert.match(pages, /Checkout and recurring payments are disabled/);
  const wrangler = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
  assert.doesNotMatch(wrangler, /CASHFREE_TEST_APP_ID|CASHFREE_TEST_SECRET_KEY|CASHFREE_SANDBOX_ENABLED/);
});
