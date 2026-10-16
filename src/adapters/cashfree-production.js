// Cashfree hosted Subscriptions CHECKOUT adapter for a FUTURE trusted billing API.
// Inert unless every independent server-side release gate is explicitly true.
// Not imported into the public browser bundle or any deployed Worker.
// Never call from a browser, client-selected offer, or unsigned webhook.
import { buildCashfreeSubscriptionPayload } from './cashfree-test.js';

const LIVE_ROOT = 'https://api.cashfree.com';
const API_VERSION = '2025-01-01';
const UUID_V4_STYLE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_PROVIDER_ID = /^[A-Za-z0-9_.-]{1,80}$/;
const INTERVALS = Object.freeze({
  month: Object.freeze({ months: 1, cycles: 60 }),
  quarter: Object.freeze({ months: 3, cycles: 20 }),
  year: Object.freeze({ months: 12, cycles: 5 })
});
function available(config, write) {
  if (config?.environment !== 'production' || config?.merchantProductionApproved !== true ||
      config?.billingLedgerReady !== true || config?.liveReadEnabled !== true) {
    throw new Error('cashfree_live_disabled');
  }
  if (write && (config.liveCheckoutEnabled !== true ||
      config.productionOffersApproved !== true ||
      config.reconciliationReady !== true ||
      config.explicitChargeLaunchApproved !== true)) {
    throw new Error('cashfree_live_checkout_disabled');
  }
  if (typeof config.fetchImpl !== 'function') throw new Error('cashfree_trusted_transport_required');
  if (typeof config.clientId !== 'string' || config.clientId.length < 8 ||
      typeof config.clientSecret !== 'string' || config.clientSecret.length < 8) {
    throw new Error('cashfree_live_credential_unavailable');
  }
}
function headers(config) {
  return {
    'x-api-version': API_VERSION,
    'x-client-id': config.clientId,
    'x-client-secret': config.clientSecret,
    'Accept': 'application/json'
  };
}
function approvedOffer(offer) {
  return Boolean(offer && typeof offer.offer_id === 'string' &&
    /^(?:pro|ai_pro)[a-z0-9_-]{0,70}$/.test(offer.offer_id) &&
    ['pro', 'ai_pro'].includes(offer.plan) && offer.status === 'approved' &&
    typeof offer.merchant_approval_ref === 'string' && offer.merchant_approval_ref.length >= 4 &&
    offer.currency === 'INR' &&
    Number.isSafeInteger(offer.amount_minor) && offer.amount_minor >= 100 &&
    Object.hasOwn(INTERVALS, offer.billing_interval) &&
    typeof offer.price_version === 'string' && offer.price_version.length >= 4);
}
function reservationMatches(reservation, offer, authenticatedSubjectId) {
  return Boolean(reservation && reservation.lifecycle_status === 'created' &&
    typeof authenticatedSubjectId === 'string' && authenticatedSubjectId.length > 0 &&
    reservation.subject_id === authenticatedSubjectId &&
    reservation.offer_id === offer.offer_id &&
    reservation.environment === 'production' &&
    reservation.approved_amount_minor === offer.amount_minor &&
    reservation.offer_price_version === offer.price_version &&
    typeof reservation.terms_version === 'string' && reservation.terms_version.length >= 4 &&
    typeof reservation.consent_recorded_at === 'string' &&
    Number.isFinite(Date.parse(reservation.consent_recorded_at)) &&
    typeof reservation.idempotency_key === 'string' &&
    UUID_V4_STYLE.test(reservation.idempotency_key) &&
    VALID_PROVIDER_ID.test(reservation.provider_subscription_id));
}

/**
 * Returns a session ID ONLY. A created subscription/authorization is never
 * a payment receipt, and this method issues zero consumer grants.
 *
 * Integration contract: the future authenticated billing service must first
 * reserve (offer, subject, idempotency key, provider subscription ID) in a
 * durable unique ledger transaction and load the approved offer from DB.
 * This isolated transport layer cannot attest those inputs itself.
 */
export async function createCashfreeProductionHostedSession({
  authenticatedSubjectId, offer, reservation, customerDetails, returnUrl
} = {}, config = {}) {
  available(config, true);
  if (!approvedOffer(offer) || !reservationMatches(reservation, offer, authenticatedSubjectId)) {
    throw new Error('cashfree_trusted_billing_reservation_required');
  }
  if (typeof returnUrl !== 'string' || !returnUrl) {
    throw new Error('cashfree_https_return_url_required');
  }
  // Pricing and interval are exclusively from the merchant-reviewed DB row.
  // Never accept plan details or amount from a browser or from a return URL.
  const interval = INTERVALS[offer.billing_interval];
  const name = offer.plan === 'pro' ? 'MLOS Pro' : 'MLOS AI Pro';
  const body = buildCashfreeSubscriptionPayload({
    subscriptionId: reservation.provider_subscription_id,
    customerDetails,
    returnUrl,
    planDetails: {
      plan_name: name + ' ' + offer.billing_interval,
      plan_type: 'PERIODIC',
      plan_currency: 'INR',
      plan_interval_type: 'MONTH',
      plan_intervals: interval.months,
      plan_max_cycles: interval.cycles,
      amountMinor: offer.amount_minor
    }
  }, { allowedReturnOrigin: config.allowedReturnOrigin });

  let response;
  try {
    response = await config.fetchImpl(LIVE_ROOT + '/pg/subscriptions', {
      method: 'POST',
      redirect: 'manual',
      headers: { ...headers(config), 'Content-Type': 'application/json',
        'x-idempotency-key': reservation.idempotency_key },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error('cashfree_live_transport_failed');
  }
  // Reject ALL redirects to prevent forwarding credential headers.
  if (!response || response.status < 200 || response.status >= 300) {
    throw new Error('cashfree_live_create_unconfirmed');
  }
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('cashfree_live_response_invalid'); }
  if (payload?.subscription_id !== reservation.provider_subscription_id ||
      typeof payload.subscription_session_id !== 'string' ||
      !payload.subscription_session_id.trim()) {
    throw new Error('cashfree_live_response_invalid');
  }
  return Object.freeze({
    provider: 'cashfree', environment: 'production',
    subscriptionId: reservation.provider_subscription_id,
    subscriptionSessionId: payload.subscription_session_id,
    status: 'authorization_pending', entitlementGranted: false
  });
}

// Provider status is an observation only, not proof that money was captured.
// The billing service must separately fetch payment-specific evidence.
export async function fetchCashfreeProductionSubscription(subscriptionId, config = {}) {
  available(config, false);
  if (typeof subscriptionId !== 'string' || !VALID_PROVIDER_ID.test(subscriptionId)) {
    throw new TypeError('Invalid Cashfree subscription ID');
  }
  let response;
  try {
    response = await config.fetchImpl(LIVE_ROOT + '/pg/subscriptions/' + encodeURIComponent(subscriptionId), {
      method: 'GET', redirect: 'manual', headers: headers(config)
    });
  } catch { throw new Error('cashfree_live_transport_failed'); }
  if (!response || response.status < 200 || response.status >= 300) {
    throw new Error('cashfree_live_fetch_unconfirmed');
  }
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('cashfree_live_response_invalid'); }
  if (payload?.subscription_id !== subscriptionId) throw new Error('cashfree_live_response_invalid');
  return Object.freeze({
    provider: 'cashfree', environment: 'production',
    subscriptionId, status: String(payload.subscription_status || 'UNKNOWN'),
    authorizationStatus: String(payload.authorization_details?.authorization_status || 'UNKNOWN'),
    entitlementGranted: false
  });
}
