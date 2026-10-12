import test from 'node:test';
import assert from 'node:assert/strict';
import { navigationFor, routeIdentity } from '../src/domain/app-navigation.js';
const { canSwitchLibraryView } = await import('../src/domain/app-navigation.js');
const module = await import('../src/domain/library-workspaces.js');
const select = (...args) => { assert.equal(typeof module.studySelection, 'function', 'configured sessions select bounded original versions'); return module.studySelection(...args); };
test('configured count selects exact original versions from the filtered published pool', () => {
  const data = { questions: [{ questionVersionId: 'q1@2' }, { questionVersionId: 'q2@1' }, { questionVersionId: 'q3@1' }] };
  assert.deepEqual(select(data, 2), ['q1@2', 'q2@1']);
});
test('a smaller available pool stays smaller without creating questions', () => {
  assert.deepEqual(select({ questions: [{ questionVersionId: 'q1@1' }] }, 15), ['q1@1']);
  assert.deepEqual(select({ questions: [] }, 15), []);
});
test('invalid session counts cannot widen the server selection boundary', () => {
  for (const count of [0, -1, 51, 1.5, '10', NaN]) assert.throws(() => select({ questions: [] }, count));
});
test('Build Session opens the shared filtered library with Study navigation ownership', () => {
  const href = navigationFor('study').find(x => x.id === 'build').href;
  const url = new URL(href, 'https://example.invalid');
  assert.equal(url.pathname, '/web/library.html');
  assert.equal(url.searchParams.get('build'), '1');
  assert.deepEqual(routeIdentity(url.pathname, url.search), { master: 'study', section: 'build' });
});
test('inline Library view switching preserves workspace ownership rather than swallowing builder handoffs', () => {
  assert.equal(typeof canSwitchLibraryView, 'function');
  const path = '/web/library.html';
  assert.equal(canSwitchLibraryView(path, '?view=notes', path, '?view=graph'), true);
  assert.equal(canSwitchLibraryView(path, '?view=notes', path, '?view=questions&build=1'), false);
  assert.equal(canSwitchLibraryView(path, '?view=questions&build=1', path, '?view=notes'), false);
  assert.equal(canSwitchLibraryView(path, '?view=questions&build=1', path, '?view=graph&build=1'), true);
});
