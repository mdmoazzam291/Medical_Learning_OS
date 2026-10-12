import { deviceCollections, selectWorkspace, addSavedView } from '/src/domain/library-workspaces.js';
import { workspaceMarkup } from '/web/library-workspace-view.js';
import { escape as e, auth, request } from '/web/content-library-client.js';
import { createCloudStudy } from '/src/adapters/cloud-study.js';
import { cloudConfig } from '/web/cloud-config.js';
export function setupLibraryWorkspaces({ root, state, change, render, remember }) {
  const storage = deviceCollections(), cloud = createCloudStudy({ ...cloudConfig, auth });
  let device = storage.read(), compare = [], recallIndex = 0, activeRecallId = null, viewer = null, requestId = 0, pending = false;
  const recallStates = new Map();
  const clearViewer = () => { viewer = null; requestId += 1; };
  const recallState = () => {
    if (!activeRecallId) return { draft: '', revealed: false };
    if (!recallStates.has(activeRecallId)) recallStates.set(activeRecallId, { draft: '', revealed: false });
    return recallStates.get(activeRecallId);
  };
  const titles = { subjects: 'Subjects & Topics', notes: 'Concept Notes', questions: 'Questions', graph: 'Knowledge Graph', atlas: 'Atlas', media: 'Media Library', references: 'Reference Tools', compare: 'Compare Concepts', foundation: 'Prerequisite Paths', savedviews: 'Saved Views', recall: 'Recall & Flashcards', cases: 'Clinical Cases', images: 'Image Drills', skills: 'Skills & Viva' };
  const current = () => { const s = state(); return selectWorkspace(s.library, { view: s.view, filters: s.filters, ...s.options }); };
  function select(key, choices) {
    return '<label>' + key[0].toUpperCase() + key.slice(1) + '<select data-workspace-option="' + key + '"><option value="">All</option>' + choices.map(([value, label]) => '<option value="' + value + '"' + (state().options[key] === value ? ' selected' : '') + '>' + label + '</option>').join('') + '</select></label>';
  }
  function bookmark(kind, id) {
    const key = kind + ':' + id;
    return '<button data-bookmark="' + e(key) + '" aria-pressed="' + device.bookmarks.includes(key) + '">' + (device.bookmarks.includes(key) ? 'Remove bookmark' : 'Bookmark') + '</button>';
  }
  function decorate() {
    const s = state(), data = current();
    const retainedIndex = data.notes.findIndex(n => n.noteVersionId === activeRecallId);
    recallIndex = retainedIndex >= 0 ? retainedIndex : Math.min(recallIndex, Math.max(0, data.notes.length - 1));
    activeRecallId = data.notes[recallIndex]?.noteVersionId || null;
    const recall = recallState();
    if (viewer && (!['media', 'atlas', 'images'].includes(s.view) || !data.questions.some(q => q.questionVersionId === viewer.questionVersionId))) clearViewer();
    document.querySelector('#library-title').textContent = new URLSearchParams(location.search).get('build') === '1' ? 'Build Session' : titles[s.view];
    root.querySelector('.library-filters').insertAdjacentHTML('beforeend', select('collection', [['pyq', 'PYQs'], ['platform', 'QBank'], ['original', 'Original']]) + select('observed', [['incorrect', 'Latest incorrect'], ['correct', 'Latest correct'], ['unattempted', 'Unattempted'], ['repeated', 'Repeated incorrect']]) + select('sort', [['wrong', 'Most incorrect attempts'], ['alphabetical', 'Alphabetical']]));
    root.querySelector('.library-actions').insertAdjacentHTML('beforeend', '<button data-save-view>Save current view</button>');
    const common = ['notes', 'questions', 'graph'].includes(s.view);
    if (!common && !['subjects', 'cases'].includes(s.view)) root.querySelector('.library-grid')?.remove();
    if (s.view === 'questions' && !s.filters.search) root.querySelector('[aria-label="Connected notes"]')?.remove();
    root.querySelector('#library-status').insertAdjacentHTML('afterend', workspaceMarkup(s.view, data, { ...s.options, filters: s.filters, library: s.library, compare, recallIndex, recallReveal: recall.revealed, recallDraft: recall.draft, device, persistence: storage.persistence }));
    for (const card of root.querySelectorAll('[data-question-card]')) {
      const q = data.questions.find(q => q.questionId === card.dataset.questionCard);
      if (q) card.insertAdjacentHTML('beforeend', '<div class="workspace-chips"><button data-one-study="' + e(q.questionVersionId) + '" ' + (pending ? 'disabled' : '') + '>Practice original question</button>' + bookmark('question', q.questionId) + '</div>');
    }
    for (const card of root.querySelectorAll('[data-note-card]')) card.insertAdjacentHTML('beforeend', bookmark('note', card.dataset.noteCard));
    if (viewer && ['media', 'atlas', 'images'].includes(s.view)) renderViewer();
  }
  function renderViewer() {
    const target = root.querySelector('#media-viewer'); if (!target || !viewer) return;
    const safe = ref => { try { const url = new URL(ref); return url.protocol === 'https:' && [cloudConfig.projectUrl, location.origin].includes(url.origin) ? url.href : null; } catch { return null; } };
    target.innerHTML = '<section class="panel"><h2>Original media</h2>' + (viewer.loading ? '<p>Loading prompt media…</p>' : viewer.error ? '<p>' + e(viewer.error) + '</p><button data-media="' + e(viewer.questionVersionId) + '">Retry original media</button>' : viewer.media.length ? '<div class="media-canvas media-zoom-' + viewer.zoom + ' media-rotate-' + viewer.rotation + '">' + viewer.media.map((m, i) => safe(m.deliveryRef) ? '<figure><img src="' + e(safe(m.deliveryRef)) + '" alt="Original ' + e(m.modality || 'medical') + ' visual ' + (i + 1) + '" referrerpolicy="no-referrer"><figcaption ' + (viewer.labels ? '' : 'hidden') + '>' + e(m.modality || 'Medical visual') + ' · ' + e(m.mediaAssetVersionId) + '</figcaption></figure>' : '<p>Verified delivery is unavailable for this asset.</p>').join('') + '</div><div class="workspace-chips"><button data-media-control="zoom">Zoom</button><button data-media-control="rotate">Rotate 2D image</button><button data-media-control="labels" aria-pressed="' + viewer.labels + '">Asset labels</button><button data-media-control="reset">Reset</button></div>' : '<p>No published prompt media for this question.</p>') + (state().view === 'images' && !viewer.loading && !viewer.error ? '<label>Your interpretation<textarea data-image-draft ' + (viewer.committed ? 'readonly' : '') + '>' + e(viewer.draft || '') + '</textarea></label><button data-image-commit ' + (viewer.committed || !viewer.draft?.trim() ? 'disabled' : '') + '>Commit interpretation</button><p class="muted">Interpretation stays in page memory. Answers and explanations are revealed by scored Study after an accepted attempt.</p>' + (viewer.committed ? '<button data-one-study="' + e(viewer.questionVersionId) + '">Open scored image practice</button>' : '') : '') + '</section>';
  }
  async function practice(questionVersionId) {
    if (pending || state().busy) return;
    pending = true; render();
    try {
      const result = await request('/study', { questionVersionIds: [questionVersionId] });
      const href = '/web/medical.html?resume=' + encodeURIComponent(result.sessionId);
      if (result.resumedExisting) { pending = false; render(); root.querySelector('#library-status').innerHTML = 'You have an unfinished session. <a href="' + e(href) + '">Continue unfinished session</a>'; }
      else location.assign(href);
    } catch (error) { pending = false; render(); root.querySelector('#library-status').textContent = error.message; }
  }
  const update = value => { change(value); remember(); render(); };
  root.addEventListener('change', event => {
    if (event.target.dataset.workspaceOption) update({ options: { [event.target.dataset.workspaceOption]: event.target.value } });
    if (event.target.hasAttribute('data-compare')) { compare[Number(event.target.dataset.compare)] = event.target.value; render(); }
  });
  root.addEventListener('input', event => {
    if (event.target.id === 'self-recall') recallState().draft = event.target.value;
    if (event.target.hasAttribute('data-image-draft') && viewer) { viewer.draft = event.target.value; root.querySelector('[data-image-commit]').disabled = !viewer.draft.trim(); }
  });
  root.addEventListener('click', async event => {
    const t = event.target.closest('button'); if (!t || !state().library) return;
    if (t.dataset.subject) { clearViewer(); update({ view: 'subjects', filters: { subject: t.dataset.subject, search: '' }, options: { module: '' } }); }
    if (t.hasAttribute('data-module')) update({ options: { module: t.dataset.module } });
    if (t.dataset.reference) update({ view: 'references', filters: { search: '' }, options: { reference: t.dataset.reference } });
    if (t.hasAttribute('data-category')) update({ options: { category: t.dataset.category } });
    if (t.hasAttribute('data-save-view')) {
      const s = state(), name = prompt('Name this filter view (stored on this device):', titles[s.view]);
      if (name?.trim()) {
        try {
          device = storage.write({ ...device, views: addSavedView(device.views, { id: crypto.randomUUID(), name: name.trim().slice(0, 80), filters: s.filters, options: s.options, view: s.view }) });
          root.querySelector('#library-status').textContent = storage.persistence === 'device' ? 'View saved on this device.' : 'View kept in page memory; device storage is unavailable.';
        } catch (error) { root.querySelector('#library-status').textContent = error.message; }
      }
    }
    if (t.dataset.deleteView) { device = storage.write({ ...device, views: device.views.filter(v => v.id !== t.dataset.deleteView) }); render(); }
    if (t.dataset.bookmark) { device = storage.write({ ...device, bookmarks: device.bookmarks.includes(t.dataset.bookmark) ? device.bookmarks.filter(x => x !== t.dataset.bookmark) : [...device.bookmarks, t.dataset.bookmark] }); render(); }
    if (t.hasAttribute('data-reveal-recall')) { const recall = recallState(); recall.revealed = !recall.revealed; render(); }
    if (t.dataset.recallStep) { const notes = current().notes; recallIndex = Math.min(Math.max(0, recallIndex + Number(t.dataset.recallStep)), Math.max(0, notes.length - 1)); activeRecallId = notes[recallIndex]?.noteVersionId || null; render(); }
    if (t.dataset.oneStudy) return practice(t.dataset.oneStudy);
    if (t.dataset.media) {
      const id = ++requestId;
      viewer = { questionVersionId: t.dataset.media, loading: true, media: [], zoom: 0, rotation: 0, labels: true, draft: '', committed: false }; renderViewer();
      try { const result = await cloud.mediaPrompt(t.dataset.media); if (id !== requestId || !['media', 'atlas', 'images'].includes(state().view)) return; viewer.loading = false; viewer.media = Array.isArray(result.media) ? result.media : []; renderViewer(); }
      catch (error) { if (id === requestId) { viewer.loading = false; viewer.error = error.message; renderViewer(); } }
    }
    if (t.dataset.mediaControl && viewer) { const action = t.dataset.mediaControl; if (action === 'zoom') viewer.zoom = (viewer.zoom + 1) % 3; if (action === 'rotate') viewer.rotation = (viewer.rotation + 1) % 4; if (action === 'labels') viewer.labels = !viewer.labels; if (action === 'reset') { viewer.zoom = 0; viewer.rotation = 0; viewer.labels = true; } renderViewer(); }
    if (t.hasAttribute('data-image-commit') && viewer?.draft.trim()) { viewer.committed = true; renderViewer(); }
  });
  window.addEventListener('mlos:library-view', event => { if (state().library && ['notes', 'questions', 'graph'].includes(event.detail?.view)) { clearViewer(); update({ view: event.detail.view }); } });
  return { decorate };
}
