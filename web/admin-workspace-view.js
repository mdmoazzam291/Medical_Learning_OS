import { buildAdminActionInbox } from '../src/domain/admin-action-inbox.js';
import { escapeText } from './navigation-view.js';

export const ADMIN_VIEWS = Object.freeze([
  ['overview', 'Overview', 'owner-home'], ['actions', 'Action Inbox', 'admin-actions'],
  ['snapshot', 'Platform Snapshot', 'owner-overview'], ['users', 'Learner Accounts', 'owner-users'],
  ['authority', 'Reviewer Authority', 'owner-review-authority'], ['learning', 'Observed Learning', 'owner-learning'],
  ['content', 'Content Snapshot', 'owner-content'], ['integrity', 'Catalog Integrity', 'owner-integrity'],
  ['source-watch', 'Source Change Watch', 'owner-source-watch'], ['ai', 'AI Usage', 'owner-ai'],
  ['health', 'Provider Health', 'owner-infrastructure'], ['alerts', 'Infrastructure Alerts', 'owner-infrastructure-alerts'],
  ['features', 'Feature Gates', 'owner-features'], ['research', 'Research Readiness', 'research-gate']
].map(([id, label, anchor]) => Object.freeze({ id, label, anchor })));
export function adminViewFor(hash = '') {
  if (/^#m11c-pair-[1-9]\d*$/.test(hash)) return ADMIN_VIEWS.find(view => view.id === 'research');
  return ADMIN_VIEWS.find(view => '#' + view.anchor === hash) || ADMIN_VIEWS[0];
}
export function applyAdminWorkspace(app, hash, authorized, { focus = false } = {}) {
  const view = adminViewFor(hash), panels = [...app.querySelectorAll('[data-admin-panel]')];
  let visible = false, hiddenFocus = false;
  for (const panel of panels) {
    panel.hidden = authorized !== true || panel.dataset.adminPanel !== view.id;
    if (!panel.hidden) visible = true;
    else if (app.ownerDocument?.activeElement && panel.contains(app.ownerDocument.activeElement)) hiddenFocus = true;
  }
  app.dataset.adminView = view.id;
  const status = app.querySelector('#admin-workspace-status');
  if (status) {
    status.hidden = authorized !== true || visible;
    const message = app.dataset.ownerState === 'unavailable'
      ? '<h2>Owner data unavailable</h2><p>' + escapeText(view.label) + ' could not be loaded. Other tools keep their existing access checks.</p><button type="button" class="secondary" data-owner-dashboard-retry>Retry owner data</button>'
      : '<p>Loading ' + escapeText(view.label) + '…</p>';
    if (!status.hidden && status.innerHTML !== message) status.innerHTML = message;
  }
  if (authorized === true) {
    const heading = app.querySelector('.page-heading h1');
    if (heading) { heading.textContent = view.label; if (focus || hiddenFocus) heading.focus({ preventScroll: true }); }
  }
  return view;
}
const observed = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : '—';
const metric = (label, value) => '<div class="owner-metric"><span>' + escapeText(label) + '</span><strong>' + escapeText(value) + '</strong></div>';
export function overviewMarkup(dashboard, alerts = null) {
  const inbox = buildAdminActionInbox(dashboard, { alerts });
  const critical = inbox.missing.includes('infrastructure alerts') ? '—' : inbox.actions.filter(action => action.kind === 'infrastructure' && action.priority === 0).length;
  const content = dashboard?.content || {};
  return '<div class="section-heading"><div><span class="eyebrow">ADMIN OVERVIEW</span><h2>Platform at a glance</h2><p>Summary evidence and shortcuts. Open a tool to inspect details or perform an authorized action.</p></div></div>' +
    '<div class="owner-metrics">' + metric('Learners', observed(dashboard?.users?.total)) + metric('Questions', observed(content.questions)) + '</div>' +
    '<h3>Urgent actions</h3><div class="owner-metrics">' + metric('Learner reports', observed(content.openLearnerReports)) + metric('Unresolved rights', observed(content.unresolvedRights)) + metric('Critical alerts', critical) + '</div>' +
    (inbox.missing.length ? '<p class="muted">Not verified: ' + escapeText(inbox.missing.join(' · ')) + '. Unknown counts are shown as —.</p>' : '<p class="muted">Counts are separate signal families; they are not summed into a possibly duplicated total.</p>') +
    '<nav class="owner-summary-links" aria-label="Admin overview shortcuts">' + ['actions', 'users', 'content', 'health'].map(id => { const view = ADMIN_VIEWS.find(item => item.id === id); return '<a class="secondary action-link" href="/web/admin.html#' + view.anchor + '">' + view.label + ' →</a>'; }).join('') + '</nav>';
}
