import { buildAdminActionInbox } from '../src/domain/admin-action-inbox.js';
import { escapeText } from './navigation-view.js';

export const ADMIN_VIEWS = Object.freeze([
  ['overview', 'Overview', 'owner-home'], ['actions', 'Action Inbox', 'admin-actions'],
  ['snapshot', 'Platform Snapshot', 'owner-overview'], ['users', 'Learner Accounts', 'owner-users'],
  ['authority', 'Reviewer Authority', 'owner-review-authority'], ['learning', 'Observed Learning', 'owner-learning'],
  ['content', 'Content Snapshot', 'owner-content'], ['coverage', 'Coverage Index', 'owner-coverage'], ['integrity', 'Catalog Integrity', 'owner-integrity'],
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


// Owner-only audit presentation, not a content-approval or publication flow.
// Warnings are derived from metadata checks, not legally or medically verified evidence.
const EVIDENCE_WARNING_LABELS = Object.freeze({
  note_contains_unresolved_review_language: 'Published note still says draft or unapproved',
  permission_claim_conflicts_with_evidence: 'Source permission claim conflicts with its recorded evidence',
  public_domain_claim_lacks_rights_evidence: 'Public-domain claim has no recorded supporting evidence'
});
const trustCheck = (title, question, required) =>
  '<li><strong>' + escapeText(title) + '</strong><span>' + escapeText(question) +
  '</span><small>' + escapeText(required) + '</small></li>';

export function publicationEvidenceMarkup(scan) {
  const intro = '<section class="owner-status-block" aria-label="Three content checks">' +
    '<h3>Before publishing: three checks</h3>' +
    '<ol class="owner-trust-checks">' +
    trustCheck('1. Permission', 'May we legally reuse this material?', 'Source ownership, licence or permitted-use evidence') +
    trustCheck('2. Medical accuracy', 'Is the clinical content correct?', 'Qualified review of the exact question or note') +
    trustCheck('3. References', 'Does the citation support the claim?', 'Verified source and relevant passage') +
    '</ol>' +
    '<p class="muted">These checks remain separate human decisions. The audit below flags possible problems only; it never grants approval or publishes content.</p>';
  // An older or malformed owner response must never be shown as an empty scan.
  const complete = scan?.status === 'complete' &&
    scan.approvalGranted === false && scan.publicationDecision === 'not_evaluated' &&
    Number.isSafeInteger(scan.warningCount) && scan.warningCount >= 0 &&
    Array.isArray(scan.warnings) &&
    scan.warnings.length <= 120 && scan.warnings.length <= scan.warningCount &&
    typeof scan.truncated === 'boolean';
  if (!complete) {
    return intro + '<p><strong>Evidence warning scan unavailable.</strong> Nothing is verified. Re-run after the owner API has been updated; continue independent review.</p></section>';
  }
  const rows = scan.warnings.map(item => {
    if (!item || !['note', 'source'].includes(item.scope) ||
        typeof item.targetId !== 'string' || typeof item.code !== 'string' ||
        item.action !== 'independent_human_review_required') return null;
    return '<tr><td>' + escapeText(item.scope === 'note' ? 'Note' : 'Source') +
      '</td><td><code>' + escapeText(item.targetId) + '</code></td><td>' +
      escapeText(EVIDENCE_WARNING_LABELS[item.code] || 'Inspect this warning with a qualified reviewer') + '</td></tr>';
  });
  if (rows.some(row => row === null)) {
    return intro + '<p><strong>Evidence warning scan malformed.</strong> Review status is unknown; no clean result can be claimed.</p></section>';
  }
  const count = scan.warningCount;
  return intro +
    (count ? '<p><strong>' + escapeText(count) + ' possible content-review problems detected.</strong> Inspect exact versions and independent evidence.</p>'
      : '<p><strong>No matching warning phrases found.</strong> Source permissions, clinical correctness and references are still unverified by this scan.</p>') +
    (rows.length ? '<div class="owner-table-wrap"><table class="owner-table"><thead><tr><th>Type</th><th>Exact ID</th><th>Review needed</th></tr></thead><tbody>' +
      rows.join('') + '</tbody></table></div>' : '') +
    (scan.truncated || count > rows.length ? '<p class="muted">Only a sample of warnings is shown. Inspect the complete evidence independently.</p>' : '') +
    '<p class="muted"><strong>Next action:</strong> <a href="/web/review.html">Open Content Review</a> to check rights and references and obtain the authorized medical decision. Use the existing Review → Live gate only when every requirement is independently satisfied.</p></section>';
}
