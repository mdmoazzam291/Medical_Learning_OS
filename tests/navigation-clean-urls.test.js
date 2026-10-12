import test from 'node:test';
import assert from 'node:assert/strict';
import { MASTERS, navigationFor, routeIdentity, canSwitchLibraryView, navigationHrefMatches } from '../src/domain/app-navigation.js';
const flatten = rows => rows.flatMap(row => [row, ...flatten(row.children)]);
test('hosted clean URLs select the same master, section and fragment as HTML menu links', () => {
  for (const row of MASTERS.flatMap(master => flatten(navigationFor(master.id, { isAdmin: true })))) {
    const url = new URL(row.href, 'https://example.invalid');
    if (!url.pathname.endsWith('.html')) continue;
    const expected = routeIdentity(url.pathname, url.search, url.hash);
    for (const path of [url.pathname.slice(0, -5), url.pathname.slice(0, -5) + '/']) {
      assert.deepEqual(routeIdentity(path, url.search, url.hash), expected, row.href + ' → ' + path);
    }
  }
});
test('clean Library routes retain shared-view switching and builder boundaries', () => {
  assert.equal(canSwitchLibraryView('/web/library', '?view=notes', '/web/library.html', '?view=graph'), true);
  assert.equal(canSwitchLibraryView('/web/library.html', '?view=notes', '/web/library/', '?view=questions'), true);
  assert.equal(canSwitchLibraryView('/web/library', '?view=notes&build=1', '/web/library', '?view=graph'), false);
  assert.equal(canSwitchLibraryView('/web/library', '?view=media&category=radiology', '/web/library', '?view=notes'), false);
});
test('nested destination markers match canonical clean URLs and their exact selection', () => {
  assert.equal(navigationHrefMatches('/web/library.html?view=subjects&subject=anatomy&module=histology', '/web/library?view=subjects&subject=anatomy&module=histology'), true);
  assert.equal(navigationHrefMatches('/web/library.html?view=subjects&subject=anatomy&module=histology', '/web/library?view=subjects&subject=anatomy&module=embryology'), false);
  assert.equal(navigationHrefMatches('/web/review.html?workspace=references', '/web/review?workspace=references'), true);
});
test('the published OAuth consent rewrite retains Account navigation ownership', () => {
  assert.deepEqual(routeIdentity('/oauth/consent', '?authorization_id=fixture'), { master: 'account', section: 'overview' });
});
