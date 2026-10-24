import { preparationLibrary } from '../src/domain/preparation-pathways.js';
import { SUBJECT_INDEX, REFERENCES, MEDIA_TYPES } from '../src/domain/app-navigation.js';
import { prerequisiteLinks, savedViewUrl } from '../src/domain/library-workspaces.js';
import { escapeText as e } from './navigation-view.js';
import { renderCanonicalNote, renderNoteOutline } from './canonical-note-reader.js';
const noteBody = n => {const r=renderCanonicalNote(n.bodyMarkdown,{idPrefix:'workspace-note-'+n.noteVersionId});return '<div class="canonical-note-reader">'+renderNoteOutline(r.sections)+r.html+'</div>';};
const link = (view, extra = '') => '/web/library.html?view=' + view + extra;
const noteLink = id => '/web/vault.html?concept=' + encodeURIComponent(id);
const empty = message => '<div class="workspace-empty"><p>' + message + '</p></div>';
const note = n => '<article class="panel"><h3>' + e(n.title) + '</h3><small>Published source note · ' + e(n.noteVersionId) + '</small><div class="library-note-body">' + noteBody(n) + '</div><a href="' + noteLink(n.conceptId) + '">Open concept and private notes</a></article>';
function subjects(data, options) {
  const selected = SUBJECT_INDEX.find(x => x.id === options.filters?.subject);
  return '<div class="subject-grid">' + SUBJECT_INDEX.map(s => '<button type="button" data-subject="' + s.id + '" aria-pressed="' + (s.id === selected?.id) + '"><strong>' + e(s.label) + '</strong><small>' + data.questions.filter(q => q.classification.subjects.includes(s.id)).length + ' published questions</small></button>').join('') + '</div>' + (selected ? '<section class="panel"><h2>' + e(selected.label) + '</h2><p>' + e(selected.detail) + '</p><div class="workspace-chips"><button data-module="" aria-pressed="' + !options.module + '">All subject content</button>' + selected.modules.map(m => '<button data-module="' + m.id + '" aria-pressed="' + (options.module === m.id) + '">' + e(m.label) + '</button>').join('') + '</div><p class="muted">Module coverage uses explicit published tags. An empty module does not mean a complete curriculum is available.</p><h3>Related references</h3><div class="workspace-chips">' + selected.tools.map(label => {
    const reference = REFERENCES.find(r => r.label === label);
    return '<a class="secondary action-link" href="' + (reference ? link('references', '&reference=' + reference.id) : label === 'Anatomy Atlas' ? link('atlas') : link('media')) + '">' + e(label) + '</a>';
  }).join('') + '</div><p>Formats: ' + e(selected.formats.join(' · ')) + '</p></section>' : '<p>Select a subject to explore its four modules and related references.</p>');
}
function compare(data, options) {
  const selected = (options.compare || []).slice(0, 3);
  const choices = index => '<label>Concept ' + (index + 1) + '<select data-compare="' + index + '"><option value="">Choose a concept</option>' + data.concepts.map(c => '<option value="' + e(c.conceptId) + '"' + (selected[index] === c.conceptId ? ' selected' : '') + '>' + e(c.label) + '</option>').join('') + '</select></label>';
  return '<p>Compare exact published notes and shared classification. Missing information stays missing.</p><div class="workspace-comparison-select">' + [0, 1, 2].map(choices).join('') + '</div><div class="workspace-comparison">' + selected.filter(Boolean).map(id => {
    const c = data.concepts.find(x => x.conceptId === id);
    if (!c) return '';
    return '<section class="panel"><h2>' + e(c.label) + '</h2><dl>' + Object.entries(c.classification).map(([k, v]) => '<dt>' + e(k) + '</dt><dd>' + e(v.join(', ') || 'Not tagged') + '</dd>').join('') + '</dl>' + (data.notes.filter(n => n.conceptId === id).map(note).join('') || '<p>No published note for this concept.</p>') + '</section>';
  }).join('') + '</div>';
}
function foundation(data) {
  const links = prerequisiteLinks(data), label = id => data.concepts.find(c => c.conceptId === id)?.label || id;
  return '<p>Paths follow explicit published prerequisite relationships. Each edge retains its question version.</p>' + (links.length ? '<ol class="prerequisite-list">' + links.map(l => '<li><a href="' + noteLink(l.from) + '">' + e(label(l.from)) + '</a><span aria-label="leads to"> → </span><a href="' + noteLink(l.to) + '">' + e(label(l.to)) + '</a><small>Evidence: ' + e(l.questionVersionId) + '</small></li>').join('') + '</ol>' : empty('No published prerequisite links match this selection.'));
}
function references(data, options) {
  return '<div class="workspace-chips">' + REFERENCES.map(r => '<button data-reference="' + r.id + '" aria-pressed="' + (options.reference === r.id) + '">' + e(r.label) + '</button>').join('') + '</div><p>References use explicit source tags. Open the canonical note for its sources and version; clinical and legal references require current reviewed material.</p>' + (data.notes.length ? data.notes.map(note).join('') : empty('No published reference notes match this category.'));
}
function media(view, data, options) {
  return (view === 'atlas' ? '<p>Explore published anatomy visuals by System and Organ using the shared filters.</p><p class="muted">3D requires a reviewed model and a supported model-delivery contract. It is not available in the current image catalog.</p>' : '<div class="workspace-chips"><button data-category="" aria-pressed="' + !options.category + '">All media</button>' + MEDIA_TYPES.map(m => '<button data-category="' + m.id + '" aria-pressed="' + (options.category === m.id) + '">' + e(m.label) + '</button>').join('') + '</div>') + '<p>Open a published visual to zoom, rotate or reset it. Blind prompt images do not reveal diagnoses or explanatory annotations.</p><div id="media-viewer" aria-live="polite"></div>' + (data.questions.length ? data.questions.slice(0, options.limit || 50).map(q => '<article class="panel"><h3>' + e(q.stem) + '</h3><button data-media="' + e(q.questionVersionId) + '">Open original media</button>' + (view === 'images' ? '<p>Observe the original image, write your interpretation, then commit it before opening scored practice.</p>' : '') + '</article>').join('') : empty('No published visual questions match this selection. Audio, video and animation require their reviewed delivery formats.'));
}
function recall(data, options) {
  const index = Math.min(options.recallIndex || 0, Math.max(0, data.notes.length - 1)), n = data.notes[index];
  if (!n) return empty('No published notes are available for source-bound recall.');
  return '<section class="panel" aria-label="Source-bound recall"><p>Card ' + (index + 1) + ' of ' + data.notes.length + '</p><h2>' + e(n.title) + '</h2><label>Your recall<textarea id="self-recall" aria-label="Your recall" rows="5" placeholder="Recall the concept before revealing its source note">' + e(options.recallDraft || '') + '</textarea></label><p class="muted">This self-review stays in page memory. It does not create scored attempts or change revision scheduling.</p><button data-reveal-recall aria-expanded="' + Boolean(options.recallReveal) + '">' + (options.recallReveal ? 'Hide source note' : 'Reveal source note') + '</button>' + (options.recallReveal ? '<div class="library-note-body">' + noteBody(n) + '</div><p>Source: ' + e(n.noteVersionId) + '</p><a href="' + noteLink(n.conceptId) + '">Keep a private note</a>' : '') + '<div class="workspace-chips"><button data-recall-step="-1" ' + (index ? '' : 'disabled') + '>Previous card</button><button data-recall-step="1" ' + (index + 1 < data.notes.length ? '' : 'disabled') + '>Next card</button></div></section>';
}
function saved(data, options) {
  const device = options.device || { views: [], bookmarks: [] };
  const notes = data.notes.filter(n => device.bookmarks.includes('note:' + n.noteVersionId)), questions = data.questions.filter(q => device.bookmarks.includes('question:' + q.questionId));
  return '<p>' + (options.persistence === 'device' ? 'Saved views and bookmarks are stored on this device.' : 'Storage is unavailable; saved views and bookmarks stay in page memory.') + '</p><h2>Saved filter views</h2>' + (device.views.map(v => '<div class="panel workspace-saved-row"><a href="' + e(savedViewUrl(v)) + '">' + e(v.name) + '</a><button data-delete-view="' + e(v.id) + '" aria-label="Delete saved view ' + e(v.name) + '">Delete</button></div>').join('') || '<p>No filter views saved yet. Use Save current view from any Library selection.</p>') + '<h2>Bookmarked notes</h2>' + (notes.map(note).join('') || '<p>No bookmarked published notes.</p>') + '<h2>Bookmarked questions</h2>' + (questions.map(q => '<article class="panel"><h3>' + e(q.stem) + '</h3><button data-one-study="' + e(q.questionVersionId) + '">Practice original question</button><button data-bookmark="question:' + e(q.questionId) + '" aria-pressed="true">Remove bookmark</button></article>').join('') || '<p>No bookmarked published questions. Unavailable catalog records are not reconstructed.</p>');
}
export function workspaceMarkup(view, data, options = {}) {
  if (options.library) options = {...options,library:preparationLibrary(options.library,options.scope)};
  if (view === 'subjects') return subjects(options.library || data, options);
  if (view === 'compare') return compare(data, options);
  if (view === 'foundation') return foundation(data);
  if (view === 'references') return references(data, options);
  if (['media', 'atlas', 'images'].includes(view)) return media(view, data, options);
  if (view === 'recall') return recall(data, options);
  if (view === 'savedviews') return saved(options.library || data, options);
  if (view === 'cases') return '<p>Published clinical vignettes retain their original facts. Open a case question below for server-scored practice. Progressive findings appear only when reviewed sequential-case content is supplied.</p>';
  if (view === 'skills') return '<p>Use the reviewed skill or viva note as a self-review checklist. Keep your observations in private notes; this does not certify a clinical skill.</p>' + (data.notes.map(note).join('') || empty('No published skills or viva reference notes match this selection.'));
  return '';
}
