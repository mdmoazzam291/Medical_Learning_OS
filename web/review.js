import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudReview } from '/src/adapters/cloud-review.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';

const root = document.querySelector('#review-app');
const notice = document.querySelector('#notice');
const escape = text => String(text ?? '').replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
const auth = createSupabaseAuth({ ...cloudConfig, storage: localStorage });
const review = createCloudReview({ ...cloudConfig, auth });

let state = {
  user: auth.currentUser(),
  grants: [],
  selectedKind: null,
  items: [],
  loading: false,
  submitting: null,
  error: null
};

function announce(message) {
  notice.textContent = message;
  notice.hidden = false;
}

function setFormBusy(form, busy) {
  for (const control of form.querySelectorAll('button, select, textarea')) {
    control.disabled = busy;
  }
}

function reportUnexpected(error, operation) {
  const status = Number(error?.status || 0);
  if (!status || status >= 500) {
    errorMonitor.capture(error, {
      component: 'content-review',
      operation,
      code: error?.code || null,
      status: status || null
    });
  }
}

function sourceLink(url) {
  if (!url) return '<span class="muted">No external URL</span>';
  try {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol)) return '<span class="muted">Invalid source URL</span>';
    return `<a href="${escape(parsed.href)}" target="_blank" rel="noopener noreferrer">Open source ↗</a>`;
  } catch {
    return '<span class="muted">Invalid source URL</span>';
  }
}

function gateLabel(kind) {
  return ({ medical: 'Medical accuracy', references: 'References', rights: 'Rights & provenance' })[kind] || kind;
}

function checklist(kind) {
  if (kind === 'medical') {
    return '<ul><li>Answer key is medically correct for the stated context.</li><li>Stem/options are unambiguous and clinically safe.</li><li>Explanation supports reasoning without introducing unsupported claims.</li></ul>';
  }
  if (kind === 'references') {
    return '<ul><li>Each material claim is supported by the cited source package.</li><li>Source identity/version is appropriate and current for the claim.</li><li>No important contradiction or scope mismatch is hidden.</li></ul>';
  }
  return '<ul><li>Provenance is accurate.</li><li>Source rights status matches the actual use: reuse rights are needed only when protected expression is copied/adapted; citation-only factual grounding must not reproduce protected text, tables, images, or other expressive material.</li><li>No recalled/licensed material is being represented as original.</li></ul>';
}

function signedOut() {
  return `<main id="main" class="review-page"><a class="text-button" href="/web/account.html">← Cloud account</a><div class="page-heading"><div><span class="eyebrow">CONTENT REVIEW</span><h1>Sign in before reviewing.</h1><p>The review workspace uses your existing Supabase account session. Reviewer identity and privileges are resolved server-side.</p></div><span class="badge">M04c</span></div><section class="panel"><h2>No review session</h2><p>Sign in on the Cloud account page, then return here. Learner accounts do not become reviewers automatically.</p><a class="primary action-link" href="/web/account.html">Open cloud account</a></section></main>`;
}

function unauthorized() {
  return `<main id="main" class="review-page"><a class="text-button" href="/web/account.html">← Cloud account</a><div class="page-heading"><div><span class="eyebrow">CONTENT REVIEW</span><h1>No reviewer grant.</h1><p>${escape(state.user?.email || 'Authenticated account')} is signed in, but has no medical, references, or rights review authority.</p></div><span class="badge">M04c</span></div><section class="panel"><h2>Fail closed by default.</h2><p>Reviewer privileges are assigned outside the learner UI. No content is exposed for review until an explicit server-side grant exists.</p></section></main>`;
}

function sourceCard(source) {
  const rights = source?.rights || {};
  const status = rights.status || 'unknown';
  const canResolve = state.selectedKind === 'rights' && status === 'unknown';
  const form = canResolve ? `
    <form class="source-rights-form" data-source-id="${escape(source?.sourceId || '')}">
      <label>Rights outcome<select name="rightsStatus" required><option value="">Choose…</option><option value="citation_only">Citation / factual grounding only</option><option value="public_domain">Public domain</option><option value="licensed">Licensed</option><option value="owned">Owned</option><option value="restricted">Restricted / do not publish</option></select></label>
      <label>Rights evidence<textarea name="evidence" minlength="1" maxlength="4000" required placeholder="Record the policy, licence, ownership evidence, or restriction."></textarea></label>
      <button class="secondary" type="submit" ${state.submitting ? 'disabled' : ''}>Resolve source rights</button>
    </form>` : '';
  return `<article class="source-card"><div><strong>${escape(source?.title || 'Untitled source')}</strong><p class="muted">${escape(source?.sourceId || 'unknown source')} · version ${escape(source?.version || '?')}</p></div><dl><div><dt>Rights</dt><dd>${escape(status)}</dd></div><div><dt>Evidence</dt><dd>${escape(rights.evidence || 'None recorded')}</dd></div></dl><div>${sourceLink(source?.url)}</div>${form}</article>`;
}

function reviewItem(item, index) {
  const q = item?.question || {};
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const options = Array.isArray(q.options) ? q.options : [];
  const primary = Array.isArray(q.conceptLinks) ? q.conceptLinks.find(link => link?.role === 'primary') : null;
  const provenance = q.provenance || {};
  const rightsReady = state.selectedKind !== 'rights' || sources.every(source => ['owned', 'licensed', 'public_domain', 'citation_only'].includes(source?.rights?.status));

  return `<article class="review-card">
    <div class="review-card-heading"><div><span class="eyebrow">TARGET ${index + 1}</span><h2>${escape(q.questionVersionId || 'Unknown version')}</h2></div><span class="badge">${escape(gateLabel(state.selectedKind))}</span></div>
    <section class="review-section"><h3>Question</h3><p class="review-stem">${escape(q.stem || '')}</p><ol class="review-options">${options.map(option => `<li class="${option?.optionId === q.answerOptionId ? 'review-answer' : ''}"><span>${escape(option?.optionId || '')}</span>${escape(option?.text || '')}${option?.optionId === q.answerOptionId ? '<strong>Key</strong>' : ''}</li>`).join('')}</ol></section>
    <section class="review-section"><h3>Explanation</h3><p>${escape(q.explanation || '')}</p></section>
    <div class="review-metadata"><div><span>Primary concept</span><strong>${escape(primary?.conceptId || 'Not linked')}</strong></div><div><span>Provenance</span><strong>${escape(provenance.kind || 'unknown')}</strong></div><div><span>Exam/year</span><strong>${escape(provenance.exam || 'N/A')} ${escape(provenance.year ?? '')}</strong></div></div>
    <section class="review-section"><h3>Provenance evidence</h3><p>${escape(provenance.evidence || '')}</p></section>
    <section class="review-section"><div class="section-heading"><h3>Referenced sources</h3><span class="badge">${sources.length}</span></div><div class="source-list">${sources.length ? sources.map(sourceCard).join('') : '<p class="muted">No source package resolved.</p>'}</div></section>
    <section class="review-checklist"><h3>${escape(gateLabel(state.selectedKind))} check</h3>${checklist(state.selectedKind)}</section>
    <form class="review-decision-form" data-question-version-id="${escape(q.questionVersionId || '')}">
      <label>Review notes<textarea name="notes" minlength="1" maxlength="4000" required placeholder="Record the evidence for this decision. Avoid learner or patient information."></textarea></label>
      <div class="review-actions"><button class="secondary danger-outline" type="submit" name="decision" value="rejected" ${state.submitting ? 'disabled' : ''}>Reject version</button><button class="primary" type="submit" name="decision" value="approved" ${state.submitting || !rightsReady ? 'disabled' : ''}>Approve this gate</button></div>${!rightsReady ? '<p class="muted">Resolve every referenced source to owned, licensed, or public domain before approving the rights gate.</p>' : ''}
    </form>
  </article>`;
}

function authorized() {
  const kinds = state.grants;
  const body = state.loading
    ? '<section class="panel"><p>Loading authorized review targets…</p></section>'
    : state.error
      ? `<section class="panel"><h2>Review queue unavailable</h2><p>${escape(state.error)}</p><button class="secondary" data-action="reload">Retry</button></section>`
      : state.items.length
        ? `<div class="review-list">${state.items.map(reviewItem).join('')}</div>`
        : '<section class="panel empty"><h2>No pending targets for this gate.</h2><p>Nothing is auto-approved. New content appears here only after it enters the in-review state.</p></section>';

  return `<main id="main" class="review-page"><a class="text-button" href="/web/account.html">← Cloud account</a><div class="page-heading"><div><span class="eyebrow">AUTHENTICATED CONTENT REVIEW</span><h1>Review one immutable version at a time.</h1><p>${escape(state.user?.email || 'Authenticated reviewer')} · decisions are timestamped and bound to the exact question/source target.</p></div><span class="badge">M04c</span></div>
  <section class="panel reviewer-boundary"><div><h2>Review authority</h2><p>Approval here advances only this review gate. Three approvals produce <strong>verified</strong>, not published. Publication is a separate server-only transition.</p></div><label>Review gate<select id="review-kind">${kinds.map(kind => `<option value="${escape(kind)}" ${kind === state.selectedKind ? 'selected' : ''}>${escape(gateLabel(kind))}</option>`).join('')}</select></label></section>
  ${body}</main>`;
}

function render() {
  root.innerHTML = !state.user ? signedOut() : state.grants.length ? authorized() : unauthorized();
}

async function loadQueue(kind = state.selectedKind) {
  if (!kind) return;
  state = { ...state, selectedKind: kind, loading: true, error: null, items: [] };
  render();
  try {
    const result = await review.queue(kind);
    state = { ...state, loading: false, items: Array.isArray(result?.items) ? result.items : [], error: null };
  } catch (error) {
    reportUnexpected(error, 'load_queue');
    state = { ...state, loading: false, items: [], error: error.code || error.message || 'review_queue_unavailable' };
  }
  render();
}

async function bootstrap() {
  state.user = auth.currentUser();
  if (!state.user) { render(); return; }
  state.loading = true;
  render();
  try {
    const me = await review.me();
    const grants = Array.isArray(me?.reviewKinds) ? me.reviewKinds.filter(kind => ['medical', 'references', 'rights'].includes(kind)) : [];
    state = { ...state, loading: false, grants, selectedKind: grants[0] || null, error: null };
    if (grants.length) await loadQueue(grants[0]);
    else render();
  } catch (error) {
    if (error.status === 401) {
      auth.clear();
      state = { user: null, grants: [], selectedKind: null, items: [], loading: false, submitting: null, error: null };
    } else {
      reportUnexpected(error, 'load_reviewer_identity');
      state = { ...state, loading: false, error: error.code || error.message || 'review_authz_unavailable' };
    }
    render();
  }
}

root.addEventListener('change', event => {
  if (event.target.id === 'review-kind') loadQueue(event.target.value);
});

root.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (target?.dataset.action === 'reload') loadQueue();
});

root.addEventListener('submit', event => {
  const rightsForm = event.target.closest('.source-rights-form');
  if (rightsForm) {
    event.preventDefault();
    const data = new FormData(rightsForm);
    const sourceId = rightsForm.dataset.sourceId;
    const rightsStatus = String(data.get('rightsStatus') || '');
    const evidence = String(data.get('evidence') || '').trim();
    if (!rightsStatus || !evidence) { announce('Rights outcome and evidence are required.'); return; }

    (async () => {
      state.submitting = sourceId;
      setFormBusy(rightsForm, true);
      try {
        const receipt = await review.resolveRights({ sourceId, rightsStatus, evidence });
        announce(`Source rights recorded for ${sourceId}: ${receipt.rightsStatus}.`);
        state.submitting = null;
        await loadQueue(state.selectedKind);
      } catch (error) {
        reportUnexpected(error, 'resolve_source_rights');
        state.submitting = null;
        setFormBusy(rightsForm, false);
        announce(`Source rights were not recorded: ${error.code || error.message || 'rights_write_failed'}. Your entered evidence has been preserved; retry when the connection is stable.`);
      }
    })();
    return;
  }

  const form = event.target.closest('.review-decision-form');
  if (!form) return;
  event.preventDefault();
  const submitter = event.submitter;
  const decision = submitter?.value;
  if (!['approved', 'rejected'].includes(decision)) return;

  const data = new FormData(form);
  const notes = String(data.get('notes') || '').trim();
  const questionVersionId = form.dataset.questionVersionId;
  if (!notes) { announce('Review notes are required.'); return; }

  (async () => {
    state.submitting = questionVersionId;
    setFormBusy(form, true);
    try {
      const receipt = await review.record({
        questionVersionId,
        reviewKind: state.selectedKind,
        decision,
        notes
      });
      announce(`${decision === 'approved' ? 'Approved' : 'Rejected'} ${questionVersionId} for ${gateLabel(state.selectedKind)}. Review receipt ${receipt.reviewId} recorded.`);
      state.submitting = null;
      await loadQueue(state.selectedKind);
    } catch (error) {
      reportUnexpected(error, 'record_review');
      state.submitting = null;
      setFormBusy(form, false);
      announce(`Review was not recorded: ${error.code || error.message || 'review_write_failed'}. Your review notes have been preserved; retry when the connection is stable.`);
    }
  })();
});

render();
bootstrap();
