import test from 'node:test';
import assert from 'node:assert/strict';
import { createCashfreeSandboxSubscription, fetchCashfreeSandboxSubscription, verifyCashfreeSandboxWebhook } from '../src/adapters/cashfree-test.js';
import { CONSUMER_PAYMENT_PROVIDER_POLICY, consumerPaymentRoute } from '../src/domain/consumer-payment-providers.js';
import { resolveConsumerAccess } from '../src/domain/consumer-entitlements.js';

const request = () => ({
  subscriptionId: 'mlos_test_1001',
  idempotencyKey: 'a68c9a51-b460-4e2c-921e-e269db6b5be6',
  customerDetails: { customer_name: 'Test Student', customer_email: 'sandbox@example.test', customer_phone: '9876543210' },
  planDetails: { plan_name: 'MLOS Pro Test', plan_type: 'PERIODIC', plan_currency: 'INR',
    plan_interval_type: 'MONTH', plan_intervals: 1, plan_max_cycles: 12, amountMinor: 49900 },
  returnUrl: 'https://staging.medical.example/return'
});
const config = (fetchImpl = async () => ({ ok: true, json: async () => ({
  subscription_id: 'mlos_test_1001', subscription_session_id: 'subs_token_example',
  subscription_status: 'INITIALIZED'
}) })) => ({
  environment: 'sandbox', sandboxEnabled: true, clientId: 'test-client-id',
  clientSecret: 'test-client-secret', webhookSecret: 'webhook-test-secret',
  allowedReturnOrigin: 'https://staging.medical.example', fetchImpl
});
test('Cashfree is primary, PhonePe remains inactive backup, and no checkout route is exposed', () => {
  assert.equal(CONSUMER_PAYMENT_PROVIDER_POLICY.primary, 'cashfree');
  assert.equal(CONSUMER_PAYMENT_PROVIDER_POLICY.alternative, 'phonepe');
  assert.equal(CONSUMER_PAYMENT_PROVIDER_POLICY.automaticFailoverEnabled, false);
  assert.equal(CONSUMER_PAYMENT_PROVIDER_POLICY.productionCheckoutEnabled, false);
  assert.equal(CONSUMER_PAYMENT_PROVIDER_POLICY.providers.phonepe.integration, 'design_only');
  assert.deepEqual(consumerPaymentRoute(), {
    enabled: false, provider: null, reason: 'consumer_checkout_not_released'
  });
  assert.equal(resolveConsumerAccess().plan, 'free');
});
test('no network call without explicit sandbox mode and server credentials', async () => {
  let calls = 0;
  const fetchImpl = () => { calls++; throw new Error('unexpected network'); };
  await assert.rejects(createCashfreeSandboxSubscription(request(), { fetchImpl }), /sandbox_disabled/);
  await assert.rejects(createCashfreeSandboxSubscription(request(), { ...config(fetchImpl), environment: 'production' }), /sandbox_disabled/);
  await assert.rejects(createCashfreeSandboxSubscription(request(), { ...config(fetchImpl), clientSecret: '' }), /credentials_required/);
  await assert.rejects(createCashfreeSandboxSubscription({ ...request(), idempotencyKey: 'user-chosen' }, config(fetchImpl)), /idempotency key/);
  assert.equal(calls, 0);
});
test('sandbox subscription sends fixed Cashfree endpoint, correct headers and allowlisted payload', async () => {
  let calls = 0;
  const result = await createCashfreeSandboxSubscription(request(), config(async (url, init) => {
    calls++;
    assert.equal(url, 'https://sandbox.cashfree.com/pg/subscriptions');
    assert.equal(init.method, 'POST');
    assert.equal(init.headers['x-api-version'], '2025-01-01');
    assert.equal(init.headers['x-client-secret'], 'test-client-secret');
    assert.equal(init.headers['x-idempotency-key'], request().idempotencyKey);
    const body = JSON.parse(init.body);
    assert.deepEqual(Object.keys(body).sort(), [
      'authorization_details', 'customer_details', 'plan_details', 'subscription_id', 'subscription_meta'
    ]);
    assert.deepEqual(body.authorization_details, { payment_methods: ['upi', 'card'] });
    assert.deepEqual(body.plan_details, {
      plan_name: 'MLOS Pro Test', plan_type: 'PERIODIC', plan_currency: 'INR',
      plan_interval_type: 'MONTH', plan_intervals: 1, plan_max_cycles: 12,
      plan_amount: 499, plan_max_amount: 499
    });
    assert.equal(body.subscription_meta.return_url, request().returnUrl);
    return { ok: true, json: async () => ({
      subscription_id: 'mlos_test_1001', subscription_session_id: 'subs_token_example', subscription_status: 'INITIALIZED'
    }) };
  }));
  assert.equal(calls, 1);
  assert.deepEqual(result, {
    provider: 'cashfree', environment: 'sandbox',
    subscriptionId: 'mlos_test_1001', subscriptionSessionId: 'subs_token_example',
    status: 'INITIALIZED'
  });
  assert.equal('grant' in result, false);
});
test('sandbox refuses injected callback URLs, unsupported plans and malformed response', async () => {
  let calls = 0;
  const cfg = config(async () => { calls++; return { ok: true, json: async () => ({ subscription_id: 'other' }) }; });
  for (const input of [
    { ...request(), returnUrl: 'https://attacker.example/return' },
    { ...request(), returnUrl: 'http://staging.medical.example/return' },
    { ...request(), subscriptionId: '../path' },
    { ...request(), planDetails: { ...request().planDetails, amountMinor: 0 } },
    { ...request(), planDetails: { ...request().planDetails, plan_interval_type: 'DAY' } },
    { ...request(), planDetails: { ...request().planDetails, plan_intervals: 6 } }
  ]) {
    await assert.rejects(createCashfreeSandboxSubscription(input, cfg));
  }
  assert.equal(calls, 0);
  await assert.rejects(createCashfreeSandboxSubscription(request(), cfg), /response_invalid/);
  assert.equal(calls, 1);
});
test('fetch test subscription provides untrusted snapshot, never a paid entitlement', async () => {
  const snapshot = await fetchCashfreeSandboxSubscription('mlos_test_1001', config(async (url, init) => {
    assert.equal(url, 'https://sandbox.cashfree.com/pg/subscriptions/mlos_test_1001');
    assert.equal(init.method, 'GET');
    return { ok: true, json: async () => ({
      subscription_id: 'mlos_test_1001', subscription_status: 'ACTIVE',
      authorization_details: { authorization_status: 'ACTIVE' }
    }) };
  }));
  assert.equal(snapshot.authorizationStatus, 'ACTIVE');
  assert.equal('subjectId' in snapshot, false);
  assert.equal('grant' in snapshot, false);
  assert.equal(resolveConsumerAccess().plan, 'free');
});
async function signature(secret, timestamp, body) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const result = new Uint8Array(await crypto.subtle.sign('HMAC', key,
    new TextEncoder().encode(timestamp + body)));
  return btoa(String.fromCharCode(...result));
}
test('Cashfree webhook verifies Base64 HMAC(timestamp+rawBody), not legacy Razorpay hex', async () => {
  const body = JSON.stringify({ type: 'SUBSCRIPTION_PAYMENT_SUCCESS', data: { subscription_id: 'mlos_test_1001' } });
  const timestamp = '1791970000';
  const cfg = config();
  const signed = await signature(cfg.webhookSecret, timestamp, body);
  const payload = { rawBody: body, timestamp, signature: signed };
  const valid = await verifyCashfreeSandboxWebhook(payload, cfg);
  assert.deepEqual(valid, {
    verified: true, provider: 'cashfree', environment: 'sandbox',
    eventType: 'SUBSCRIPTION_PAYMENT_SUCCESS', reconciliationRequired: true
  });
  assert.equal((await verifyCashfreeSandboxWebhook({ ...payload, rawBody: body + ' ' }, cfg)).verified, false);
  assert.equal((await verifyCashfreeSandboxWebhook({ ...payload, timestamp: '1791970001' }, cfg)).verified, false);
  assert.equal((await verifyCashfreeSandboxWebhook({ ...payload, signature: 'bad' }, cfg)).verified, false);
  assert.equal((await verifyCashfreeSandboxWebhook({ ...payload, signature: '0'.repeat(64) }, cfg)).verified, false);
  assert.equal((await verifyCashfreeSandboxWebhook({ ...payload, timestamp: 'wrong' }, cfg)).verified, false);
  const invalidBody = '{"type":';
  assert.equal((await verifyCashfreeSandboxWebhook({
    rawBody: invalidBody, timestamp, signature: await signature(cfg.webhookSecret, timestamp, invalidBody)
  }, cfg)).verified, false);
  await assert.rejects(verifyCashfreeSandboxWebhook(payload, { ...cfg, sandboxEnabled: false }), /sandbox_disabled/);
});
