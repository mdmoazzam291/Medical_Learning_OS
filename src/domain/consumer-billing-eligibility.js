// Pure preflight for a future trusted-server subscription reconciler.
// Does NOT access the network or database, and NEVER writes or grants access.
// The caller MUST authenticate the learner and obtain a fresh, signed or
// server-fetched Cashfree payment observation. Client-provided objects are NEVER
// valid evidence merely because this helper returns eligible.
const VALID_PLANS = new Set(['pro', 'ai_pro']);
const EXPECTED_CURRENCY = 'INR';

function instant(value) {
  return typeof value === 'string' ? Date.parse(value) : NaN;
}
function nonempty(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 200;
}
export function evaluateVerifiedConsumerTerm({
  subjectId, offer, subscription, payment, providerObservation,
  at = new Date().toISOString()
} = {}) {
  function rejected(reason) { return Object.freeze({ eligible: false, reason }); }
  const current = instant(at);
  if (!Number.isFinite(current)) return rejected('invalid_time');

  // A sandbox transaction is NEVER eligible for a consumer production grant.
  if (!subscription || subscription.environment !== 'production' ||
      payment?.environment !== 'production' ||
      providerObservation?.environment !== 'production') {
    return rejected('production_evidence_required');
  }
  if (!nonempty(subjectId) || subscription.subject_id !== subjectId) {
    return rejected('subject_mismatch');
  }
  if (!offer || !nonempty(offer.offer_id) || !VALID_PLANS.has(offer.plan) ||
      offer.currency !== EXPECTED_CURRENCY || offer.status !== 'approved' ||
      !nonempty(offer.merchant_approval_ref) ||
      !Number.isSafeInteger(offer.amount_minor) || offer.amount_minor < 100) {
    return rejected('approved_offer_required');
  }
  if (!nonempty(subscription.subscription_id) ||
      subscription.offer_id !== offer.offer_id ||
      !nonempty(subscription.provider_subscription_id) ||
      subscription.provider !== 'cashfree' ||
      subscription.lifecycle_status !== 'active' ||
      subscription.authorization_status !== 'active' ||
      subscription.cancelled_at != null) {
    return rejected('active_subscription_required');
  }
  if (!payment || !nonempty(payment.payment_id) ||
      payment.subscription_id !== subscription.subscription_id ||
      !nonempty(payment.provider_payment_id) ||
      payment.payment_status !== 'success' ||
      payment.amount_minor !== offer.amount_minor ||
      payment.currency !== EXPECTED_CURRENCY ||
      !Number.isFinite(instant(payment.provider_verified_at)) ||
      payment.reversed_at != null) {
    return rejected('matching_verified_payment_required');
  }
  // This field is assigned ONLY by a privileged integration after a fresh
  // Cashfree read; the domain cannot cryptographically attest the caller.
  if (providerObservation.source !== 'server_fetched_cashfree' ||
      providerObservation.provider_subscription_id !== subscription.provider_subscription_id ||
      providerObservation.provider_payment_id !== payment.provider_payment_id ||
      providerObservation.payment_status !== 'SUCCESS' ||
      providerObservation.currency !== EXPECTED_CURRENCY ||
      providerObservation.amount_minor !== offer.amount_minor ||
      !Number.isFinite(instant(providerObservation.fetched_at))) {
    return rejected('matching_provider_reconciliation_required');
  }
  const start = instant(subscription.starts_at);
  const end = instant(subscription.current_period_end);
  const providerAt = instant(providerObservation.fetched_at);
  if (!Number.isFinite(start) || !Number.isFinite(end) || !(start <= current && current < end) ||
      providerAt > current || providerAt < current - 24 * 60 * 60 * 1000) {
    return rejected('valid_current_billing_period_required');
  }
  return Object.freeze({
    eligible: true,
    plan: offer.plan,
    subjectId,
    paymentId: payment.payment_id,
    startsAt: subscription.starts_at,
    endsAt: subscription.current_period_end
  });
}
