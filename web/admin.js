import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudReview } from '/src/adapters/cloud-review.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';

const root = document.querySelector('#admin-app');
const notice = document.querySelector('#notice');
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const auth = createSupabaseAuth({ ...cloudConfig, storage: localStorage });
const review = createCloudReview({ ...cloudConfig, auth });

let state = {
  user: auth.currentUser(),
  isAdmin: false,
  reviewKinds: [],
  pairs: [],
  researchGate: null,
  loading: false,
  submitting: false,
  error: null
};

function announce(message) {
  notice.textContent = message;
  notice.hidden = false;
}

function reportUnexpected(error, operation) {
  const status = Number(error?.status || 0);
  if (!status || status >= 500) {
    errorMonitor.capture(error, { component: 'admin-console', operation, code: error?.code || null, status: status || null });
  }
}

function questionCard(label, q) {
  const options = Array.isArray(q?.options)
    ? q.options.map(option => '<li>' + (option?.optionId === q?.answerOptionId ? '<strong>✓ ' : '') + escape(option?.text || '') + (option?.optionId === q?.answerOptionId ? '</strong>' : '') + '</li>').join('')
    : '';
  const packet = q?.reviewPacket || {};
  const sources = Array.isArray(packet.sources)
    ? packet.sources.map(source =>
        '<li><strong>' + escape(source?.title || source?.sourceId || 'Source') + '</strong>' +
        (source?.version ? ' · ' + escape(source.version) : '') +
        (source?.rightsStatus ? ' · rights: ' + escape(source.rightsStatus) : '') + '</li>'
      ).join('')
    : '';
  const reviews = Array.isArray(packet.reviewSummary)
    ? packet.reviewSummary.map(review =>
        '<span class="badge">' + escape(review?.kind || 'review') + ': ' + escape(review?.decision || 'unknown') + '</span>'
      ).join(' ')
    : '';
  const provenance = packet?.provenance?.kind
    ? '<p class="muted">Provenance: ' + escape(packet.provenance.kind) + (packet.changeReason ? ' · ' + escape(packet.changeReason) : '') + '</p>'
    : '';
  const reviewPacket = '<div class="review-packet"><span class="eyebrow">HUMAN REVIEW PACKET</span>' +
    (sources ? '<ul>' + sources + '</ul>' : '<p class="muted">No source metadata attached.</p>') +
    (reviews ? '<p>' + reviews + '</p>' : '') + provenance + '</div>';
  return '<article class="source-card"><span class="eyebrow">' + escape(label) + '</span><h3>' + escape(q?.questionVersionId || '') + '</h3><p>' + escape(q?.stem || '') + '</p><ol>' + options + '</ol><p class="muted">' + escape(q?.explanation || '') + '</p>' + reviewPacket + '</article>';
}

function pairPanel(pair, index) {
  const existing = pair?.validation;
  if (existing) {
    return '<section class="panel" id="m11c-pair-' + (index + 1) + '"><div class="section-heading"><div><span class="eyebrow">M11C PAIR ' + (index + 1) + '</span><h2>' + escape(pair.primaryConceptId) + '</h2></div><span class="badge">Already ' + escape(existing.decision) + '</span></div>' +
      '<div class="two-column">' + questionCard('QUESTION A', pair.questionA) + questionCard('QUESTION B', pair.questionB) + '</div>' +
      '<p class="muted">This pair already has immutable validation evidence. Revised question versions require a new validation.</p></section>';
  }

  return '<section class="panel" id="m11c-pair-' + (index + 1) + '"><div class="section-heading"><div><span class="eyebrow">M11C HUMAN PAIR REVIEW</span><h2>' + escape(pair.primaryConceptId) + '</h2></div><span class="badge">Admin only</span></div>' +
    '<div class="two-column">' + questionCard('QUESTION A', pair.questionA) + questionCard('QUESTION B', pair.questionB) + '</div>' +
    '<form class="transfer-pair-form" data-a="' + escape(pair.questionA.questionVersionId) + '" data-b="' + escape(pair.questionB.questionVersionId) + '">' +
      '<div class="two-column">' +
        '<label>Decision<select name="decision" required><option value="">Choose…</option><option value="validated">Validate pair</option><option value="rejected">Reject pair</option></select></label>' +
        '<label>Surface novelty<select name="surfaceNovelty" required><option value="">Choose…</option><option value="moderate">Moderate</option><option value="high">High</option><option value="low">Low</option></select></label>' +
        '<label>Construct alignment<select name="constructAlignment" required><option value="">Choose…</option><option value="same_primary_construct">Same primary construct</option><option value="related_construct">Related construct</option><option value="mismatch">Mismatch</option></select></label>' +
        '<label>Reasoning alignment<select name="reasoningAlignment" required><option value="">Choose…</option><option value="comparable">Comparable</option><option value="bounded_difference">Bounded difference</option><option value="materially_different">Materially different</option></select></label>' +
        '<label>Difficulty comparability<select name="difficultyComparability" required><option value="">Choose…</option><option value="comparable">Comparable</option><option value="bounded_difference">Bounded difference</option><option value="unknown">Unknown</option><option value="materially_different">Materially different</option></select></label>' +
        '<label>Cue-overlap risk<select name="cueOverlapRisk" required><option value="">Choose…</option><option value="low">Low</option><option value="moderate">Moderate</option><option value="high">High</option></select></label>' +
      '</div>' +
      '<label><input type="checkbox" name="retentionProbeComparable"> Also valid for the preregistered retention-probe feasibility protocol</label>' +
      '<label>Validation notes<textarea name="notes" minlength="20" maxlength="4000" required placeholder="State why the pair is or is not sufficiently novel, aligned and comparable."></textarea></label>' +
      '<label class="review-attestation"><input type="checkbox" name="attested" required> I personally inspected both exact published question versions and this judgment is my human research validation.</label>' +
      '<div class="review-actions"><button class="primary" type="submit" ' + (state.submitting ? 'disabled' : '') + '>Record immutable validation</button></div>' +
      '<p class="muted">Validation does not activate probes, change mastery, or grant Study Now authority.</p>' +
    '</form></section>';
}

function gateStatus(label, ok) {
  return '<div><strong>' + (ok ? '✓' : '○') + '</strong><span>' + escape(label) + '</span></div>';
}

function researchGatePanel() {
  const gate = state.researchGate;
  if (!gate) {
    return '<section class="panel"><span class="eyebrow">RESEARCH GATE</span><h2>Readiness unavailable.</h2><p class="muted">No activation control is exposed when canonical readiness cannot be loaded.</p></section>';
  }

  const readiness = gate.activationReadiness?.readiness || {};
  const next = gate.nextAction || {};
  const blockers = Array.isArray(readiness.blockingReasons) ? readiness.blockingReasons : [];
  const metrics =
    '<div class="metrics">' +
      gateStatus('Published alternate pair', readiness.hasPublishedAlternateItemPair === true) +
      gateStatus('Protocol preregistered', readiness.protocolPreregistered === true) +
      gateStatus('Human-validated comparable pair', readiness.validatedPairMetadataAvailable === true) +
      gateStatus('Learner opt-in path', readiness.learnerOptInPathAvailable === true) +
    '</div>';

  let action;
  if (next.kind === 'human-transfer-pair-validation') {
    action = '<div class="section-heading"><div><span class="eyebrow">ACTION REQUIRED · BLOCKING</span><h2>Human pair validation is the next research gate.</h2></div><span class="badge">1st priority</span></div>' +
      '<p>' + escape(next.pendingCount || 0) + ' published alternate pair review is waiting for the content admin. This judgment must come from direct human inspection of both exact versions.</p>' +
      '<p><a class="primary action-link" href="#m11c-pair-1">Review the blocking pair ↓</a></p>';
  } else if (next.kind === 'separate-activation-authorization-not-implemented') {
    action = '<div class="section-heading"><div><span class="eyebrow">NEXT GATE · NOT YET AVAILABLE</span><h2>Separate activation authorization remains intentionally absent.</h2></div><span class="badge">Fail closed</span></div>' +
      '<p>The pair-validity gate is no longer the blocker. Activation still requires its own governed authorization layer. No activate button is exposed here.</p>';
  } else {
    action = '<div class="section-heading"><div><span class="eyebrow">RESEARCH GATE</span><h2>No executable research action is available.</h2></div><span class="badge">Fail closed</span></div>';
  }

  const blockerText = blockers.length
    ? '<p class="muted">Canonical blockers: ' + blockers.map(escape).join(' · ') + '</p>'
    : '<p class="muted">Canonical readiness reports no listed blockers, but activation remains disabled unless a separately governed authorization exists.</p>';

  return '<section class="panel" id="research-gate">' + action + metrics + blockerText +
    '<p class="muted">Activation authority: none · probe scheduling: disabled · Study Now authority: unchanged.</p></section>';
}

function signedOut() {
  return '<main id="main" class="account-page"><a class="text-button" href="/">← App</a><div class="page-heading"><div><span class="eyebrow">ADMIN CONSOLE</span><h1>Sign in with the content-admin account.</h1><p>Admin authority is verified on the server. Learner accounts cannot open review queues or approve content.</p></div></div><section class="panel"><a class="primary action-link" href="/web/account.html">Open sign in →</a></section></main>';
}

function restricted() {
  return '<main id="main" class="account-page"><a class="text-button" href="/">← App</a><div class="page-heading"><div><span class="eyebrow">ADMIN CONSOLE</span><h1>Admin access only.</h1><p>This authenticated account is a learner account and has no content approval authority.</p></div></div><section class="panel"><a class="secondary action-link" href="/web/account.html">Account →</a></section></main>';
}

function adminHome() {
  const pairPanels = state.pairs.length
    ? state.pairs.map(pairPanel).join('')
    : '<section class="panel"><h2>No published alternate pairs awaiting display.</h2><p class="muted">M11c validation appears here only when two distinct published question identities share a primary concept.</p></section>';
  const loading = state.loading ? '<section class="panel"><p>Loading admin evidence…</p></section>' : '';
  const error = state.error ? '<section class="panel"><h2>Admin data unavailable</h2><p>' + escape(state.error) + '</p><button class="secondary" data-action="reload">Retry</button></section>' : '';

  return '<div class="shell"><aside class="sidebar"><a class="brand" href="/"><span class="brand-mark">m.</span><span>Medical<span>Learning OS</span></span></a><span class="nav-caption">ADMIN</span><nav aria-label="Admin navigation"><a href="/web/admin.html" aria-current="page">Admin Home<span>↗</span></a><a href="/web/review.html">Content Review<span>↗</span></a><a href="/web/account.html">Account<span>↗</span></a></nav><div class="sidebar-note"><span class="status-dot">Server authorized</span><p>Human authority.<br>Immutable receipts.</p></div></aside><div class="workspace"><header><span>MEDICAL LEARNING OS <span class="header-divider">/</span> Admin</span><a class="text-button" href="/">Learner app</a></header><main id="main" tabindex="-1"><div class="page-heading"><div><span class="eyebrow">SINGLE CONTENT ADMIN</span><h1>Review authority stays out of the learner product.</h1><p>' + escape(state.user?.email || 'Authenticated admin') + ' · gates: ' + state.reviewKinds.map(escape).join(', ') + '</p></div><span class="badge">BETA ADMIN</span></div>' + (!state.loading && !state.error ? researchGatePanel() : '') + '<div class="two-column"><section class="panel"><span class="eyebrow">CONTENT GOVERNANCE</span><h2>Medical + References + Rights</h2><p>Open the version-bound review workspace for question, note, source-rights and learner-report triage.</p><a class="primary action-link" href="/web/review.html">Open content review →</a></section><section class="panel"><span class="eyebrow">RESEARCH VALIDATION</span><h2>M11c pair validity</h2><p>Validate whether published alternate items provide legitimate transfer evidence and, separately, whether they are comparable enough for the retention feasibility protocol.</p></section></div>' + loading + error + (!state.loading && !state.error ? pairPanels : '') + '</main><footer>Medical Learning OS · admin-only beta surface</footer></div></div>';
}

function render() {
  if (!state.user) root.innerHTML = signedOut();
  else if (!state.loading && !state.isAdmin) root.innerHTML = restricted();
  else root.innerHTML = adminHome();
}

async function loadAdmin() {
  if (!state.user) { render(); return; }
  state = { ...state, loading: true, error: null };
  render();
  try {
    const session = await auth.getSession();
    if (!session?.user) {
      state = { ...state, user: null, loading: false, isAdmin: false, reviewKinds: [], pairs: [], researchGate: null };
      render();
      return;
    }
    const me = await review.me();
    if (me?.isAdmin !== true) {
      state = { ...state, user: auth.currentUser() || session.user, loading: false, isAdmin: false, reviewKinds: [], pairs: [], researchGate: null };
      render();
      return;
    }
    const result = await review.transferPairs();
    state = {
      ...state,
      user: auth.currentUser() || session.user,
      loading: false,
      isAdmin: true,
      reviewKinds: Array.isArray(me.reviewKinds) ? me.reviewKinds : [],
      pairs: Array.isArray(result?.pairs) ? result.pairs : [],
      researchGate: result?.researchGate || null,
      error: null
    };
  } catch (error) {
    reportUnexpected(error, 'load_admin');
    state = { ...state, loading: false, error: error.code || error.message || 'admin_console_unavailable' };
  }
  render();
}

root.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  event.preventDefault();
  if (target.dataset.action === 'reload') loadAdmin();
});

root.addEventListener('submit', event => {
  const form = event.target.closest('.transfer-pair-form');
  if (!form) return;
  event.preventDefault();
  if (state.submitting) return;
  const data = new FormData(form);
  state.submitting = true;
  render();
  (async () => {
    try {
      const result = await review.validateTransferPair({
        questionVersionA: form.dataset.a,
        questionVersionB: form.dataset.b,
        decision: data.get('decision'),
        surfaceNovelty: data.get('surfaceNovelty'),
        constructAlignment: data.get('constructAlignment'),
        reasoningAlignment: data.get('reasoningAlignment'),
        difficultyComparability: data.get('difficultyComparability'),
        cueOverlapRisk: data.get('cueOverlapRisk'),
        retentionProbeComparable: data.get('retentionProbeComparable') === 'on',
        notes: data.get('notes'),
        attested: data.get('attested') === 'on'
      });
      announce('Pair validation recorded immutably. Probe activation remains disabled.');
      state.submitting = false;
      await loadAdmin();
      if (result?.receipt?.retention_probe_comparable === true) {
        announce('Pair validated as retention-probe comparable. Learner opt-in and separate activation authorization are still required.');
      }
    } catch (error) {
      reportUnexpected(error, 'validate_transfer_pair');
      state.submitting = false;
      render();
      announce('Pair validation was not recorded: ' + (error.code || error.message || 'validation_failed') + '.');
    }
  })();
});

render();
loadAdmin();