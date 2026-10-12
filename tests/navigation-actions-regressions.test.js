import test from 'node:test';
import assert from 'node:assert/strict';
import { navigationFor, routeIdentity, canSwitchLibraryView } from '../src/domain/app-navigation.js';
import { childrenMarkup } from '../web/navigation-view.js';
const nav = await import('../src/domain/app-navigation.js');
test('Practice selects its own menu instead of the separate Build Session destination', () => {
  const u = new URL(navigationFor('study').find(x => x.id === 'practice').href, 'https://example.invalid');
  assert.deepEqual(routeIdentity(u.pathname, u.search, u.hash), { master: 'study', section: 'practice' });
});
test('the research fragment selects Research Participation on the Account page', () => {
  assert.deepEqual(routeIdentity('/web/account.html', '', '#research'), { master: 'account', section: 'research' });
});
test('only the three shared Library representations can switch in place', () => {
  for (const view of ['atlas', 'media', 'references', 'recall', 'images']) {
    assert.equal(canSwitchLibraryView('/web/library.html', '?view=' + view + '&category=radiology', '/web/library.html', '?view=notes'), false, view);
  }
  assert.equal(canSwitchLibraryView('/web/library.html', '?view=notes&subject=medicine', '/web/library.html', '?view=graph'), true);
});
test('Reference Review opens the requested authorized gate, never a query-granted permission', () => {
  assert.equal(typeof nav.reviewEntryKind, 'function');
  assert.equal(nav.reviewEntryKind('?workspace=references', ['medical', 'references', 'rights']), 'references');
  assert.equal(nav.reviewEntryKind('?workspace=references', ['medical']), 'medical');
  assert.equal(nav.reviewEntryKind('?workspace=references', []), null);
});
test('nested module links identify the exact active module', () => {
  const subject = navigationFor('library').find(x => x.id === 'subjects').children[0].children[0];
  const target = subject.children[0].href;
  const html = childrenMarkup(subject.children, 'library:subjects:index:' + subject.id, { groups: [] }, target);
  assert.match(html, /aria-current="page"/);
  assert.equal((html.match(/aria-current="page"/g) || []).length, 1);
});

test('media and reference leaf markers survive reading filters and remain gate-specific', () => {
  const matches = nav.navigationHrefMatches;
  assert.equal(matches('/web/library.html?view=media&category=radiology', '/web/library.html?view=media&category=radiology&subject=medicine&search=test'), true);
  assert.equal(matches('/web/library.html?view=references&reference=labs-diagnostics', '/web/library.html?view=references&reference=drugs-therapeutics'), false);
  assert.equal(matches('/web/review.html?workspace=references', '/web/review.html'), false);
  assert.equal(matches('/web/library.html?view=notes', '/web/library.html?view=notes&build=1'), false);
});
