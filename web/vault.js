import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudStudy } from '/src/adapters/cloud-study.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';
import { createVaultDrafts } from '/web/vault-drafts.js';

const root = document.querySelector('#vault-app');
const notice = document.querySelector('#notice');
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const auth = createSupabaseAuth({ ...cloudConfig });
const cloud = createCloudStudy({ ...cloudConfig, auth });
const drafts = createVaultDrafts({ root, onChange: count => {
  const status = root.querySelector('[data-vault-draft-count]');
  if (status) {
    status.hidden = count === 0;
    const message = count + ' unsaved draft' + (count === 1 ? '' : 's') + ' in this page. Return to the concept to save. Reloading or leaving can lose unsaved work.';
    if (status.textContent !== message) status.textContent = message;
  }
} });
window.addEventListener('beforeunload', event => {
  if (!drafts.hasDrafts()) return;
  event.preventDefault();
  event.returnValue = '';
});
const initialParams = new URLSearchParams(location.search);
const returnSessionParam = initialParams.get('returnSession');
const returnSessionId = /^[a-zA-Z0-9-]{1,160}$/.test(returnSessionParam || '') ? returnSessionParam : null;
const initialConceptId = initialParams.get('concept');
const allowedCorrectionTargetTypes = new Set(['canonical_note', 'question_version']);
const correctionTargetTypeParam = initialParams.get('correctionTargetType');
const correctionTargetIdParam = initialParams.get('correctionTargetId');
const initialCorrectionTarget =
  initialConceptId &&
  allowedCorrectionTargetTypes.has(correctionTargetTypeParam) &&
  /^[a-zA-Z0-9:_@.\-]{1,180}$/.test(correctionTargetIdParam || '')
    ? {
        conceptId: initialConceptId,
        targetType: correctionTargetTypeParam,
        targetId: correctionTargetIdParam
      }
    : null;
const allowedEntryReasons = new Set(['mistake-repair', 'due-revision', 'new-learning']);
const initialEntryReason = allowedEntryReasons.has(initialParams.get('reason')) ? initialParams.get('reason') : null;
const initialEntryContext = initialParams.get('from') === 'study-now' && initialConceptId && initialEntryReason
  ? { source: 'study-now', conceptId: initialConceptId, reason: initialEntryReason }
  : null;

let state = {
  user: auth.currentUser(),
  loading: false,
  concepts: [],
  catalogVersion: null,
  selectedConceptId: initialConceptId,
  entryContext: initialEntryContext,
  correctionTarget: initialCorrectionTarget,
  detail: null,
  conceptBrowserOpen: window.matchMedia('(min-width: 801px)').matches,
  searchQuery: '',
  searchResults: null,
  busy: false,
  error: null
};

function announce(message) {
  notice.textContent = message;
  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'notice-dismiss';
  dismiss.textContent = 'Dismiss';
  dismiss.setAttribute('aria-label', 'Dismiss message');
  dismiss.addEventListener('click', () => {
    notice.hidden = true;
    root.querySelector('#concept-title')?.focus({ preventScroll: true });
  });
  notice.append(dismiss);
  notice.hidden = false;
}

function reportUnexpected(error, operation) {
  const status = Number(error?.status || 0);
  if (!status || status >= 500) {
    errorMonitor.capture(error, {
      component: 'neural-vault',
      operation,
      code: error?.code || null,
      status: status || null
    });
  }
}

function signedOut() {
  return '<main id="main" class="account-page"><a class="text-button" href="/web/account.html">← Cloud account</a><div class="page-heading"><div><span class="eyebrow">NEURALVAULT</span><h1>Sign in to open your concept notes.</h1><p>Personal annotations are learner-scoped cloud data. Canonical medical content stays separate.</p></div><span class="badge">M06</span></div><section class="panel"><a class="primary action-link" href="/web/account.html">Open cloud account</a></section></main>';
}

function conceptButton(concept) {
  const selected = concept.conceptId === state.selectedConceptId;
  return '<button type="button" class="vault-concept-button' + (selected ? ' selected' : '') + '" aria-pressed="' + selected + '" data-action="select-concept" data-concept-id="' + escape(concept.conceptId) + '"><strong>' + escape(concept.label) + '</strong><span>' + escape((concept.subjectTags || []).join(' · ') || 'Canonical concept') + '</span><small>' + concept.annotationCount + ' personal item' + (concept.annotationCount === 1 ? '' : 's') + (concept.correctionCount ? ' · ' + concept.correctionCount + ' correction' + (concept.correctionCount === 1 ? '' : 's') : '') + (concept.canonicalNote ? ' · canonical note published' : '') + '</small></button>';
}

function canonicalSection(detail) {
  const note = detail?.canonicalNote;
  if (!note) {
    return '<section id="reviewed-note" class="panel vault-reading" aria-labelledby="reviewed-note-title"><span class="eyebrow">CANONICAL NOTE</span><h2 id="reviewed-note-title" tabindex="-1">No reviewed canonical note is published yet.</h2><p>Your personal notes are available below. Reviewed content will appear here when it is published.</p></section>';
  }
  return '<section id="reviewed-note" class="panel vault-reading" aria-labelledby="reviewed-note-title"><span class="eyebrow">CANONICAL NOTE · VERSION ' + note.version + '</span><h2 id="reviewed-note-title" tabindex="-1">' + escape(note.title) + '</h2><pre class="vault-markdown">' + escape(note.bodyMarkdown) + '</pre><details class="vault-provenance"><summary>Published version details</summary><p class="muted">Immutable version ' + escape(note.contentSha256.slice(0, 12)) + '…</p></details></section>';
}

function annotationCard(annotation) {
  const anchorLabel = {
    current: 'Anchored to current canonical version',
    'canonical-updated': 'Canonical note updated since this annotation',
    'anchor-unavailable': 'Anchored canonical version is unavailable',
    unanchored: 'Concept-linked · unanchored'
  }[annotation.anchorState] || 'Concept-linked';
  return '<article class="vault-note"><span class="eyebrow">PERSONAL NOTE</span><form data-form="update-note" data-annotation-id="' + escape(annotation.annotationId) + '" data-revision="' + annotation.revision + '"><label>Your note<textarea aria-label="Your note" name="bodyMarkdown" maxlength="20000" required>' + escape(annotation.bodyMarkdown) + '</textarea></label><div class="vault-note-meta"><span>Revision ' + annotation.revision + '</span><span>' + escape(anchorLabel) + '</span></div><div class="vault-actions"><button class="secondary" type="submit" ' + (state.busy ? 'disabled' : '') + '>Save changes</button><button class="danger-outline" type="button" data-action="delete-note" data-annotation-id="' + escape(annotation.annotationId) + '" ' + (state.busy ? 'disabled' : '') + '>Delete</button></div></form></article>';
}

function correctionStateLabel(annotation) {
  return {
    current: 'Target version is still current',
    'canonical-updated': 'Canonical note changed after you wrote this correction',
    'question-retired': 'This question version has since been retired',
    'target-unavailable': 'The original target is no longer available'
  }[annotation.targetState] || 'Private correction target';
}

function reportForm({ targetType, targetId, correctionAnnotationId = null }) {
  const shareControl = correctionAnnotationId
    ? '<label class="review-attestation"><input type="checkbox" name="shareCorrection"> Include my private correction text in this report.</label>'
    : '';
  return '<form data-form="content-report" data-target-type="' + escape(targetType) + '" data-target-id="' + escape(targetId) + '" data-correction-annotation-id="' + escape(correctionAnnotationId || '') + '">' +
    '<label>Why might the shared content need review?<select name="reportKind" required>' +
      '<option value="incorrect">Possibly incorrect</option>' +
      '<option value="outdated">Possibly outdated</option>' +
      '<option value="ambiguous">Ambiguous</option>' +
      '<option value="missing_context">Missing context</option>' +
      '<option value="other">Other</option>' +
    '</select></label>' +
    '<label>Optional details<textarea name="details" maxlength="4000" placeholder="Optional. Explain what should be checked."></textarea></label>' +
    shareControl +
    '<button class="secondary" type="submit" ' + (state.busy ? 'disabled' : '') + '>Report possible canonical error</button>' +
    '<p class="muted">A report creates review evidence only. It does not change canonical content, your score, mastery, or another learner\'s view.</p>' +
  '</form>';
}

function correctionCard(annotation) {
  return '<article class="vault-note personal-correction">' +
    '<div class="section-heading"><div><span class="eyebrow">MY CORRECTION · PRIVATE</span><h3>' + escape(annotation.targetLabel || annotation.targetId || 'Correction') + '</h3></div><span class="badge">Learner-only</span></div>' +
    '<p class="muted">' + escape(correctionStateLabel(annotation)) + '. Canonical content remains visible and unchanged.</p>' +
    '<form data-form="update-note" data-annotation-id="' + escape(annotation.annotationId) + '" data-revision="' + annotation.revision + '">' +
      '<label>My corrected wording / interpretation<textarea aria-label="My corrected wording / interpretation" name="bodyMarkdown" maxlength="20000" required>' + escape(annotation.bodyMarkdown) + '</textarea></label>' +
      '<div class="vault-note-meta"><span>Revision ' + annotation.revision + '</span><span>' + escape(annotation.targetType || '') + '</span></div>' +
      '<div class="vault-actions"><button class="secondary" type="submit" ' + (state.busy ? 'disabled' : '') + '>Save my correction</button><button class="danger-outline" type="button" data-action="delete-note" data-annotation-id="' + escape(annotation.annotationId) + '" ' + (state.busy ? 'disabled' : '') + '>Delete my correction</button></div>' +
    '</form>' +
    '<details><summary>Think the shared content is actually wrong?</summary>' +
      reportForm({
        targetType: annotation.targetType,
        targetId: annotation.targetId,
        correctionAnnotationId: annotation.annotationId
      }) +
    '</details>' +
  '</article>';
}

function correctionComposer(detail, corrections) {
  const targets = [];
  const canonical = detail?.canonicalNote;
  if (canonical) {
    targets.push({
      targetType: 'canonical_note',
      targetId: canonical.noteVersionId,
      label: 'Canonical note: ' + canonical.title
    });
  }
  const deepLink = state.correctionTarget;
  if (deepLink &&
      deepLink.conceptId === state.selectedConceptId &&
      deepLink.targetType === 'question_version') {
    targets.push({
      targetType: 'question_version',
      targetId: deepLink.targetId,
      label: 'Question version: ' + deepLink.targetId
    });
  }

  const uniqueTargets = targets.filter((target, index, list) =>
    list.findIndex(candidate =>
      candidate.targetType === target.targetType && candidate.targetId === target.targetId
    ) === index
  );
  if (!uniqueTargets.length) return '';

  return uniqueTargets.map(target => {
    const existing = corrections.find(annotation =>
      annotation.targetType === target.targetType && annotation.targetId === target.targetId
    );
    if (existing) return '';
    return '<details class="personal-correction-composer"' + (target.targetType === 'question_version' ? ' open' : '') + '><summary>Add a private correction · ' + escape(target.label) + '</summary><div class="vault-composer-body">' +
      '<div class="section-heading"><div><span class="eyebrow">PRIVATE CORRECTION OVERLAY</span><h3>' + escape(target.label) + '</h3></div><span class="badge">Only you</span></div>' +
      '<p>Use this when you want your own corrected wording or interpretation without changing the reviewed canonical content for anyone else.</p>' +
      '<form data-form="create-correction" data-target-type="' + escape(target.targetType) + '" data-target-id="' + escape(target.targetId) + '">' +
        '<label>My correction<textarea name="bodyMarkdown" maxlength="20000" required placeholder="Write the version you want to keep for yourself…"></textarea></label>' +
        '<button class="primary" type="submit" ' + (state.busy ? 'disabled' : '') + '>Save private correction</button>' +
      '</form>' +
      '<details><summary>Or report the shared content without changing my private layer</summary>' +
        reportForm({ targetType: target.targetType, targetId: target.targetId }) +
      '</details>' +
      '<p class="muted">Your correction is an overlay, not a replacement. Canonical content remains visible so a personal typo cannot silently become your new source of truth.</p>' +
    '</div></details>';
  }).join('');
}

function entryContextPanel() {
  const entry = state.entryContext;
  if (!entry || entry.source !== 'study-now' || entry.conceptId !== state.selectedConceptId) return '';
  const copy = {
    'mistake-repair': ['Mistake repair', 'You arrived from Study Now after a due item with a prior incorrect answer. Use the canonical note to repair the concept after retrieval.'],
    'due-revision': ['Due revision', 'You arrived from Study Now after a scheduled retrieval. Use the canonical note to consolidate the concept after testing yourself.'],
    'new-learning': ['New learning', 'You arrived from Study Now after an unseen published item. Use the canonical note to connect the question to the underlying concept.']
  }[entry.reason];
  if (!copy) return '';
  return '<details class="vault-entry-context"><summary><span class="eyebrow">STUDY NOW HANDOFF</span> · ' + escape(copy[0]) + '</summary><p>' + escape(copy[1]) + '</p><p class="muted">This handoff is context only. It does not change your score, note content, mastery state, or revision schedule.</p></details>';
}

function detailPanel() {
  const detail = state.detail;
  if (!detail) return '<section class="panel empty"><h1>Your concept workspace</h1><p>Select a concept to open its NeuralVault workspace.</p></section>';
  const concept = detail.concept;
  const allAnnotations = detail.annotations || [];
  const notes = allAnnotations.filter(annotation => annotation.annotationKind !== 'correction');
  const corrections = allAnnotations.filter(annotation => annotation.annotationKind === 'correction');
  const anchor = detail.canonicalNote?.noteVersionId || null;
  const noteList = notes.length
    ? notes.map(annotationCard).join('')
    : '<p class="muted">No ordinary personal notes for this concept yet.</p>';
  const correctionList = corrections.length
    ? corrections.map(correctionCard).join('')
    : '<p class="muted">No private corrections for this concept yet.</p>';

  return '<div>' +
    '<section class="vault-concept-heading"><span class="eyebrow">CANONICAL CONCEPT</span><h1 id="concept-title" tabindex="-1">' + escape(concept.label) + '</h1>' + ((concept.aliases || []).length ? '<p>' + escape(concept.aliases.join(' · ')) + '</p>' : '') + '<div class="vault-tags">' + (concept.subjectTags || []).map(tag => '<span class="badge">' + escape(tag) + '</span>').join('') + '</div></section>' +
    entryContextPanel() +
    '<nav class="vault-section-nav" aria-label="This concept"><a href="#reviewed-note" data-section-title="reviewed-note-title">Reviewed note</a><a href="#my-notes" data-section-title="my-notes-title">My notes (' + notes.length + ')</a><a href="#my-corrections" data-section-title="my-corrections-title">My corrections (' + corrections.length + ')</a></nav>' +
    canonicalSection(detail) +
    '<section id="my-notes" class="panel"><span class="eyebrow">PERSONAL ANNOTATIONS</span><h2 id="my-notes-title" tabindex="-1">My notes</h2><p>Your general notes stay yours. Edits use revision checks so an older tab cannot overwrite a newer note.</p><div class="vault-note-list">' + noteList + '</div><form id="create-note-form" class="vault-editor"><label>Add a personal note<textarea name="bodyMarkdown" maxlength="20000" placeholder="Write a concise recall cue or connection…" required></textarea></label><input type="hidden" name="anchorNoteVersionId" value="' + escape(anchor || '') + '"><button class="primary" type="submit" ' + (state.busy ? 'disabled' : '') + '>Save note</button></form></section>' +
    '<section id="my-corrections" class="panel"><span class="eyebrow">MY CORRECTIONS</span><h2 id="my-corrections-title" tabindex="-1">My corrections</h2><p>Private overlay. Canonical stays canonical. Your corrections are visible only to you.</p><div class="vault-note-list">' + correctionList + '</div>' + correctionComposer(detail, corrections) + '</section>' +
  '</div>';
}

function signedIn() {
  const visibleConcepts = Array.isArray(state.searchResults) ? state.searchResults : state.concepts;
  const list = visibleConcepts.length
    ? visibleConcepts.map(conceptButton).join('')
    : '<p class="muted">' + (state.searchResults ? 'No NeuralVault matches.' : 'No canonical concepts are available yet.') + '</p>';
  const error = state.error ? '<section class="panel" role="status"><p>The last action could not finish. Your unsaved drafts remain in this page. Try the action again.</p></section>' : '';
  return '<main id="main" class="vault-page">' +
    '<div class="vault-topbar"><a class="text-button" href="/">← Home</a><div>' + (returnSessionId ? '<a class="secondary action-link" href="/web/medical.html?resume=' + encodeURIComponent(returnSessionId) + '">← Return to study</a>' : '<a class="text-button" href="/web/medical.html">Study</a>') + '<a class="text-button" href="/web/library.html">Notes / Graph</a><a class="text-button" href="/web/account.html">Account</a></div></div>' +
    '<div class="vault-workspace-label"><span class="eyebrow">NEURALVAULT</span><p>Reviewed knowledge and your personal workspace.</p><p data-vault-draft-count role="status" hidden></p></div>' + error +
    '<div class="vault-layout"><aside class="vault-index panel" aria-label="Concept browser"><details id="vault-concept-browser"' + (state.conceptBrowserOpen ? ' open' : '') + '><summary>Browse concepts <span class="muted">(' + visibleConcepts.length + ')</span></summary><form id="vault-search-form"><label>Search NeuralVault<input name="q" type="search" minlength="2" maxlength="120" value="' + escape(state.searchQuery) + '" placeholder="Concept, alias, note, or your annotation"></label><div class="button-row"><button class="secondary" type="submit">Search</button>' + (state.searchResults ? '<button class="text-button" type="button" data-action="clear-search">Clear</button>' : '') + '</div></form><div class="vault-concept-list">' + list + '</div></details></aside><section class="vault-detail" aria-label="Concept workspace" aria-busy="' + state.loading + '">' + (state.loading ? '<section class="panel"><p>Loading concept…</p></section>' : detailPanel()) + '</section></div></main>';
}

function render() {
  root.innerHTML = state.user ? signedIn() : signedOut();
  drafts.restore({ userId: state.user?.id || null, conceptId: state.detail?.concept?.conceptId, busy: state.busy });
}

let detailRequest = 0;

async function loadDetail(conceptId, focusConcept = false) {
  const request = ++detailRequest;
  state = { ...state, loading: true, selectedConceptId: conceptId, error: null };
  render();
  try {
    const detail = await cloud.vaultConcept(conceptId);
    if (request !== detailRequest) return;
    state = { ...state, loading: false, detail, error: null };
    const url = new URL(location.href);
    url.searchParams.set('concept', conceptId);
    history.replaceState(null, '', url.pathname + url.search);
  } catch (error) {
    if (request !== detailRequest) return;
    reportUnexpected(error, 'load_concept');
    state = { ...state, loading: false, detail: null, error: error.code || error.message || 'vault_unavailable' };
  }
  render();
  if (focusConcept) root.querySelector('#concept-title')?.focus();
}

async function reloadVault(preferredConceptId = state.selectedConceptId) {
  let session;
  try {
    session = await auth.getSession();
  } catch (error) {
    reportUnexpected(error, 'load_session');
    state = { ...state, user: null, loading: false, error: null };
    render();
    return;
  }
  if (!session?.user) {
    state = { ...state, user: null, loading: false, error: null };
    render();
    return;
  }

  state = { ...state, user: session.user, loading: true, error: null };
  render();
  try {
    const result = await cloud.vaultConcepts();
    const concepts = Array.isArray(result?.concepts) ? result.concepts : [];
    const selected = concepts.some(c => c.conceptId === preferredConceptId)
      ? preferredConceptId
      : concepts[0]?.conceptId || null;
    state = {
      ...state,
      user: auth.currentUser() || session.user,
      concepts,
      catalogVersion: result?.catalogVersion ?? null,
      selectedConceptId: selected,
      loading: false,
      error: null
    };
    if (selected) await loadDetail(selected);
    else render();
  } catch (error) {
    reportUnexpected(error, 'load_index');
    state = { ...state, loading: false, error: error.code || error.message || 'vault_unavailable' };
    render();
  }
}

root.addEventListener('toggle', event => {
  if (event.target.id === 'vault-concept-browser') state.conceptBrowserOpen = event.target.open;
}, true);

root.addEventListener('click', event => {
  const sectionLink = event.target.closest('[data-section-title]');
  if (sectionLink) {
    event.preventDefault();
    document.querySelector(sectionLink.getAttribute('href'))?.scrollIntoView({ block: 'start' });
    document.getElementById(sectionLink.dataset.sectionTitle)?.focus({ preventScroll: true });
    history.replaceState(null, '', location.pathname + location.search + sectionLink.getAttribute('href'));
    return;
  }
  const target = event.target.closest('[data-action]');
  if (!target) return;
  event.preventDefault();

  if (target.dataset.action === 'select-concept') {
    if (state.busy) return;
    if (!window.matchMedia('(min-width: 801px)').matches) state.conceptBrowserOpen = false;
    loadDetail(target.dataset.conceptId, true);
  }

  if (target.dataset.action === 'clear-search') {
    if (state.busy) return;
    state = { ...state, searchQuery: '', searchResults: null, error: null };
    render();
  }

  if (target.dataset.action === 'delete-note') {
    const annotationId = target.dataset.annotationId;
    if (!annotationId || state.busy) return;
    (async () => {
      state.busy = true; render();
      try {
        await cloud.deleteVaultAnnotation(annotationId);
        drafts.clear(target.closest('form'));
        announce('Personal note deleted.');
        state.busy = false;
        await reloadVault(state.selectedConceptId);
      } catch (error) {
        reportUnexpected(error, 'delete_note');
        state = { ...state, busy: false, error: error.code || error.message || 'vault_write_failed' };
        announce('Note was not deleted.');
        render();
      }
    })();
  }
});

root.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  if (state.busy) return;

  if (form.id === 'vault-search-form') {
    (async () => {
      const data = new FormData(form);
      const query = String(data.get('q') || '').trim();
      if (query.length < 2 || state.busy) return;
      state = { ...state, busy: true, searchQuery: query, error: null };
      render();
      try {
        const result = await cloud.vaultSearch(query);
        state = { ...state, busy: false, searchResults: Array.isArray(result?.results) ? result.results : [], error: null };
      } catch (error) {
        reportUnexpected(error, 'search_vault');
        state = { ...state, busy: false, error: error.code || error.message || 'vault_search_failed' };
      }
      render();
    })();
  }

  if (form.dataset.form === 'create-correction') {
    (async () => {
      const data = new FormData(form);
      const targetType = form.dataset.targetType;
      const targetId = form.dataset.targetId;
      state.busy = true; render();
      try {
        await cloud.createVaultCorrection({
          conceptId: state.selectedConceptId,
          targetType,
          targetId,
          bodyMarkdown: data.get('bodyMarkdown')
        });
        drafts.clear(form);
        announce('Private correction saved. Canonical content was not changed.');
        state.busy = false;
        await reloadVault(state.selectedConceptId);
      } catch (error) {
        reportUnexpected(error, 'create_correction');
        state = { ...state, busy: false, error: error.code || error.message || 'vault_write_failed' };
        announce(error.code === 'neural_correction_already_exists'
          ? 'A private correction already exists for this exact target. Edit the existing correction instead.'
          : 'Private correction was not saved.');
        render();
      }
    })();
  }

  if (form.dataset.form === 'content-report') {
    (async () => {
      const data = new FormData(form);
      const correctionAnnotationId = form.dataset.correctionAnnotationId || null;
      const shareCorrection = correctionAnnotationId
        ? data.get('shareCorrection') === 'on'
        : false;
      state.busy = true; render();
      try {
        await cloud.reportContentIssue({
          conceptId: state.selectedConceptId,
          targetType: form.dataset.targetType,
          targetId: form.dataset.targetId,
          reportKind: String(data.get('reportKind') || ''),
          details: String(data.get('details') || '').trim() || null,
          correctionAnnotationId: shareCorrection ? correctionAnnotationId : null,
          shareCorrection
        });
        drafts.clear(form);
        announce(shareCorrection
          ? 'Possible canonical error reported. Your correction text was shared with the report by your choice.'
          : 'Possible canonical error reported. Your private correction was not shared.');
        state.busy = false;
        await reloadVault(state.selectedConceptId);
      } catch (error) {
        reportUnexpected(error, 'report_content_issue');
        state = { ...state, busy: false, error: error.code || error.message || 'content_report_write_failed' };
        announce(error.code === 'learner_content_report_already_submitted'
          ? 'You already submitted this type of report for the current target version.'
          : 'The content report was not saved.');
        render();
      }
    })();
  }

  if (form.id === 'create-note-form') {
    (async () => {
      const data = new FormData(form);
      state.busy = true; render();
      try {
        await cloud.createVaultAnnotation({
          conceptId: state.selectedConceptId,
          bodyMarkdown: data.get('bodyMarkdown'),
          anchorNoteVersionId: data.get('anchorNoteVersionId') || null
        });
        drafts.clear(form);
        announce('Personal note saved.');
        state.busy = false;
        await reloadVault(state.selectedConceptId);
      } catch (error) {
        reportUnexpected(error, 'create_note');
        state = { ...state, busy: false, error: error.code || error.message || 'vault_write_failed' };
        announce('Note was not saved.');
        render();
      }
    })();
  }

  if (form.dataset.form === 'update-note') {
    (async () => {
      const data = new FormData(form);
      state.busy = true; render();
      try {
        await cloud.updateVaultAnnotation(
          form.dataset.annotationId,
          Number(form.dataset.revision),
          data.get('bodyMarkdown')
        );
        drafts.clear(form);
        announce('Personal note updated.');
        state.busy = false;
        await reloadVault(state.selectedConceptId);
      } catch (error) {
        reportUnexpected(error, 'update_note');
        state = { ...state, busy: false, error: error.code || error.message || 'vault_write_failed' };
        announce(error.code === 'neural_annotation_revision_conflict'
          ? 'This note changed elsewhere. Reloaded content is required before saving again.'
          : 'Note was not updated.');
        render();
      }
    })();
  }
});

render();
reloadVault(initialConceptId);
