import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPages } from './build-pages.js';
import { publicFileSet } from './public-surface.js';
import { MASTERS, navigationFor } from '../src/domain/app-navigation.js';
const engines = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const engine = process.env.BROWSER_ENGINE || 'chromium';
assert.ok(['chromium', 'webkit'].includes(engine));
const flatten = rows => rows.flatMap(row => [row, ...flatten(row.children)]);
const destinations = MASTERS.flatMap(master => flatten(navigationFor(master.id, { isAdmin: true })));
for (const row of destinations) {
  const target = new URL(row.href, 'http://localhost');
  assert.ok(publicFileSet.has(target.pathname === '/' ? 'web/index.html' : target.pathname.slice(1)), row.href);
}
const directory = await mkdtemp(join(tmpdir(), 'mlos-navigation-browser-'));
await buildPages({ outputDirectory: directory });
const headers = Object.fromEntries((await readFile(join(directory, '_headers'), 'utf8')).split('\n').filter(l => /^\s+[^:]+:/.test(l)).map(l => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost'), path = url.pathname;
  // Cloudflare static assets redirect HTML page links to canonical clean URLs.
  if (path.endsWith('.html') && publicFileSet.has(path.slice(1))) {
    res.writeHead(308, { Location: path.slice(0, -5) + url.search }); return res.end();
  }
  const cleanFile = path.replace(/\/$/, '').slice(1) + '.html';
  const file = path === '/' ? 'web/index.html' : publicFileSet.has(path.slice(1)) ? path.slice(1) : publicFileSet.has(cleanFile) ? cleanFile : path.slice(1);
  if (!publicFileSet.has(file)) { res.writeHead(404); return res.end(); }
  try { res.writeHead(200, { ...headers, 'Content-Type': file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : 'text/javascript' }); res.end(await readFile(join(directory, file))); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.invalid', identities: [{ provider: 'email', identity_data: { email_verified: true } }], app_metadata: { providers: ['email'] } };
const classification = { subjects: ['medicine'], systems: ['respiratory'], organs: ['lung'], domains: [], tasks: ['diagnosis'] };
const question = { questionId: 'fixture-q', questionVersionId: 'fixture-q@1', stem: 'Synthetic question for UI verification only', options: [{ optionId: 'a', text: 'Alpha' }, { optionId: 'b', text: 'Beta' }], conceptLinks: [{ conceptId: 'fixture-c', role: 'primary' }], classification, origins: [], home: { kind: 'original', exams: [], platforms: [] }, observed: { attempts: 0, wrong: 0, state: 'unattempted', repeatedWrong: false }, intelligence: { presentation: ['clinical-vignette'], qualifiers: [], responseFormat: 'single-best-answer' } };
const library = { concepts: [{ conceptId: 'fixture-c', label: 'Synthetic concept', aliases: [], classification }], questions: [question], notes: [{ noteVersionId: 'fixture-n@1', conceptId: 'fixture-c', title: 'Synthetic source note', bodyMarkdown: 'UI verification only. No real clinical content.' }], links: [] };
const browser = await engines[engine].launch({ headless: true }), errors = [];
try {
  const layouts = engine === 'webkit' ? [['ipad-portrait', 820, 1180], ['ipad-landscape', 1180, 820], ['ipad-split', 620, 1024]] : [['phone', 390, 844], ['tablet', 820, 1180], ['desktop', 1440, 1000]];
  for (const [name, width, height] of layouts) {
    const touch = engine === 'webkit' || width < 1050;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: engine === 'webkit', deviceScaleFactor: engine === 'webkit' ? 2 : 1 });
    const activate = locator => touch ? locator.tap() : locator.click();
    await context.addInitScript(value => localStorage.setItem('mlos-supabase-auth-v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: 2100000000, user: value })), user);
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    const writes = []; let admin = true, selectionLibrary = library, selectedIds = null, libraryUnavailable = false;
    await page.route('https://iyapppmeieqhflnzslao.supabase.co/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (req.method() !== 'GET') writes.push(path);
      if (path.endsWith('/auth/v1/user')) return reply(user);
      if (path.endsWith('/review-api/me')) return reply({ isAdmin: admin, reviewKinds: admin ? ['medical', 'references', 'rights'] : [] });
      // Owner dashboard APIs are independent of the navigation integration under test.
      if (path.endsWith('/owner-api/dashboard')) return reply({
        contractId: 'owner-admin-dashboard-v1', owner: { singleton: true, email: 'fixture@example.invalid' },
        generatedAt: '2026-10-12T00:00:00Z', users: { total: 0, recent: [] }, learning: {},
        content: { catalogVersion: 407, questions: 0, sources: 0, concepts: 0, openLearnerReports: 2, unresolvedRights: 1, pendingReview: { medical: 1 } },
        learnerAdministration: { auditEvents: 0 }, reviewAuthority: { temporary: true, grants: [] },
        ai: { telemetryAvailable: false }, infrastructure: { database: 'healthy', publicTableCount: 0, cloudflare: { status: 'healthy' } }
      });
      if (path.endsWith('/owner-api/infrastructure-alerts')) return reply({ alerts: [{ state: 'open', severity: 'warning', provider: 'Synthetic edge', status: 'test-only issue' }] });
      if (path.endsWith('/owner-api/content-integrity')) return reply({
        contractId: 'owner-catalog-integrity-v1', catalogVersion: 407,
        scanComplete: true, evidenceScope: 'structural_only', clinicalAccuracyVerified: false,
        rightsVerified: false, crossTableAtomicSnapshot: false, observedAt: '2026-10-12T00:00:00Z',
        emptyCatalog: true, findingCount: 0, byCode: {}, findings: [], findingsTruncated: false,
        totals: { questions: 0, concepts: 0, sources: 0, notes: 0, noteQuestionLinks: 0, questionMetadata: 0, conceptMetadata: 0 }
      });
      if (path.endsWith('/owner-api/source-watch')) return reply({
        contractId: 'owner-medical-source-watch-v1', catalogVersion: 407, asOf: '2026-10-12T00:00:00Z',
        sourceCount: 0, sourcesWithSightings: 0, pendingVerification: 0,
        unmatchedHistoricalSightings: 0, sources: [], scope: 'owner_submitted_evidence_only',
        automatedWebChecks: false, medicalUpdateVerified: false, clinicalApprovalGranted: false
      });
      if (path.endsWith('/owner-api/feature-flags')) return reply({ flags: [] });
      if (path.includes('/owner-api/')) return reply({});
      if (path.endsWith('/review-api/transfer-pairs')) return reply({ pairs: [] });
      // The review shell may read distinct gate queues; navigation checks never approve content.
      if (path.includes('/review-api/')) return reply({ items: [], questions: [], notes: [], queue: [], sources: [], reviews: [], pending: [], reviewKinds: admin ? ['medical', 'references', 'rights'] : [] });
      if (path.endsWith('/learner-experiment-api/status')) return reply({ contractId: 'answer-confidence-feature-status-v1', featureKey: 'answer_confidence_capture', enabled: false, authority: 'server_entitlement' });
      if (path.endsWith('/content-library-api/library')) return libraryUnavailable ? reply({ error: 'fixture_library_unavailable' }, 503) : reply(selectionLibrary);
      if (path.endsWith('/content-library-api/imports')) return reply({ imports: [] });
      if (path.endsWith('/content-library-api/study')) { selectedIds = req.postDataJSON().questionVersionIds; return reply({ sessionId: 'owned-selection', resumedExisting: true }); }
      if (path.endsWith('/study-api/questions')) return reply({ questions: [question] });
      if (path.endsWith('/study-api/media')) return reply({ media: [] });
      if (path.endsWith('/study-api/progress')) return reply({ attempts: 0, correct: 0, accuracy: null, concepts: [] });
      if (path.endsWith('/study-api/revision/due')) return reply({ dueCount: 0, unseenCount: 1, items: [] });
      if (path.endsWith('/study-api/exam-simulator/readiness')) return reply({ ready: false, eligibleUniqueQuestions: 1, requiredUniqueQuestions: 180, shortage: 179 });
      if (path.endsWith('/study-api/exam-simulator/runs/current')) return reply({ contractId: 'exam-run-view-v1', run: null });
      if (path.endsWith('/study-api/exam-simulator/test-readiness')) return reply({ error: 'internal_exam_test_forbidden' }, 403);
      if (path.endsWith('/study-api/retention-probe/consent')) return reply({ consent: null, protocol: null, activation: { active: false } });
      if (path.endsWith('/study-api/activity')) return reply({ items: [{ questionVersionId: 'fixture-q@1', correct: false, representation: 'concise-practice', recordedAt: '2026-10-01T00:00:00Z' }], nextOffset: null });
      if (path.endsWith('/study-api/exam-simulator/history')) return reply({ runs: [{ runId: 'owned-run', examId: 'synthetic', status: 'completed', startedAt: '2026-10-01T00:00:00Z' }, { runId: 'cancelled-run', status: 'cancelled' }], nextOffset: null });
      if (path.endsWith('/study-api/diagnostics/mistakes')) return reply({ fingerprints: [] });
      if (path.endsWith('/study-api/exam-dna')) return reply({ concepts: [] });
      throw new Error('Unexpected navigation request ' + req.method() + ' ' + path);
    });
    await page.goto(origin + '/web/library.html?view=subjects');
    await page.getByRole('heading', { name: 'Subjects & Topics', exact: true }).waitFor();
    const mainNav = page.getByRole('navigation', { name: 'Main navigation', exact: true });
    await mainNav.getByRole('link', { name: 'Admin', exact: true }).waitFor();
    assert.deepEqual(await mainNav.getByRole('link').evaluateAll(links => links.map(l => l.getAttribute('aria-label'))), ['Home', 'Study', 'Library', 'Exams', 'Account', 'Admin']);
    assert.equal(await page.evaluate(() => document.body.dataset.rail), 'collapsed');
    assert.equal(await page.locator('[data-subject]').count(), 19);
    assert.equal(new URL(page.url()).pathname, '/web/library');
    assert.equal(await mainNav.getByRole('link', { name: 'Library', exact: true }).getAttribute('aria-current'), 'page');
    const rowPositions = await mainNav.getByRole('link').evaluateAll(links => links.map(l => Math.round(l.getBoundingClientRect().top)));
    assert.equal(new Set(rowPositions).size, 1);
    await page.locator('#mlos-local-nav').getByRole('button', { name: 'Subjects & Topics', exact: true }).click();
    await page.getByRole('dialog', { name: 'Navigation submenu' }).waitFor();
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#mlos-flyout').isVisible(), false);
    await page.getByRole('button', { name: 'Expand navigation', exact: true }).click();
    assert.equal(await page.locator('#mlos-local-nav').evaluate(node => getComputedStyle(node).display), 'grid');
    assert.equal(await page.locator('#mlos-local-nav > .mlos-nav-row').first().locator('a span').evaluate(node => getComputedStyle(node).display !== 'none'), true);
    if (touch) await page.touchscreen.tap(width - 12, 170); else await page.mouse.click(width - 12, 170);
    assert.equal(await page.evaluate(() => document.body.dataset.rail), width < 700 ? 'collapsed' : 'expanded');
    if (width < 700) await activate(page.getByRole('button', { name: 'Expand navigation', exact: true }));
    await page.locator('#mlos-local-nav > details[data-group="library:subjects"] > summary').click();
    await page.locator('#mlos-local-nav details[data-group="library:subjects:index"] > summary').click();
    await page.locator('#mlos-local-nav > details[data-group="library:references"] > summary').click();
    assert.equal(await page.locator('#mlos-local-nav > details[data-group="library:subjects"]').getAttribute('open'), '');
    assert.equal(await page.locator('#mlos-local-nav > details[data-group="library:references"]').getAttribute('open'), '');
    await page.locator('#mlos-local-nav [data-pin="library:subjects"]').click();
    await page.getByRole('navigation', { name: 'Pinned shortcuts' }).waitFor();
    await page.keyboard.press('Control+k');
    await page.getByRole('searchbox', { name: 'Search all published content', exact: true }).fill('Preserved search');
    await page.getByRole('button', { name: 'Switch to dark appearance', exact: true }).click();
    assert.equal(await page.getByRole('searchbox', { name: 'Search all published content', exact: true }).inputValue(), 'Preserved search');
    await page.getByRole('searchbox', { name: 'Search all published content', exact: true }).fill('');
    await page.keyboard.press('Escape');
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) await page.getByRole('button', { name: 'Expand navigation', exact: true }).click();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.appearance), 'dark');
    await page.reload(); await page.getByRole('heading', { name: 'Subjects & Topics', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.appearance), 'dark');
    assert.equal(await page.evaluate(() => document.body.dataset.rail), 'expanded');
    await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click();
    await mainNav.getByRole('link', { name: 'Study', exact: true }).click();
    await page.getByRole('heading', { name: 'Your study workspace.', exact: true }).waitFor();
    assert.equal(await page.locator('#mlos-local-nav a[aria-current]').getAttribute('aria-label'), 'Practice');
    await page.getByRole('navigation', { name: 'Pinned shortcuts' }).waitFor();
    await mainNav.getByRole('link', { name: 'Exams', exact: true }).click();
    await page.getByRole('heading', { name: 'Rule-faithful, locked-section simulation.', exact: true }).waitFor();
    await mainNav.getByRole('link', { name: 'Home', exact: true }).click();
    await page.getByRole('heading', { name: 'What should you study next?', exact: true }).waitFor();
    await page.getByRole('button', { name: '5 min', exact: true }).click();
    assert.match(await page.locator('[data-study-start]').getAttribute('href'), /studyNow=5$/);
    await mainNav.getByRole('link', { name: 'Account', exact: true }).click();
    await page.getByRole('heading', { name: 'Your Medical Learning OS account.', exact: true }).waitFor();
    await mainNav.getByRole('link', { name: 'Admin', exact: true }).waitFor();
    await activate(page.locator('#mlos-local-nav a[href="/web/account.html#research"]'));
    await page.waitForFunction(() => location.hash === '#research');
    assert.equal(await page.locator('#mlos-local-nav a[aria-current]').getAttribute('aria-label'), 'Research Participation');
    await page.goBack();
    await page.waitForFunction(() => location.hash === '');
    assert.equal(await page.locator('#mlos-local-nav a[aria-current]').getAttribute('aria-label'), 'Overview');
    await activate(mainNav.getByRole('link', { name: 'Admin', exact: true }));
    await page.getByRole('heading', { name: 'Operate the learning system without exposing owner controls to learners.', exact: true }).waitFor();
    assert.equal(await mainNav.getByRole('link', { name: 'Admin', exact: true }).getAttribute('aria-current'), 'page');
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) await activate(page.getByRole('button', { name: 'Expand navigation', exact: true }));
    await activate(page.locator('#mlos-local-nav details[data-group="admin:overview"] > summary'));
    assert.equal(await page.locator('#mlos-local-nav a[aria-current]').getAttribute('href'), '/web/admin.html');
    await page.locator('#admin-actions').waitFor();
    assert.match(await page.locator('#admin-actions').innerText(), /Learner-reported content issues/);
    await page.locator('#owner-integrity').waitFor();
    await activate(page.locator('[data-owner-integrity-run]'));
    await page.getByText('No canonical catalog content exists to assess yet.', { exact: false }).waitFor();
    assert.equal(await page.locator('#owner-integrity-results').getByText('Findings', { exact: true }).count(), 1);
    await page.locator('#owner-source-watch').waitFor();
    await activate(page.locator('[data-owner-source-watch-run]'));
    await page.getByText('No canonical sources are present.', { exact: false }).waitFor();
    assert.equal(await page.locator('#owner-source-sighting-form').count(), 0, 'no observation can be manufactured without a canonical source');

    // Outside-panel touch intentionally collapses the rail on a phone.
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) {
      await activate(page.getByRole('button', { name: 'Expand navigation', exact: true }));
    }
    await activate(page.locator('#mlos-local-nav details[data-group="admin:content"] > summary'));
    assert.equal(await page.locator('#mlos-local-nav details[data-group="admin:overview"]').getAttribute('open'), '', 'Admin groups expand independently');
    // Admin Content shares its landing URL with Content Intake. Keep one link,
    // but still allow a shortcut pin and accessible collapsed flyout.
    assert.equal(await page.locator('#mlos-local-nav a[href="/web/content-import.html"]').count(), 1);
    assert.equal(await page.locator('#mlos-local-nav [data-pin="admin:content"]').count(), 1);
    await activate(page.locator('#mlos-local-nav [data-pin="admin:content"]'));
    assert.equal(await page.locator('nav[aria-label="Pinned shortcuts"] [data-group="admin:content"]').count(), 1, 'Admin group pin is usable');
    await activate(page.locator('#mlos-local-nav [data-pin="admin:content"]'));
    assert.equal(await page.locator('nav[aria-label="Pinned shortcuts"] [data-group="admin:content"]').count(), 0, 'unpin removes this Admin shortcut, preserving other pins');
    await activate(page.getByRole('button', { name: 'Collapse navigation', exact: true }));
    await activate(page.locator('#mlos-local-nav [data-flyout="admin:content"]'));
    const adminFlyout = page.getByRole('dialog', { name: 'Navigation submenu' });
    assert.equal(await adminFlyout.locator('a[href="/web/content-import.html"]').count(), 1, 'collapsed group has one destination');
    assert.equal(await adminFlyout.locator('.mlos-flyout-heading a[href="/web/content-import.html"]').count(), 0, 'group heading does not repeat the child route');
    await activate(adminFlyout.getByRole('button', { name: 'Close submenu' }));
    await activate(page.getByRole('button', { name: 'Expand navigation', exact: true }));

    for (const [href, title] of [['/web/admin.html', 'Overview'], ['/web/content-import.html', 'Content Intake'], ['/web/admin.html#owner-integrity', 'Catalog Integrity'], ['/web/admin.html#owner-source-watch', 'Source Change Watch'], ['/web/review.html', 'Review Workspace'], ['/web/review.html?workspace=references', 'Reference Review'], ['/web/review.html?workspace=rights', 'Source Rights']]) {
      assert.equal(await page.locator('#mlos-local-nav a[href="' + href + '"]').count(), 1, title);
    }
    await activate(page.locator('#mlos-local-nav a[href="/web/content-import.html"]'));
    await page.getByRole('heading', { name: 'Import & review', exact: true }).waitFor();
    await mainNav.getByRole('link', { name: 'Admin', exact: true }).waitFor();
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) {
      assert.equal(await page.locator('#mlos-local-nav [data-flyout="admin:content"]').getAttribute('data-active'), 'true');
      await activate(page.getByRole('button', { name: 'Expand navigation', exact: true }));
    }
    const contentGroup = page.locator('#mlos-local-nav details[data-group="admin:content"]');
    if (!(await contentGroup.evaluate(node => node.open))) await activate(contentGroup.locator(':scope > summary'));
    assert.equal(await page.locator('#mlos-local-nav a[href="/web/content-import.html"]').getAttribute('aria-current'), 'page');
    await activate(page.locator('#mlos-local-nav a[href="/web/review.html?workspace=references"]'));
    await page.waitForURL('**/web/review?workspace=references');
    await mainNav.getByRole('link', { name: 'Admin', exact: true }).waitFor();
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) {
      assert.equal(await page.locator('#mlos-local-nav [data-flyout="admin:content"]').getAttribute('data-active'), 'true');
      await activate(page.getByRole('button', { name: 'Expand navigation', exact: true }));
    }
    const reviewGroup = page.locator('#mlos-local-nav details[data-group="admin:content"]');
    if (!(await reviewGroup.evaluate(node => node.open))) await activate(reviewGroup.locator(':scope > summary'));
    assert.equal(await page.locator('#mlos-local-nav a[href="/web/review.html?workspace=references"]').getAttribute('aria-current'), 'page');
    await mainNav.getByRole('link', { name: 'Study', exact: true }).click();
    await mainNav.getByRole('link', { name: 'Admin', exact: true }).waitFor();
    await mainNav.getByRole('link', { name: 'Account', exact: true }).click();
    admin = false; await page.reload(); await page.getByRole('heading', { name: 'Your Medical Learning OS account.', exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('#mlos-navigation') && !document.querySelector('[data-master="admin"]'));
    assert.equal(await mainNav.getByRole('link', { name: 'Admin', exact: true }).count(), 0);
    await page.goto(origin + '/web/library.html?view=notes&subject=medicine&system=respiratory');
    await page.getByRole('heading', { name: 'Synthetic source note', exact: true }).waitFor();
    await page.getByRole('tab', { name: 'Questions', exact: true }).click();
    await page.getByRole('tab', { name: 'Graph', exact: true }).click();
    await page.goBack();
    await page.waitForFunction(() => new URLSearchParams(location.search).get('view') === 'questions' && document.querySelector('[data-view=questions]')?.getAttribute('aria-selected') === 'true');
    assert.equal(await page.locator('#mlos-local-nav a[aria-current]').getAttribute('href'), '/web/library.html?view=questions');
    await page.goBack();
    await page.getByRole('heading', { name: 'Concept Notes', exact: true }).waitFor();
    await page.goForward();
    await page.getByRole('heading', { name: 'Questions', exact: true, level: 1 }).waitFor();
    await page.goForward();
    await page.getByRole('heading', { name: 'Knowledge Graph', exact: true }).waitFor();
    await page.locator('#library-app').evaluate(root => { root.dataset.navigationProbe = 'retained'; });
    await page.locator('#mlos-local-nav a[href="/web/library.html?view=notes"]').click();
    await page.getByRole('heading', { name: 'Concept Notes', exact: true }).waitFor();
    assert.equal(await page.locator('#library-app').getAttribute('data-navigation-probe'), 'retained', 'clean-URL shell view changes preserve the workspace');
    assert.equal(await page.getByLabel('Subject', { exact: true }).inputValue(), 'medicine');
    assert.equal(await page.getByLabel('System', { exact: true }).inputValue(), 'respiratory');

    assert.equal(await page.getByLabel('Subject', { exact: true }).inputValue(), 'medicine');
    assert.equal(await page.getByLabel('System', { exact: true }).inputValue(), 'respiratory');
    await page.goto(origin + '/web/library.html?view=recall');
    await page.getByLabel('Your recall', { exact: true }).fill('Unsaved self-review');
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) await page.getByRole('button', { name: 'Expand navigation', exact: true }).click();
    await page.getByRole('button', { name: 'Switch to light appearance', exact: true }).click();
    assert.equal(await page.getByLabel('Your recall', { exact: true }).inputValue(), 'Unsaved self-review');
    await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click();
    await page.goto(origin + '/web/workspace.html?master=home&section=recent');
    await page.getByText('Concise practice', { exact: true }).waitFor();
    await page.goto(origin + '/web/workspace.html?master=exams&section=autopsy');
    await page.getByRole('link', { name: 'Open GT Autopsy', exact: true }).waitFor();
    assert.equal(await page.locator('a[href*="cancelled-run"]').count(), 0);
    await page.goto(origin + '/web/workspace.html?master=account&section=preferences');
    await page.getByRole('heading', { name: 'Appearance and navigation', exact: true }).waitFor();
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) await page.getByRole('button', { name: 'Expand navigation', exact: true }).click();
    await page.locator('#mlos-local-nav [data-pin="account:data"]').click();
    await page.getByLabel('Appearance', { exact: true }).selectOption('dark');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.appearance), 'dark');
    assert.equal(await page.evaluate(() => document.body.dataset.rail), 'expanded');
    assert.equal(await page.getByRole('navigation', { name: 'Pinned shortcuts' }).getByRole('link', { name: 'My Data', exact: true }).count(), 1);
    await page.reload(); await page.getByLabel('Appearance', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Appearance', { exact: true }).inputValue(), 'dark');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(writes.length, 0, 'navigation and self-review must not create learning or publication writes');
    await page.goto(origin + '/web/library.html?view=media&category=radiology');
    await page.getByRole('heading', { name: 'Media Library', exact: true }).waitFor();
    await page.locator('#mlos-local-nav a[href="/web/library.html?view=notes"]').click();
    await page.getByRole('heading', { name: 'Concept Notes', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('category'), null);
    assert.equal(await page.getByRole('heading', { name: 'Synthetic source note', exact: true }).count(), 1);
    await page.goto(origin + '/web/library.html?view=references&reference=labs-diagnostics&subject=medicine&count=5');
    await page.getByRole('heading', { name: 'Reference Tools', exact: true }).waitFor();
    await activate(page.getByRole('tab', { name: 'Notes', exact: true }));
    assert.equal(new URL(page.url()).searchParams.get('reference'), null);
    assert.equal(await page.getByRole('heading', { name: 'Synthetic source note', exact: true }).count(), 1);
    assert.equal(await page.getByLabel('Subject', { exact: true }).inputValue(), 'medicine');
    assert.equal(await page.getByLabel('Question count', { exact: true }).inputValue(), '5');
    await page.goBack();
    await page.getByRole('heading', { name: 'Reference Tools', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('reference'), 'labs-diagnostics');
    await page.goForward();
    await page.getByRole('heading', { name: 'Concept Notes', exact: true }).waitFor();
    if (width < 1050) {
      await activate(page.getByRole('button', { name: 'Search all published content', exact: true }));
      await page.getByRole('searchbox', { name: 'Search all published content', exact: true }).fill('Unsubmitted draft');
      if (touch) await page.touchscreen.tap(width - 12, 170); else await page.mouse.click(width - 12, 170);
      assert.equal(await page.locator('#mlos-navigation').evaluate(node => node.classList.contains('mlos-search-open')), false);
      await activate(page.getByRole('button', { name: 'Search all published content', exact: true }));
      assert.equal(await page.getByRole('searchbox', { name: 'Search all published content', exact: true }).inputValue(), 'Unsubmitted draft');
      await page.keyboard.press('Escape');
    }
    if (name === layouts[0][0]) {
      if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) await activate(page.getByRole('button', { name: 'Expand navigation', exact: true }));
      // Follow every generated module, reference and media leaf from the real menu catalog.
      const leaves = destinations.filter(row => !row.children.length && /[?&](module|reference|category)=/.test(row.href));
      assert.equal(leaves.length, 96);
      for (const row of leaves) {
        await page.goto(origin + row.href);
        const title = new URL(row.href, origin).searchParams.get('view');
        await page.getByRole('heading', { name: { subjects: 'Subjects & Topics', references: 'Reference Tools', media: 'Media Library' }[title], exact: true }).waitFor();
        assert.equal(await page.locator('#mlos-local-nav a[aria-current]').filter({ hasText: row.label }).count() >= 1, true, row.href);
        const url = new URL(page.url());
        if (url.searchParams.has('module')) assert.equal(await page.getByLabel('Subject', { exact: true }).inputValue(), url.searchParams.get('subject'));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, row.href);
      }
      await page.goto(origin + '/web/library.html?view=subjects');
      await page.getByRole('heading', { name: 'Subjects & Topics', exact: true }).waitFor();
      if (await page.evaluate(() => document.body.dataset.rail === 'expanded')) await activate(page.getByRole('button', { name: 'Collapse navigation', exact: true }));
      await activate(page.locator('#mlos-local-nav').getByRole('button', { name: 'Subjects & Topics', exact: true }));
      const flyout = page.getByRole('dialog', { name: 'Navigation submenu' });
      const group = flyout.locator('details[data-group="library:subjects:index"]');
      if (!await group.evaluate(node => node.open)) await activate(group.locator(':scope > summary'));
      await activate(flyout.locator('details[data-group="library:subjects:index:anatomy"] > summary'));
      await activate(flyout.getByRole('link', { name: 'Gross & regional anatomy', exact: true }));
      await page.getByRole('heading', { name: 'Subjects & Topics', exact: true }).waitFor();
      assert.equal(new URL(page.url()).searchParams.get('subject'), 'anatomy');
      assert.equal(new URL(page.url()).searchParams.get('module'), 'gross-regional-anatomy');
    }
    libraryUnavailable = true;
    await page.goto(origin + '/web/library.html?view=notes');
    await page.getByRole('button', { name: 'Retry library', exact: true }).waitFor();
    await page.locator('#mlos-local-nav a[href="/web/library.html?view=graph"]').click();
    await page.waitForURL('**/web/library?view=graph');
    await page.getByRole('button', { name: 'Retry library', exact: true }).waitFor();
    assert.equal(await page.locator('#mlos-local-nav a[aria-current]').getAttribute('href'), '/web/library.html?view=graph');
    libraryUnavailable = false;
    const otherClassification = { ...classification, systems: ['cardiovascular'] };
    selectionLibrary = {
      ...library,
      concepts: [...library.concepts, { conceptId: 'fixture-c2', label: 'Second synthetic concept', aliases: [], classification: otherClassification }],
      notes: [...library.notes, { noteVersionId: 'fixture-n2@1', conceptId: 'fixture-c2', title: 'Second synthetic note', bodyMarkdown: 'Second isolated source body.' }],
      questions: [{ ...question, intelligence: { ...question.intelligence, presentation: ['image'] } }, { ...question, questionId: 'fixture-q2', questionVersionId: 'fixture-q2@1', classification: otherClassification, conceptLinks: [{ conceptId: 'fixture-c2', role: 'primary' }], intelligence: { ...question.intelligence, presentation: ['image'] } }]
    };
    await page.goto(origin + '/web/library.html?view=recall');
    if (await page.evaluate(() => document.body.dataset.rail === 'expanded')) await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click();
    await page.getByLabel('Your recall', { exact: true }).fill('Draft tied to first source');
    await page.getByRole('button', { name: 'Next card', exact: true }).click();
    await page.getByLabel('Your recall', { exact: true }).fill('Draft tied to second source');
    await page.getByLabel('Concept', { exact: true }).selectOption('fixture-c');
    assert.equal(await page.getByLabel('Your recall', { exact: true }).count(), 1, 'Recall after concept filter: ' + JSON.stringify(errors) + ' ' + await page.locator('#library-app').innerText());
    assert.equal(await page.getByLabel('Your recall', { exact: true }).inputValue(), 'Draft tied to first source');
    await page.getByRole('button', { name: 'Reveal source note', exact: true }).click();
    await page.getByLabel('Concept', { exact: true }).selectOption('fixture-c2');
    assert.equal(await page.getByLabel('Your recall', { exact: true }).inputValue(), 'Draft tied to second source');
    assert.equal(await page.getByRole('button', { name: 'Reveal source note', exact: true }).isVisible(), true);
    assert.equal(await page.getByText('Second isolated source body.', { exact: true }).count(), 0);
    await page.goto(origin + '/web/library.html?view=images&system=respiratory');
    await page.getByRole('button', { name: 'Open original media', exact: true }).click();
    await page.getByRole('heading', { name: 'Original media', exact: true }).waitFor();
    await page.getByLabel('System', { exact: true }).selectOption('cardiovascular');
    assert.equal(await page.getByRole('heading', { name: 'Original media', exact: true }).count(), 0);
    await page.evaluate(() => localStorage.setItem('mlos-library-device-v1', JSON.stringify({ version: 1, bookmarks: [], views: Array.from({ length: 30 }, (_, i) => ({ id: 'limit-' + i, name: 'Saved fixture ' + i, view: 'notes', filters: {} })) })));
    await page.goto(origin + '/web/library.html?view=notes');
    page.once('dialog', dialog => dialog.accept('Overflow fixture'));
    await page.getByRole('button', { name: 'Save current view', exact: true }).click();
    await page.getByText('You have 30 saved views. Delete one before saving another.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mlos-library-device-v1')).views.length), 30);
    selectionLibrary = { ...library, questions: [question, { ...question, questionId: 'fixture-q2', questionVersionId: 'fixture-q2@3' }, { ...question, questionId: 'fixture-q3', questionVersionId: 'fixture-q3@2' }] };
    await page.goto(origin + '/web/library.html?view=questions&master=study&build=1');
    await page.getByRole('heading', { name: 'Build Session', exact: true }).waitFor();
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) await page.getByRole('button', { name: 'Expand navigation', exact: true }).click();
    await page.locator('#mlos-local-nav [data-pin="study:build"]').click();
    await page.goto(origin + '/web/library.html?view=notes');
    await page.getByRole('heading', { name: 'Concept Notes', exact: true }).waitFor();
    await page.getByLabel('Collection', { exact: true }).selectOption('pyq');
    assert.equal(await page.locator('[data-filter="keyword"] option[value="diagnosis"]').count(), 0);
    await page.getByLabel('Collection', { exact: true }).selectOption('');
    await page.locator('#mlos-local-nav [data-pin="library:notes"]').click();
    await page.getByRole('navigation', { name: 'Pinned shortcuts' }).getByRole('link', { name: 'Build Session', exact: true }).click();
    await page.getByRole('heading', { name: 'Build Session', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('build'), '1');
    await page.getByRole('navigation', { name: 'Pinned shortcuts' }).getByRole('link', { name: 'Concept Notes', exact: true }).click();
    await page.getByRole('heading', { name: 'Concept Notes', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('build'), null);
    await page.getByRole('navigation', { name: 'Pinned shortcuts' }).getByRole('link', { name: 'Build Session', exact: true }).click();
    await page.getByRole('heading', { name: 'Build Session', exact: true }).waitFor();
    await page.getByLabel('Question count', { exact: true }).selectOption('1');
    await page.reload(); await page.getByRole('heading', { name: 'Build Session', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Question count', { exact: true }).inputValue(), '1');
    await page.getByLabel('Subject', { exact: true }).selectOption('medicine');
    await page.getByLabel('System', { exact: true }).selectOption('respiratory');
    await page.getByRole('link', { name: 'Synthetic concept (primary)', exact: true }).first().click();
    await page.getByRole('heading', { name: 'Build Session', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Subject', { exact: true }).inputValue(), 'medicine');
    assert.equal(await page.getByLabel('System', { exact: true }).inputValue(), 'respiratory');
    assert.equal(await page.getByLabel('Question count', { exact: true }).inputValue(), '1');
    await page.getByRole('tab', { name: 'Graph', exact: true }).click();
    assert.equal(await page.getByLabel('Question count', { exact: true }).inputValue(), '1');
    assert.equal(new URL(page.url()).searchParams.get('build'), '1');
    await page.getByRole('button', { name: 'Study these questions (up to 1)', exact: true }).click();
    await page.getByRole('link', { name: 'Continue unfinished session', exact: true }).waitFor();
    assert.deepEqual(selectedIds, ['fixture-q@1']);
    assert.deepEqual(writes, ['/functions/v1/content-library-api/study'], 'only explicit practice starts a session');
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, 'navigation-preferences-' + name + '.png'), fullPage: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('Navigation actions, 96 nested leaves, touch dismissal, history, pins and persistence passed in ' + engine + '.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
