import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPages } from './build-pages.js';
import { publicFileSet } from './public-surface.js';
import { MASTERS, navigationFor, routeIdentity } from '../src/domain/app-navigation.js';
import { ADMIN_VIEWS } from '../web/admin-workspace-view.js';
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
const browser = await engines[engine].launch({ headless: true, ...(engine === 'chromium' && process.env.CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH } : {}) }), errors = [];
try {
  const layouts = engine === 'webkit' ? [['ipad-portrait', 820, 1180], ['ipad-landscape', 1180, 820], ['ipad-split', 620, 1024]] : [['phone', 390, 844], ['tablet', 820, 1180], ['desktop', 1440, 1000]];
  for (const [name, width, height] of layouts) {
    const touch = engine === 'webkit' || width < 1050;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: engine === 'webkit', deviceScaleFactor: engine === 'webkit' ? 2 : 1 });
    const activate = async locator => {
      await page.waitForLoadState('networkidle');
      const local = page.locator('#mlos-local-nav a,#mlos-local-nav button,#mlos-local-nav summary,#mlos-workspace-menu .mlos-master-nav a,#mlos-workspace-menu .mlos-master-nav button,.mlos-panel a,.mlos-panel button');
      if (await locator.and(local).count()) await openTools();
      if (await locator.count()) {
        const groups = await locator.first().evaluate(node => {
          const keys = []; for (let parent = node.parentElement; parent; parent = parent.parentElement) if (parent.matches('details[data-group]') && !parent.open) keys.unshift(parent.dataset.group); return keys;
        });
        for (const key of groups) await page.locator('details[data-group="' + key + '"] > summary').click();
      }
      return touch ? locator.tap() : locator.click();
    };
    await context.addInitScript(value => {
      if (sessionStorage.getItem('mlos-navigation-fixture-seeded')) return;
      localStorage.setItem('mlos-supabase-auth-v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: 2100000000, user: value }));
      sessionStorage.setItem('mlos-navigation-fixture-seeded', 'true');
    }, user);
    const page = await context.newPage(); page.on('pageerror', error => { errors.push(error.message); console.error('Navigation page error', name, page.url(), error.message); });
    const openTools = async () => {
      if (page.viewportSize().width <= 700) {
        if (await page.locator('.mlos-panel[hidden]').count()) await page.getByRole('button', { name: 'Expand navigation', exact: true }).click();
        return;
      }
      if (await page.locator('#mlos-workspace-menu').isVisible()) return;
      const url = new URL(page.url()), master = routeIdentity(url.pathname, url.search, url.hash).master;
      const trigger = page.locator('[data-workspace-menu="' + master + '"]').first();
      if (!(await trigger.isVisible()) && master === 'account') await page.getByLabel('Account menu', { exact: true }).click();
      await trigger.click();
      await page.locator('#mlos-workspace-menu').waitFor({ state: 'visible' });
    };
    const closeTools = async () => { if (page.viewportSize().width <= 700) { if (!(await page.locator('.mlos-panel[hidden]').count())) await page.getByRole('button', { name: 'Collapse navigation', exact: true }).click(); } else await page.keyboard.press('Escape'); };
    // Wait for background access reads before abandoning a document. WebKit
    // reports canceled cross-origin fixture reads as access-control errors.
    const go = async url => { await page.waitForLoadState('networkidle'); await page.goto(url); };
    const reload = async () => { await page.waitForLoadState('networkidle'); await page.reload(); };
    const writes = []; let admin = true, selectionLibrary = library, selectedIds = null, libraryUnavailable = false, flagsUnavailable = false, alertsUnavailable = false, largeFlags = false, accessStatus = 200, projectionUnavailable = false, projectionDelayed = false, dashboardUnavailable = false, dashboardReads = 0, logoutFails = false;
    await page.route('https://iyapppmeieqhflnzslao.supabase.co/**', async route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      const reply = (body, status = 200) => route.fulfill({ status, headers: { 'access-control-allow-origin': origin }, contentType: 'application/json', body: JSON.stringify(body) });
      if (req.method() !== 'GET') writes.push(path);
      if (path.endsWith('/auth/v1/logout')) return reply({}, logoutFails ? 503 : 200);
      if (path.endsWith('/auth/v1/user')) return reply(user);
      if (path.endsWith('/review-api/me')) return accessStatus === 200 ? reply({ isAdmin: admin, reviewKinds: admin ? ['medical', 'references', 'rights'] : [] }) : reply({ error: 'synthetic_access_failure' }, accessStatus);
      // Owner dashboard APIs are independent of the navigation integration under test.
      if (path.endsWith('/owner-api/dashboard')) { dashboardReads++; return dashboardUnavailable ? reply({ error: 'synthetic_dashboard_failure' }, 503) : reply({
        contractId: 'owner-admin-dashboard-v1', owner: { singleton: true, email: 'fixture@example.invalid' },
        generatedAt: '2026-10-12T00:00:00Z', users: { total: 0, recent: [] }, learning: {},
        content: { catalogVersion: 407, questions: 0, sources: 0, concepts: 0, openLearnerReports: 2, unresolvedRights: 1, pendingReview: { medical: 1 } },
        learnerAdministration: { auditEvents: 0 }, reviewAuthority: { temporary: true, grants: [] },
        ai: { telemetryAvailable: false }, infrastructure: { database: 'healthy', publicTableCount: 0, cloudflare: { status: 'healthy' } }
      }); }
      if (path.endsWith('/owner-api/infrastructure-alerts')) return alertsUnavailable ? reply({ error: 'synthetic_alerts_outage' }, 503) : reply({ alerts: [{ state: 'open', severity: 'warning', provider: 'Synthetic edge', status: 'test-only issue' }] });
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
      if (path.endsWith('/owner-api/feature-flags')) {
        if (largeFlags) await new Promise(resolve => setTimeout(resolve, 300));
        return flagsUnavailable ? reply({ error: 'synthetic_flags_outage' }, 503) : reply({ flags: largeFlags ? [{ featureKey: 'synthetic_navigation_gate', audience: 'off', description: 'Navigation fixture only; never submitted.' }] : [] });
      }
      if (path.includes('/owner-api/')) return reply({});
      if (path.endsWith('/review-api/transfer-pairs')) {
        if (projectionDelayed) await new Promise(resolve => setTimeout(resolve, 1000));
        return projectionUnavailable ? reply({ error: 'synthetic_projection_failure' }, 503) : reply({ pairs: [] });
      }
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
    await go(origin + '/web/library.html?view=subjects');
    const settleAdmin = () => page.waitForFunction(() => {
      const research = document.querySelector('[data-admin-panel="research"]'), features = document.getElementById('owner-features-state'), alerts = document.getElementById('owner-alerts-state');
      return research && !research.textContent.includes('Loading admin evidence') && features && !features.textContent.includes('Loading feature gates') && alerts && !alerts.textContent.includes('Loading infrastructure alerts');
    });
    await page.getByRole('heading', { name: 'Subjects & Topics', exact: true }).waitFor();
    const mainNav = page.getByRole('navigation', { name: 'Main navigation', exact: true, includeHidden: true });
    await mainNav.getByRole('link', { includeHidden: true, name: 'Master Admin', exact: true }).waitFor({ state: 'attached' });
    assert.deepEqual(await mainNav.getByRole('link', { includeHidden: true }).evaluateAll(links => links.map(l => l.getAttribute('aria-label'))), ['Home', 'Study', 'Library', 'Exams', 'Master Admin']);
    assert.equal(await page.evaluate(() => document.body.dataset.rail), 'collapsed');

    assert.equal(await page.locator('[data-subject]').count(), 19);
    assert.equal(new URL(page.url()).pathname, '/web/library');
    assert.equal(await mainNav.getByRole('link', { includeHidden: true, name: 'Library', exact: true }).getAttribute('aria-current'), 'page');
    if (width >= 1000) {
    const rowPositions = await mainNav.getByRole('link', { includeHidden: true }).evaluateAll(links => links.map(l => Math.round(l.getBoundingClientRect().top)));
    assert.equal(new Set(rowPositions).size, 1);
    } else if (width <= 700) {
      assert.equal(await page.locator('.mlos-panel').isVisible(), false);
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).paddingLeft), '0px');
      assert.equal(await page.locator('.mlos-header').evaluate(node => node.getBoundingClientRect().height), 56);
      assert.equal(await page.locator('main').first().evaluate(node => node.getBoundingClientRect().width), width);
      assert.equal(await page.getByRole('link', { name: 'Master Admin', exact: true }).count(), 0, 'admin master stays out of the closed phone header');
    }
    if (width <= 700) {
      for (const phoneWidth of [320, 390]) {
        await page.setViewportSize({ width: phoneWidth, height });
        await page.waitForFunction(() => Boolean(document.querySelector('.mlos-mobile-menu')));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'phone content fits ' + phoneWidth);
        assert.equal(await page.locator('.mlos-header').evaluate(node => [...node.children].every(child => child.getBoundingClientRect().right <= innerWidth)), true, 'phone header fits ' + phoneWidth);
        await openTools();
        assert.equal(await mainNav.getByRole('link', { name: 'Home', exact: true }).isVisible(), true);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.mlos-mobile-menu').evaluate(node => document.activeElement === node), true);
      }
      await page.setViewportSize({ width, height });
    }
    // Rotation dismisses temporary top menus and preserves legacy/device preferences.
    const savedLayout = await page.evaluate(() => JSON.parse(localStorage.getItem('mlos-navigation-v1')));
    for (const desktopExpanded of [false, true]) {
      await page.evaluate(value => window.dispatchEvent(new CustomEvent('mlos:preferences', { detail: { prefs: { ...JSON.parse(localStorage.getItem('mlos-navigation-v1')), expanded: value } } })), desktopExpanded);
      await page.setViewportSize({ width: 820, height: 1180 }); await openTools();
      assert.equal(await page.locator('#mlos-workspace-menu').isVisible(), true);
      await page.setViewportSize({ width: 1180, height: 820 });
      await page.waitForFunction(() => document.body.dataset.navigationLayout === 'top' && document.getElementById('mlos-workspace-menu').hidden);
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).paddingLeft), '0px');
      await openTools(); await page.keyboard.press('Escape');
      assert.equal(await page.locator('[data-workspace-menu="library"]').evaluate(node => document.activeElement === node), true);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mlos-navigation-v1')).expanded), desktopExpanded);
    }
    for (const testWidth of [701, 999, 1000, 1180, 1440]) {
      await page.setViewportSize({ width: testWidth, height: 1000 });
      await page.waitForFunction(() => document.body.dataset.navigationLayout === 'top');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'header fit ' + testWidth);
      const headerControls = await page.locator('.mlos-header').evaluate(node => [...node.querySelectorAll('a,button,summary')].filter(n => n.getClientRects().length).map(n => ({ label: n.getAttribute('aria-label') || n.textContent.trim(), left: n.getBoundingClientRect().left, right: n.getBoundingClientRect().right, accountOpen: n.closest('.mlos-account')?.open })));
      const overflowingControls = headerControls.filter(n => n.left < 0 || n.right > testWidth);
      if (overflowingControls.length && process.env.SCREENSHOT_DIR) await page.screenshot({ path: process.env.SCREENSHOT_DIR + '/navigation-fit-' + testWidth + '.png', fullPage: true });
      assert.deepEqual(overflowingControls, [], 'visible controls fit ' + testWidth);
    }
    await page.setViewportSize({ width, height });
    await page.evaluate(prefs => window.dispatchEvent(new CustomEvent('mlos:preferences', { detail: { prefs } })), savedLayout);
    await page.waitForFunction(value => document.body.dataset.navigationLayout === (value <= 700 ? 'phone' : 'top') && document.body.dataset.rail === 'collapsed', width);
    await activate(page.getByLabel('Account menu', { exact: true }));
    const accountMenu = page.getByRole('navigation', { name: 'Account navigation', exact: true });
    for (const label of ['Profile', 'Preferences', 'Account & Security']) {
      const link = accountMenu.getByRole('link', { name: label, exact: true });
      assert.equal(await link.isVisible(), true, 'avatar label remains accessible at ' + name);
      assert.equal(await link.evaluate(node => getComputedStyle(node).justifyContent), 'flex-start', 'avatar labels align beside icons');
      assert.notEqual(await link.locator('span').evaluate(node => getComputedStyle(node).display), 'none');
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.mlos-account').evaluate(node => node.open), false);
    assert.equal(await page.getByLabel('Account menu', { exact: true }).evaluate(node => document.activeElement === node), true);
    await openTools();
    assert.equal(await page.locator('#mlos-local-nav').evaluate(node => getComputedStyle(node).display), 'grid');
    if (width > 700) assert.equal(await page.locator('main').first().evaluate(node => node.inert || Boolean(node.closest('[inert]'))), false, 'top menu leaves the learning canvas usable');
    await activate(page.locator('#mlos-local-nav > details[data-group="library:subjects"] > summary'));
    await activate(page.locator('#mlos-local-nav details[data-group="library:subjects:index"] > summary'));
    await activate(page.locator('#mlos-local-nav > details[data-group="library:references"] > summary'));
    assert.equal(await page.locator('#mlos-local-nav > details[data-group="library:subjects"]').getAttribute('open'), '');
    assert.equal(await page.locator('#mlos-local-nav > details[data-group="library:references"]').getAttribute('open'), '');
    await activate(page.locator('#mlos-local-nav [data-pin="library:subjects"]'));
    assert.equal(await page.getByRole('navigation', { name: 'Pinned shortcuts', includeHidden: true }).count(), 0, 'same-workspace pin does not duplicate its destination');
    await page.keyboard.press('Control+k');
    await page.getByRole('searchbox', { name: 'Search all published content', exact: true }).fill('Preserved search');
    await page.getByRole('button', { name: 'Switch to dark appearance', exact: true }).click();
    assert.equal(await page.getByRole('searchbox', { name: 'Search all published content', exact: true }).inputValue(), 'Preserved search');
    await page.getByRole('searchbox', { name: 'Search all published content', exact: true }).fill('');
    await page.keyboard.press('Escape');
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) await openTools();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.appearance), 'dark');
    await reload(); await page.getByRole('heading', { name: 'Subjects & Topics', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.dataset.appearance), 'dark');
    assert.equal(await page.evaluate(() => document.body.dataset.rail), 'collapsed');
    if (width > 1050) await closeTools();
    await activate(mainNav.getByRole('link', { includeHidden: true, name: 'Study', exact: true }));
    await page.getByRole('heading', { name: 'Your study workspace.', exact: true }).waitFor();
    assert.equal(await page.locator('#mlos-local-nav a[aria-current]').innerText(), 'Study Now');
    await page.getByRole('navigation', { name: 'Pinned shortcuts', includeHidden: true }).waitFor({ state: 'attached' });
    await activate(mainNav.getByRole('link', { includeHidden: true, name: 'Exams', exact: true }));
    await page.getByRole('heading', { name: 'Rule-faithful, locked-section simulation.', exact: true }).waitFor();
    await activate(mainNav.getByRole('link', { includeHidden: true, name: 'Home', exact: true }));
    await page.getByRole('heading', { name: 'What should you study next?', exact: true }).waitFor();
    await page.getByRole('button', { name: '5 min', exact: true }).click();
    assert.match(await page.locator('[data-study-start]').getAttribute('href'), /studyNow=5$/);
    await activate(page.getByLabel('Account menu', { exact: true }));
    await activate(page.getByRole('navigation', { name: 'Account navigation', exact: true }).getByRole('link', { name: 'Profile', exact: true }));
    await page.getByRole('heading', { name: 'Your Medical Learning OS account.', exact: true }).waitFor();
    await mainNav.getByRole('link', { includeHidden: true, name: 'Master Admin', exact: true }).waitFor({ state: 'attached' });
    if (width > 1050 && await page.evaluate(() => document.body.dataset.rail === 'expanded')) await closeTools();
    await activate(page.locator('#mlos-local-nav a[href="/web/account.html#research"]'));
    await page.waitForFunction(() => location.hash === '#research');
    assert.equal(await page.locator('#mlos-local-nav a[aria-current]').innerText(), 'Research Participation');
    await page.goBack();
    await page.waitForFunction(() => location.hash === '');
    assert.equal(await page.locator('#mlos-local-nav a[aria-current]').innerText(), 'Overview');
    await activate(mainNav.getByRole('link', { includeHidden: true, name: 'Master Admin', exact: true }));
    await page.getByRole('heading', { name: 'Overview', exact: true }).waitFor();
    await page.locator('#owner-home').waitFor();
    await settleAdmin();
    assert.deepEqual(await page.locator('[data-admin-panel]:visible').evaluateAll(nodes => nodes.map(node => node.dataset.adminPanel)), ['overview']);
    assert.match(await page.locator('#owner-home').innerText(), /Urgent actions/);
    assert.equal(await page.locator('#owner-home form').count(), 0);
    assert.equal(await page.locator('aside').count(), width <= 700 ? 1 : 0, 'only phone navigation reserves an aside');
    assert.equal(await page.locator('header').count(), 1, 'only one shared Admin header');
    assert.equal(await mainNav.getByRole('link', { includeHidden: true, name: 'Master Admin', exact: true }).getAttribute('aria-current'), 'page');
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) await openTools();
    await activate(page.locator('#mlos-local-nav details[data-group="admin:overview"] > summary'));
    assert.equal(await page.locator('#mlos-local-nav a[aria-current]').getAttribute('href'), '/web/admin.html');
    await go(origin + '/web/admin.html#admin-actions');
    await page.locator('#admin-actions').waitFor();
    assert.match(await page.locator('#admin-actions').innerText(), /Learner-reported content issues/);
    await settleAdmin();
    await go(origin + '/web/admin.html#owner-integrity');
    await page.locator('#owner-integrity').waitFor();
    await activate(page.locator('[data-owner-integrity-run]'));
    await page.getByText('No canonical catalog content exists to assess yet.', { exact: false }).waitFor();
    assert.equal(await page.locator('#owner-integrity-results').getByText('Findings', { exact: true }).count(), 1);
    await settleAdmin();
    await go(origin + '/web/admin.html#owner-source-watch');
    await page.locator('#owner-source-watch').waitFor();
    await activate(page.locator('[data-owner-source-watch-run]'));
    await page.getByText('No canonical sources are present.', { exact: false }).waitFor();
    assert.equal(await page.locator('#owner-source-sighting-form').count(), 0, 'no observation can be manufactured without a canonical source');
    await settleAdmin();

    if (name === layouts[0][0]) {
      // Both Admin links remain real destinations when either provider call
      // fails; never show "zero alerts" in place of a failed read.
      flagsUnavailable = true;
      await go(origin + '/web/admin.html#owner-features');
      await page.getByRole('heading', { name: 'Feature Gates', exact: true }).waitFor();
      await page.locator('#owner-features-state').getByText('Feature gates unavailable.', { exact: false }).waitFor();
      assert.equal(await page.locator('#owner-features').count(), 1);
      assert.match(await page.locator('#owner-infrastructure-alerts').innerText(), /Synthetic edge/);
      assert.equal(await page.locator('#owner-features [data-owner-v3-feature-form]').count(), 0, 'no feature mutation form on failed feature read');
      flagsUnavailable = false; alertsUnavailable = true;
      await go(origin + '/web/admin.html#owner-infrastructure-alerts');
      await page.locator('#owner-alerts-state').getByText('Infrastructure alerts unavailable.', { exact: false }).waitFor();
      assert.equal(await page.locator('#owner-infrastructure-alerts').count(), 1);
      assert.match(await page.locator('#owner-features').innerText(), /No feature gates are registered/);
      assert.doesNotMatch(await page.locator('#owner-alerts-state').innerText(), /No open infrastructure alerts/);
      alertsUnavailable = false;
      await go(origin + '/web/admin.html#owner-infrastructure-alerts');
      await page.locator('#owner-infrastructure-alerts').getByText('Synthetic edge', { exact: true }).waitFor();
      assert.match(await page.locator('#owner-features').innerText(), /No feature gates are registered/);
    }


    // Outside-panel touch intentionally collapses the rail on a phone.
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) {
      await openTools();
    }
    await activate(page.locator('#mlos-local-nav details[data-group="admin:content"] > summary'));
    assert.equal(await page.locator('#mlos-local-nav details[data-group="admin:overview"]').getAttribute('open'), '', 'Admin groups expand independently');
    // Admin Content shares its landing URL with Content Intake. Keep one link,
    // but still allow a shortcut pin and accessible collapsed flyout.
    assert.equal(await page.locator('#mlos-local-nav a[href="/web/content-import.html"]').count(), 1);
    assert.equal(await page.locator('#mlos-local-nav [data-pin="admin:content"]').count(), 1);
    await activate(page.locator('#mlos-local-nav [data-pin="admin:content"]'));
    assert.equal(await page.locator('[data-group="admin:content"]').count(), 1, 'a pinned group never duplicates the local Admin group');
    assert.equal(await page.locator('#mlos-local-nav [data-pin="admin:content"]').getAttribute('aria-pressed'), 'true');
    await activate(page.locator('#mlos-local-nav [data-pin="admin:content"]'));
    assert.equal(await page.locator('nav[aria-label="Pinned shortcuts"] [data-group="admin:content"]').count(), 0, 'unpin removes this Admin shortcut, preserving other pins');
    await closeTools();
    await openTools();

    largeFlags = true;
    await go(origin + '/web/admin.html#owner-infrastructure');
    await page.locator('[data-owner-v3-feature-form]').waitFor({ state: 'attached' });
    await page.waitForFunction(() => {
      const rect = document.getElementById('owner-infrastructure').getBoundingClientRect();
      return rect.top >= document.querySelector('.mlos-header').getBoundingClientRect().bottom && rect.top < innerHeight;
    });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Admin fits the viewport');
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) await openTools();
    const operationsGroup = page.locator('#mlos-local-nav details[data-group="admin:operations"]');
    if (!(await operationsGroup.evaluate(node => node.open))) await activate(operationsGroup.locator(':scope > summary'));
    projectionDelayed = true;
    await go(origin + '/web/admin.html#owner-users');
    await page.locator('#owner-learner-query').fill('Unsent navigation draft');
    await page.waitForFunction(() => document.querySelector('[data-admin-panel="research"]')?.textContent.includes('No published alternate pairs'));
    assert.equal(await page.locator('#owner-learner-query').inputValue(), 'Unsent navigation draft', 'background research projection preserves a loaded owner draft');
    projectionDelayed = false;
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) await openTools();
    if (!(await operationsGroup.evaluate(node => node.open))) await activate(operationsGroup.locator(':scope > summary'));
    await activate(page.locator('#mlos-local-nav a[href="/web/admin.html#owner-features"]'));
    await page.waitForFunction(() => {
      const rect = document.getElementById('owner-features')?.getBoundingClientRect();
      return location.hash === '#owner-features' && rect && rect.top >= document.querySelector('.mlos-header').getBoundingClientRect().bottom && rect.top < innerHeight;
    });
    assert.equal(await page.locator('#owner-learner-query').inputValue(), 'Unsent navigation draft', 'same-page Admin navigation preserves owner drafts');
    if (width <= 1050) await openTools();
    assert.equal(await page.locator('#mlos-local-nav a[aria-current="page"]').getAttribute('href'), '/web/admin.html#owner-features');
    await page.locator('#owner-features').scrollIntoViewIfNeeded();
    await activate(page.locator('#mlos-local-nav a[href="/web/admin.html#owner-features"]'));
    await page.waitForFunction(() => document.getElementById('owner-features').getBoundingClientRect().top >= document.querySelector('.mlos-header').getBoundingClientRect().bottom && document.getElementById('owner-features').getBoundingClientRect().top < innerHeight);
    await page.goBack();
    await page.waitForFunction(() => location.hash === '#owner-users' && !document.getElementById('owner-users').hidden);
    assert.equal(await page.locator('#owner-learner-query').inputValue(), 'Unsent navigation draft', 'Back retains the owner workspace');
    await activate(mainNav.getByRole('link', { includeHidden: true, name: 'Master Admin', exact: true }));
    await page.waitForFunction(() => location.hash === '' && scrollY < 100);
    assert.equal(await page.locator('#owner-learner-query').inputValue(), 'Unsent navigation draft', 'Overview navigation retains owner drafts');
    await activate(page.locator('#owner-home').getByRole('link', { name: 'Content Snapshot →', exact: true }));
    await page.getByRole('heading', { name: 'Content Snapshot', exact: true }).waitFor();
    assert.deepEqual(await page.locator('[data-admin-panel]:visible').evaluateAll(nodes => nodes.map(node => node.dataset.adminPanel)), ['content']);
    assert.equal(await page.locator('#owner-learner-query').inputValue(), 'Unsent navigation draft', 'Overview shortcuts retain mounted tool drafts');
    // Audit every Admin workspace in both approved palettes and appearances.
    for (const palette of ['sage_precision', 'lavender_precision']) for (const theme of ['light', 'dark']) {
      await page.evaluate(({ palette, theme }) => window.dispatchEvent(new CustomEvent('mlos:preferences', { detail: { prefs: { ...JSON.parse(localStorage.getItem('mlos-navigation-v1')), palette, theme } } })), { palette, theme });
      for (const view of ADMIN_VIEWS) {
        await page.evaluate(hash => { location.hash = hash; }, view.id === 'overview' ? '' : '#' + view.anchor);
        await page.locator('[data-admin-panel="' + view.id + '"]').waitFor();
        assert.deepEqual(await page.locator('[data-admin-panel]:visible').evaluateAll(nodes => nodes.map(node => node.dataset.adminPanel)), [view.id], view.label);
        await page.getByRole('heading', { name: view.label, exact: true }).waitFor();
        await settleAdmin();
        assert.deepEqual(await page.evaluate(() => ({ palette: document.documentElement.dataset.palette, theme: document.documentElement.dataset.appearance, overflow: document.documentElement.scrollWidth > innerWidth })), { palette, theme, overflow: false }, view.label + ' ' + palette + ' ' + theme);
        if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, 'admin-' + view.id + '-' + palette + '-' + theme + '-' + name + '.png'), fullPage: true });
      }
      // Intake and the three review entry points are separate authorized tools.
      for (const destination of ['/web/content-import.html', '/web/review.html', '/web/review.html?workspace=references', '/web/review.html?workspace=rights']) {
        await go(origin + destination);
        await mainNav.getByRole('link', { includeHidden: true, name: 'Master Admin', exact: true }).waitFor({ state: 'attached' });
        assert.deepEqual(await page.evaluate(() => ({ palette: document.documentElement.dataset.palette, theme: document.documentElement.dataset.appearance, overflow: document.documentElement.scrollWidth > innerWidth })), { palette, theme, overflow: false }, destination);
      }
      await go(origin + '/web/admin.html');
      await settleAdmin();
    }
    await go(origin + '/web/admin.html');
    await settleAdmin();
    largeFlags = false;
    if (name === layouts[0][0]) {
      accessStatus = 503; await reload();
      await page.getByRole('heading', { name: 'Admin access unavailable', exact: true }).waitFor();
      assert.equal(await mainNav.getByRole('link', { includeHidden: true, name: 'Master Admin', exact: true }).count(), 0);
      accessStatus = 200; projectionUnavailable = true;
      if (width <= 1050 && await page.evaluate(() => document.body.dataset.rail === 'expanded')) await closeTools();
      await activate(page.locator('[data-action="reload"]'));
      await settleAdmin();
      await go(origin + '/web/admin.html#research-gate');
      await page.getByRole('heading', { name: 'Admin data unavailable', exact: true }).waitFor();
      await mainNav.getByRole('link', { includeHidden: true, name: 'Master Admin', exact: true }).waitFor({ state: 'attached' });
      projectionUnavailable = false; await activate(page.locator('[data-action="reload"]'));
      await page.locator('#owner-console').waitFor({ state: 'attached' });
      await page.locator('#owner-features-state').getByText('No feature gates are registered.', { exact: true }).waitFor({ state: 'attached' });
      assert.equal(await page.locator('#owner-features').count(), 1);
      await settleAdmin();
      accessStatus = 403; await reload();
      await page.getByRole('heading', { name: 'Admin access only.', exact: true }).waitFor();
      assert.equal(await page.locator('#owner-console').count(), 0);
      assert.equal(await mainNav.getByRole('link', { includeHidden: true, name: 'Master Admin', exact: true }).count(), 0);
      accessStatus = 200;
      dashboardUnavailable = true;
      const beforeOutage = dashboardReads;
      await go(origin + '/web/admin.html#owner-users');
      await page.getByRole('heading', { name: 'Owner data unavailable', exact: true }).waitFor();
      assert.equal(dashboardReads, beforeOutage + 1, 'failed dashboard waits for an explicit Retry');
      if (width <= 1050 && await page.evaluate(() => document.body.dataset.rail === 'expanded')) await closeTools();
      dashboardUnavailable = false;
      await activate(page.locator('[data-owner-dashboard-retry]'));
      await page.locator('#owner-users').waitFor();
      await settleAdmin();
      assert.equal(dashboardReads, beforeOutage + 2, 'explicit Retry performs one owner read');
    }
    await go(origin + '/web/admin.html');
    await page.locator('#owner-console').waitFor();
    await settleAdmin();
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) await openTools();
    assert.deepEqual(writes, [], 'Admin sidebar actions never change user access or content');
    for (const [href, title] of [['/web/admin.html', 'Overview'], ['/web/content-import.html', 'Content Intake'], ['/web/admin.html#owner-integrity', 'Catalog Integrity'], ['/web/admin.html#owner-source-watch', 'Source Change Watch'], ['/web/review.html', 'Review Workspace'], ['/web/review.html?workspace=references', 'Reference Review'], ['/web/review.html?workspace=rights', 'Source Rights']]) {
      assert.equal(await page.locator('#mlos-local-nav a[href="' + href + '"]').count(), 1, title);
    }
    await activate(page.locator('#mlos-local-nav a[href="/web/content-import.html"]'));
    await page.getByRole('heading', { name: 'Import & review', exact: true }).waitFor();
    await mainNav.getByRole('link', { includeHidden: true, name: 'Master Admin', exact: true }).waitFor({ state: 'attached' });
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) {
      if (width > 700) assert.equal(await page.locator('#mlos-local-nav details[data-group="admin:content"]').getAttribute('data-active'), 'true');
      await openTools();
    }
    const contentGroup = page.locator('#mlos-local-nav details[data-group="admin:content"]');
    if (!(await contentGroup.evaluate(node => node.open))) await activate(contentGroup.locator(':scope > summary'));
    assert.equal(await page.locator('#mlos-local-nav a[href="/web/content-import.html"]').getAttribute('aria-current'), 'page');
    await activate(page.locator('#mlos-local-nav a[href="/web/review.html?workspace=references"]'));
    await page.waitForURL('**/web/review?workspace=references');
    await mainNav.getByRole('link', { includeHidden: true, name: 'Master Admin', exact: true }).waitFor({ state: 'attached' });
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) {
      if (width > 700) assert.equal(await page.locator('#mlos-local-nav details[data-group="admin:content"]').getAttribute('data-active'), 'true');
      await openTools();
    }
    const reviewGroup = page.locator('#mlos-local-nav details[data-group="admin:content"]');
    if (!(await reviewGroup.evaluate(node => node.open))) await activate(reviewGroup.locator(':scope > summary'));
    assert.equal(await page.locator('#mlos-local-nav a[href="/web/review.html?workspace=references"]').getAttribute('aria-current'), 'page');
    await activate(mainNav.getByRole('link', { includeHidden: true, name: 'Study', exact: true }));
    await mainNav.getByRole('link', { includeHidden: true, name: 'Master Admin', exact: true }).waitFor({ state: 'attached' });
    await activate(page.getByLabel('Account menu', { exact: true }));
    await activate(page.getByRole('navigation', { name: 'Account navigation', exact: true }).getByRole('link', { name: 'Profile', exact: true }));
    await page.getByRole('heading', { name: 'Your Medical Learning OS account.', exact: true }).waitFor();
    admin = false; await reload(); await page.getByRole('heading', { name: 'Your Medical Learning OS account.', exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('#mlos-navigation') && !document.querySelector('[data-master="admin"]'));
    assert.equal(await mainNav.getByRole('link', { includeHidden: true, name: 'Master Admin', exact: true }).count(), 0);
    await go(origin + '/web/library.html?view=notes&subject=medicine&system=respiratory');
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
    await activate(page.locator('#mlos-local-nav a[href="/web/library.html?view=notes"]'));
    await page.getByRole('heading', { name: 'Concept Notes', exact: true }).waitFor();
    assert.equal(await page.locator('#library-app').getAttribute('data-navigation-probe'), 'retained', 'clean-URL shell view changes preserve the workspace');
    assert.equal(await page.getByLabel('Subject', { exact: true }).inputValue(), 'medicine');
    assert.equal(await page.getByLabel('System', { exact: true }).inputValue(), 'respiratory');

    assert.equal(await page.getByLabel('Subject', { exact: true }).inputValue(), 'medicine');
    assert.equal(await page.getByLabel('System', { exact: true }).inputValue(), 'respiratory');
    await go(origin + '/web/library.html?view=recall');
    await page.getByLabel('Your recall', { exact: true }).fill('Unsaved self-review');
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) await openTools();
    await page.getByRole('button', { name: 'Switch to light appearance', exact: true }).click();
    assert.equal(await page.getByLabel('Your recall', { exact: true }).inputValue(), 'Unsaved self-review');
    if (await page.evaluate(() => document.body.dataset.rail === 'expanded')) await closeTools();
    await go(origin + '/web/workspace.html?master=home&section=recent');
    await page.getByText('Concise practice', { exact: true }).waitFor();
    await go(origin + '/web/workspace.html?master=exams&section=autopsy');
    await page.getByRole('link', { name: 'Open GT Autopsy', exact: true }).waitFor();
    assert.equal(await page.locator('a[href*="cancelled-run"]').count(), 0);
    await go(origin + '/web/workspace.html?master=account&section=preferences');
    await page.getByRole('heading', { name: 'Appearance and navigation', exact: true }).waitFor();
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) await openTools();
    await activate(page.locator('#mlos-local-nav [data-pin="account:data"]'));
    if (width <= 1050) await closeTools();
    await page.getByLabel('Appearance', { exact: true }).selectOption('dark');
    assert.equal(await page.evaluate(() => document.documentElement.dataset.appearance), 'dark');
    assert.equal(await page.evaluate(() => document.body.dataset.rail), 'collapsed');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mlos-navigation-v1')).pins.includes('account:data')), true, 'pin persists without duplicating the current sidebar');
    await reload(); await page.getByLabel('Appearance', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Appearance', { exact: true }).inputValue(), 'dark');
    admin = true;
    // Style/palette/appearance are independent and survive real Preferences edits and reload.
    for (const surfaceStyle of ['standard', 'glass']) for (const palette of ['sage_precision', 'lavender_precision']) for (const theme of ['light', 'dark']) {
      await page.getByLabel('Surface style', { exact: true }).selectOption(surfaceStyle);
      await page.getByLabel('Colour palette', { exact: true }).selectOption(palette);
      await page.getByLabel('Appearance', { exact: true }).selectOption(theme);
      const prefsBefore = await page.evaluate(() => JSON.parse(localStorage.getItem('mlos-navigation-v1')));
      await reload(); await page.getByLabel('Surface style', { exact: true }).waitFor();
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('mlos-navigation-v1'))), prefsBefore, 'full saved preference equality');
      for (const destination of ['/', '/web/medical.html', '/web/library.html?view=notes', '/web/admin.html']) {
        await go(origin + destination); await page.locator('[data-theme]').waitFor();
        if (destination === '/web/admin.html') await settleAdmin();
        const actual = await page.evaluate(() => {
          const root = document.documentElement, header = getComputedStyle(document.querySelector('.mlos-header'));
          const reading = [...document.querySelectorAll('main .panel,main .session-card,main .explanation')];
          return { surfaceStyle: root.dataset.surfaceStyle, palette: root.dataset.palette, theme: root.dataset.appearance,
            overflow: root.scrollWidth > innerWidth, padding: getComputedStyle(document.body).paddingLeft,
            blur: header.backdropFilter || header.webkitBackdropFilter || 'none', navColor: header.backgroundColor,
            readingBlur: reading.every(node => ['none',''].includes(getComputedStyle(node).backdropFilter || 'none')) };
        });
        assert.equal(actual.surfaceStyle, surfaceStyle); assert.equal(actual.palette, palette); assert.equal(actual.theme, theme);
        assert.equal(actual.overflow, false); assert.equal(actual.padding, '0px'); assert.equal(actual.readingBlur, true);
        if (width > 700 && surfaceStyle === 'glass') { assert.notEqual(actual.navColor, 'rgb(255, 255, 255)'); assert.notEqual(actual.blur, 'none'); }
        else assert.equal(actual.blur, 'none');
        if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, 'surface-' + surfaceStyle + '-' + palette + '-' + theme + '-' + name + '-' + (destination === '/' ? 'home' : destination.includes('medical') ? 'study' : destination.includes('admin') ? 'admin' : 'library') + '.png'), fullPage: true });
      }
      await go(origin + '/web/workspace.html?master=account&section=preferences');
      await page.getByLabel('Surface style', { exact: true }).waitFor();
    }
    // Every real section/module leaf is reachable through rendered menu links.
    await go(origin + '/web/library.html?view=subjects'); await openTools();
    for (const master of MASTERS) {
      if (master.id === 'account') continue;
      if (width <= 700) continue; // phone catalog already covered by unchanged drawer and the existing route sweep
      const currentMenu = page.locator('#mlos-workspace-menu');
      if (page.viewportSize().width < 1000) {
        await currentMenu.locator('[data-workspace-menu="' + master.id + '"]').click();
      } else await page.locator('.mlos-header [data-workspace-menu="' + master.id + '"]').click();
      for (const row of flatten(navigationFor(master.id, { isAdmin: true }))) assert.ok(await currentMenu.locator('a').evaluateAll((nodes, href) => nodes.some(n => n.getAttribute('href') === href), row.href), master.id + ':' + row.id);
    }
    await closeTools();
    await go(origin + '/web/workspace.html?master=account&section=preferences'); await page.getByLabel('Surface style', { exact: true }).waitFor();
    await page.getByLabel('Surface style', { exact: true }).selectOption('standard');
    // Exact approved light palettes, independent dark appearance, and cross-page persistence.
    for (const [palette, background, ink, primary, firstStop] of [
      ['sage_precision', 'rgb(250, 250, 247)', 'rgb(25, 42, 34)', '#244A3A', 'rgb(233, 241, 231)'],
      ['lavender_precision', 'rgb(219, 216, 233)', 'rgb(32, 32, 32)', '#373737', 'rgb(151, 139, 227)']
    ]) {
      await page.getByLabel('Colour palette', { exact: true }).selectOption(palette);
      assert.equal(await page.getByLabel('Appearance', { exact: true }).inputValue(), 'dark');
      await page.getByLabel('Appearance', { exact: true }).selectOption('light');
      for (const destination of ['/', '/web/medical.html', '/web/library.html?view=notes', '/web/exam.html', '/web/account.html', '/web/admin.html']) {
        await go(origin + destination);
        await page.locator('[data-theme]').waitFor();
        if (destination === '/web/admin.html') await page.locator('#owner-home').waitFor();
        const actual = await page.evaluate(() => ({
          palette: document.documentElement.dataset.palette,
          bg: getComputedStyle(document.body).backgroundColor,
          ink: getComputedStyle(document.body).color,
          primary: getComputedStyle(document.documentElement).getPropertyValue('--forest').trim(),
          overflow: document.documentElement.scrollWidth > innerWidth
        }));
        assert.deepEqual(actual, { palette, bg: background, ink, primary, overflow: false }, destination + ' ' + palette);
        if (destination === '/') assert.ok((await page.locator('.hero').first().evaluate(node => getComputedStyle(node).backgroundImage)).includes(firstStop));
      }
      await go(origin + '/web/workspace.html?master=account&section=preferences');
      await page.getByLabel('Colour palette', { exact: true }).waitFor();
      assert.equal(await page.getByLabel('Colour palette', { exact: true }).inputValue(), palette);
      await reload(); await page.getByLabel('Colour palette', { exact: true }).waitFor();
      assert.equal(await page.getByLabel('Colour palette', { exact: true }).inputValue(), palette);
      await page.getByLabel('Appearance', { exact: true }).selectOption('dark');
      assert.equal(await page.evaluate(() => document.documentElement.dataset.palette), palette);
    }

    admin = false;
    // The landing uses different CSS and no learner session: verify it independently.
    for (const palette of ['sage_precision', 'lavender_precision']) for (const appearance of ['light', 'dark']) {
      const signedOut = await browser.newContext({ viewport: { width, height }, hasTouch: touch });
      await signedOut.addInitScript(({ palette, appearance }) => localStorage.setItem('mlos-navigation-v1', JSON.stringify({ version: 1, palette, theme: appearance })), { palette, appearance });
      const landing = await signedOut.newPage();
      landing.on('pageerror', error => errors.push(error.message));
      await landing.goto(origin + '/web/account.html');
      await landing.locator('body.account-landing-active').waitFor();
      const actual = await landing.evaluate(() => {
        const root = getComputedStyle(document.documentElement), body = getComputedStyle(document.body);
        const expectedBg = root.getPropertyValue('--bg').trim(), expectedInk = root.getPropertyValue('--ink').trim();
        const swatch = document.createElement('span'); document.body.append(swatch);
        swatch.style.color = expectedBg; const bg = getComputedStyle(swatch).color;
        swatch.style.color = expectedInk; const ink = getComputedStyle(swatch).color; swatch.remove();
        const brand = document.querySelector('.account-brand>span:last-child').getBoundingClientRect(), cta = document.querySelector('.account-create-cta').getBoundingClientRect();
        return { palette: document.documentElement.dataset.palette, appearance: document.documentElement.dataset.appearance, brandOverlap: brand.right > cta.left, backgroundMatches: body.backgroundColor === bg, inkMatches: body.color === ink,
          previewInk: getComputedStyle(document.querySelector('.continue-card small')).color === ink,
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.deepEqual(actual, { palette, appearance, brandOverlap: false, backgroundMatches: true, inkMatches: true, previewInk: true, overflow: false }, palette + ' signed-out ' + appearance);
      await signedOut.close();
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(writes.length, 0, 'navigation and self-review must not create learning or publication writes');
    await go(origin + '/web/library.html?view=media&category=radiology');
    await page.getByRole('heading', { name: 'Media Library', exact: true }).waitFor();
    await activate(page.locator('#mlos-local-nav a[href="/web/library.html?view=notes"]'));
    await page.getByRole('heading', { name: 'Concept Notes', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('category'), null);
    assert.equal(await page.getByRole('heading', { name: 'Synthetic source note', exact: true }).count(), 1);
    await go(origin + '/web/library.html?view=references&reference=labs-diagnostics&subject=medicine&count=5');
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
      await openTools();
      await activate(page.locator('#mlos-local-nav a[href="/web/library.html?view=subjects&subject=anatomy&module=gross-regional-anatomy"]'));
      await page.getByRole('heading', { name: 'Subjects & Topics', exact: true }).waitFor();
      assert.equal(new URL(page.url()).searchParams.get('subject'), 'anatomy');
      assert.equal(new URL(page.url()).searchParams.get('module'), 'gross-regional-anatomy');
    }
    libraryUnavailable = true;
    await go(origin + '/web/library.html?view=notes');
    await page.getByRole('button', { name: 'Retry library', exact: true }).waitFor();
    await activate(page.locator('#mlos-local-nav a[href="/web/library.html?view=graph"]'));
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
    await go(origin + '/web/library.html?view=recall');
    if (await page.evaluate(() => document.body.dataset.rail === 'expanded')) await closeTools();
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
    await go(origin + '/web/library.html?view=images&system=respiratory');
    await page.getByRole('button', { name: 'Open original media', exact: true }).click();
    await page.getByRole('heading', { name: 'Original media', exact: true }).waitFor();
    await page.getByLabel('System', { exact: true }).selectOption('cardiovascular');
    assert.equal(await page.getByRole('heading', { name: 'Original media', exact: true }).count(), 0);
    await page.evaluate(() => localStorage.setItem('mlos-library-device-v1', JSON.stringify({ version: 1, bookmarks: [], views: Array.from({ length: 30 }, (_, i) => ({ id: 'limit-' + i, name: 'Saved fixture ' + i, view: 'notes', filters: {} })) })));
    await go(origin + '/web/library.html?view=notes');
    page.once('dialog', dialog => dialog.accept('Overflow fixture'));
    await page.getByRole('button', { name: 'Save current view', exact: true }).click();
    await page.getByText('You have 30 saved views. Delete one before saving another.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('mlos-library-device-v1')).views.length), 30);
    await go(origin + '/web/library.html?view=subjects&master=study');
    await page.getByRole('heading', { name: 'Subjects & Topics', exact: true }).waitFor();
    await page.getByLabel('Subject', { exact: true }).selectOption('medicine');
    assert.equal(new URL(page.url()).searchParams.get('master'), 'study');
    assert.equal(await mainNav.getByRole('link', { includeHidden: true, name: 'Study', exact: true }).getAttribute('aria-current'), 'page');
    await reload();
    await page.getByRole('heading', { name: 'Subjects & Topics', exact: true }).waitFor();
    assert.equal(await mainNav.getByRole('link', { includeHidden: true, name: 'Study', exact: true }).getAttribute('aria-current'), 'page');
    selectionLibrary = { ...library, questions: [question, { ...question, questionId: 'fixture-q2', questionVersionId: 'fixture-q2@3' }, { ...question, questionId: 'fixture-q3', questionVersionId: 'fixture-q3@2' }] };
    await go(origin + '/web/library.html?view=questions&master=study&build=1');
    await page.getByRole('heading', { name: 'Build Session', exact: true }).waitFor();
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) await openTools();
    await activate(page.locator('#mlos-local-nav [data-pin="study:build"]'));
    await go(origin + '/web/library.html?view=notes');
    await page.getByRole('heading', { name: 'Concept Notes', exact: true }).waitFor();
    await page.getByLabel('Collection', { exact: true }).selectOption('pyq');
    assert.equal(await page.locator('[data-filter="keyword"] option[value="diagnosis"]').count(), 0);
    await page.getByLabel('Collection', { exact: true }).selectOption('');
    if (await page.evaluate(() => document.body.dataset.rail === 'collapsed')) await openTools();
    await activate(page.locator('#mlos-local-nav [data-pin="library:notes"]'));
    await activate(page.getByRole('navigation', { name: 'Pinned shortcuts', includeHidden: true }).getByRole('link', { name: 'Questions', exact: true, includeHidden: true }));
    await page.getByRole('heading', { name: 'Build Session', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('build'), '1');
    await activate(page.getByRole('navigation', { name: 'Pinned shortcuts', includeHidden: true }).getByRole('link', { name: 'Concept Notes', exact: true, includeHidden: true }));
    await page.getByRole('heading', { name: 'Concept Notes', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('build'), null);
    await activate(page.getByRole('navigation', { name: 'Pinned shortcuts', includeHidden: true }).getByRole('link', { name: 'Questions', exact: true, includeHidden: true }));
    await page.getByRole('heading', { name: 'Build Session', exact: true }).waitFor();
    if (width <= 1050 && await page.evaluate(() => document.body.dataset.rail === 'expanded')) await closeTools();
    await page.getByLabel('Question count', { exact: true }).selectOption('1');
    await reload(); await page.getByRole('heading', { name: 'Build Session', exact: true }).waitFor();
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
    await activate(page.getByLabel('Account menu', { exact: true }));
    await activate(accountMenu.getByRole('link', { name: 'Preferences', exact: true }));
    await page.getByRole('heading', { name: 'Appearance and navigation', exact: true }).waitFor();
    await activate(page.getByLabel('Account menu', { exact: true }));
    await activate(accountMenu.getByRole('link', { name: 'Account & Security', exact: true }));
    await page.locator('#sign-in-methods').waitFor();
    assert.equal(new URL(page.url()).hash, '#sign-in-methods');
    for (const fail of [false, true]) {
      logoutFails = fail;
      await page.evaluate(value => localStorage.setItem('mlos-supabase-auth-v1', JSON.stringify({ accessToken: 'fixture', refreshToken: 'fixture', expiresAt: 2100000000, user: value })), user);
      await go(origin + '/web/account.html');
      await page.getByRole('heading', { name: 'Your Medical Learning OS account.', exact: true }).waitFor();
      await activate(page.getByLabel('Account menu', { exact: true }));
      await activate(accountMenu.getByRole('button', { name: 'Sign out', exact: true }));
      await page.waitForFunction(() => !JSON.parse(localStorage.getItem('mlos-supabase-auth-v1') || 'null'));
      await page.waitForFunction(() => !document.querySelector('[data-master="admin"]'));
      await page.waitForLoadState('networkidle');
      await activate(page.getByLabel('Account menu', { exact: true }));
      assert.equal(await accountMenu.getByRole('link', { name: 'Sign in', exact: true }).isVisible(), true);
      assert.equal(await accountMenu.getByRole('button', { name: 'Sign out', exact: true }).count(), 0);
    }

    await page.waitForLoadState('networkidle'); await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('Navigation actions, 172 contextual nested leaves, touch dismissal, history, pins and persistence passed in ' + engine + '.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }); }
