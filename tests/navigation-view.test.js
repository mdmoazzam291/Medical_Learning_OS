import test from 'node:test';
import assert from 'node:assert/strict';
const view = await import('../web/navigation-view.js').catch(() => null);
const model = await import('../src/domain/app-navigation.js').catch(() => null);
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
test('collapsed Admin rail identifies the selected group without disclosing admin tools to learners', () => {
  const active = markup({ master: 'admin', section: 'content', prefs: { expanded: false }, isAdmin: true });
  assert.match(active, /data-flyout="admin:content" data-active="true"/);
  assert.match(active, /data-flyout="admin:overview" data-active="false"/);
  const denied = markup({ master: 'admin', section: 'content', prefs: { expanded: false }, isAdmin: false });
  assert.ok(!denied.includes('data-flyout="admin:content"'));
});
test('admin tools appear only with verified access', () => {
  assert.ok(!markup({ master: 'admin', prefs: { expanded: true } }).includes('Content Intake'));
  const granted = markup({ master: 'admin', section: 'content', prefs: { expanded: true, groups: ['admin:content'] }, isAdmin: true });
  assert.match(granted, /Content Intake/);
  assert.match(granted, /Review Workspace/);
  assert.match(granted, /Reference Review/);
  assert.ok(!markup({ master: 'account', prefs: { expanded: true }, isAdmin: true }).includes('Content Intake'));
  assert.match(granted, /data-group="admin:content" open/);
  assert.match(granted, /Source Rights/);
  assert.ok(granted.includes('href="/web/review.html"'));
});

test('Admin expanded sidebar renders a single destination and a working pin for every group', () => {
  const allGroups = ['overview', 'content', 'learners', 'research', 'operations'];
  const html = markup({
    master: 'admin', section: 'content', isAdmin: true,
    prefs: { expanded: true, groups: allGroups.map(key => 'admin:' + key) },
    currentHref: '/web/admin.html#owner-source-watch'
  });
  const local = html.split('<nav id="mlos-local-nav"')[1].split('</nav>')[0];
  for (const key of allGroups) {
    assert.equal((local.match(new RegExp('data-pin="admin:' + key + '"', 'g')) || []).length, 1,
      key + ' must remain pinnable without a redundant Open link');
  }
  for (const href of [
    '/web/content-import.html', '/web/admin.html#owner-users',
    '/web/admin.html#research-gate', '/web/admin.html#owner-infrastructure'
  ]) {
    assert.equal(local.split('href="' + href + '"').length - 1, 1,
      href + ' must appear once when both parent and first child target it');
  }
  assert.match(local, /data-group="admin:content" open data-active="true"/);
  assert.match(local, /href="\/web\/admin.html#owner-source-watch" aria-current="page"/);
  assert.ok(!local.includes('Open Content &amp; Quality'));
});

test('collapsed Admin flyouts avoid duplicate parent links while retaining pin and close actions', () => {
  const { flyoutMarkup } = view;
  const { navigationFor, validatePreferences } = model;
  const rows = navigationFor('admin', { isAdmin: true });
  const prefs = validatePreferences(null);
  for (const group of ['content', 'learners', 'research', 'operations']) {
    const row = rows.find(x => x.id === group);
    const flyout = flyoutMarkup(row, 'admin', prefs, row.href);
    assert.match(flyout, new RegExp('data-pin="admin:' + group + '"'));
    assert.match(flyout, /data-close-flyout/);
    assert.match(flyout, /class="mlos-flyout-title"/);
    assert.equal(flyout.split('href="' + row.href + '"').length - 1, 1,
      group + ' flyout must not duplicate its first child route');
  }
  const overview = rows.find(x => x.id === 'overview');
  assert.match(flyoutMarkup(overview, 'admin', prefs), /class="mlos-flyout-heading"><a href="\/web\/admin.html"/);
});

test('Admin deep links mark only the exact destination current, not the group landing page', () => {
  const html = markup({
    master: 'admin', section: 'overview', isAdmin: true,
    prefs: { expanded: true, groups: ['admin:overview'] },
    currentHref: '/web/admin.html#admin-actions'
  });
  const local = html.split('<nav id="mlos-local-nav"')[1].split('</nav>')[0];
  assert.match(local, /href="\/web\/admin.html#admin-actions" aria-current="page"/);
  assert.doesNotMatch(local, /href="\/web\/admin.html" aria-current="page"/);
  assert.equal((local.match(/aria-current="page"/g) || []).length, 1);

  const root = markup({
    master: 'admin', section: 'overview', isAdmin: true,
    prefs: { expanded: true, groups: ['admin:overview'] }, currentHref: '/web/admin.html'
  });
  assert.match(root, /href="\/web\/admin.html" aria-current="page"/);
});

test('standalone Study Practice remains selected on its landing page despite its deep-link href', () => {
  const collapsed = markup({
    master: 'study', section: 'practice', prefs: { expanded: false },
    currentHref: '/web/medical.html'
  });
  assert.match(collapsed, /href="\/web\/medical.html#question-browser" aria-label="Practice"[^>]*aria-current="page"/);
});
