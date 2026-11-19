// Read-only owner records: Admin Audit Log and Payments.
// Mounted into the owner console like the feature-gate panels. Each panel
// fails closed: an unavailable read never renders as "no events" or "₹0".
import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudOwner } from '/src/adapters/cloud-owner.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';
import { formatInrMinor } from '/src/domain/owner-records.js';
import { accessReview } from '/src/domain/access-protection.js';

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

const n = value => (Number.isSafeInteger(value) && value >= 0 ? value : null);
const share = (part, whole) => (n(part) === null || !n(whole) ? '' : ' (' + Math.round((part / whole) * 100) + '%)');

export function funnelMarkup(f) {
  if (!f || f.contractId !== 'owner-learner-funnel-v1') return '<p class="muted" role="status">Learner journey unavailable. This is not evidence of zero learners. Reload to retry.</p>';
  const step = (label, value, base, note = '') => '<div class="owner-metric"><span>' + escape(label) + '</span><strong>' + escape(n(value) ?? '—') + escape(share(value, base)) + '</strong>' + (note ? '<small>' + escape(note) + '</small>' : '') + '</div>';
  const weeks = Array.isArray(f.weeklySignups) && f.weeklySignups.length
    ? '<p>Sign-ups per week (last 12): ' + f.weeklySignups.map(w => '<span class="badge">' + escape(String(w.weekStart).slice(5)) + ': ' + escape(w.signups) + '</span>').join(' ') + '</p>'
    : '<p class="muted">No sign-ups in the last 12 weeks.</p>';
  return '<div class="owner-metrics">' +
    step('Learner accounts', f.accounts, null, (n(f.signups7d) ?? '—') + ' new in 7 days · ' + (n(f.signups30d) ?? '—') + ' in 30') +
    step('Email confirmed', f.emailConfirmed, f.accounts) +
    step('Answered at least one question', f.studiedOnce, f.accounts) +
    step('Studied on 2+ days', f.studiedOnTwoOrMoreDays, f.studiedOnce) +
    step('Came back 7+ days after starting', f.studiedAgain7DaysAfterFirst, f.eligibleFor7DayReturn, 'of ' + (n(f.eligibleFor7DayReturn) ?? '—') + ' who started 7+ days ago') +
    step('Active in last 7 days', f.activeLearners7d, f.accounts, (n(f.activeLearners30d) ?? '—') + ' in 30 days') +
    step('Two-factor turned on', f.twoFactorEnabled, f.accounts) +
    '</div>' + weeks +
    '<p class="muted">Admin accounts excluded. These are activity counts, not mastery or memory retention. Percentages under ~30 learners are noisy.</p>';
}

const LEVEL = { review: 'NEEDS REVIEW', watch: 'WATCH', none: 'NO FLAGS' };

export function accessSignalsMarkup(payload) {
  const review = accessReview(payload);
  if (!review) return '<p class="muted" role="status">Access signals unavailable. This is not evidence that nobody is scraping. Reload to retry.</p>';
  const limits = review.limits
    ? '<p class="muted">Automatic limits per learner: questions ' + escape(review.limits.question?.perMinute) + '/min and ' + escape(review.limits.question?.perDay) + '/day; library ' + escape(review.limits.library?.perMinute) + '/min and ' + escape(review.limits.library?.perDay) + '/day. A throttle divides these.</p>'
    : '';
  const flagged = review.rows.filter(row => row.level !== 'none' || row.throttledUntil || row.suspendedUntil);
  const rows = flagged.length
    ? '<ul class="owner-action-inbox-list">' + flagged.map(row => '<li class="owner-action-row"><div><strong>' + escape(row.email || shortId(row.learnerId)) + '</strong> <span class="badge">' + escape(LEVEL[row.level]) + '</span>' +
        (row.suspendedUntil ? ' <span class="badge">SUSPENDED</span>' : '') + (row.throttledUntil ? ' <span class="badge">THROTTLED 1/' + escape(row.throttleFactor) + ' until ' + escape(dateTime(row.throttledUntil)) + '</span>' : '') +
        (row.flags.length ? '<ul>' + row.flags.map(flag => '<li>' + escape(flag.label) + ' <small>(' + escape(flag.strength) + ') ' + escape(flag.evidence) + '</small></li>').join('') + '</ul>' : '') +
        '</div><a class="secondary action-link" href="#owner-users" data-owner-learner-id="' + escape(row.learnerId) + '">Manage learner →</a></li>').join('') + '</ul>'
    : '<p class="muted">No learner shows unusual access in the last ' + escape(review.windowDays) + ' days. Signals cover behaviour inside Medretica only; they cannot see an agent that behaves like a person.</p>';
  return limits + rows + '<p class="muted">' + escape(review.rows.length) + ' learner(s) with any activity checked. Flags are evidence for your decision, never automatic action. Suggested response: watch → throttle → suspend.</p>';
}

export function traceMarkup(result) {
  if (!result || result.contractId !== 'owner-watermark-trace-v1') return '<p class="muted" role="status">Trace failed. Nothing was concluded.</p>';
  if (!result.codesFound?.length) return '<p>No trace mark found in that text. This proves nothing: retyped, screenshotted or cleaned text loses the mark.</p>';
  if (!result.matches?.length) return '<p>Mark found (' + escape(result.codesFound.join(', ')) + ') but it matches no current account.</p>';
  return '<ul>' + result.matches.map(m => '<li>Matches <strong>' + escape(m.email || m.learnerId) + '</strong> (' + escape(shortId(m.learnerId)) + ') · <a href="#owner-users" data-owner-learner-id="' + escape(m.learnerId) + '">Manage learner →</a></li>').join('') +
    '</ul><p class="muted">The mark shows which account the text was served to, not who shared it. Text from questions served before 20 Nov 2026 has no mark.</p>';
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
  const payments = panel('owner-payments', 'payments', 'BILLING', 'Billing ledger', 'Subscriptions, verified captures, refunds and webhooks that need attention.', 'owner-payments-state');
  const signals = panel('owner-access-signals', 'signals', 'LEARNERS · ACCESS PROTECTION', 'Access signals', 'Learners whose behaviour looks automated or bulk-copying, with the evidence. Throttle or suspend from Manage learner.', 'owner-access-signals-state');
  signals.insertAdjacentHTML('beforeend', '<h3>Trace leaked question text</h3><form id="owner-trace-form" autocomplete="off"><label>Paste the leaked question text<textarea name="text" maxlength="6000" required></textarea></label><button class="secondary" type="submit">Find source account</button></form><div id="owner-trace-result" aria-live="polite"></div>');
  container.append(audit, payments, signals);
  window.dispatchEvent(new CustomEvent('mlos:admin-ready'));
  const learning = app.querySelector('#owner-learning');
  const journey = document.createElement('div');
  journey.className = 'owner-status-block'; journey.id = 'owner-learner-journey';
  journey.innerHTML = '<h3>Learner journey</h3><div id="owner-learner-journey-state" aria-live="polite"><p class="muted">Loading…</p></div>';
  learning?.append(journey);
  const [auditResult, billingResult, funnelResult, signalsResult] = await Promise.allSettled([client().auditEvents({ limit: 50 }), client().billingSummary(), client().learnerFunnel(), client().accessSignals()]);
  signals.querySelector('#owner-access-signals-state').innerHTML = accessSignalsMarkup(signalsResult.status === 'fulfilled' ? signalsResult.value : null);
  if (app.querySelector('#owner-console') !== container) return;
  audit.querySelector('#owner-audit-state').innerHTML = auditMarkup(auditResult.status === 'fulfilled' ? auditResult.value : null);
  payments.querySelector('#owner-payments-state').innerHTML = billingMarkup(billingResult.status === 'fulfilled' ? billingResult.value : null);
  const journeyState = journey.querySelector('#owner-learner-journey-state');
  if (journeyState) journeyState.innerHTML = funnelMarkup(funnelResult.status === 'fulfilled' ? funnelResult.value : null);
  for (const [result, operation] of [[auditResult, 'load_audit_events'], [billingResult, 'load_billing_summary'], [funnelResult, 'load_learner_funnel'], [signalsResult, 'load_access_signals']]) {
    if (result.status === 'rejected' && ![401, 403].includes(Number(result.reason?.status || 0))) {
      errorMonitor.capture(result.reason, { component: 'owner-records-console', operation, code: result.reason?.code || null });
    }
  }
  window.dispatchEvent(new CustomEvent('mlos:admin-ready', { detail: { layoutChanged: true } }));
}

app?.addEventListener('submit', event => {
  const form = event.target.closest('#owner-trace-form');
  if (!form) return;
  event.preventDefault();
  const out = app.querySelector('#owner-trace-result');
  const button = form.querySelector('button');
  if (button) button.disabled = true;
  (async () => {
    try { out.innerHTML = traceMarkup(await client().traceWatermark(String(new FormData(form).get('text') || ''))); }
    catch (error) { out.innerHTML = traceMarkup(null); if (Number(error?.status || 0) >= 500) errorMonitor.capture(error, { component: 'owner-records-console', operation: 'trace_watermark' }); }
    finally { if (button) button.disabled = false; }
  })();
});

if (app) {
  new MutationObserver(() => queueMicrotask(mount)).observe(app, { childList: true, subtree: true });
  mount();
}
