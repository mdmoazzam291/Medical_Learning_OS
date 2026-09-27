import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudStudy } from '/src/adapters/cloud-study.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';

const root = document.querySelector('#vault-app');
const notice = document.querySelector('#notice');
const escape = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const auth = createSupabaseAuth({ ...cloudConfig, storage: localStorage });
const cloud = createCloudStudy({ ...cloudConfig, auth });

let state = {
  user: auth.currentUser(),
  loading: false,
  concepts: [],
  catalogVersion: null,
  selectedConceptId: new URLSearchParams(location.search).get('concept'),
  detail: null,
  searchQuery: '',
  searchResults: null,
  busy: false,
  error: null
};

function announce(message) {
  notice.textContent = message;
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
  return '<button type="button" class="vault-concept-button' + (selected ? ' selected' : '') + '" data-action="select-concept" data-concept-id="' + escape(concept.conceptId) + '"><strong>' + escape(concept.label) + '</strong><span>' + escape((concept.subjectTags || []).join(' · ') || 'Canonical concept') + '</span><small>' + concept.annotationCount + ' personal note' + (concept.annotationCount === 1 ? '' : 's') + (concept.canonicalNote ? ' · canonical note published' : '') + '</small></button>';
}

function canonicalSection(detail) {
  const note = detail?.canonicalNote;
  if (!note) {
    return '<section class="panel"><span class="eyebrow">CANONICAL NOTE</span><h2>No reviewed canonical note is published yet.</h2><p>The concept identity is live, but NeuralVault will not manufacture medical prose just to fill this space. Your personal notes remain available independently.</p></section>';
  }
  return '<section class="panel"><span class="eyebrow">CANONICAL NOTE · VERSION ' + note.version + '</span><h2>' + escape(note.title) + '</h2><pre class="vault-markdown">' + escape(note.bodyMarkdown) + '</pre><p class="muted">Source-backed canonical content · immutable version ' + escape(note.contentSha256.slice(0, 12)) + '…</p></section>';
}

function annotationCard(annotation) {
  const anchorLabel = {
    current: 'Anchored to current canonical version',
    'canonical-updated': 'Canonical note updated since this annotation',
    'anchor-unavailable': 'Anchored canonical version is unavailable',
    unanchored: 'Concept-linked · unanchored'
  }[annotation.anchorState] || 'Concept-linked';
  return '<article class="vault-note"><form data-form="update-note" data-annotation-id="' + escape(annotation.annotationId) + '" data-revision="' + annotation.revision + '"><label>Your note<textarea name="bodyMarkdown" maxlength="20000" required>' + escape(annotation.bodyMarkdown) + '</textarea></label><div class="vault-note-meta"><span>Revision ' + annotation.revision + '</span><span>' + escape(anchorLabel) + '</span></div><div class="vault-actions"><button class="secondary" type="submit" ' + (state.busy ? 'disabled' : '') + '>Save changes</button><button class="danger-outline" type="button" data-action="delete-note" data-annotation-id="' + escape(annotation.annotationId) + '" ' + (state.busy ? 'disabled' : '') + '>Delete</button></div></form></article>';
}

function detailPanel() {
  const detail = state.detail;
  if (!detail) return '<section class="panel empty"><p>Select a concept to open its NeuralVault workspace.</p></section>';
  const concept = detail.concept;
  const annotations = detail.annotations || [];
  const anchor = detail.canonicalNote?.noteVersionId || null;
  const annotationList = annotations.length
    ? annotations.map(annotationCard).join('')
    : '<p class="muted">No personal notes for this concept yet.</p>';

  return '<div><section class="panel"><span class="eyebrow">CANONICAL CONCEPT</span><h1>' + escape(concept.label) + '</h1><p>' + escape((concept.aliases || []).join(' · ') || concept.conceptId) + '</p><div class="vault-tags">' + (concept.subjectTags || []).map(tag => '<span class="badge">' + escape(tag) + '</span>').join('') + '</div></section>' +
    canonicalSection(detail) +
    '<section class="panel"><span class="eyebrow">PERSONAL ANNOTATIONS</span><h2>Your layer stays yours.</h2><p>Edits use revision checks, so an older tab cannot silently overwrite a newer note.</p><div class="vault-note-list">' + annotationList + '</div><form id="create-note-form" class="vault-editor"><label>Add a personal note<textarea name="bodyMarkdown" maxlength="20000" placeholder="Write a concise recall cue, connection, or correction…" required></textarea></label><input type="hidden" name="anchorNoteVersionId" value="' + escape(anchor || '') + '"><button class="primary" type="submit" ' + (state.busy ? 'disabled' : '') + '>Save note</button></form></section></div>';
}

function signedIn() {
  const visibleConcepts = Array.isArray(state.searchResults) ? state.searchResults : state.concepts;
  const list = visibleConcepts.length
    ? visibleConcepts.map(conceptButton).join('')
    : '<p class="muted">' + (state.searchResults ? 'No NeuralVault matches.' : 'No canonical concepts are available yet.') + '</p>';
  const error = state.error ? '<section class="panel"><p>NeuralVault load failed: <strong>' + escape(state.error) + '</strong></p></section>' : '';
  return '<main id="main" class="vault-page"><a class="text-button" href="/web/account.html">← Cloud account</a><div class="page-heading"><div><span class="eyebrow">NEURALVAULT</span><h1>One concept. Canonical knowledge. Your annotations.</h1><p>' + escape(state.user?.email || 'Authenticated learner') + ' · catalog v' + escape(state.catalogVersion ?? '—') + '</p></div><span class="badge">M06c</span></div>' + error + '<div class="vault-layout"><aside class="vault-index panel"><div class="section-heading"><h2>Concepts</h2><span class="muted">' + visibleConcepts.length + '</span></div><form id="vault-search-form"><label>Search NeuralVault<input name="q" type="search" minlength="2" maxlength="120" value="' + escape(state.searchQuery) + '" placeholder="Concept, alias, note, or your annotation"></label><div class="button-row"><button class="secondary" type="submit">Search</button>' + (state.searchResults ? '<button class="text-button" type="button" data-action="clear-search">Clear</button>' : '') + '</div></form><div class="vault-concept-list">' + list + '</div></aside><section class="vault-detail">' + (state.loading ? '<section class="panel"><p>Loading concept…</p></section>' : detailPanel()) + '</section></div></main>';
}

function render() {
  root.innerHTML = state.user ? signedIn() : signedOut();
}

async function loadDetail(conceptId) {
  state = { ...state, loading: true, selectedConceptId: conceptId, error: null };
  render();
  try {
    const detail = await cloud.vaultConcept(conceptId);
    state = { ...state, loading: false, detail, error: null };
    const url = new URL(location.href);
    url.searchParams.set('concept', conceptId);
    history.replaceState(null, '', url.pathname + url.search);
  } catch (error) {
    reportUnexpected(error, 'load_concept');
    state = { ...state, loading: false, detail: null, error: error.code || error.message || 'vault_unavailable' };
  }
  render();
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

root.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  event.preventDefault();

  if (target.dataset.action === 'select-concept') {
    loadDetail(target.dataset.conceptId);
  }

  if (target.dataset.action === 'clear-search') {
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
reloadVault();
