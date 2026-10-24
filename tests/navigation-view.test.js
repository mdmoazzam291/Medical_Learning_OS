import test from 'node:test';
import assert from 'node:assert/strict';
const view = await import('../web/navigation-view.js').catch(() => null);
const model = await import('../src/domain/app-navigation.js').catch(() => null);
const markup = options => { assert.ok(view, 'navigation can render the real shared shell'); return view.navigationMarkup({ signedIn: true, ...options }); };
test('phone navigation uses one workspace menu and hides the closed sidebar', () => {
  const html = markup({ phone: true, master: 'study', prefs: { expanded: false }, isAdmin: true });
  const header = html.split('</header>')[0];
  assert.match(header, /class="mlos-mobile-menu"/);
  assert.match(header, /aria-label="Expand navigation"/);
  assert.match(header, /<span>Study<\/span>/);
  assert.doesNotMatch(header.split('class="mlos-account"')[0], /data-master=/);
  assert.match(html, /<aside[^>]* hidden/);
  assert.equal((html.match(/aria-label="Main navigation"/g) || []).length, 1);
  assert.equal((html.match(/data-rail/g) || []).length, 1);
  assert.doesNotMatch(html.split('<aside')[1], /data-master="admin"/);
  assert.match(html, /aria-label="Account navigation"[\s\S]*data-master="admin"/);
  assert.doesNotMatch(markup({ phone: true, prefs: {} }), /data-master="admin"/);
  const opened = markup({ phone: true, master: 'study', prefs: { expanded: true } });
  assert.doesNotMatch(opened, /<aside[^>]* hidden/);
  assert.match(opened, /aria-label="Collapse navigation"/);
  assert.match(opened, /More study tools/);
});
test('the wide header keeps four learner masters and an authorized Admin destination', () => {
  const html = markup({ master: 'library', section: 'subjects', prefs: {} });
  assert.match(html, /aria-label="Main navigation"/);
  assert.equal((html.split('</nav>')[0].match(/data-master=/g) || []).length, 4);
  assert.match(html, /name="search"/);
  assert.match(html, /aria-label="Switch to dark appearance"/);
  assert.ok(!html.split('</nav>')[0].includes('Admin'));
  const granted = markup({ master: 'admin', section: 'overview', prefs: { expanded: true }, isAdmin: true });
  const nav = granted.split('</nav>')[0];
  assert.equal((nav.match(/data-master=/g) || []).length, 5);
  assert.doesNotMatch(nav, /data-master="account"/);
  assert.match(nav, /Master Admin/);
  assert.match(granted, /aria-label="Account menu"/);
  assert.match(granted, /data-master="admin"[^>]*aria-current="page"/);
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
  const html = markup({ phone: true, master: 'study', section: 'build', prefs: { pins: ['library:subjects'] } });
  assert.match(html, /data-flyout="library:subjects"/);
  assert.match(html, /aria-label="Pinned shortcuts"/);
  assert.match(html, /aria-label="Expand navigation"/);
});
test('collapsed Admin rail identifies the selected group without disclosing admin tools to learners', () => {
  const active = markup({ phone: true, master: 'admin', section: 'content', prefs: { expanded: false }, isAdmin: true });
  assert.match(active, /data-flyout="admin:content" data-active="true"/);
  assert.match(active, /data-flyout="admin:overview" data-active="false"/);
  const denied = markup({ phone: true, master: 'admin', section: 'content', prefs: { expanded: false }, isAdmin: false });
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

test('Admin expanded menu renders single destinations without cross-workspace pin actions', () => {
  const allGroups = ['overview', 'content', 'learners', 'research', 'operations'];
  const html = markup({
    master: 'admin', section: 'content', isAdmin: true,
    prefs: { expanded: true, groups: allGroups.map(key => 'admin:' + key) },
    currentHref: '/web/admin.html#owner-source-watch'
  });
  const local = html.split('<nav id="mlos-local-nav"')[1].split('</nav>')[0];
  for (const key of allGroups) {
    assert.equal((local.match(new RegExp('data-pin="admin:' + key + '"', 'g')) || []).length, 0,
      key + ' must not offer a pin that exposes Admin tools in learner menus');
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

test('collapsed Admin flyouts avoid duplicate parent links and preserve close actions', () => {
  const { flyoutMarkup } = view;
  const { navigationFor, validatePreferences } = model;
  const rows = navigationFor('admin', { isAdmin: true });
  const prefs = validatePreferences(null);
  for (const group of ['content', 'learners', 'research', 'operations']) {
    const row = rows.find(x => x.id === group);
    const flyout = flyoutMarkup(row, 'admin', prefs, row.href);
    assert.doesNotMatch(flyout, new RegExp('data-pin="admin:' + group + '"'));
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
    phone: true, master: 'study', section: 'practice', prefs: { expanded: false },
    currentHref: '/web/medical.html'
  });
  assert.match(collapsed, /href="\/web\/medical.html#question-browser" aria-label="Study Now"[^>]*aria-current="page"/);
});


test('avatar links use real account destinations and signed-out visitors get Sign in', () => {
  const html = markup({ master: 'account', signedIn: true });
  const account = html.split('class="mlos-account"')[1].split('</details>')[0];
  assert.match(account, /aria-label="Account menu"/);
  assert.match(account, /href="\/web\/account.html">[\s\S]*Profile/);
  assert.match(account, /master=account&amp;section=preferences/);
  assert.match(account, /Account &amp; Security/);
  assert.match(account, /data-signout/);
  assert.doesNotMatch(markup({ signedIn: false }), /data-signout/);
  assert.match(markup({ signedIn: false }), /Sign in/);
});

test('expanded Study navigation prioritizes the four approved destinations and nests all subjects', () => {
  const html = markup({ master: 'study', section: 'practice', prefs: { expanded: true, groups: ['study:subjects'] } });
  const local = html.split('<nav id="mlos-local-nav"')[1].split('</nav>')[0];
  const labels = ['Study Now', 'Subjects &amp; Topics', 'Questions', 'Mistake Review'];
  for (const label of labels) assert.ok(local.includes(label), label);
  assert.ok(labels.every((label, i) => !i || local.indexOf(labels[i - 1]) < local.indexOf(label)));
  assert.match(local, /data-group="study:subjects" open/);
  assert.match(local, /Anatomy/);
  assert.match(local, /More study tools/);
  assert.doesNotMatch(local, /Research Participation|Source Rights|Simulator/);
});


test('cross-workspace pins never repeat an existing local destination', () => {
  const html = markup({ master: 'library', section: 'notes', prefs: { expanded: true, pins: ['home:material'] } });
  assert.equal(html.split('href="/web/library.html?view=notes"').length - 1, 1);
});

test('larger screens expose separate workspace links and disclosures without a sidebar', () => {
  const html = markup({ master: 'library', section: 'notes', isAdmin: true });
  assert.doesNotMatch(html, /<aside/);
  for (const id of ['home', 'study', 'library', 'exams']) {
    assert.match(html, new RegExp('data-master="' + id + '"'));
    assert.match(html, new RegExp('data-workspace-menu="' + id + '"'));
  }
  assert.match(html, /id="mlos-workspace-menu"[^>]* hidden/);
  assert.doesNotMatch(markup({ master: 'library' }), /data-workspace-menu="admin"/);
});
test('workspace menus preserve every nested route and gate pinned Admin shortcuts', () => {
  assert.equal(typeof view.workspaceMenuMarkup, 'function');
  const flatten = rows => rows.flatMap(row => [row, ...flatten(row.children)]);
  for (const master of ['home', 'study', 'library', 'exams', 'account', 'admin']) {
    const html = view.workspaceMenuMarkup({ master, section: 'notes', prefs: { groups: ['library:subjects', 'library:references'] }, isAdmin: true });
    for (const row of flatten(model.navigationFor(master, { isAdmin: true }))) {
      assert.ok(html.includes('href="' + view.escapeText(row.href) + '"'), master + ':' + row.id);
    }
  }
  const denied = view.workspaceMenuMarkup({ master: 'admin', isAdmin: false, prefs: { pins: ['admin:content'] } });
  assert.doesNotMatch(denied, /Content Intake|Source Rights/);
});

test('the avatar retains access to every Account tool on larger screens', () => {
  const html = markup({ master: 'library', signedIn: true });
  const account = html.split('class="mlos-account"')[1].split('</details>')[0];
  assert.match(account, /data-workspace-menu="account"/);
  assert.match(account, /Account tools/);
});

test('compact master current marker follows the page when another tools menu is selected', () => {
  const html = view.workspaceMenuMarkup({ master: 'study', currentMaster: 'library', compactHeader: true, currentHref: '/web/library.html?view=notes' });
  assert.match(html, /data-master="library"[^>]*aria-current="page"/);
  assert.doesNotMatch(html, /data-master="study"[^>]*aria-current/);
  assert.match(html, /Study tools/);
});
