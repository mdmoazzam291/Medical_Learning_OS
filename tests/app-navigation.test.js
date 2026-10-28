import test from 'node:test';
import assert from 'node:assert/strict';
const nav = await import('../src/domain/app-navigation.js').catch(() => null);
const requireNav = () => { assert.ok(nav, 'shared navigation model is implemented'); return nav; };

test('five learner destinations plus a permission-gated Admin master keep their approved order', () => {
  const { MASTERS, navigationFor } = requireNav();
  assert.deepEqual(MASTERS.map(x => x.label), ['Home', 'Study', 'Library', 'Exams', 'Account', 'Master Admin']);
  assert.equal(MASTERS.at(-1).adminOnly, true);
  for (const master of MASTERS) for (const row of navigationFor(master.id, { isAdmin: true })) {
    assert.ok(row.href.startsWith('/') && !row.href.startsWith('//'), row.id);
    assert.ok(row.icon && row.label, row.id);
  }
});

test('Subject Index and all nineteen subjects belong inside Subjects & Topics', () => {
  const { navigationFor, SUBJECT_INDEX } = requireNav();
  const rows = navigationFor('library');
  const subjects = rows.find(x => x.id === 'subjects');
  assert.equal(subjects.children[0].id, 'index');
  assert.deepEqual(subjects.children[0].children.map(x => x.id), SUBJECT_INDEX.map(x => x.id));
  assert.equal(SUBJECT_INDEX.length, 19);
  assert.ok(SUBJECT_INDEX.every(x => x.modules.length === 4));
  assert.ok(!rows.some(x => x.id === 'index'));
});

test('opening a second submenu retains the first and pins survive master changes', () => {
  const { changePreference, validatePreferences } = requireNav();
  let prefs = validatePreferences(null);
  prefs = changePreference(prefs, { type: 'group', id: 'library:subjects', open: true });
  prefs = changePreference(prefs, { type: 'group', id: 'library:references', open: true });
  prefs = changePreference(prefs, { type: 'pin', id: 'library:subjects' });
  assert.deepEqual(prefs.groups, ['library:subjects', 'library:references']);
  assert.deepEqual(validatePreferences(JSON.parse(JSON.stringify(prefs))).pins, ['library:subjects']);
  prefs = changePreference(prefs, { type: 'group', id: 'library:subjects', open: false });
  assert.deepEqual(prefs.groups, ['library:references']);
});

test('role filtering never trusts query strings or stored admin preferences', () => {
  const { navigationFor, pinnedSections } = requireNav();
  assert.ok(!navigationFor('account').some(x => x.id === 'admin'));
  assert.ok(!navigationFor('account', { isAdmin: true }).some(x => x.id === 'admin'));
  assert.deepEqual(navigationFor('admin'), []);
  assert.deepEqual(navigationFor('admin', { isAdmin: true }).map(x => x.id), ['overview', 'content', 'learners', 'research', 'operations']);
  assert.deepEqual(pinnedSections({ pins: ['account:admin', 'library:notes'] }, false).map(x => x.id), ['notes']);
});

test('malformed preferences discard arbitrary paths, private fields and unknown groups', () => {
  const { validatePreferences } = requireNav();
  const prefs = validatePreferences({ version: 1, expanded: 'yes', theme: 'code', pins: ['javascript:alert(1)', 'library:notes', 'library:notes'], groups: ['__proto__', 'library:subjects'], answer: 'private', token: 'secret' });
  assert.deepEqual(prefs, { version: 1, expanded: false, theme: 'light', palette: 'sage_precision', surfaceStyle: 'standard', pins: ['library:notes'], groups: ['library:subjects'] });
  assert.deepEqual(validatePreferences({ version: 999, expanded: true }).expanded, false);
});

test('approved palette defaults and migration preserve appearance, pins and groups', () => {
  const { validatePreferences, changePreference, preferenceStore } = requireNav();
  const old = { version: 1, theme: 'dark', expanded: true, pins: ['library:notes'], groups: ['library:subjects'] };
  const values = new Map([['mlos-navigation-v1', JSON.stringify(old)]]);
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const store = preferenceStore(() => storage);
  assert.deepEqual(store.read(), { ...old, palette: 'sage_precision', surfaceStyle: 'standard' });
  const lavender = changePreference(store.read(), { type: 'palette', value: 'lavender_precision' });
  store.write(lavender);
  assert.deepEqual(preferenceStore(() => storage).read(), { ...old, palette: 'lavender_precision', surfaceStyle: 'standard' });
  assert.equal(changePreference(lavender, { type: 'theme' }).palette, 'lavender_precision');
  assert.equal(validatePreferences({ ...old, palette: 'adaptive-dusk' }).palette, 'sage_precision');
});

test('blocked browser storage retains preferences in memory without claiming device persistence', () => {
  const { preferenceStore } = requireNav();
  const store = preferenceStore(() => { throw new Error('blocked'); });
  assert.equal(store.persistence, 'session');
  store.write({ ...store.read(), theme: 'dark', expanded: true });
  assert.equal(store.read().theme, 'dark');
  assert.equal(store.read().expanded, true);
  assert.equal(store.persistence, 'session');
});

test('route identity places private notes in Library and authenticated tools under Account', () => {
  const { routeIdentity } = requireNav();
  assert.deepEqual(routeIdentity('/web/vault.html', ''), { master: 'library', section: 'mynotes' });
  assert.deepEqual(routeIdentity('/web/admin.html', '?admin=true'), { master: 'admin', section: 'overview' });
  assert.deepEqual(routeIdentity('/web/content-import', ''), { master: 'admin', section: 'content' });
  assert.deepEqual(routeIdentity('/web/review', ''), { master: 'admin', section: 'content' });
  assert.deepEqual(routeIdentity('/web/review', '?workspace=references'), { master: 'admin', section: 'content' });
  assert.deepEqual(routeIdentity('/web/library.html', '?master=study&view=recall'), { master: 'study', section: 'recall' });
  assert.deepEqual(routeIdentity('/web/library.html', '?view=graph&subject=medicine'), { master: 'library', section: 'graph' });
});

test('Admin sidebar uses five nested groups and preserves genuine destinations', () => {
  const { navigationFor, routeIdentity, changePreference, validatePreferences } = requireNav();
  const groups = navigationFor('admin', { isAdmin: true });
  assert.deepEqual(groups.map(x => x.id), ['overview', 'content', 'learners', 'research', 'operations']);
  assert.deepEqual(groups.find(x => x.id === 'content').children.map(x => x.id), ['intake','relationships','snapshot','coverage','integrity','source-watch','review','references','rights']);
  assert.ok(groups.every(x => x.children.length > 0));
  assert.deepEqual(routeIdentity('/web/admin.html', '', '#owner-users'), { master: 'admin', section: 'learners' });
  assert.deepEqual(routeIdentity('/web/admin.html', '', '#owner-infrastructure-alerts'), { master: 'admin', section: 'operations' });
  assert.deepEqual(routeIdentity('/web/admin.html', '', '#owner-integrity'), { master: 'admin', section: 'content' });
  assert.deepEqual(routeIdentity('/web/admin.html', '', '#owner-coverage'), { master: 'admin', section: 'content' });
  assert.deepEqual(routeIdentity('/web/admin.html', '', '#owner-source-watch'), { master: 'admin', section: 'content' });

  assert.deepEqual(routeIdentity('/web/admin.html', '', '#owner-learning'), { master: 'admin', section: 'research' });
  let prefs = validatePreferences(null);
  prefs = changePreference(prefs, { type: 'group', id: 'admin:overview', open: true });
  prefs = changePreference(prefs, { type: 'group', id: 'admin:content', open: true });
  assert.deepEqual(prefs.groups, ['admin:overview', 'admin:content']);
  assert.deepEqual(navigationFor('admin', { isAdmin: false }), []);
});


test('Study subject leaves keep their contextual ownership without a second catalog', () => {
  const { navigationFor, routeIdentity, SUBJECT_INDEX } = requireNav();
  const subjects = navigationFor('study').find(row => row.id === 'subjects');
  assert.ok(subjects);
  assert.deepEqual(subjects.children.map(row => row.id), SUBJECT_INDEX.map(row => row.id));
  for (const row of subjects.children.flatMap(row => [row, ...row.children])) {
    const url = new URL(row.href, 'https://example.invalid');
    assert.deepEqual(routeIdentity(url.pathname, url.search), { master: 'study', section: 'subjects' });
  }
});

test('old navigation records acquire Standard without losing independent preferences', () => {
  const { validatePreferences } = requireNav();
  const old = { version: 1, expanded: true, theme: 'dark', palette: 'lavender_precision', pins: ['library:notes'], groups: ['library:subjects'] };
  assert.deepEqual(validatePreferences(old), { ...old, surfaceStyle: 'standard' });
  for (const value of [null, 'unknown', {}, false]) assert.equal(validatePreferences({ ...old, surfaceStyle: value }).surfaceStyle, 'standard');
});
test('Glass survives reload and palette and appearance edits without losing pins or groups', () => {
  const { preferenceStore, changePreference } = requireNav();
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const store = preferenceStore(() => storage);
  const before = store.write({ ...store.read(), theme: 'dark', palette: 'lavender_precision', expanded: true, pins: ['account:data'], groups: ['library:subjects', 'library:references'] });
  const glass = store.write(changePreference(before, { type: 'surfaceStyle', value: 'glass' }));
  assert.deepEqual(glass, { ...before, surfaceStyle: 'glass' });
  const reloaded = preferenceStore(() => storage).read();
  assert.deepEqual(reloaded, glass);
  const sage = changePreference(reloaded, { type: 'palette', value: 'sage_precision' });
  assert.equal(sage.surfaceStyle, 'glass');
  assert.equal(changePreference(sage, { type: 'theme' }).surfaceStyle, 'glass');
  assert.equal(changePreference(glass, { type: 'surfaceStyle', value: 'invalid' }).surfaceStyle, 'standard');
});
