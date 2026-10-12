import test from 'node:test';
import assert from 'node:assert/strict';
const view = await import('../web/navigation-view.js').catch(() => null);
const markup = options => { assert.ok(view, 'navigation can render the real shared shell'); return view.navigationMarkup(options); };
test('the header keeps five learner links and adds Admin immediately after Account only with server-backed access', () => {
  const html = markup({ master: 'library', section: 'subjects', prefs: {} });
  assert.match(html, /aria-label="Main navigation"/);
  assert.equal((html.split('</nav>')[0].match(/data-master=/g) || []).length, 5);
  assert.match(html, /name="search"/);
  assert.match(html, /aria-label="Switch to dark appearance"/);
  assert.ok(!html.split('</nav>')[0].includes('Admin'));
  const granted = markup({ master: 'admin', section: 'overview', prefs: { expanded: true }, isAdmin: true });
  const nav = granted.split('</nav>')[0];
  assert.equal((nav.match(/data-master=/g) || []).length, 6);
  assert.match(nav, /data-master="account"[\s\S]*data-master="admin"/);
  assert.match(nav, /data-master="admin"[^>]*aria-current="page"/);
});
test('an expanded panel nests independent subject and reference disclosures in their parents', () => {
  const html = markup({ master: 'library', section: 'subjects', prefs: { expanded: true, groups: ['library:subjects', 'library:subjects:index', 'library:references'] } });
  assert.match(html, /data-group="library:subjects" open/);
  assert.match(html, /data-group="library:subjects:index" open/);
  assert.match(html, /data-group="library:references" open/);
  assert.ok(html.indexOf('Subject Index') > html.indexOf('Subjects &amp; Topics'));
  assert.match(html, /Gross &amp; regional anatomy/);
});
test('rail controls expose click flyouts and pin shortcuts retain their original master ownership', () => {
  const html = markup({ master: 'study', section: 'build', prefs: { pins: ['library:subjects'] } });
  assert.match(html, /data-flyout="library:subjects"/);
  assert.match(html, /aria-label="Pinned shortcuts"/);
  assert.match(html, /aria-label="Expand navigation"/);
});
test('admin tools appear only with verified access', () => {
  assert.ok(!markup({ master: 'admin', prefs: { expanded: true } }).includes('Content Intake'));
  const granted = markup({ master: 'admin', section: 'content', prefs: { expanded: true, groups: ['admin:content'] }, isAdmin: true });
  assert.match(granted, /Content Intake/);
  assert.match(granted, /Review Workspace/);
  assert.match(granted, /Reference Review/);
  assert.ok(!markup({ master: 'account', prefs: { expanded: true }, isAdmin: true }).includes('Content Intake'));
  assert.match(granted, /href="\/web\/review.html" aria-current="page"/);
});
