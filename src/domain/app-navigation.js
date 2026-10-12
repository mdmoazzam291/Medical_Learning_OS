import { SUBJECT_INDEX } from './subject-index.js';
export { SUBJECT_INDEX };
const library = (view, extra = '') => '/web/library.html?view=' + view + extra;
const workspace = (master, section) => '/web/workspace.html?master=' + master + '&section=' + section;
const item = (id, label, icon, href, children = []) => ({ id, label, icon, href, children });
export const REFERENCES = Object.freeze([
  ['drugs-therapeutics', 'Drugs & therapeutics'], ['labs-diagnostics', 'Labs & diagnostics'],
  ['pathways-mechanisms', 'Pathways & mechanisms'], ['formulae-statistics', 'Formulae & statistics'],
  ['classifications-staging', 'Classifications & staging'], ['organisms-microbiology', 'Organisms & microbiology'],
  ['skills-procedures', 'Skills & procedures'], ['population-health', 'Population health'], ['ethics-forensic', 'Ethics & forensic references']
].map(([id, label]) => ({ id, label })));
export const MEDIA_TYPES = Object.freeze([
  ['radiology', 'Radiology'], ['histology', 'Histology'], ['clinical-photos', 'Clinical photographs'],
  ['ecg-traces', 'ECG & tracings'], ['anatomy', 'Anatomy'], ['graphs-charts', 'Graphs & charts'],
  ['microbiology', 'Microbiology'], ['instruments', 'Instruments'], ['clinical-audio', 'Clinical audio'],
  ['procedure-videos', 'Procedure videos'], ['mechanism-animations', 'Mechanism animations']
].map(([id, label]) => ({ id, label })));
const libraryRows = [
  item('subjects', 'Subjects & Topics', 'subjects', library('subjects'), [item('index', 'Subject Index', 'subjects', library('subjects'), SUBJECT_INDEX.map(s => item(s.id, s.label, 'book', library('subjects', '&subject=' + s.id), s.modules.map(m => item(m.id, m.label, 'book', library('subjects', '&subject=' + s.id + '&module=' + m.id))))))]),
  item('notes', 'Concept Notes', 'book', library('notes')),
  item('questions', 'Questions', 'questions', library('questions')),
  item('graph', 'Knowledge Graph', 'graph', library('graph')),
  item('atlas', 'Atlas', 'atlas', library('atlas'), [item('systems', 'Systems & organs', 'atlas', library('atlas'))]),
  item('media', 'Media Library', 'image', library('media'), MEDIA_TYPES.map(m => item(m.id, m.label, 'image', library('media', '&category=' + m.id)))),
  item('references', 'Reference Tools', 'reference', library('references'), [item('index', 'Reference Index', 'reference', library('references'), REFERENCES.map(r => item(r.id, r.label, 'reference', library('references', '&reference=' + r.id))))]),
  item('compare', 'Compare Concepts', 'compare', library('compare')),
  item('foundation', 'Prerequisite Paths', 'path', library('foundation')),
  item('mynotes', 'My Notes', 'edit', '/web/vault.html'),
  item('savedviews', 'Saved Views', 'pin', library('savedviews'))
];
export const MASTERS = Object.freeze([
  { id: 'home', label: 'Home', icon: 'home', href: '/' },
  { id: 'study', label: 'Study', icon: 'book', href: '/web/medical.html' },
  { id: 'library', label: 'Library', icon: 'reference', href: library('subjects') },
  { id: 'exams', label: 'Exams', icon: 'exam', href: '/web/exam.html' },
  { id: 'account', label: 'Account', icon: 'user', href: '/web/account.html' },
  { id: 'admin', label: 'Admin', icon: 'settings', href: '/web/admin.html', adminOnly: true }
]);
const SECTIONS = {
  home: [item('today', 'Today', 'home', '/'), item('resume', 'Resume', 'play', '/web/medical.html'), item('progress', 'Progress', 'graph', workspace('home', 'progress')), item('recent', 'Recent Activity', 'clock', workspace('home', 'recent')), item('material', 'Published Material', 'book', library('notes'))],
  study: [item('build', 'Build Session', 'settings', '/web/library.html?view=questions&master=study&build=1'), item('practice', 'Practice', 'play', '/web/medical.html#question-browser'), item('revision', 'Revision', 'clock', workspace('study', 'revision')), item('mistakes', 'Mistake Repair', 'repair', workspace('study', 'mistakes')), ...[['recall', 'Recall & Flashcards', 'book'], ['cases', 'Clinical Cases', 'cases'], ['images', 'Image Drills', 'image'], ['skills', 'Skills & Viva', 'skills']].map(([id, label, icon]) => item(id, label, icon, library(id, '&master=study')))],
  library: libraryRows,
  exams: [item('simulator', 'Simulator', 'exam', '/web/exam.html'), item('dna', 'Exam DNA / PYQs', 'graph', workspace('exams', 'dna')), item('past', 'Past Runs', 'clock', workspace('exams', 'past')), item('autopsy', 'GT Autopsy', 'repair', workspace('exams', 'autopsy')), item('rules', 'Exam Plan & Rules', 'settings', workspace('exams', 'rules'))],
  account: [item('overview', 'Overview', 'user', '/web/account.html'), item('preferences', 'Preferences', 'settings', workspace('account', 'preferences')), item('data', 'My Data', 'reference', workspace('account', 'data')), item('research', 'Research Participation', 'cases', '/web/account.html#research')],
  admin: [
    item('overview', 'Overview', 'home', '/web/admin.html', [
      item('actions', 'Action Inbox', 'repair', '/web/admin.html#admin-actions'),
      item('snapshot', 'Platform Snapshot', 'graph', '/web/admin.html#owner-overview')
    ]),
    item('content', 'Content & Quality', 'book', '/web/content-import.html', [
      item('intake', 'Content Intake', 'book', '/web/content-import.html'),
      item('review', 'Review Workspace', 'edit', '/web/review.html'),
      item('references', 'Reference Review', 'reference', '/web/review.html?workspace=references'),
      item('rights', 'Source Rights', 'reference', '/web/review.html?workspace=rights')
    ]),
    item('learners', 'Learners & Access', 'user', '/web/admin.html#owner-users', [
      item('accounts', 'Learner Accounts', 'user', '/web/admin.html#owner-users'),
      item('authority', 'Reviewer Authority', 'settings', '/web/admin.html#owner-review-authority')
    ]),
    item('research', 'Learning & Research', 'graph', '/web/admin.html#research-gate', [
      item('learning', 'Observed Learning', 'graph', '/web/admin.html#owner-learning'),
      item('readiness', 'Research Readiness', 'cases', '/web/admin.html#research-gate'),
      item('ai', 'AI Usage Evidence', 'settings', '/web/admin.html#owner-ai')
    ]),
    item('operations', 'System Operations', 'settings', '/web/admin.html#owner-infrastructure', [
      item('health', 'Provider Health', 'settings', '/web/admin.html#owner-infrastructure'),
      item('alerts', 'Infrastructure Alerts', 'repair', '/web/admin.html#owner-infrastructure-alerts'),
      item('features', 'Feature Gates', 'settings', '/web/admin.html#owner-features')
    ])
  ]
};
export function navigationFor(master, { isAdmin = false } = {}) {
  if (master === 'admin' && isAdmin !== true) return [];
  return (SECTIONS[master] || SECTIONS.home).filter(row => !row.adminOnly || isAdmin === true);
}
const sectionKeys = new Set(Object.entries(SECTIONS).flatMap(([master, rows]) => rows.map(row => master + ':' + row.id)));
const groupKeys = new Set();
function groups(rows, prefix) { for (const row of rows) if (row.children.length) { const key = prefix + ':' + row.id; groupKeys.add(key); groups(row.children, key); } }
for (const [master, rows] of Object.entries(SECTIONS)) groups(rows, master);
export function validatePreferences(value) {
  const p = value && value.version === 1 ? value : {};
  const allowed = (values, keys) => Array.isArray(values) ? [...new Set(values.filter(v => typeof v === 'string' && keys.has(v)))].slice(0, 120) : [];
  return { version: 1, expanded: p.expanded === true, theme: p.theme === 'dark' ? 'dark' : 'light', pins: allowed(p.pins, sectionKeys), groups: allowed(p.groups, groupKeys) };
}
export function changePreference(value, action) {
  const p = validatePreferences(value);
  if (action.type === 'theme') p.theme = p.theme === 'light' ? 'dark' : 'light';
  if (action.type === 'expanded') p.expanded = action.open === true;
  if (action.type === 'pin' && sectionKeys.has(action.id)) p.pins = p.pins.includes(action.id) ? p.pins.filter(x => x !== action.id) : [...p.pins, action.id];
  if (action.type === 'group' && groupKeys.has(action.id)) p.groups = action.open ? [...new Set([...p.groups, action.id])] : p.groups.filter(x => x !== action.id);
  return validatePreferences(p);
}
export function pinnedSections(prefs, isAdmin = false) {
  return (prefs.pins || []).flatMap(key => { const [master, id] = key.split(':'); const row = navigationFor(master, { isAdmin }).find(x => x.id === id); return row ? [{ ...row, master, key }] : []; });
}
export function preferenceStore(storageAccess = () => globalThis.localStorage) {
  let memory = validatePreferences(null), persistence = 'session';
  try { const storage = storageAccess(); memory = validatePreferences(JSON.parse(storage.getItem('mlos-navigation-v1') || 'null')); storage.setItem('mlos-navigation-v1', JSON.stringify(memory)); persistence = 'device'; } catch { /* Page memory remains usable. */ }
  return { get persistence() { return persistence; }, read: () => structuredClone(memory), write(value) { memory = validatePreferences(value); try { storageAccess().setItem('mlos-navigation-v1', JSON.stringify(memory)); persistence = 'device'; } catch { persistence = 'session'; } return this.read(); } };
}
export function canonicalPagePath(pathname) {
  if (pathname === '/oauth/consent') return '/web/oauth-consent.html';
  return /^\/web\/[a-z][a-z-]*\/?$/.test(pathname) ? pathname.replace(/\/$/, '') + '.html' : pathname;
}
export function canSwitchLibraryView(pathname, search, targetPathname, targetSearch) {
  pathname = canonicalPagePath(pathname); targetPathname = canonicalPagePath(targetPathname);
  const current = new URLSearchParams(search), target = new URLSearchParams(targetSearch);
  return pathname === '/web/library.html' && targetPathname === pathname
    && (current.get('build') === '1') === (target.get('build') === '1')
    && ['notes', 'questions', 'graph'].includes(current.get('view') || 'notes')
    && ['notes', 'questions', 'graph'].includes(target.get('view'));
}
export function reviewEntryKind(search, grants) {
  const allowed = Array.isArray(grants) ? grants.filter(kind => ['medical', 'references', 'rights'].includes(kind)) : [];
  const requested = new URLSearchParams(search).get('workspace');
  return allowed.includes(requested) ? requested : allowed[0] || null;
}
export function navigationHrefMatches(href, currentHref) {
  if (!currentHref) return false;
  const target = new URL(href, 'https://navigation.invalid'), current = new URL(currentHref, 'https://navigation.invalid');
  const targetPath = canonicalPagePath(target.pathname);
  if (targetPath !== canonicalPagePath(current.pathname) || target.hash !== current.hash) return false;
  const keys = targetPath.endsWith('/library.html')
    ? ['view', 'build', ...(target.searchParams.get('view') === 'subjects' ? ['subject', 'module'] : target.searchParams.get('view') === 'media' ? ['category'] : target.searchParams.get('view') === 'references' ? ['reference'] : [])]
    : ['master', 'section', 'workspace'];
  return keys.every(key => (target.searchParams.get(key) || '') === (current.searchParams.get(key) || ''));
}
export function routeIdentity(pathname, search = '', hash = '') {
  pathname = canonicalPagePath(pathname);
  const p = new URLSearchParams(search);
  if (pathname.endsWith('/workspace.html')) { const master = MASTERS.some(x => x.id === p.get('master')) ? p.get('master') : 'home'; const section = (SECTIONS[master] || []).some(x => x.id === p.get('section')) ? p.get('section') : SECTIONS[master][0].id; return { master, section }; }
  if (pathname.endsWith('/library.html')) { if (p.get('build') === '1') return { master: 'study', section: 'build' }; const view = p.get('view') || 'notes'; return ['recall', 'cases', 'images', 'skills'].includes(view) ? { master: 'study', section: view } : { master: 'library', section: libraryRows.some(x => x.id === view) ? view : 'notes' }; }
  if (pathname.endsWith('/vault.html')) return { master: 'library', section: 'mynotes' };
  if (pathname.endsWith('/medical.html')) return { master: 'study', section: 'practice' };
  if (pathname.endsWith('/exam.html')) return { master: 'exams', section: 'simulator' };
  if (pathname.endsWith('/admin.html')) {
    const ownerAnchors = { '#owner-users': 'learners', '#owner-review-authority': 'learners', '#owner-learning': 'research', '#research-gate': 'research', '#owner-ai': 'research', '#owner-infrastructure': 'operations', '#owner-infrastructure-alerts': 'operations', '#owner-features': 'operations' };
    return { master: 'admin', section: ownerAnchors[hash] || 'overview' };
  }
  if (pathname.endsWith('/content-import.html') || pathname.endsWith('/review.html')) return { master: 'admin', section: 'content' };
  if (/\/(account|oauth-consent|retention|retention-origin)\.html$/.test(pathname)) return { master: 'account', section: pathname.endsWith('/account.html') && hash === '#research' ? 'research' : 'overview' };
  return { master: 'home', section: 'today' };
}
