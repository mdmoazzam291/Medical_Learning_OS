// Cashfree Subscriptions sandbox preparation. NOT imported by public assets,
// not wired to HTTP routes, account checkout, grant issuance or billing storage.
// Credentials are server-only. A signed webhook is NOT proof of paid entitlement.
const API_ROOT = 'https://sandbox.cashfree.com';
const API_VERSION = '2025-01-01';
const SUBSCRIPTION_ID = /^[a-zA-Z0-9_.-]{1,80}$/;
const SHA256_SIGNATURE = /^[A-Za-z0-9+/]{43}=$/;
const encoder = new TextEncoder();

function requireSandbox(config) {
  if (config?.sandboxEnabled !== true || config.environment !== 'sandbox') {
    throw new Error('cashfree_sandbox_disabled');
  }
}

function authHeaders(config) {
  requireSandbox(config);
  if (typeof config.clientId !== 'string' || config.clientId.trim().length < 8 ||
      typeof config.clientSecret !== 'string' || config.clientSecret.length < 8) {
    throw new Error('cashfree_sandbox_credentials_required');
  }
  return {
    'x-client-id': config.clientId,
    'x-client-secret': config.clientSecret,
    'x-api-version': API_VERSION,
    Accept: 'application/json'
  };
}

function requireTransport(config) {
  if (typeof config.fetchImpl !== 'function') {
    throw new TypeError('Cashfree sandbox requires explicit server-only transport');
  }
  return config.fetchImpl;
}

function validateSubscriptionId(id) {
  if (typeof id !== 'string' || !SUBSCRIPTION_ID.test(id)) {
    throw new TypeError('Invalid Cashfree subscription identifier');
  }
  return id;
}

function createPayload(input, config) {
  if (!input || typeof input !== 'object') throw new TypeError('Invalid subscription input');
  const id = validateSubscriptionId(input.subscriptionId);
  const details = input.customerDetails;
  if (!details || typeof details.customer_name !== 'string' ||
      details.customer_name.trim().length < 1 || details.customer_name.length > 90 ||
      typeof details.customer_email !== 'string' ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.customer_email) ||
      typeof details.customer_phone !== 'string' || !/^[6-9][0-9]{9}$/.test(details.customer_phone)) {
    throw new TypeError('Invalid sandbox customer details');
  }
  const plan = input.planDetails;
  if (!plan || typeof plan.plan_name !== 'string' || !/^[a-zA-Z0-9 _.\-]{1,70}$/.test(plan.plan_name) ||
      plan.plan_type !== 'PERIODIC' || plan.plan_currency !== 'INR' ||
      plan.plan_interval_type !== 'MONTH' ||
      ![1, 3, 12].includes(plan.plan_intervals) ||
      !Number.isSafeInteger(plan.plan_max_cycles) || plan.plan_max_cycles < 1 || plan.plan_max_cycles > 60 ||
      !Number.isSafeInteger(plan.amountMinor) || plan.amountMinor < 100 || plan.amountMinor > 10000000) {
    throw new TypeError('Invalid sandbox recurring plan details');
  }
  // Input must be derived from the trusted server price catalog. Do not accept
  // arbitrary browser-supplied amounts even though this adapter is test-only.
  const amountINR = plan.amountMinor / 100;
  const body = {
    subscription_id: id,
    customer_details: {
      customer_name: details.customer_name.trim(),
      customer_email: details.customer_email,
      customer_phone: details.customer_phone
    },
    plan_details: {
      plan_name: plan.plan_name,
      plan_type: 'PERIODIC',
      plan_currency: 'INR',
      plan_interval_type: 'MONTH',
      plan_intervals: plan.plan_intervals,
      plan_max_cycles: plan.plan_max_cycles,
      plan_amount: amountINR,
      plan_max_amount: amountINR
    },
    authorization_details: { payment_methods: ['upi', 'card'] }
  };
  if (input.returnUrl != null) {
    if (typeof input.returnUrl !== 'string') throw new TypeError('Invalid return URL');
    let url;
    try { url = new URL(input.returnUrl); } catch { throw new TypeError('Invalid return URL'); }
    if (url.protocol !== 'https:' ||
        typeof config.allowedReturnOrigin !== 'string' ||
        url.origin !== config.allowedReturnOrigin ||
        url.username || url.password || url.hash) {
      throw new TypeError('Return URL is not an authorized HTTPS origin');
    }
    body.subscription_meta = { return_url: url.toString() };
  }
  return body;
}

// Shared pure schema validator used by the separate, server-only production
// adapter. Does NOT send a request or approve a price; the trusted caller must
// fetch the approved offer from its own ledger, never a browser-chosen amount.
export function buildCashfreeSubscriptionPayload(input, config = {}) {
  return createPayload(input, config);
}

export async function createCashfreeSandboxSubscription(input, config = {}) {
  // Validate everything before a network request.
  const headers = authHeaders(config);
  const fetchImpl = requireTransport(config);
  const body = createPayload(input, config);
  if (typeof input.idempotencyKey !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.idempotencyKey)) {
    throw new TypeError('Trusted-server UUID idempotency key required');
  }
  const response = await fetchImpl(API_ROOT + '/pg/subscriptions', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', 'x-idempotency-key': input.idempotencyKey },
    body: JSON.stringify(body)
  });
  if (!response?.ok) throw new Error('cashfree_sandbox_create_failed');
  const result = await response.json();
  if (result?.subscription_id !== body.subscription_id ||
      typeof result?.subscription_session_id !== 'string' ||
      !result.subscription_session_id.trim()) {
    throw new Error('cashfree_sandbox_response_invalid');
  }
  // Intentionally no entitlement/status activation. Session ID alone is NOT payment.
  return Object.freeze({
    provider: 'cashfree', environment: 'sandbox',
    subscriptionId: result.subscription_id,
    subscriptionSessionId: result.subscription_session_id,
    status: String(result.subscription_status || 'INITIALIZED')
  });
}

export async function fetchCashfreeSandboxSubscription(subscriptionId, config = {}) {
  const headers = authHeaders(config);
  const fetchImpl = requireTransport(config);
  const id = validateSubscriptionId(subscriptionId);
  const response = await fetchImpl(API_ROOT + '/pg/subscriptions/' + encodeURIComponent(id), {
    method: 'GET', headers
  });
  if (!response?.ok) throw new Error('cashfree_sandbox_fetch_failed');
  const result = await response.json();
  if (result?.subscription_id !== id) throw new Error('cashfree_sandbox_response_invalid');
  // Authorization status is not an entitlement: confirmed payment and expiry
  // require separate durable reconciliation, which does not exist yet.
  return Object.freeze({
    provider: 'cashfree', environment: 'sandbox',
    subscriptionId: id, status: String(result.subscription_status || 'UNKNOWN'),
    authorizationStatus: String(result.authorization_details?.authorization_status || 'UNKNOWN')
  });
}


/**
 * One read-only test-credential probe: no subscription creation, no mandate,
 * no payments, no persistent writes, no response-body logging. A missing fake
 * plan is NOT proof of authentication or Subscriptions product entitlement.
 * Cashfree documented endpoint: GET /pg/plans/{plan_id}.
 */
export async function probeCashfreeSandboxPlanAccess(config = {}) {
  const headers = authHeaders(config);
  const fetchImpl = requireTransport(config);
  const path = '/pg/plans/mlos_nonexistent_auth_probe_20261015';
  let response;
  try {
    response = await fetchImpl(API_ROOT + path, {
      // Never forward Cashfree credential headers to a redirect target.
      // redirect:'error' turns 3xx into an indistinguishable fetch rejection.
      method: 'GET', headers, redirect: 'manual', cache: 'no-store'
    });
  } catch {
    return Object.freeze({ provider: 'cashfree', environment: 'sandbox', result: 'transport_failed' });
  }
  const code = response?.status;
  let result;
  if (!Number.isInteger(code) || code < 100 || code > 599) result = 'invalid_response';
  else if (code === 401) result = 'unauthorized';
  else if (code === 403) result = 'forbidden_or_product_restricted';
  else if (code === 404) result = 'not_found_auth_inconclusive';
  else if (code === 400 || code === 422) result = 'bad_request_auth_inconclusive';
  else if (code >= 300 && code < 400) result = 'redirect_response_auth_inconclusive';
  else if (code === 429) result = 'rate_limited';
  else if (code >= 500) result = 'provider_unavailable';
  else if (code >= 200 && code < 300) result = 'unexpected_plan_found_investigate';
  else result = 'other_response_auth_inconclusive';
  // Never read or return the provider's response body, headers or full URL.
  return Object.freeze({ provider: 'cashfree', environment: 'sandbox', result });
}

function rawBytes(rawBody) {
  if (typeof rawBody === 'string') return encoder.encode(rawBody);
  if (rawBody instanceof Uint8Array) return rawBody;
  throw new TypeError('Cashfree webhook requires unchanged raw body');
}

function base64Bytes(signature) {
  if (typeof signature !== 'string' || !SHA256_SIGNATURE.test(signature)) return null;
  try {
    const bytes = Uint8Array.from(atob(signature), ch => ch.charCodeAt(0));
    return bytes.length === 32 ? bytes : null;
  } catch { return null; }
}
function constantTimeEquals(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Cashfree: Base64(HMAC-SHA256(secret, x-webhook-timestamp + rawBody)).
// Verification returns an inert receipt; DB uniqueness, reconciliation and
// state-transition validation MUST precede any payment-related entitlement.
export async function verifyCashfreeSandboxWebhook({ rawBody, signature, timestamp } = {}, config = {}) {
  requireSandbox(config);
  if (typeof config.webhookSecret !== 'string' || config.webhookSecret.length < 8) {
    throw new Error('cashfree_sandbox_webhook_secret_required');
  }
  const decodedSignature = base64Bytes(signature);
  if (!decodedSignature) return Object.freeze({ verified: false, reason: 'invalid_signature' });
  if (typeof timestamp !== 'string' || !/^\d{10,13}$/.test(timestamp)) {
    return Object.freeze({ verified: false, reason: 'invalid_timestamp' });
  }
  const bytes = rawBytes(rawBody);
  const message = new Uint8Array(encoder.encode(timestamp).length + bytes.length);
  message.set(encoder.encode(timestamp), 0);
  message.set(bytes, encoder.encode(timestamp).length);
  const key = await crypto.subtle.importKey('raw', encoder.encode(config.webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const actual = new Uint8Array(await crypto.subtle.sign('HMAC', key, message));
  if (!constantTimeEquals(actual, decodedSignature)) {
    return Object.freeze({ verified: false, reason: 'invalid_signature' });
  }
  let event;
  try { event = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { return Object.freeze({ verified: false, reason: 'invalid_json' }); }
  if (typeof event?.type !== 'string' || !/^SUBSCRIPTION_[A-Z_]{3,75}$/.test(event.type)) {
    return Object.freeze({ verified: false, reason: 'invalid_subscription_event' });
  }
  return Object.freeze({
    verified: true, provider: 'cashfree', environment: 'sandbox',
    eventType: event.type, reconciliationRequired: true
  });
}
