import { buildReferencesWorkspace } from '/src/domain/references-workspace.js';
import { referencesSourceFocus, filterReferencesBySource } from '/src/domain/references-source-focus.js';
import { referencesPanel } from '/web/references-panel.js';
import { REFERENCES_WORKFLOW_BATCH_EXPERIMENT_V2, filterReferencesWorkflowItems } from '/src/domain/review-workflow-experiment.js';
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
  learnerReportGroups: [],
  learnerReportError: null,
  referencesWorkspace: null,
  referencesSourceId: null,
  referencesError: null,
  referencesExperimentArm: 'all',
  referencesBatchMeasurementSummary: null,
  referencesBatchMeasurementError: null,
  selectedTargetIds: [],
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

function formatDurationMs(value) {
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return seconds + 's';
  const minutes = Math.floor(seconds / 60);
  return minutes + 'm ' + String(seconds % 60).padStart(2, '0') + 's';
}

function referencesWorkflowSummary(workflowMode) {
  const workflows = state.referencesBatchMeasurementSummary?.workflows;
  return Array.isArray(workflows)
    ? workflows.find(item => item?.workflowMode === workflowMode) || null
    : null;
}

function referencesWorkflowCard(config) {
  const summary = referencesWorkflowSummary(config.workflowMode);
  const decisions = Number(summary?.decisions || 0);
  const expected = Number(config.expectedQuestionCount || 0);
  const rejected = Number(summary?.rejected || 0);
  const rejectionRate = Number(summary?.rejectionRate);
  const rejectionText = decisions && Number.isFinite(rejectionRate)
    ? Math.round(rejectionRate * 100) + '% (' + rejected + ')'
    : rejected + '';
  return '<article class="source-card review-pilot-arm" data-workflow-mode="' + escape(config.workflowMode) + '">' +
    '<div class="section-heading"><div><h3>' + escape(config.label) + '</h3><p class="muted">' +
    escape(config.sourceId) + '</p></div><span class="badge">' + escape(decisions) + ' / ' +
    escape(expected) + ' decisions</span></div>' +
    '<div class="review-metadata">' +
      '<div><span>Batch foreground-active</span><strong>' + escape(formatDurationMs(summary?.foregroundActiveMs)) + '</strong></div>' +
      '<div><span>Batch elapsed wall</span><strong>' + escape(formatDurationMs(summary?.elapsedWallMs)) + '</strong></div>' +
      '<div><span>Rejection proxy</span><strong>' + escape(rejectionText || '0') + '</strong></div>' +
      '<div><span>Measured decisions</span><strong>' + escape(decisions) + '</strong></div>' +
    '</div></article>';
}

function referencesExperimentPanel() {
  if (state.selectedKind !== 'references' || state.targetType !== 'questions' || state.loading || state.error) return '';
  const experiment = REFERENCES_WORKFLOW_BATCH_EXPERIMENT_V2;
  const claimCount = filterReferencesWorkflowItems(state.items, experiment.treatment.workflowMode).length;
  const standardCount = filterReferencesWorkflowItems(state.items, experiment.comparator.workflowMode).length;
  const button = (mode, label, count) =>
    '<button class="' + (state.referencesExperimentArm === mode ? 'primary' : 'secondary') +
    '" type="button" data-action="references-experiment-arm" data-mode="' + mode + '">' +
    escape(label) + ' · ' + escape(count) + ' pending</button>';

  const treatment = referencesWorkflowSummary(experiment.treatment.workflowMode);
  const comparator = referencesWorkflowSummary(experiment.comparator.workflowMode);
  const complete =
    Number(treatment?.decisions || 0) >= experiment.treatment.expectedQuestionCount &&
    Number(comparator?.decisions || 0) >= experiment.comparator.expectedQuestionCount;
  const summaryState = state.referencesBatchMeasurementError
    ? '<p class="muted"><strong>Batch measurement summary unavailable.</strong> Review remains usable and no prior summary is reused.</p>'
    : '<div class="source-list">' +
        referencesWorkflowCard(experiment.treatment) +
        referencesWorkflowCard(experiment.comparator) +
      '</div>' +
      (complete
        ? '<p><strong>Both arms are complete.</strong> Compare timing bounds and correction/rejection signals together before deciding whether persistent M02c claim/passage infrastructure is justified. No winner is inferred automatically.</p>'
        : '<p class="muted">Pilot results remain incomplete. Do not interpret partial timing as a workflow verdict.</p>');

  return '<section class="panel review-measurement-panel">' +
    '<div class="section-heading"><div><span class="eyebrow">M02C REVIEW-WORKFLOW PILOT V2</span>' +
    '<h2>Two-session atomic comparison</h2></div><span class="badge">Descriptive only · not causal</span></div>' +
    '<p>Inspect one seven-question arm at a time. Each item keeps its own approve/reject choice and immutable review receipt; one final human attestation submits the whole arm atomically and records one timing session.</p>' +
    '<div class="button-row">' +
      button('all','All backlog',state.items.length) +
      button(experiment.treatment.workflowMode,experiment.treatment.label,claimCount) +
      button(experiment.comparator.workflowMode,experiment.comparator.label,standardCount) +
    '</div>' + summaryState +
    '<p class="muted">Foreground-active time is a lower bound; elapsed wall time is an upper bound when source reading happens in another tab. Batch submission removes repetitive form overhead only. Rejection rate remains a correction-needed proxy, not proof of review quality.</p>' +
    '</section>';
}

function referencesBatchReviewPanel(items) {
  if (state.selectedKind !== 'references' ||
      state.targetType !== 'questions' ||
      !['claim_first', 'standard'].includes(state.referencesExperimentArm) ||
      state.loading ||
      state.error) return '';

  const experiment = REFERENCES_WORKFLOW_BATCH_EXPERIMENT_V2;
  const config = state.referencesExperimentArm === experiment.treatment.workflowMode
    ? experiment.treatment
    : experiment.comparator;
  const armItems = filterReferencesWorkflowItems(items, state.referencesExperimentArm);
  if (armItems.length !== config.expectedQuestionCount) {
    return '<section class="panel"><h2>Batch arm unavailable.</h2><p class="muted">This arm no longer has exactly ' +
      escape(config.expectedQuestionCount) +
      ' pending targets. Reload the queue; no partial batch can be submitted.</p></section>';
  }

  const rows = armItems.map(item => {
    const q = item?.question || {};
    const questionVersionId = q.questionVersionId || '';
    const draft = assistQuestion(questionVersionId)?.references?.draftNote || '';
    return '<fieldset class="batch-review-row" data-question-version-id="' + escape(questionVersionId) + '">' +
      '<legend>' + escape(questionVersionId) + '</legend>' +
      '<p>' + escape(q.stem || '') + '</p>' +
      '<label>Decision<select name="decision" required><option value="">Choose after review…</option>' +
        '<option value="approved">Approve References</option><option value="rejected">Reject References</option></select></label>' +
      '<label>References notes<textarea name="notes" minlength="1" maxlength="4000" required>' +
        escape(draft) + '</textarea></label>' +
      '</fieldset>';
  }).join('');

  return '<section class="panel review-batch-panel"><div class="section-heading"><div><span class="eyebrow">ATOMIC HUMAN REVIEW</span>' +
    '<h2>' + escape(config.label) + ' · 7 decisions, 1 submission</h2></div><span class="badge">No automatic approval</span></div>' +
    '<p>Inspect the source and all seven exact targets above. Choose each item independently. The database writes all seven immutable References receipts or none.</p>' +
    '<form class="references-batch-review-form" data-workflow-mode="' + escape(config.workflowMode) + '">' +
      rows +
      '<label class="review-attestation"><input type="checkbox" name="attested" required> I independently inspected this source and all seven exact targets, and each selected decision and note reflects my own References judgment.</label>' +
      '<div class="review-actions"><button class="primary" type="submit" ' + (state.submitting ? 'disabled' : '') + '>Submit 7 References decisions atomically</button></div>' +
      '<p class="muted">This records review evidence only. It cannot publish content or approve Medical/Rights gates.</p>' +
    '</form></section>';
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
  const draftButton = '';

  return `<section class="review-section review-assist">
    <div class="section-heading"><div><span class="eyebrow">REVIEW ASSIST</span><h3>AI/source preflight</h3></div><span class="badge">Non-authoritative</span></div>
    <p><strong>${escape(gate.result || 'preflight')}</strong> · ${escape(gate.summary || 'No summary recorded.')}</p>
    ${rightsLinks}
    ${draftButton}
    <p class="muted">Generated ${escape(packet.generatedDate || 'unknown date')}. Draft text is editable and cannot approve, verify or publish content. Independently inspect the question and cited source before deciding this gate.</p>
  </section>`;
}

function fullQuestionReviewBundlePanel(question, rightsReady) {
  const questionVersionId = question?.questionVersionId;
  const reviews = Array.isArray(question?.reviews) ? question.reviews : [];
  const assist = assistQuestion(questionVersionId);
  const allGrants = ['medical', 'references', 'rights'].every(kind => state.grants.includes(kind));
  const inMeasuredReferencesArm =
    state.selectedKind === 'references' &&
    ['claim_first', 'standard'].includes(state.referencesExperimentArm);
  if (!questionVersionId || reviews.length || !allGrants || !rightsReady || inMeasuredReferencesArm) return '';
  const drafts = {
    medical: assist?.medical?.draftNote,
    references: assist?.references?.draftNote,
    rights: assist?.rights?.draftNote
  };
  if (!drafts.medical || !drafts.references || !drafts.rights) return '';

  return `<section class="review-section full-review-bundle">
    <div class="section-heading"><div><span class="eyebrow">FULL REVIEW BUNDLE</span><h3>One click · three immutable gate receipts</h3></div><span class="badge">Human decision required</span></div>
    <p>Use this only after independently checking the clinical answer, source support, and rights/provenance for this exact version. No text entry is required. If any gate should fail, use the gate-specific Reject button instead.</p>
    <details><summary>Read the three preflight summaries</summary>
      <p><strong>Medical:</strong> ${escape(assist?.medical?.summary || '')}</p>
      <p><strong>References:</strong> ${escape(assist?.references?.summary || '')}</p>
      <p><strong>Rights:</strong> ${escape(assist?.rights?.summary || '')}</p>
    </details>
    <form class="full-question-review-form" data-question-version-id="${escape(questionVersionId)}">
      <label class="review-attestation"><input type="checkbox" name="attested" required> I independently inspected this exact question and its cited evidence for all three gates.</label>
      <div class="review-actions"><button class="primary" type="submit" ${state.submitting ? 'disabled' : ''}>Approve all 3 gates</button></div>
      <p class="muted">The stored gate notes come from the review-assist packet and remain bound to the exact fingerprints. This does not publish content.</p>
    </form>
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

function referencesSourcePanel() {
  if (state.selectedKind !== 'references' || state.loading || state.error ||
      state.referencesExperimentArm !== 'all') return '';
  const groups = referencesSourceFocus(state.items);
  if (!groups.length) return '';
  const selected = groups.find(group => group.source.sourceId === state.referencesSourceId);
  const option = (sourceId, label, count) =>
    '<button type="button" class="' + (state.referencesSourceId === sourceId ? 'primary' : 'secondary') +
    '" data-action="references-source-focus" data-source-id="' + escape(sourceId || '') + '">' +
    escape(label) + ' · ' + escape(count) + '</button>';
  return '<section class="panel references-source-panel"><div class="section-heading"><div><span class="eyebrow">SOURCE-FOCUSED REFERENCES</span>' +
    '<h2>Inspect a source once, then its linked targets</h2></div><span class="badge">' +
    escape(groups.length) + ' unique source versions</span></div>' +
    '<p>Choose a source to narrow the queue. Its original page and version are shown here; then check each question or note for exact claim support, wording, and scope. Switching sources records no decision.</p>' +
    '<div class="button-row">' + option('', 'All targets', state.items.length) +
    groups.map(group => option(group.source.sourceId, group.source.title || group.source.sourceId, group.targetIds.length)).join('') +
    '</div>' + (selected ? '<div class="source-list">' + sourceCard(selected.source, { allowResolve: false, impactCount: selected.targetIds.length }) + '</div>' : '') +
    '<p class="muted">Shared inspection is not shared approval. Each target still needs its own authenticated References decision; Medical, Rights, and publication stay separate.</p></section>';
}

function reviewTargetIdentity(item) {
  if (state.targetType === 'neural-notes') {
    return item?.note?.noteVersionId || item?.note?.id || null;
  }
  return item?.question?.questionVersionId || null;
}

function reviewTargetType() {
  return state.targetType === 'neural-notes' ? 'neural_note_version' : 'question_version';
}

function itemRightsReady(item) {
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  return sources.length > 0 &&
    sources.every(source => ['owned', 'licensed', 'public_domain', 'citation_only'].includes(source?.rights?.status));
}

function defaultRejectReason() {
  if (state.selectedKind === 'medical') return 'needs_medical_correction';
  if (state.selectedKind === 'references') return 'reference_support_insufficient';
  return 'rights_or_provenance_problem';
}

function itemRightsResolved(item) {
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  return sources.length > 0 &&
    sources.every(source => (source?.rights?.status || 'unknown') !== 'unknown');
}

function currentReviewItems(decision = null) {
  const referencesExperiment =
    state.selectedKind === 'references' &&
    state.targetType === 'questions' &&
    ['claim_first', 'standard'].includes(state.referencesExperimentArm);
  const experimentItems = referencesExperiment
    ? filterReferencesWorkflowItems(state.items, state.referencesExperimentArm)
    : state.items;
  const focusedItems = state.selectedKind === 'references' && !referencesExperiment
    ? filterReferencesBySource(experimentItems, state.referencesSourceId)
    : experimentItems;
  if (state.selectedKind !== 'rights') return focusedItems;
  const resolved = focusedItems.filter(itemRightsResolved);
  return decision === 'approved' ? resolved.filter(itemRightsReady) : resolved;
}

function superApprovalEligible(item) {
  if (state.targetType !== 'questions') return false;
  if (Array.isArray(item?.mediaReview?.media) && item.mediaReview.media.length) return false;
  if (state.selectedKind === 'rights' && !itemRightsReady(item)) return false;
  const questionVersionId = item?.question?.questionVersionId;
  const assist = assistQuestion(questionVersionId);
  if (!assist) return false;
  if (state.selectedKind === 'medical') {
    return assist?.medical?.result === 'supported' && assist?.medical?.uncertainty === 'low';
  }
  if (state.selectedKind === 'references') {
    return assist?.references?.result === 'direct_support';
  }
  return ['citation_only_recommended','citation_only_supported','public_domain_recommended','public_domain_supported']
    .includes(assist?.rights?.result);
}

function superApprovalItems() {
  return currentReviewItems('approved').filter(superApprovalEligible);
}

function structuredReviewControls(item) {
  if (state.selectedKind === 'references' &&
      ['claim_first', 'standard'].includes(state.referencesExperimentArm)) return '';
  const targetId = reviewTargetIdentity(item);
  if (!targetId) return '';
  const rightsReady = state.selectedKind !== 'rights' || itemRightsReady(item);
  const checked = state.selectedTargetIds.includes(targetId) ? 'checked' : '';
  return `<section class="review-section structured-review-controls">
    <div class="section-heading"><div><span class="eyebrow">ZERO-TYPING REVIEW</span><h3>Decision</h3></div>
      <label><input type="checkbox" class="review-select" data-target-id="${escape(targetId)}" ${checked}> Select</label>
    </div>
    <div class="review-actions">
      <button class="secondary danger-outline" type="button" data-action="quick-structured-review" data-target-id="${escape(targetId)}" data-decision="rejected" ${state.submitting ? 'disabled' : ''}>Reject</button>
      <button class="primary" type="button" data-action="quick-structured-review" data-target-id="${escape(targetId)}" data-decision="approved" ${state.submitting || !rightsReady ? 'disabled' : ''}>Approve</button>
    </div>
    ${!rightsReady ? '<p class="muted">Resolve source rights before approval. Rejection remains available.</p>' : ''}
    <p class="muted">No text entry required. Clicking a decision confirms you inspected this exact target for the selected gate; the server generates the audit note.</p>
  </section>`;
}

function masterReviewPanel() {
  if (state.loading || state.error ||
      (state.selectedKind === 'references' &&
       ['claim_first', 'standard'].includes(state.referencesExperimentArm))) return '';
  const reviewableItems = currentReviewItems('rejected');
  const reviewableIds = reviewableItems.map(reviewTargetIdentity).filter(Boolean);
  if (!reviewableIds.length) return '';
  const approvableIds = new Set(currentReviewItems('approved').map(reviewTargetIdentity).filter(Boolean));
  const superApproveIds = superApprovalItems().map(reviewTargetIdentity).filter(Boolean);
  const selected = state.selectedTargetIds.filter(id => reviewableIds.includes(id));
  const selectedAllApprovable = selected.length > 0 && selected.every(id => approvableIds.has(id));
  return `<section class="panel master-review-panel">
    <div class="section-heading"><div><span class="eyebrow">MASTER REVIEW</span>
      <h2>Bulk decision controls</h2></div><span class="badge">${escape(reviewableIds.length)} reviewable · ${escape(selected.length)} selected</span></div>
    <p>Bulk actions affect only the current <strong>${escape(gateLabel(state.selectedKind))}</strong> gate and never publish content. Every target still receives its own immutable review receipt.</p>
    <div class="button-row">
      <button class="secondary" type="button" data-action="select-all-review">Select all reviewable</button>
      <button class="secondary" type="button" data-action="clear-review-selection">Clear selection</button>
      <button class="primary" type="button" data-action="master-review-selected" data-decision="approved" ${selectedAllApprovable ? '' : 'disabled'}>Approve selected</button>
      <button class="secondary danger-outline" type="button" data-action="master-review-selected" data-decision="rejected" ${selected.length ? '' : 'disabled'}>Reject selected</button>
    </div>
    <div class="button-row">
      <button class="primary" type="button" data-action="master-review-all" data-decision="approved" ${superApproveIds.length ? '' : 'disabled'}>Super approve ${escape(superApproveIds.length)} preflight-clean</button>
      <button class="secondary danger-outline" type="button" data-action="master-review-all" data-decision="rejected">Super reject all ${escape(reviewableIds.length)} reviewable</button>
    </div>
    <label class="review-attestation"><input id="master-review-attested" type="checkbox"> I inspected the targets I am about to decide and accept one gate-level decision per exact target.</label>
    <p class="muted">For heterogeneous or large queues, select a reviewed subset instead of using the super action. The batch is atomic: if any target changed or became ineligible, nothing is partially committed.</p>
  </section>`;
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
  const rightsReady = state.selectedKind !== 'rights' || itemRightsReady(item);

  return `<article class="review-card">
    <div class="review-card-heading"><div><span class="eyebrow">TARGET ${index + 1}</span><h2>${escape(q.questionVersionId || 'Unknown version')}</h2></div><span class="badge">${escape(gateLabel(state.selectedKind))}</span></div>
    <section class="review-section"><h3>Question</h3><p class="review-stem">${escape(q.stem || '')}</p><ol class="review-options">${options.map(option => `<li class="${option?.optionId === q.answerOptionId ? 'review-answer' : ''}"><span>${escape(option?.optionId || '')}</span>${escape(option?.text || '')}${option?.optionId === q.answerOptionId ? '<strong>Key</strong>' : ''}</li>`).join('')}</ol></section>
    ${mediaReviewPanel(item)}
    <section class="review-section"><h3>Explanation</h3><p>${escape(q.explanation || '')}</p></section>
    <div class="review-metadata"><div><span>Primary concept</span><strong>${escape(primary?.conceptId || 'Not linked')}</strong></div><div><span>Provenance</span><strong>${escape(provenance.kind || 'unknown')}</strong></div><div><span>Exam/year</span><strong>${escape(provenance.exam || 'N/A')} ${escape(provenance.year ?? '')}</strong></div></div>
    <section class="review-section"><h3>Provenance evidence</h3><p>${escape(provenance.evidence || '')}</p></section>
    <section class="review-section"><div class="section-heading"><h3>Referenced sources</h3><span class="badge">${sources.length}</span></div><div class="source-list">${sources.length ? sources.map(source => sourceCard(source, { allowResolve: state.selectedKind !== 'rights' })).join('') : '<p class="muted">No source package resolved.</p>'}</div></section>
    ${reviewAssistPanel(q.questionVersionId)}
    ${fullQuestionReviewBundlePanel(q, rightsReady)}
    <section class="review-checklist"><h3>${escape(gateLabel(state.selectedKind))} check</h3>${checklist(state.selectedKind)}</section>
    ${state.selectedKind === 'references' && ['claim_first', 'standard'].includes(state.referencesExperimentArm)
      ? '<p class="muted">Decision controls for this measured arm are consolidated in the atomic batch form below.</p>'
      : structuredReviewControls(item)}
  </article>`;
}

function noteReviewItem(item, index) {
  const note = item?.note || {};
  const sources = Array.isArray(item?.sources) ? item.sources : [];
  const provenance = note?.provenance || {};

  return `<article class="review-card">
    <div class="review-card-heading"><div><span class="eyebrow">NEURALVAULT TARGET ${index + 1}</span><h2>${escape(note.title || 'Untitled canonical note')}</h2><p class="muted">${escape(note.noteVersionId || '')} · concept ${escape(note.conceptId || '')} · v${escape(note.version || '?')}</p></div><span class="badge">${escape(gateLabel(state.selectedKind))}</span></div>
    <section class="review-section"><h3>Canonical note body</h3><pre class="vault-markdown">${escape(note.bodyMarkdown || '')}</pre></section>
    <div class="review-metadata"><div><span>Concept</span><strong>${escape(note.conceptId || 'Unknown')}</strong></div><div><span>Version</span><strong>${escape(note.version || '?')}</strong></div><div><span>Fingerprint</span><strong>${escape((note.contentSha256 || '').slice(0, 16))}…</strong></div></div>
    <section class="review-section"><h3>Provenance</h3><p><strong>${escape(provenance.kind || 'unknown')}</strong></p><p>${escape(provenance.evidence || 'No provenance evidence recorded.')}</p></section>
    <section class="review-section"><div class="section-heading"><h3>Referenced sources</h3><span class="badge">${sources.length}</span></div><div class="source-list">${sources.length ? sources.map(source => sourceCard(source, { allowResolve: state.selectedKind !== 'rights' })).join('') : '<p class="muted">No source package resolved.</p>'}</div></section>
    <section class="review-checklist"><h3>${escape(gateLabel(state.selectedKind))} check</h3>${checklist(state.selectedKind)}</section>
    ${structuredReviewControls(item)}
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
  const focusedItems = state.selectedKind === 'references' && !referencesExperiment
    ? filterReferencesBySource(experimentItems, state.referencesSourceId)
    : experimentItems;
  const rightsSourceFirst = state.selectedKind === 'rights' && state.targetType === 'questions';
  const visibleItems = rightsSourceFirst
    ? focusedItems.filter(questionSourcesHaveResolvedRights)
    : focusedItems;
  const blockedByUnknownRights = rightsSourceFirst ? focusedItems.length - visibleItems.length : 0;
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
  ${learnerReportPanel()}
  <section class="panel reviewer-boundary"><div><h2>Review authority</h2><p>Approval here advances only this review gate. Three approvals produce <strong>verified</strong>, not published. Publication is a separate server-only transition.</p></div><div><label>Review target<select id="review-target"><option value="questions" ${state.targetType === 'questions' ? 'selected' : ''}>Questions</option><option value="neural-notes" ${state.targetType === 'neural-notes' ? 'selected' : ''}>NeuralVault canonical notes</option></select></label><label>Review gate<select id="review-kind">${kinds.map(kind => `<option value="${escape(kind)}" ${kind === state.selectedKind ? 'selected' : ''}>${escape(gateLabel(kind))}</option>`).join('')}</select></label></div></section>
  ${rightsSourceBacklogPanel()}
  ${referencesExperimentPanel()}
  ${referencesSourcePanel()}
  ${state.selectedKind === 'references' && state.targetType === 'questions' && state.referencesExperimentArm !== 'standard' && !state.loading && !state.error ? referencesPanel(state.referencesWorkspace, state.referencesError) : ''}
  ${masterReviewPanel()}
  ${body}
  ${referencesBatchReviewPanel(state.items)}</main>`;
}

function render() {
  root.innerHTML = !state.user ? signedOut() : state.grants.length ? authorized() : unauthorized();
}

let queueGeneration = 0;
async function loadQueue(kind = state.selectedKind) {
  const generation = ++queueGeneration;
  if (!kind) return;
  state = { ...state, selectedKind: kind, loading: true, error: null, items: [], referencesWorkspace: null, referencesError: null, referencesBatchMeasurementSummary: null, referencesBatchMeasurementError: null, selectedTargetIds: [] };
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
    const learnerReportsPromise = review.learnerReports()
      .then(result => ({ result, error: null }))
      .catch(error => {
        reportUnexpected(error, 'load_learner_report_triage');
        return { result: null, error: error.code || error.message || 'learner_report_queue_unavailable' };
      });
    const [result, pipelineStatus, reviewAssist, learnerReportsState] = await Promise.all([
      queuePromise,
      pipelinePromise,
      assistPromise,
      learnerReportsPromise
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
    let referencesMeasurementSummary = null;
    let referencesMeasurementError = null;
    let referencesBatchMeasurementSummary = null;
    let referencesBatchMeasurementError = null;
    if (kind === 'references' && state.targetType === 'questions') {
      try {
        const summary = await review.batchMeasurementSummary(REFERENCES_WORKFLOW_BATCH_EXPERIMENT_V2.experimentId);
        if (summary?.contractId !== 'content-review-workflow-batch-measurement-summary-v1' ||
            summary?.experimentId !== REFERENCES_WORKFLOW_BATCH_EXPERIMENT_V2.experimentId ||
            summary?.causal !== false ||
            !Array.isArray(summary?.workflows)) {
          throw new Error('review_batch_measurement_summary_invalid');
        }
        referencesBatchMeasurementSummary = summary;
      } catch (error) {
        referencesBatchMeasurementError = 'review_batch_measurement_summary_unavailable';
        reportUnexpected(error, 'load_review_batch_measurement_summary');
      }
    }
    if (generation !== queueGeneration) return;
    const items = Array.isArray(result?.items) ? result.items : [];
    const sourceStillPresent = referencesSourceFocus(items).some(group => group.source.sourceId === state.referencesSourceId);
    state = {
      ...state,
      referencesSourceId: sourceStillPresent ? state.referencesSourceId : null,
      referencesWorkspace,
      referencesError,
      referencesBatchMeasurementSummary,
      referencesBatchMeasurementError,
      loading: false,
      items,
      pipelineStatus,
      reviewAssist,
      learnerReportGroups: Array.isArray(learnerReportsState.result?.groups)
        ? learnerReportsState.result.groups
        : [],
      learnerReportError: learnerReportsState.error,
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
      state = { user: null, grants: [], selectedKind: null, targetType: 'questions', items: [], pipelineStatus: null, reviewAssist: null, learnerReportGroups: [], learnerReportError: null, referencesWorkspace: null, referencesError: null, referencesExperimentArm: 'all', referencesBatchMeasurementSummary: null, referencesBatchMeasurementError: null, selectedTargetIds: [], loading: false, submitting: null, error: null };
    } else {
      reportUnexpected(error, 'load_reviewer_identity');
      state = { ...state, loading: false, error: error.code || error.message || 'review_authz_unavailable' };
    }
    render();
  }
}

root.addEventListener('change', event => {
  const reviewSelect = event.target.closest?.('.review-select');
  if (reviewSelect) {
    const targetId = reviewSelect.dataset.targetId;
    if (!targetId) return;
    const selected = new Set(state.selectedTargetIds);
    if (reviewSelect.checked) selected.add(targetId);
    else selected.delete(targetId);
    state.selectedTargetIds = [...selected];
    render();
    return;
  }
  if (event.target.id === 'review-kind') {
    state.referencesExperimentArm = 'all';
    state.referencesSourceId = null;
    reviewTiming = null;
    loadQueue(event.target.value);
  }
  if (event.target.id === 'review-target') {
    state.targetType = event.target.value === 'neural-notes' ? 'neural-notes' : 'questions';
    state.referencesExperimentArm = 'all';
    state.referencesSourceId = null;
    reviewTiming = null;
    loadQueue(state.selectedKind);
  }
});

async function submitStructuredReview(targetIds, decision, { requireMasterAttestation = false, label = 'review' } = {}) {
  const ids = [...new Set((Array.isArray(targetIds) ? targetIds : []).filter(Boolean))];
  if (!ids.length) {
    announce('No review targets are selected.');
    return;
  }
  if (!['approved', 'rejected'].includes(decision)) return;
  if (requireMasterAttestation) {
    const attested = root.querySelector('#master-review-attested')?.checked === true;
    if (!attested) {
      announce('Confirm the master-review inspection attestation first.');
      return;
    }
    const verb = decision === 'approved' ? 'approve' : 'reject';
    if (!globalThis.confirm(`${verb.toUpperCase()} ${ids.length} target${ids.length === 1 ? '' : 's'} for the current ${gateLabel(state.selectedKind)} gate? This creates immutable review receipts and cannot be undone.`)) {
      return;
    }
  }

  const reasonCode = decision === 'approved' ? 'human_reviewed_no_issue' : defaultRejectReason();
  state.submitting = label;
  render();
  try {
    const receipt = await review.recordStructuredBatch({
      targetType: reviewTargetType(),
      targetIds: ids,
      reviewKind: state.selectedKind,
      decision,
      reasonCode,
      attested: true
    });
    announce(`${decision === 'approved' ? 'Approved' : 'Rejected'} ${receipt.decisionCount} target${receipt.decisionCount === 1 ? '' : 's'} for ${gateLabel(state.selectedKind)}. Separate immutable receipts were recorded; nothing was published.`);
    state.selectedTargetIds = [];
    state.submitting = null;
    await loadQueue(state.selectedKind);
  } catch (error) {
    reportUnexpected(error, 'record_structured_review');
    state.submitting = null;
    render();
    announce(`Review was not recorded: ${error.code || error.message || 'structured_review_write_failed'}. The batch is atomic, so no partial decision was committed.`);
  }
}

root.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  if (target.dataset.action === 'reload') {
    loadQueue();
    return;
  }

  if (target.dataset.action === 'select-all-review') {
    state.selectedTargetIds = currentReviewItems('rejected').map(reviewTargetIdentity).filter(Boolean);
    render();
    return;
  }

  if (target.dataset.action === 'clear-review-selection') {
    state.selectedTargetIds = [];
    render();
    return;
  }

  if (target.dataset.action === 'quick-structured-review') {
    const targetId = target.dataset.targetId;
    const decision = target.dataset.decision;
    submitStructuredReview([targetId], decision, { label: targetId || 'quick-review' });
    return;
  }

  if (target.dataset.action === 'master-review-selected') {
    const decision = target.dataset.decision;
    const eligibleItems = currentReviewItems(decision);
    const eligibleIds = new Set(eligibleItems.map(reviewTargetIdentity).filter(Boolean));
    const selectedReviewable = state.selectedTargetIds.filter(id =>
      currentReviewItems('rejected').map(reviewTargetIdentity).filter(Boolean).includes(id)
    );
    if (decision === 'approved' && selectedReviewable.some(id => !eligibleIds.has(id))) {
      announce('At least one selected target is not approvable for this gate. Resolve its blocking condition or deselect it.');
      return;
    }
    const selected = selectedReviewable.filter(id => eligibleIds.has(id));
    submitStructuredReview(selected, decision, {
      requireMasterAttestation: true,
      label: 'master-selected-review'
    });
    return;
  }

  if (target.dataset.action === 'master-review-all') {
    const decision = target.dataset.decision;
    const ids = decision === 'approved'
      ? superApprovalItems().map(reviewTargetIdentity).filter(Boolean)
      : currentReviewItems('rejected').map(reviewTargetIdentity).filter(Boolean);
    submitStructuredReview(ids, decision, {
      requireMasterAttestation: true,
      label: 'master-all-review'
    });
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

  if (target.dataset.action === 'references-source-focus') {
    const sourceId = target.dataset.sourceId || null;
    if (sourceId && !referencesSourceFocus(state.items).some(group => group.source.sourceId === sourceId)) return;
    state.referencesSourceId = sourceId;
    render();
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
  const batchForm = event.target.closest('.references-batch-review-form');
  if (batchForm) {
    event.preventDefault();
    const rows = [...batchForm.querySelectorAll('.batch-review-row')];
    const timing = reviewTimingSnapshot();
    if (rows.length !== 7 || !timing) {
      announce('This References batch is not ready. Reload the selected pilot arm.');
      return;
    }
    const questionVersionIds = [];
    const decisions = [];
    const notes = [];
    for (const row of rows) {
      const questionVersionId = row.dataset.questionVersionId;
      const decision = row.querySelector('select[name="decision"]')?.value || '';
      const note = row.querySelector('textarea[name="notes"]')?.value.trim() || '';
      if (!questionVersionId || !['approved', 'rejected'].includes(decision) || !note) {
        announce('Choose approve/reject and keep a review note for all seven targets before submitting.');
        return;
      }
      questionVersionIds.push(questionVersionId);
      decisions.push(decision);
      notes.push(note);
    }
    const attested = batchForm.querySelector('input[name="attested"]')?.checked === true;
    if (!attested) {
      announce('The independent-review attestation is required.');
      return;
    }

    (async () => {
      state.submitting = 'references-batch-' + batchForm.dataset.workflowMode;
      setFormBusy(batchForm, true);
      try {
        const receipt = await review.recordReferencesBatch({
          questionVersionIds,
          decisions,
          notes,
          experimentId: REFERENCES_WORKFLOW_BATCH_EXPERIMENT_V2.experimentId,
          workflowMode: batchForm.dataset.workflowMode,
          clientSessionId: timing.clientSessionId,
          foregroundActiveMs: timing.foregroundActiveMs,
          elapsedWallMs: timing.elapsedWallMs,
          queueSize: rows.length,
          attested
        });
        announce(`Recorded ${receipt.decisionCount} independent References decisions atomically for ${receipt.workflowMode}. No publication occurred.`);
        reviewTiming = null;
        state.submitting = null;
        await loadQueue(state.selectedKind);
      } catch (error) {
        reportUnexpected(error, 'record_reference_review_batch');
        state.submitting = null;
        setFormBusy(batchForm, false);
        announce(`References batch was not recorded: ${error.code || error.message || 'review_batch_write_failed'}. All selected decisions and notes remain on screen.`);
      }
    })();
    return;
  }

  const fullReviewForm = event.target.closest('.full-question-review-form');
  if (fullReviewForm) {
    event.preventDefault();
    const data = new FormData(fullReviewForm);
    const questionVersionId = fullReviewForm.dataset.questionVersionId;
    const assist = assistQuestion(questionVersionId);
    const medicalNotes = assist?.medical?.draftNote || '';
    const referencesNotes = assist?.references?.draftNote || '';
    const rightsNotes = assist?.rights?.draftNote || '';
    const attested = data.get('attested') === 'on';
    if (!questionVersionId || !medicalNotes || !referencesNotes || !rightsNotes || !attested) {
      announce('The three-gate review packet and independent-review attestation are required.');
      return;
    }

    (async () => {
      state.submitting = questionVersionId;
      setFormBusy(fullReviewForm, true);
      try {
        const receipt = await review.recordFullQuestionReview({
          questionVersionId,
          medicalNotes,
          referencesNotes,
          rightsNotes,
          attested
        });
        announce(`Approved all three review gates for ${questionVersionId}. ${receipt.reviewCount} immutable receipts were recorded; publication remains separate.`);
        state.submitting = null;
        await loadQueue(state.selectedKind);
      } catch (error) {
        reportUnexpected(error, 'record_full_question_review');
        state.submitting = null;
        setFormBusy(fullReviewForm, false);
        announce(`Full review was not recorded: ${error.code || error.message || 'review_write_failed'}.`);
      }
    })();
    return;
  }

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

  // Normal question/note decisions use the structured zero-typing click path above.

});

render();
bootstrap();
