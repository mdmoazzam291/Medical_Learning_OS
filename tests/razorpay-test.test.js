import test from 'node:test';
import assert from 'node:assert/strict';
import { createRazorpayTestSubscription, verifyRazorpayTestWebhook } from '../src/adapters/razorpay-test.js';

test('Razorpay sandbox refuses all requests when disabled, and refuses live keys', async () => {
  let called = 0;
  const fetchImpl = async () => { called++; return { ok: true, json: async () => ({ id: 'sub_test', status: 'created' }) }; };
  const input = { planId: 'plan_test123', totalCount: 12 };
  await assert.rejects(createRazorpayTestSubscription(input, { fetchImpl }), /sandbox_disabled/);
  await assert.rejects(createRazorpayTestSubscription(input, {
    sandboxEnabled: true, keyId: 'rzp_live_abcd', keySecret: 'testsecret', fetchImpl
  }), /test_key_required/);
  assert.equal(called, 0);
});
test('Razorpay test transport uses pinned API URL and safe subscription shape', async () => {
  let called = 0;
  const fakeFetch = async (url, init) => {
    called++;
    assert.equal(url, 'https://api.razorpay.com/v1/subscriptions');
    assert.equal(init.method, 'POST');
    assert.deepEqual(JSON.parse(init.body), { plan_id: 'plan_abc123', total_count: 12, customer_notify: 0 });
    assert.match(init.headers.Authorization, /^Basic /);
    return { ok: true, json: async () => ({ id: 'sub_test42', status: 'created' }) };
  };
  const config = { sandboxEnabled: true, keyId: 'rzp_test_123456', keySecret: 'testsecret', fetchImpl: fakeFetch };
  assert.deepEqual(await createRazorpayTestSubscription({ planId: 'plan_abc123', totalCount: 12 }, config), {
    provider: 'razorpay', environment: 'test', id: 'sub_test42', status: 'created'
  });
  assert.equal(called, 1);
  await assert.rejects(createRazorpayTestSubscription({ planId: 'plan_abc123', totalCount: 0 }, config), /billing-cycle/);
  await assert.rejects(createRazorpayTestSubscription({ planId: 'https://other.host/path', totalCount: 12 }, config), /plan ID/);
  assert.equal(called, 1);
});
test('Razorpay webhook uses exact raw-body HMAC and rejects tampering and disabled mode', async () => {
  const secret = 'fake-test-only-secret';
  const rawBody = '{"event":"subscription.charged","payload":{"x":1}}';
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)))].map(x => x.toString(16).padStart(2, '0')).join('');
  const payload = { rawBody, signature: digest, eventId: 'evt_test_0001' };
  const config = { sandboxEnabled: true, webhookSecret: secret };
  assert.deepEqual(await verifyRazorpayTestWebhook(payload, config), {
    verified: true, provider: 'razorpay', environment: 'test', eventId: payload.eventId, eventType: 'subscription.charged'
  });
  assert.equal((await verifyRazorpayTestWebhook({ ...payload, rawBody: rawBody + ' ' }, config)).verified, false);
  assert.equal((await verifyRazorpayTestWebhook({ ...payload, signature: 'x' }, config)).verified, false);
  assert.equal((await verifyRazorpayTestWebhook({ ...payload, eventId: '' }, config)).verified, false);
  await assert.rejects(verifyRazorpayTestWebhook(payload, { webhookSecret: secret }), /sandbox_disabled/);
});
