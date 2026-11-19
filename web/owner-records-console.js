// Read-only owner records: Admin Audit Log and Payments.
// Mounted into the owner console like the feature-gate panels. Each panel
// fails closed: an unavailable read never renders as "no events" or "₹0".
import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudOwner } from '/src/adapters/cloud-owner.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';
import { formatInrMinor } from '/src/domain/owner-records.js';

const app = document.querySelector('#admin-app');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let owner = null;
const client = () => owner || (owner = createCloudOwner({ ...cloudConfig, auth: createSupabaseAuth({ ...cloudConfig }) }));

const dateTime = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};
const shortId = value => { const text = String(value || ''); return text.length > 8 ? text.slice(0, 8) + '…' : text || '—'; };
const ACTIONS = { grant_beta: 'Granted beta', revoke_beta: 'Revoked beta', suspend: 'Suspended learner', restore: 'Restored learner', set_feature_audience: 'Changed feature audience' };

function changeText(event) {
  const { before, after } = event.change || {};
  if (event.family === 'feature_gate') return escape(before ?? '—') + ' → ' + escape(after ?? '—');
  const summarize = value => value && typeof value === 'object'
    ? Object.entries(value).filter(([, v]) => v !== null && typeof v !== 'object').map(([k, v]) => k + ': ' + v).join(', ') || '—'
    : '—';
  return escape(summarize(before)) + ' → ' + escape(summarize(after));
}

export function auditMarkup(payload) {
  const events = Array.isArray(payload?.events) ? payload.events : null;
  if (!events) return '<p class="muted" role="status">Audit log unavailable. This is not evidence that no admin actions happened. Reload to retry.</p>';
  if (!events.length) return '<p class="muted">No learner-access or feature-gate actions have been recorded yet.</p>';
  return '<div class="owner-table-wrap"><table class="owner-table"><thead><tr><th>When</th><th>Action</th><th>Target</th><th>Change</th><th>Reason</th></tr></thead><tbody>' +
    events.map(event => '<tr><td>' + escape(dateTime(event.at)) + '<small>by ' + escape(shortId(event.actorId)) + '</small></td>' +
      '<td>' + escape(ACTIONS[event.action] || event.action) + '</td>' +
      '<td>' + escape(event.family === 'feature_gate' ? event.target : shortId(event.target)) + '</td>' +
      '<td>' + changeText(event) + '</td><td>' + escape(event.reason) + '</td></tr>').join('') +
    '</tbody></table></div><p class="muted">Showing the latest ' + escape(events.length) + ' of learner-access and feature-gate events. Records are immutable. Content edits keep their own receipts in their tools.</p>';
}

const counts = map => {
  const entries = Object.entries(map || {});
  return entries.length ? entries.map(([key, value]) => '<span class="badge">' + escape(key.replaceAll('_', ' ')) + ': ' + escape(value) + '</span>').join(' ') : '<span class="muted">none</span>';
};

function environmentBlock(label, env) {
  return '<div class="review-packet"><span class="eyebrow">' + escape(label) + '</span>' +
    '<div class="owner-metrics"><div class="owner-metric"><span>Captured, last 30 days</span><strong>' + escape(formatInrMinor(env.capturedMinor30d)) + '</strong></div>' +
    '<div class="owner-metric"><span>Refunds / reversals, 30 days</span><strong>' + escape(env.refundedOrReversed30d) + '</strong></div>' +
    '<div class="owner-metric"><span>Webhooks needing attention</span><strong>' + escape(env.webhooksNeedingAttention) + '</strong></div></div>' +
    '<p>Subscriptions: ' + counts(env.subscriptionsByLifecycle) + '</p><p>Payments (30 days): ' + counts(env.payments30d) + '</p></div>';
}

export function billingMarkup(payload) {
  if (!payload || payload.contractId !== 'owner-billing-summary-v1') return '<p class="muted" role="status">Payment records unavailable. This is not evidence of zero payments. Reload to retry.</p>';
  if (payload.activation === 'not_installed') return '<p>Billing tables are not installed in this database yet. No payments can exist.</p>';
  const notice = payload.activation === 'not_activated'
    ? '<p class="review-packet"><strong>Payments are not activated.</strong> No price offer is approved, so learners cannot be charged. Figures below should stay at zero until merchant approval.</p>'
    : '';
  const recent = Array.isArray(payload.recentPayments) && payload.recentPayments.length
    ? '<div class="owner-table-wrap"><table class="owner-table"><thead><tr><th>Recorded</th><th>Status</th><th>Amount</th><th>Environment</th><th>Subscription</th></tr></thead><tbody>' +
      payload.recentPayments.map(row => '<tr><td>' + escape(dateTime(row.recordedAt)) + '</td><td>' + escape(row.status) + (row.status === 'success' && row.providerVerifiedAt ? '<small>provider verified</small>' : '') + '</td><td>' + escape(formatInrMinor(row.amountMinor)) + '</td><td>' + escape(row.environment) + '</td><td>' + escape(shortId(row.subscriptionId)) + '</td></tr>').join('') +
      '</tbody></table></div>'
    : '<p class="muted">No payment records.</p>';
  return notice + '<p>Price offers: ' + escape(payload.offers?.total ?? 0) + ' · ' + counts(payload.offers?.byStatus) + '</p>' +
    environmentBlock('PRODUCTION', payload.production || {}) + environmentBlock('SANDBOX (test money, never summed with production)', payload.sandbox || {}) +
    '<h3>Recent payments</h3>' + recent;
}

function panel(id, view, eyebrow, title, description, bodyId) {
  const section = document.createElement('section');
  section.id = id; section.className = 'panel'; section.dataset.adminPanel = view; section.hidden = true;
  section.innerHTML = '<div class="section-heading"><div><span class="eyebrow">' + eyebrow + '</span><h2>' + title + '</h2><p>' + description + '</p></div><span class="badge">READ ONLY</span></div><div id="' + bodyId + '" aria-live="polite"><p class="muted">Loading…</p></div>';
  return section;
}

async function mount() {
  const container = app?.querySelector('#owner-console');
  if (!container || app.querySelector('#owner-audit')) return;
  const audit = panel('owner-audit', 'audit', 'GOVERNANCE', 'Admin audit log', 'Who changed learner access or feature gates, when, and why.', 'owner-audit-state');
  const payments = panel('owner-payments', 'payments', 'BILLING LEDGER', 'Payments', 'Subscriptions, verified captures, refunds and webhooks that need attention.', 'owner-payments-state');
  container.append(audit, payments);
  window.dispatchEvent(new CustomEvent('mlos:admin-ready'));
  const [auditResult, billingResult] = await Promise.allSettled([client().auditEvents({ limit: 50 }), client().billingSummary()]);
  if (app.querySelector('#owner-console') !== container) return;
  audit.querySelector('#owner-audit-state').innerHTML = auditMarkup(auditResult.status === 'fulfilled' ? auditResult.value : null);
  payments.querySelector('#owner-payments-state').innerHTML = billingMarkup(billingResult.status === 'fulfilled' ? billingResult.value : null);
  for (const [result, operation] of [[auditResult, 'load_audit_events'], [billingResult, 'load_billing_summary']]) {
    if (result.status === 'rejected' && ![401, 403].includes(Number(result.reason?.status || 0))) {
      errorMonitor.capture(result.reason, { component: 'owner-records-console', operation, code: result.reason?.code || null });
    }
  }
  window.dispatchEvent(new CustomEvent('mlos:admin-ready', { detail: { layoutChanged: true } }));
}

if (app) {
  new MutationObserver(() => queueMicrotask(mount)).observe(app, { childList: true, subtree: true });
  mount();
}
