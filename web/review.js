import { buildReferencesWorkspace } from '/src/domain/references-workspace.js';
import { referencesPanel } from '/web/references-panel.js';
import { referencesWorkflowArm, filterReferencesWorkflowItems } from '/src/domain/review-workflow-experiment.js';
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
  targetType: 'questions',
  items: [],
  pipelineStatus: null,
  reviewAssist: null,
  referencesWorkspace: null,
  referencesError: null,
  referencesExperimentArm: 'all',
  loading: false,
  submitting: null,
  error: null
};

let reviewTiming = null;

function reviewPageIsActive() {
  return document.visibilityState === 'visible' && document.hasFocus();
}

function syncReviewTiming() {
  if (!reviewTiming) return;
  const now = performance.now();
  const active = reviewPageIsActive();
  if (reviewTiming.foregroundStartedAt !== null && !active) {
    reviewTiming.foregroundActiveMs += Math.max(0, now - reviewTiming.foregroundStartedAt);
    reviewTiming.foregroundStartedAt = null;
  } else if (reviewTiming.foregroundStartedAt === null && active) {
    reviewTiming.foregroundStartedAt = now;
  }
}

function beginReviewTiming() {
  reviewTiming = null;
  if (state.selectedKind !== 'references' ||
      state.targetType !== 'questions' ||
      !['claim_first', 'standard'].includes(state.referencesExperimentArm) ||
      !globalThis.crypto?.randomUUID) {
    return;
  }
  reviewTiming = {
    clientSessionId: crypto.randomUUID(),
    wallStartedAt: Date.now(),
    foregroundActiveMs: 0,
    foregroundStartedAt: reviewPageIsActive() ? performance.now() : null
  };
}

function reviewTimingSnapshot() {
  if (!reviewTiming) return null;
  syncReviewTiming();
  const foregroundActiveMs = Math.max(0, Math.round(reviewTiming.foregroundActiveMs));
  const elapsedWallMs = Math.max(foregroundActiveMs, Date.now() - reviewTiming.wallStartedAt);
  return {
    clientSessionId: reviewTiming.clientSessionId,
    foregroundActiveMs,
    elapsedWallMs
  };
}

function referencesExperimentPanel() {
  if (state.selectedKind !== 'references' || state.targetType !== 'questions' || state.loading || state.error) return '';
  const claimCount = filterReferencesWorkflowItems(state.items, 'claim_first').length;
  const standardCount = filterReferencesWorkflowItems(state.items, 'standard').length;
  const button = (mode, label, count) =>
    '<button class="' + (state.referencesExperimentArm === mode ? 'primary' : 'secondary') +
    '" type="button" data-action="references-experiment-arm" data-mode="' + mode + '">' +
    escape(label) + ' · ' + escape(count) + '</button>';
  return '<section class="panel review-measurement-panel"><div class="section-heading"><div><span class="eyebrow">M02C REVIEW-WORKFLOW PILOT</span><h2>Matched 7-question operational comparison</h2></div><span class="badge">Descriptive, not causal</span></div><p>Use one pilot arm at a time. Timing is recorded only after a real References decision succeeds and is never used for reviewer scoring or publication authority.</p><div class="button-row">' +
    button('all','All backlog',state.items.length) +
    button('claim_first','CO claim-first',claimCount) +
    button('standard','ASA standard',standardCount) +
    '</div><p class="muted">Foreground-active time is a lower bound; elapsed wall time is an upper bound when source reading happens in another tab. Rejection rate is a correction-needed proxy, not proof of review quality.</p></section>';
}

function reviewMeasurementForQuestion(questionVersionId) {
  if (state.selectedKind !== 'references' ||
      state.targetType !== 'questions' ||
      !['claim_first', 'standard'].includes(state.referencesExperimentArm)) {
    return null;
  }
  const item = state.items.find(candidate => candidate?.question?.questionVersionId === questionVersionId);
  const arm = referencesWorkflowArm(item);
  if (!arm || arm.workflowMode !== state.referencesExperimentArm) return null;
  const timing = reviewTimingSnapshot();
  if (!timing) return null;
  return {
    ...timing,
    experimentId: arm.experimentId,
    workflowMode: arm.workflowMode,
    queueSize: filterReferencesWorkflowItems(state.items, arm.workflowMode).length
  };
}

document.addEventListener('visibilitychange', syncReviewTiming);
window.addEventListener('focus', syncReviewTiming);
window.addEventListener('blur', syncReviewTiming);

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

function safeReviewMediaUrl(value) {
  try {
    const parsed = new URL(String(value ?? ''));
    return parsed.protocol === 'https:' ? parsed.href : null;
  } catch {
    return null;
  }
}

function mediaReviewPanel(item) {
  const packet = item?.mediaReview;
  if (!packet || !Array.isArray(packet.media) || !packet.media.length) return '';

  const figures = packet.media.map((media, index) => {
    const url = safeReviewMediaUrl(media?.deliveryRef);
    const modality = escape(media?.modality || 'medical');
    const role = escape(media?.role || 'linked');
    const dimensions = media?.width && media?.height
      ? escape(String(media.width) + ' × ' + String(media.height))
      : 'unknown dimensions';
    const assetId = escape(media?.mediaAssetVersionId || 'unknown media');
    if (!url) {
      return '<div class="review-media-unavailable"><strong>Media unavailable</strong><span>' + assetId + '</span></div>';
    }
    return '<figure class="review-media-figure"><img src="' + escape(url) + '" alt="Review ' + modality + ' image ' + (index + 1) + '" loading="eager" decoding="async" referrerpolicy="no-referrer"><figcaption><strong>' + modality + '</strong><span>' + role + ' · ' + dimensions + '</span><small>' + assetId + '</small></figcaption></figure>';
  }).join('');

  const targetJson = escape(JSON.stringify(packet.target ?? [], null, 2));
  return '<section class="review-section review-media-section"><div class="section-heading"><div><span class="eyebrow">MEDIA-BOUND REVIEW</span><h3>Inspect the exact visual target</h3></div><span class="badge">' + escape(gateLabel(packet.reviewKind || state.selectedKind)) + '</span></div><div class="review-media-grid">' + figures + '</div><div class="review-target-fingerprint"><span>Current target SHA-256</span><code>' + escape(packet.targetSha256 || 'unavailable') + '</code></div><details class="review-media-target"><summary>Exact gate-bound media metadata</summary><pre>' + targetJson + '</pre></details><p class="muted">Your decision is bound to this current media-aware target. Inspect the image and gate-specific metadata before approving.</p></section>';
}
function gateLabel(kind) {
  return ({ medical: 'Medical accuracy', references: 'References', rights: 'Rights & provenance' })[kind] || kind;
}

function checklist(kind) {
  if (kind === 'medical' && state.targetType === 'neural-notes') {
    return '<ul><li>Medical statements are accurate for the stated scope.</li><li>Wording is clinically safe and appropriately qualified.</li><li>The note does not introduce unsupported claims or false precision.</li></ul>';
  }
  if (kind === 'medical') {
    return '<ul><li>Answer key is medically correct for the stated context.</li><li>Stem/options are unambiguous and clinically safe.</li><li>Explanation supports reasoning without introducing unsupported claims.</li></ul>';
  }
  if (kind === 'references') {
    return '<ul><li>Each material claim is supported by the cited source package.</li><li>Source identity/version is appropriate and current for the claim.</li><li>No important contradiction or scope mismatch is hidden.</li></ul>';
  }
  return '<ul><li>Provenance is accurate.</li><li>Source rights status matches the actual use: reuse rights are needed only when protected expression is copied/adapted; citation-only factual grounding must not reproduce protected text, tables, images, or other expressive material.</li><li>No recalled/licensed material is being represented as original.</li></ul>';
}

function pipelinePanel() {
  const pipeline = state.pipelineStatus;
  if (!pipeline) return '';

  const intake = pipeline.intake || {};
  const catalog = pipeline.catalog || {};
  const outstanding = pipeline.reviewOutstanding || {};
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;

  return `<section class="panel">
    <div class="section-heading"><div><span class="eyebrow">CONTENT PIPELINE</span><h2>Review backlog</h2></div><span class="badge">${escape(number(catalog.inReviewQuestions))} in review</span></div>
    <div class="review-metadata">
      <div><span>Medical pending</span><strong>${escape(number(outstanding.medical))}</strong></div>
      <div><span>References pending</span><strong>${escape(number(outstanding.references))}</strong></div>
      <div><span>Rights pending</span><strong>${escape(number(outstanding.rights))}</strong></div>
      <div><span>Published stable questions</span><strong>${escape(number(catalog.publishedStableQuestions))}</strong></div>
      <div><span>Staged questions</span><strong>${escape(number(intake.stagedQuestions))}</strong></div>
      <div><span>Promoted batches</span><strong>${escape(number(intake.promotedBatches))}</strong></div>
    </div>
    <p class="muted">Pipeline metrics are descriptive only. Intake publication authority: <strong>${pipeline.publicationAuthority === true ? 'enabled' : 'none'}</strong>. Semantic near-duplicate detection: <strong>${pipeline.semanticDuplicateDetection === true ? 'enabled' : 'not yet enabled'}</strong>.</p>
  </section>`;
}

function assistQuestion(questionVersionId) {
  const items = Array.isArray(state.reviewAssist?.questions) ? state.reviewAssist.questions : [];
  return items.find(item => item?.questionVersionId === questionVersionId) || null;
}

function assistSource(sourceId) {
  const items = Array.isArray(state.reviewAssist?.sourceEvidence) ? state.reviewAssist.sourceEvidence : [];
  return items.find(item => item?.sourceId === sourceId) || null;
}

function reviewAssistPanel(questionVersionId) {
  const packet = state.reviewAssist;
  const assist = assistQuestion(questionVersionId);
  const gate = assist?.[state.selectedKind];
  if (!assist || !gate) return '';

  const referenced = Array.isArray(gate.sourceIds)
    ? gate.sourceIds
    : Array.isArray(assist?.references?.sourceIds)
      ? assist.references.sourceIds
      : [];
  const sourceEvidence = Array.isArray(packet?.sourceEvidence)
    ? packet.sourceEvidence.filter(source => referenced.includes(source?.sourceId))
    : [];
  const rightsLinks = state.selectedKind === 'rights'
    ? sourceEvidence
        .filter(source => source?.rightsBasisUrl)
        .map(source => `<div>${sourceLink(source.rightsBasisUrl)}</div>`)
        .join('')
    : '';
  const draftButton = gate.draftNote
    ? `<button class="secondary" type="button" data-action="use-review-assist-note" data-question-version-id="${escape(questionVersionId)}">Use as draft note</button>`
    : '';

  return `<section class="review-section review-assist">
    <div class="section-heading"><div><span class="eyebrow">REVIEW ASSIST</span><h3>AI/source preflight</h3></div><span class="badge">Non-authoritative</span></div>
    <p><strong>${escape(gate.result || 'preflight')}</strong> · ${escape(gate.summary || 'No summary recorded.')}</p>
    ${rightsLinks}
    ${draftButton}
    <p class="muted">Generated ${escape(packet.generatedDate || 'unknown date')}. Draft text is editable and cannot approve, verify or publish content. Independently inspect the question and cited source before deciding this gate.</p>
  </section>`;
}

function signedOut() {
  return `<main id="main" class="review-page"><a class="text-button" href="/web/account.html">← Cloud account</a><div class="page-heading"><div><span class="eyebrow">CONTENT REVIEW</span><h1>Sign in before reviewing.</h1><p>The review workspace uses your existing Supabase account session. Reviewer identity and privileges are resolved server-side.</p></div><span class="badge">M04c</span></div><section class="panel"><h2>No review session</h2><p>Sign in on the Cloud account page, then return here. Learner accounts do not become reviewers automatically.</p><a class="primary action-link" href="/web/account.html">Open cloud account</a></section></main>`;
}

function unauthorized() {
  return `<main id="main" class="review-page"><a class="text-button" href="/web/account.html">← Cloud account</a><div class="page-heading"><div><span class="eyebrow">CONTENT REVIEW</span><h1>No reviewer grant.</h1><p>${escape(state.user?.email || 'Authenticated account')} is signed in, but has no medical, references, or rights review authority.</p></div><span class="badge">M04c</span></div><section class="panel"><h2>Fail closed by default.</h2><p>Reviewer privileges are assigned outside the learner UI. No content is exposed for review until an explicit server-side grant exists.</p></section></main>`;
}

function sourceCard(source, { allowResolve = true, impactCount = null } = {}) {
  const rights = source?.rights || {};
  const status = rights.status || 'unknown';
  const canResolve = allowResolve && state.selectedKind === 'rights' && status === 'unknown';
  const sourceAssist = assistSource(source?.sourceId);
  const draftEvidenceButton = canResolve && sourceAssist?.draftRightsEvidence
    ? `<button class="secondary" type="button" data-action="use-rights-assist-evidence" data-source-id="${escape(source?.sourceId || '')}">Use source-policy draft</button>`
    : '';
  const impact = Number.isFinite(Number(impactCount))
    ? `<span class="badge">${escape(Number(impactCount))} pending question${Number(impactCount) === 1 ? '' : 's'}</span>`
    : '';
  const form = canResolve ? `
    <form class="source-rights-form" data-source-id="${escape(source?.sourceId || '')}">
      <label>Rights outcome<select name="rightsStatus" required><option value="">Choose…</option><option value="citation_only">Citation / factual grounding only</option><option value="public_domain">Public domain</option><option value="licensed">Licensed</option><option value="owned">Owned</option><option value="restricted">Restricted / do not publish</option></select></label>
      <label>Rights evidence<textarea name="evidence" minlength="1" maxlength="4000" required placeholder="Record the policy, licence, ownership evidence, or restriction."></textarea></label>
      ${draftEvidenceButton}
      <button class="secondary" type="submit" ${state.submitting ? 'disabled' : ''}>Resolve source rights</button>
    </form>` : '';
  return `<article class="source-card"><div class="section-heading"><div><strong>${escape(source?.title || 'Untitled source')}</strong><p class="muted">${escape(source?.sourceId || 'unknown source')} · version ${escape(source?.version || '?')}</p></div>${impact}</div><dl><div><dt>Rights</dt><dd>${escape(status)}</dd></div><div><dt>Evidence</dt><dd>${escape(rights.evidence || 'None recorded')}</dd></div></dl><div>${sourceLink(source?.url)}</div>${form}</article>`;
}

function rightsSourceBacklogPanel() {
  if (state.selectedKind !== 'rights' || state.targetType !== 'questions' || state.loading || state.error) return '';

  const bySource = new Map();
  for (const item of state.items) {
    const questionVersionId = item?.question?.questionVersionId;
    for (const source of Array.isArray(item?.sources) ? item.sources : []) {
      const sourceId = source?.sourceId;
      if (!sourceId) continue;
      const current = bySource.get(sourceId) || { source, questionIds: new Set() };
      if (questionVersionId) current.questionIds.add(questionVersionId);
      bySource.set(sourceId, current);
    }
  }

  const unresolved = [...bySource.values()]
    .filter(entry => (entry.source?.rights?.status || 'unknown') === 'unknown')
    .sort((a, b) => b.questionIds.size - a.questionIds.size ||
      String(a.source?.sourceId || '').localeCompare(String(b.source?.sourceId || '')));

  if (!unresolved.length) {
    return `<section class="panel"><div class="section-heading"><div><span class="eyebrow">SOURCE-FIRST RIGHTS</span><h2>Source rights resolved</h2></div><span class="badge">0 unresolved sources</span></div><p class="muted">Proceed with question-level provenance and rights decisions. Source resolution never approves a question gate by itself.</p></section>`;
  }

  const impactedQuestions = new Set(unresolved.flatMap(entry => [...entry.questionIds]));
  return `<section class="panel"><div class="section-heading"><div><span class="eyebrow">SOURCE-FIRST RIGHTS</span><h2>Resolve unique sources before repeated question review</h2></div><span class="badge">${escape(unresolved.length)} unresolved source${unresolved.length === 1 ? '' : 's'}</span></div><p>${escape(impactedQuestions.size)} pending question${impactedQuestions.size === 1 ? '' : 's'} depend on these sources. Resolve each source once; question-level Rights & provenance approval still remains separate.</p><div class="source-list">${unresolved.map(entry => sourceCard(entry.source, { allowResolve: true, impactCount: entry.questionIds.size })).join('')}</div></section>`;
}

function questionSourcesHaveResolvedRights(item) {
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  return sources.length > 0 && sources.every(source => (source?.rights?.status || 'unknown') !== 'unknown');
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
    ${mediaReviewPanel(item)}\n    <section class="review-section"><h3>Explanation</h3><p>${escape(q.explanation || '')}</p></section>
    <div class="review-metadata"><div><span>Primary concept</span><strong>${escape(primary?.conceptId || 'Not linked')}</strong></div><div><span>Provenance</span><strong>${escape(provenance.kind || 'unknown')}</strong></div><div><span>Exam/year</span><strong>${escape(provenance.exam || 'N/A')} ${escape(provenance.year ?? '')}</strong></div></div>
    <section class="review-section"><h3>Provenance evidence</h3><p>${escape(provenance.evidence || '')}</p></section>
    <section class="review-section"><div class="section-heading"><h3>Referenced sources</h3><span class="badge">${sources.length}</span></div><div class="source-list">${sources.length ? sources.map(source => sourceCard(source, { allowResolve: state.selectedKind !== 'rights' })).join('') : '<p class="muted">No source package resolved.</p>'}</div></section>
    ${reviewAssistPanel(q.questionVersionId)}
    <section class="review-checklist"><h3>${escape(gateLabel(state.selectedKind))} check</h3>${checklist(state.selectedKind)}</section>
    <form class="review-decision-form" data-question-version-id="${escape(q.questionVersionId || '')}">
      <label>Review notes<textarea name="notes" minlength="1" maxlength="4000" required placeholder="Record the evidence for this decision. Avoid learner or patient information."></textarea></label>
      <div class="review-actions"><button class="secondary danger-outline" type="submit" name="decision" value="rejected" ${state.submitting ? 'disabled' : ''}>Reject version</button><button class="primary" type="submit" name="decision" value="approved" ${state.submitting || !rightsReady ? 'disabled' : ''}>Approve this gate</button></div>${!rightsReady ? '<p class="muted">Resolve every referenced source to owned, licensed, public domain, or citation-only factual grounding before approving the rights gate.</p>' : ''}
    </form>
  </article>`;
}

function noteReviewItem(item, index) {
  const note = item?.note || {};
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const rightsReady = state.selectedKind !== 'rights' ||
    sources.every(source => ['owned', 'licensed', 'public_domain', 'citation_only'].includes(source?.rights?.status));
  const provenance = note?.provenance || {};

  return `<article class="review-card">
    <div class="review-card-heading"><div><span class="eyebrow">NEURALVAULT TARGET ${index + 1}</span><h2>${escape(note.title || 'Untitled canonical note')}</h2><p class="muted">${escape(note.noteVersionId || '')} · concept ${escape(note.conceptId || '')} · v${escape(note.version || '?')}</p></div><span class="badge">${escape(gateLabel(state.selectedKind))}</span></div>
    <section class="review-section"><h3>Canonical note body</h3><pre class="vault-markdown">${escape(note.bodyMarkdown || '')}</pre></section>
    <div class="review-metadata"><div><span>Concept</span><strong>${escape(note.conceptId || 'Unknown')}</strong></div><div><span>Version</span><strong>${escape(note.version || '?')}</strong></div><div><span>Fingerprint</span><strong>${escape((note.contentSha256 || '').slice(0, 16))}…</strong></div></div>
    <section class="review-section"><h3>Provenance</h3><p><strong>${escape(provenance.kind || 'unknown')}</strong></p><p>${escape(provenance.evidence || 'No provenance evidence recorded.')}</p></section>
    <section class="review-section"><div class="section-heading"><h3>Referenced sources</h3><span class="badge">${sources.length}</span></div><div class="source-list">${sources.length ? sources.map(source => sourceCard(source, { allowResolve: state.selectedKind !== 'rights' })).join('') : '<p class="muted">No source package resolved.</p>'}</div></section>
    <section class="review-checklist"><h3>${escape(gateLabel(state.selectedKind))} check</h3>${checklist(state.selectedKind)}</section>
    <form class="review-decision-form" data-note-version-id="${escape(note.noteVersionId || '')}">
      <label>Review notes<textarea name="notes" minlength="1" maxlength="4000" required placeholder="Record the evidence for this decision. Avoid learner or patient information."></textarea></label>
      <div class="review-actions"><button class="secondary danger-outline" type="submit" name="decision" value="rejected" ${state.submitting ? 'disabled' : ''}>Reject version</button><button class="primary" type="submit" name="decision" value="approved" ${state.submitting || !rightsReady ? 'disabled' : ''}>Approve this gate</button></div>${!rightsReady ? '<p class="muted">Resolve every referenced source to owned, licensed, public domain, or citation-only factual grounding before approving the rights gate.</p>' : ''}
    </form>
  </article>`;
}

function authorized() {
  const kinds = state.grants;
  const referencesExperiment =
    state.selectedKind === 'references' &&
    state.targetType === 'questions' &&
    ['claim_first', 'standard'].includes(state.referencesExperimentArm);
  const experimentItems = referencesExperiment
    ? filterReferencesWorkflowItems(state.items, state.referencesExperimentArm)
    : state.items;
  const rightsSourceFirst = state.selectedKind === 'rights' && state.targetType === 'questions';
  const visibleItems = rightsSourceFirst
    ? experimentItems.filter(questionSourcesHaveResolvedRights)
    : experimentItems;
  const blockedByUnknownRights = rightsSourceFirst ? experimentItems.length - visibleItems.length : 0;
  const body = state.loading
    ? '<section class="panel"><p>Loading authorized review targets…</p></section>'
    : state.error
      ? `<section class="panel"><h2>Review queue unavailable</h2><p>${escape(state.error)}</p><button class="secondary" data-action="reload">Retry</button></section>`
      : visibleItems.length
        ? `${blockedByUnknownRights ? `<section class="panel"><p><strong>${escape(blockedByUnknownRights)}</strong> question decision${blockedByUnknownRights === 1 ? '' : 's'} hidden until every referenced source has a recorded rights status.</p></section>` : ''}<div class="review-list">${visibleItems.map(state.targetType === 'neural-notes' ? noteReviewItem : reviewItem).join('')}</div>`
        : state.items.length && rightsSourceFirst
          ? `<section class="panel empty"><h2>Resolve source rights first.</h2><p>${escape(blockedByUnknownRights)} question decision${blockedByUnknownRights === 1 ? '' : 's'} are intentionally hidden until their referenced sources have a recorded rights status. Source resolution does not approve any question.</p></section>`
          : '<section class="panel empty"><h2>No pending targets for this gate.</h2><p>Nothing is auto-approved. New content appears here only after it enters the in-review state.</p></section>';

  return `<main id="main" class="review-page"><a class="text-button" href="/web/account.html">← Cloud account</a><div class="page-heading"><div><span class="eyebrow">AUTHENTICATED CONTENT REVIEW</span><h1>Review one immutable version at a time.</h1><p>${escape(state.user?.email || 'Authenticated reviewer')} · decisions are timestamped and bound to the exact content/source target.</p></div><span class="badge">M04c</span></div>
  ${pipelinePanel()}
  <section class="panel reviewer-boundary"><div><h2>Review authority</h2><p>Approval here advances only this review gate. Three approvals produce <strong>verified</strong>, not published. Publication is a separate server-only transition.</p></div><div><label>Review target<select id="review-target"><option value="questions" ${state.targetType === 'questions' ? 'selected' : ''}>Questions</option><option value="neural-notes" ${state.targetType === 'neural-notes' ? 'selected' : ''}>NeuralVault canonical notes</option></select></label><label>Review gate<select id="review-kind">${kinds.map(kind => `<option value="${escape(kind)}" ${kind === state.selectedKind ? 'selected' : ''}>${escape(gateLabel(kind))}</option>`).join('')}</select></label></div></section>
  ${rightsSourceBacklogPanel()}
  ${referencesExperimentPanel()}
  ${state.selectedKind === 'references' && state.targetType === 'questions' && state.referencesExperimentArm !== 'standard' && !state.loading && !state.error ? referencesPanel(state.referencesWorkspace, state.referencesError) : ''}
  ${body}</main>`;
}

function render() {
  root.innerHTML = !state.user ? signedOut() : state.grants.length ? authorized() : unauthorized();
}

let queueGeneration = 0;
async function loadQueue(kind = state.selectedKind) {
  const generation = ++queueGeneration;
  if (!kind) return;
  state = { ...state, selectedKind: kind, loading: true, error: null, items: [], referencesWorkspace: null, referencesError: null };
  render();
  try {
    const queuePromise = state.targetType === 'neural-notes'
      ? review.noteQueue(kind)
      : review.queue(kind);
    const pipelinePromise = review.pipelineStatus().catch(error => {
      reportUnexpected(error, 'load_pipeline_status');
      return state.pipelineStatus;
    });
    const assistPromise = state.targetType === 'questions'
      ? fetch('/data/content-review-assist.json', { cache: 'no-store' })
          .then(response => response.ok ? response.json() : null)
          .catch(() => state.reviewAssist)
      : Promise.resolve(state.reviewAssist);
    const [result, pipelineStatus, reviewAssist] = await Promise.all([
      queuePromise,
      pipelinePromise,
      assistPromise
    ]);
    let referencesWorkspace = null;
    let referencesError = null;
    if (kind === 'references' && state.targetType === 'questions') {
      try {
        const response = await fetch('/data/evaluations/source-grounding-cdc-co-v1.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('grounding_pilot_unavailable');
        referencesWorkspace = await buildReferencesWorkspace(await response.json(), Array.isArray(result?.items) ? result.items : []);
      } catch (error) {
        referencesError = 'grounding_pilot_unavailable';
        reportUnexpected(error, 'load_references_workspace');
      }
    }
    if (generation !== queueGeneration) return;
    state = {
      ...state,
      referencesWorkspace,
      referencesError,
      loading: false,
      items: Array.isArray(result?.items) ? result.items : [],
      pipelineStatus,
      reviewAssist,
      error: null
    };
  } catch (error) {
    if (generation !== queueGeneration) return;
    reportUnexpected(error, 'load_queue');
    state = { ...state, loading: false, items: [], error: error.code || error.message || 'review_queue_unavailable' };
  }
  render();
  beginReviewTiming();
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
      state = { user: null, grants: [], selectedKind: null, targetType: 'questions', items: [], pipelineStatus: null, reviewAssist: null, referencesWorkspace: null, referencesError: null, referencesExperimentArm: 'all', loading: false, submitting: null, error: null };
    } else {
      reportUnexpected(error, 'load_reviewer_identity');
      state = { ...state, loading: false, error: error.code || error.message || 'review_authz_unavailable' };
    }
    render();
  }
}

root.addEventListener('change', event => {
  if (event.target.id === 'review-kind') {
    state.referencesExperimentArm = 'all';
    reviewTiming = null;
    loadQueue(event.target.value);
  }
  if (event.target.id === 'review-target') {
    state.targetType = event.target.value === 'neural-notes' ? 'neural-notes' : 'questions';
    state.referencesExperimentArm = 'all';
    reviewTiming = null;
    loadQueue(state.selectedKind);
  }
});

root.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  if (target.dataset.action === 'reload') {
    loadQueue();
    return;
  }

  if (target.dataset.action === 'references-experiment-arm') {
    const mode = target.dataset.mode;
    if (!['all', 'claim_first', 'standard'].includes(mode)) return;
    state.referencesExperimentArm = mode;
    render();
    beginReviewTiming();
    return;
  }

  if (target.dataset.action === 'use-review-assist-note') {
    const questionVersionId = target.dataset.questionVersionId;
    const gate = assistQuestion(questionVersionId)?.[state.selectedKind];
    const form = [...root.querySelectorAll('.review-decision-form')]
      .find(candidate => candidate.dataset.questionVersionId === questionVersionId);
    const textarea = form?.querySelector('textarea[name="notes"]');
    if (!textarea || !gate?.draftNote) return;
    if (textarea.value.trim()) {
      announce('Review notes already contain text. Clear them before applying the preflight draft.');
      return;
    }
    textarea.value = gate.draftNote;
    textarea.focus();
    announce('Preflight draft copied into review notes. Edit it after your independent review, then submit your own decision.');
    return;
  }

  if (target.dataset.action === 'use-rights-assist-evidence') {
    const sourceId = target.dataset.sourceId;
    const sourceDraft = assistSource(sourceId)?.draftRightsEvidence;
    const form = [...root.querySelectorAll('.source-rights-form')]
      .find(candidate => candidate.dataset.sourceId === sourceId);
    const textarea = form?.querySelector('textarea[name="evidence"]');
    if (!textarea || !sourceDraft) return;
    if (textarea.value.trim()) {
      announce('Rights evidence already contains text. Clear it before applying the source-policy draft.');
      return;
    }
    textarea.value = sourceDraft;
    textarea.focus();
    announce('Source-policy draft copied into rights evidence. Independently choose the rights outcome and submit it yourself.');
  }
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
  const noteVersionId = form.dataset.noteVersionId;
  const targetId = noteVersionId || questionVersionId;
  if (!notes || !targetId) { announce('Review notes are required.'); return; }
  const workflowMeasurement = noteVersionId ? null : reviewMeasurementForQuestion(questionVersionId);

  (async () => {
    state.submitting = targetId;
    setFormBusy(form, true);
    try {
      const receipt = noteVersionId
        ? await review.recordNote({
            noteVersionId,
            reviewKind: state.selectedKind,
            decision,
            notes
          })
        : await review.record({
            questionVersionId,
            reviewKind: state.selectedKind,
            decision,
            notes
          });
      if (workflowMeasurement) {
        try {
          await review.recordMeasurement({
            reviewId: receipt.reviewId,
            ...workflowMeasurement
          });
        } catch (measurementError) {
          reportUnexpected(measurementError, 'record_review_workflow_measurement');
        }
      }
      announce(`${decision === 'approved' ? 'Approved' : 'Rejected'} ${targetId} for ${gateLabel(state.selectedKind)}. Review receipt ${receipt.reviewId} recorded.`);
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

