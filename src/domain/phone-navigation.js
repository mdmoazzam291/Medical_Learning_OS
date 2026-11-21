// Phone navigation model (ADR-155): area menus for the bottom tab bar, learner-local
// "your pages", concept shortcuts and page/action suggestions for the header search.
// Pure functions only: the DOM adapter lives in web/phone-navigation.js.
import { navigationFor, MASTERS } from './app-navigation.js';

export const PHONE_AREAS = Object.freeze(['home', 'study', 'library', 'exams']);

const GROUPS = Object.freeze({
  home: [['', ['today', 'resume', 'progress', 'recent', 'material']]],
  study: [['Start', ['practice', 'mistakes', 'revision']], ['Practise', ['build', 'recall', 'cases', 'images', 'skills']], ['Browse', ['subjects']]],
  library: [['Browse', ['overview', 'subjects', 'notes', 'questions']], ['Visual', ['graph', 'atlas', 'media']], ['Tools', ['references', 'compare', 'foundation']], ['Yours', ['mynotes', 'savedviews']]],
  exams: [['', ['simulator', 'dna', 'past', 'autopsy', 'rules']]]
});

const DESCRIPTIONS = Object.freeze({
  'home:today': 'Your next step', 'home:resume': 'Pick up the last session', 'home:progress': 'Trends over weeks', 'home:recent': 'What you did lately', 'home:material': 'What is new to study',
  'study:practice': 'Best next set for you', 'study:mistakes': 'Questions you got wrong', 'study:revision': 'Spaced reviews', 'study:build': 'Build a question set', 'study:recall': 'Active recall', 'study:cases': 'Case-based reasoning', 'study:images': 'Spot the diagnosis', 'study:skills': 'Oral and practical prep', 'study:subjects': 'Study by subject',
  'library:overview': 'Find any concept', 'library:subjects': 'NMC subjects and topics', 'library:notes': 'Read and annotate', 'library:questions': 'Question bank', 'library:graph': 'How concepts connect', 'library:atlas': 'Anatomy and images', 'library:media': 'Videos and figures', 'library:references': 'Normal values and scores', 'library:compare': 'Side by side', 'library:foundation': 'What to learn first', 'library:mynotes': 'Your annotations', 'library:savedviews': 'Saved filters',
  'exams:simulator': 'Full-length mocks', 'exams:dna': 'Past-year patterns', 'exams:past': 'Your attempts', 'exams:autopsy': 'Analyse a grand test', 'exams:rules': 'Dates and pattern'
});

const DEFAULT_YOURS = Object.freeze({ home: ['today', 'progress', 'recent'], study: ['practice', 'mistakes', 'revision', 'build'], library: ['notes', 'questions', 'references', 'graph'], exams: ['simulator', 'past', 'dna'] });
const YOURS_LIMIT = 4;

export function isPhoneArea(master) { return PHONE_AREAS.includes(master); }

export function areaLabel(master) { return MASTERS.find(m => m.id === master)?.label || ''; }

export function areaStart(master) {
  const row = navigationFor(master)[0];
  return row ? { label: row.label, href: row.href } : null;
}

// Rows of one area, with description, pin state and current marker.
function areaRows(area, { isAdmin = false, current = {}, pins = [] } = {}) {
  return navigationFor(area, { isAdmin }).map(row => {
    const key = area + ':' + row.id;
    return { key, id: row.id, label: row.label, href: row.href, description: DESCRIPTIONS[key] || '', pinned: pins.includes(key), current: current.master === area && current.section === row.id };
  });
}

// "Your pages": the learner's most visited pages in this area (counted on this device),
// topped up from sensible defaults so a new learner still sees a short list.
export function yourPages(area, visits = {}, rows = areaRows(area)) {
  const byId = new Map(rows.map(r => [r.id, r]));
  const visited = rows.map(r => [r, Number(visits[r.key]) || 0]).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([r]) => r);
  const picked = [];
  for (const row of [...visited, ...(DEFAULT_YOURS[area] || []).map(id => byId.get(id)).filter(Boolean)]) {
    if (!picked.includes(row)) picked.push(row);
    if (picked.length === YOURS_LIMIT) break;
  }
  return picked;
}

// Shortcuts to one canonical concept across areas; every target view honours the library
// `concept` filter, so the same concept stays selected after the jump.
export function conceptShortcuts(conceptId, current = {}) {
  if (!conceptId) return [];
  const c = encodeURIComponent(conceptId);
  const links = [
    ['Notes', 'library', 'notes', '/web/library.html?view=notes&concept=' + c],
    ['Questions', 'library', 'questions', '/web/library.html?view=questions&concept=' + c],
    ['Flashcards', 'study', 'recall', '/web/library.html?view=recall&master=study&concept=' + c],
    ['Graph', 'library', 'graph', '/web/library.html?view=graph&concept=' + c],
    ['Compare', 'library', 'compare', '/web/library.html?view=compare&concept=' + c],
    ['My notes', 'library', 'mynotes', '/web/vault.html?concept=' + c]
  ];
  return links.map(([label, master, section, href]) => ({ label, href, current: current.master === master && current.section === section }));
}

export function areaMenuModel(area, { isAdmin = false, current = {}, visits = {}, pins = [], conceptId = '', conceptLabel = '' } = {}) {
  if (!isPhoneArea(area)) return null;
  const rows = areaRows(area, { isAdmin, current, pins });
  const byId = new Map(rows.map(r => [r.id, r]));
  const listed = new Set();
  const groups = (GROUPS[area] || []).map(([name, ids]) => ({ name, rows: ids.map(id => byId.get(id)).filter(Boolean) })).map(g => { g.rows.forEach(r => listed.add(r.id)); return g; });
  const rest = rows.filter(r => !listed.has(r.id));
  if (rest.length) groups.push({ name: 'More', rows: rest });
  const pinnedRows = pins.flatMap(key => {
    const [master, id] = key.split(':');
    if (!isPhoneArea(master)) return [];
    const row = areaRows(master, { isAdmin, current, pins }).find(r => r.id === id);
    return row ? [{ ...row, areaLabel: areaLabel(master) }] : [];
  });
  return {
    area, label: areaLabel(area), start: areaStart(area), count: rows.length,
    concept: conceptId ? { id: conceptId, label: conceptLabel || 'This concept', links: conceptShortcuts(conceptId, current) } : null,
    pinned: pinnedRows, yours: yourPages(area, visits, rows), groups
  };
}

// Header search suggestions: things to do and pages to go to, matched by words.
const ACTIONS = Object.freeze([
  { label: 'Start Study Now', detail: 'Best next set for you', href: '/web/medical.html#question-browser', words: 'start study now practice questions next' },
  { label: 'Start mistake review', detail: 'Questions you got wrong', href: '/web/workspace.html?master=study&section=mistakes', words: 'start mistake mistakes wrong review' },
  { label: 'Start revision', detail: 'Spaced reviews', href: '/web/workspace.html?master=study&section=revision', words: 'start revision revise spaced review due' },
  { label: 'Start a timed test', detail: 'Exam simulator', href: '/web/exam.html', words: 'start timed test mock exam simulator grand' },
  { label: 'Set exam goals', detail: 'Preferences', href: '/web/workspace.html?master=account&section=preferences', words: 'set exam goals target preferences' }
]);

export function searchSuggestions(query, { isAdmin = false, limit = 5 } = {}) {
  const terms = String(query || '').toLowerCase().split(/\s+/).filter(t => t.length >= 2);
  if (!terms.length) return { actions: [], pages: [] };
  const hit = text => terms.every(t => text.toLowerCase().includes(t));
  const actions = ACTIONS.filter(a => hit(a.label + ' ' + a.words)).slice(0, 2).map(({ label, detail, href }) => ({ label, detail, href }));
  const pages = PHONE_AREAS.flatMap(area => areaRows(area, { isAdmin }).map(r => ({ label: r.label, detail: areaLabel(area) + (r.description ? ' · ' + r.description : ''), href: r.href, text: r.label + ' ' + r.description + ' ' + areaLabel(area) })))
    .filter(p => hit(p.text)).slice(0, limit).map(({ label, detail, href }) => ({ label, detail, href }));
  return { actions, pages };
}

// Device-local study resume record, keyed by learner so one device can be shared safely.
export function resumeRecordFor(record, userId, now = Date.now()) {
  if (!record || !userId || record.userId !== userId || !record.sessionId) return null;
  if (!(now - Number(record.at) < 7 * 24 * 3600 * 1000)) return null;
  if (!(Number.isInteger(record.position) && Number.isInteger(record.total) && record.total > 0)) return null;
  return { sessionId: record.sessionId, position: record.position, total: record.total, href: '/web/medical.html?resume=' + encodeURIComponent(record.sessionId) };
}

export function nextResumeRecord(previous, { userId, session, summaryShown = false }, now = Date.now()) {
  if (!userId || !session?.sessionId) return previous || null;
  const finished = session.closed || session.summaryPending || session.summaryUnavailable || session.resumeUnavailable || summaryShown;
  if (finished) return previous?.sessionId === session.sessionId ? null : (previous || null);
  if (session.resumePending || !Number.isInteger(session.position) || !Number.isInteger(session.total)) return previous || null;
  return { userId, sessionId: session.sessionId, position: session.position, total: session.total, at: now };
}
