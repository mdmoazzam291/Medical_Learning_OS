// Razorpay TEST MODE preparation only. Not wired to a public route, checkout or grants.
// Test credentials must be supplied by a trusted server. No production keys accepted.
const API_ORIGIN = 'https://api.razorpay.com';
const SAFE_ID = /^plan_[A-Za-z0-9]+$/;
const SAFE_EVENT_ID = /^[A-Za-z0-9_:-]{8,180}$/;
function requireTestConfig(config) {
  if (config?.sandboxEnabled !== true) throw new Error('razorpay_sandbox_disabled');
  if (typeof config.keyId !== 'string' || !config.keyId.startsWith('rzp_test_')) {
    throw new Error('razorpay_test_key_required');
  }
  if (typeof config.keySecret !== 'string' || config.keySecret.length < 8) {
    throw new Error('razorpay_test_secret_required');
  }
}
function basicCredentials(keyId, keySecret) {
  // Basic auth belongs only to this test-mode server adapter.
  return 'Basic ' + btoa(keyId + ':' + keySecret);
}
export async function createRazorpayTestSubscription(input, config = {}) {
  requireTestConfig(config);
  const { planId, totalCount, notifyCustomer = 0 } = input || {};
  if (typeof planId !== 'string' || !SAFE_ID.test(planId)) throw new TypeError('Invalid test plan ID');
  if (!Number.isSafeInteger(totalCount) || totalCount < 1 || totalCount > 120) throw new TypeError('Invalid billing-cycle count');
  if (notifyCustomer !== 0 && notifyCustomer !== 1) throw new TypeError('Invalid notification flag');
  const transport = config.fetchImpl;
  if (typeof transport !== 'function') throw new TypeError('A server-only transport is required');
  const response = await transport(API_ORIGIN + '/v1/subscriptions', {
    method: 'POST',
    headers: Object.freeze({
      'Content-Type': 'application/json',
      Authorization: basicCredentials(config.keyId, config.keySecret)
    }),
    body: JSON.stringify({ plan_id: planId, total_count: totalCount, customer_notify: notifyCustomer })
  });
  if (!response?.ok) throw new Error('razorpay_test_subscription_creation_failed');
  const data = await response.json();
  if (typeof data?.id !== 'string' || !data.id.startsWith('sub_')) throw new Error('razorpay_invalid_test_response');
  // Returned test subscription ID is NOT a paid entitlement.
  return Object.freeze({ provider: 'razorpay', environment: 'test', id: data.id, status: String(data.status || 'created') });
}
const encoder = new TextEncoder();
function toBytes(value) {
  if (typeof value === 'string') return encoder.encode(value);
  if (value instanceof Uint8Array) return value;
  throw new TypeError('Webhook body must be the unchanged raw UTF-8 body');
}
function constantTimeBytes(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}
function hexBytes(hex) {
  if (typeof hex !== 'string' || !/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  return Uint8Array.from(hex.match(/../g), value => parseInt(value, 16));
}
async function signedBytes(secret, body) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, body));
}
// Standalone verifier: no persistence and NO learner access mutation.
export async function verifyRazorpayTestWebhook({ rawBody, signature, eventId }, config = {}) {
  if (config.sandboxEnabled !== true) throw new Error('razorpay_sandbox_disabled');
  if (typeof config.webhookSecret !== 'string' || config.webhookSecret.length < 8) throw new Error('razorpay_webhook_secret_required');
  const received = hexBytes(signature);
  if (!received) return Object.freeze({ verified: false, reason: 'invalid_signature' });
  const body = toBytes(rawBody);
  const computed = await signedBytes(config.webhookSecret, body);
  if (!constantTimeBytes(computed, received)) return Object.freeze({ verified: false, reason: 'invalid_signature' });
  if (typeof eventId !== 'string' || !SAFE_EVENT_ID.test(eventId)) return Object.freeze({ verified: false, reason: 'invalid_event_id' });
  let event;
  try { event = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)); }
  catch { return Object.freeze({ verified: false, reason: 'invalid_json' }); }
  if (typeof event?.event !== 'string' || !event.event) return Object.freeze({ verified: false, reason: 'invalid_event' });
  // Persistence layer must atomically claim eventId before interpreting state. Do not
  // trust delivery order, and do not grant access from this verification receipt.
  return Object.freeze({ verified: true, provider: 'razorpay', environment: 'test', eventId, eventType: event.event });
}
