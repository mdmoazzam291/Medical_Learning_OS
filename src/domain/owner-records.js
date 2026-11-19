// Read-only owner records: admin audit trail and billing summary.
// Pure projection functions; the owner-api supplies rows read with the
// service role. Nothing here writes, grants access or contacts a provider.

const AUDIT_LIMIT_MAX = 200;
const RECENT_PAYMENTS = 20;

export function auditLimit(value) {
  if (value === null || value === undefined || value === '') return 50;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > AUDIT_LIMIT_MAX) throw Object.assign(new Error('audit_limit_invalid'), { status: 400, code: 'audit_limit_invalid' });
  return n;
}

const iso = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

// Learner administration and feature-gate audit rows merged into one timeline.
// Reasons are owner-authored text; they are returned as-is and must be escaped by the UI.
export function auditTimeline({ learnerEvents = [], featureEvents = [], limit = 50 } = {}) {
  const rows = [
    ...(Array.isArray(learnerEvents) ? learnerEvents : []).map(row => ({
      family: 'learner_access',
      id: String(row.id ?? ''),
      at: iso(row.created_at),
      actorId: String(row.admin_user_id ?? ''),
      action: String(row.action ?? ''),
      target: String(row.learner_id ?? ''),
      reason: String(row.reason ?? ''),
      change: { before: row.before_state ?? null, after: row.after_state ?? null }
    })),
    ...(Array.isArray(featureEvents) ? featureEvents : []).map(row => ({
      family: 'feature_gate',
      id: String(row.id ?? ''),
      at: iso(row.created_at),
      actorId: String(row.admin_user_id ?? ''),
      action: 'set_feature_audience',
      target: String(row.feature_key ?? ''),
      reason: String(row.reason ?? ''),
      change: { before: row.before_audience ?? null, after: row.after_audience ?? null }
    }))
  ].filter(row => row.id && row.at);
  rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : a.id < b.id ? 1 : -1));
  return { contractId: 'owner-audit-timeline-v1', events: rows.slice(0, limit), limit, sources: ['owner_admin_audit_events', 'owner_feature_flag_audit_events'] };
}

const count = (rows, key) => {
  const out = {};
  for (const row of rows) { const k = String(row?.[key] ?? 'unknown'); out[k] = (out[k] || 0) + 1; }
  return out;
};

// Billing summary. Payment success counts only provider-verified captures
// (the schema already forbids success without provider_verified_at).
// Sandbox and production are always reported separately, never summed.
export function billingSummary({ offers = [], subscriptions = [], payments = [], inbox = [], now = Date.now() } = {}) {
  const since = now - 30 * 86400000;
  const byEnv = environment => {
    const subs = subscriptions.filter(row => row.environment === environment);
    const pays = payments.filter(row => row.environment === environment);
    const recent = pays.filter(row => Date.parse(row.recorded_at) >= since);
    const captured = recent.filter(row => row.payment_status === 'success');
    return {
      subscriptionsByLifecycle: count(subs, 'lifecycle_status'),
      payments30d: count(recent, 'payment_status'),
      capturedMinor30d: captured.reduce((sum, row) => sum + (Number.isSafeInteger(row.amount_minor) ? row.amount_minor : 0), 0),
      refundedOrReversed30d: recent.filter(row => ['refunded', 'reversed'].includes(row.payment_status)).length,
      webhooksNeedingAttention: inbox.filter(row => row.environment === environment && ['unprocessed', 'needs_review'].includes(row.processing_status)).length
    };
  };
  const approvedOffers = offers.filter(row => row.status === 'approved').length;
  const recentPayments = [...payments]
    .sort((a, b) => String(b.recorded_at).localeCompare(String(a.recorded_at)))
    .slice(0, RECENT_PAYMENTS)
    .map(row => ({
      paymentId: String(row.payment_id ?? ''),
      subscriptionId: String(row.subscription_id ?? ''),
      environment: row.environment === 'production' ? 'production' : 'sandbox',
      status: String(row.payment_status ?? ''),
      amountMinor: Number.isSafeInteger(row.amount_minor) ? row.amount_minor : null,
      currency: 'INR',
      recordedAt: iso(row.recorded_at),
      providerVerifiedAt: iso(row.provider_verified_at)
    }));
  return {
    contractId: 'owner-billing-summary-v1',
    activation: approvedOffers > 0 ? 'offers_approved' : 'not_activated',
    offers: { total: offers.length, byStatus: count(offers, 'status') },
    production: byEnv('production'),
    sandbox: byEnv('sandbox'),
    recentPayments,
    currency: 'INR',
    windowDays: 30
  };
}

export function formatInrMinor(minor) {
  if (!Number.isSafeInteger(minor)) return '—';
  return '₹' + (minor / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
