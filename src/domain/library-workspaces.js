import { filterLibrary } from './content-library.js';
export const FILTER_KEYS = Object.freeze(['qualifier', 'medium', 'response', 'subject', 'system', 'organ', 'domain', 'task', 'exam', 'platform', 'concept', 'keyword', 'search']);
export const LIBRARY_VIEWS = Object.freeze(['subjects', 'notes', 'questions', 'graph', 'atlas', 'media', 'references', 'compare', 'foundation', 'savedviews', 'recall', 'cases', 'images', 'skills']);
const normal = text => String(text || '').normalize('NFKC').toLowerCase();
const tagged = (classification, tag) => !tag || [...(classification?.domains || []), ...(classification?.tasks || [])].includes(tag);
const imageKinds = new Set(['image', 'ecg-tracing', 'histology', 'audio', 'video']);
const categories = { 'ecg-traces': ['ecg-tracing'], histology: ['histology'], 'clinical-audio': ['audio'], 'procedure-videos': ['video'] };
export function studySelection(data, count = 50) {
  if (!Number.isInteger(count) || count < 1 || count > 50) throw new Error('Choose between 1 and 50 questions.');
  return data.questions.slice(0, count).map(q => q.questionVersionId);
}
export function selectWorkspace(library, options = {}) {
  const filters = { ...(options.filters || {}), ...(options.collection ? { home: options.collection } : {}) };
  const data = filterLibrary(library, filters);
  if (filters.search && !['exam', 'platform', 'home', 'keyword', 'qualifier', 'medium', 'response'].some(k => filters[k])) {
    const candidate = filterLibrary(library, { ...filters, search: '' });
    const matchingNotes = candidate.notes.filter(n => normal(n.title + ' ' + n.bodyMarkdown + ' ' + candidate.concepts.find(c => c.conceptId === n.conceptId)?.label).includes(normal(filters.search)));
    data.notes = [...new Map([...data.notes, ...matchingNotes].map(n => [n.noteVersionId, n])).values()];
    const ids = new Set(data.notes.map(n => n.conceptId));
    data.concepts = candidate.concepts.filter(c => ids.has(c.conceptId) || data.concepts.some(x => x.conceptId === c.conceptId));
  }
  const reference = options.view === 'skills' ? 'skills-procedures' : options.reference;
  const matchesTags = c => tagged(c, options.module) && tagged(c, reference);
  data.questions = data.questions.filter(q => {
    const presentation = q.intelligence?.presentation || [];
    return matchesTags(q.classification)
      && (!options.observed || (options.observed === 'repeated' ? q.observed.repeatedWrong : q.observed.state === options.observed))
      && (!['media', 'images', 'atlas'].includes(options.view) || presentation.some(x => imageKinds.has(x)))
      && (options.view !== 'cases' || presentation.some(x => ['clinical-vignette', 'sequential-case'].includes(x)))
      && (!options.category || tagged(q.classification, options.category) || (categories[options.category] || []).some(x => presentation.includes(x)))
      && (options.view !== 'atlas' || tagged(q.classification, 'atlas') || tagged(q.classification, 'anatomy'));
  });
  data.concepts = data.concepts.filter(c => matchesTags(c.classification));
  const conceptIds = new Set(data.concepts.map(c => c.conceptId));
  data.notes = data.notes.filter(n => conceptIds.has(n.conceptId));
  if (options.sort === 'wrong') data.questions.sort((a, b) => b.observed.wrong - a.observed.wrong || a.questionId.localeCompare(b.questionId));
  if (options.sort === 'alphabetical') data.questions.sort((a, b) => a.stem.localeCompare(b.stem));
  return data;
}
export function prerequisiteLinks(library) {
  const known = new Set(library.concepts.map(c => c.conceptId));
  return library.questions.flatMap(q => q.conceptLinks.filter(l => l.role === 'prerequisite' && known.has(l.conceptId)).flatMap(from => q.conceptLinks.filter(l => l.role === 'primary' && known.has(l.conceptId)).map(to => ({ from: from.conceptId, to: to.conceptId, questionVersionId: q.questionVersionId }))));
}
export function validateSavedViews(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values.filter(v => v && typeof v.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(v.id) && typeof v.name === 'string' && v.name.trim() && v.name.length <= 80 && LIBRARY_VIEWS.includes(v.view) && !seen.has(v.id) && seen.add(v.id)).slice(0, 30).map(v => ({ id: v.id, name: v.name.trim(), view: v.view, filters: Object.fromEntries(FILTER_KEYS.filter(k => typeof v.filters?.[k] === 'string' && v.filters[k].length <= 300).map(k => [k, v.filters[k]])), options: Object.fromEntries(['module', 'reference', 'category', 'collection', 'observed', 'sort'].filter(k => typeof v.options?.[k] === 'string' && /^[a-z0-9-]{0,100}$/.test(v.options[k])).map(k => [k, v.options[k]])) }));
}
export function savedViewUrl(view) {
  const valid = validateSavedViews([view])[0];
  if (!valid) return '/web/library.html';
  const p = new URLSearchParams({ view: valid.view });
  for (const [key, value] of Object.entries({ ...valid.filters, ...valid.options })) if (value) p.set(key, value);
  return '/web/library.html?' + p;
}
export function deviceCollections(storageAccess = () => globalThis.localStorage) {
  let state = { views: [], bookmarks: [] }, persistence = 'session';
  const clean = p => ({ views: validateSavedViews(p?.views), bookmarks: Array.isArray(p?.bookmarks) ? [...new Set(p.bookmarks.filter(x => typeof x === 'string' && /^(question|note):[a-zA-Z0-9:@._-]{1,150}$/.test(x)))].slice(0, 300) : [] });
  try { const saved = JSON.parse(storageAccess().getItem('mlos-library-device-v1') || 'null'); if (saved?.version === 1) state = clean(saved); persistence = 'device'; } catch { /* Optional device collection. */ }
  return { get persistence() { return persistence; }, read: () => structuredClone(state), write(value) { state = clean(value); try { storageAccess().setItem('mlos-library-device-v1', JSON.stringify({ version: 1, ...state })); persistence = 'device'; } catch { persistence = 'session'; } return this.read(); } };
}
