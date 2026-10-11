import test from 'node:test';
import assert from 'node:assert/strict';
const nav = await import('../src/domain/app-navigation.js').catch(() => null);
const requireNav = () => { assert.ok(nav, 'shared navigation model is implemented'); return nav; };

test('five masters retain the approved order and every section has a real local destination', () => {
  const { MASTERS, navigationFor } = requireNav();
  assert.deepEqual(MASTERS.map(x => x.label), ['Home', 'Study', 'Library', 'Exams', 'Account']);
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
  assert.ok(navigationFor('account', { isAdmin: true }).some(x => x.id === 'admin'));
  assert.deepEqual(pinnedSections({ pins: ['account:admin', 'library:notes'] }, false).map(x => x.id), ['notes']);
});

test('malformed preferences discard arbitrary paths, private fields and unknown groups', () => {
  const { validatePreferences } = requireNav();
  const prefs = validatePreferences({ version: 1, expanded: 'yes', theme: 'code', pins: ['javascript:alert(1)', 'library:notes', 'library:notes'], groups: ['__proto__', 'library:subjects'], answer: 'private', token: 'secret' });
  assert.deepEqual(prefs, { version: 1, expanded: false, theme: 'light', pins: ['library:notes'], groups: ['library:subjects'] });
  assert.deepEqual(validatePreferences({ version: 999, expanded: true }).expanded, false);
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
  assert.deepEqual(routeIdentity('/web/admin.html', '?admin=true'), { master: 'account', section: 'admin' });
  assert.deepEqual(routeIdentity('/web/library.html', '?master=study&view=recall'), { master: 'study', section: 'recall' });
  assert.deepEqual(routeIdentity('/web/library.html', '?view=graph&subject=medicine'), { master: 'library', section: 'graph' });
});
