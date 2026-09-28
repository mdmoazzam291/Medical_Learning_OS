// Optional browser verification. Supply PLAYWRIGHT_MODULE_URL for a preinstalled
// Playwright module, or install Playwright in a separate verification environment.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const browser = await chromium.launch({ headless: true });
const origin = process.env.APP_URL || 'http://127.0.0.1:3000';
const errors = [];
let activePage;
try {
  for (const [name, width, height] of [['phone', 390, 844], ['tablet', 820, 1180], ['desktop', 1440, 1000]]) {
    const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
    const page = await context.newPage();
    activePage = page;
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin);
    await page.getByRole('heading', { name: 'Make the next answer count.' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name + ' horizontal overflow');
    const firstCountdown = await page.locator('#countdown').textContent();
    await page.waitForFunction(first => document.querySelector('#countdown').textContent !== first, firstCountdown);
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await page.getByRole('button', { name: 'Edit target' }).click();
    await page.getByLabel('Personal target date').fill('2027-07-04');
    await page.getByLabel('Daily question target').fill('20');
    await page.getByRole('button', { name: 'Save plan' }).click();
    await page.getByRole('alert').filter({ hasText: 'Study plan saved.' }).waitFor();
    await page.reload();
    await page.getByRole('heading', { name: 'Make the next answer count.' }).waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.match(await page.locator('.countdown').textContent(), /2027-07-04/);
    await page.getByRole('button', { name: 'Start demo' }).click();
    await page.getByRole('radio').nth(1).check();
    await page.waitForFunction(() => !document.querySelector('#submit-answer').disabled);
    await page.getByRole('button', { name: 'Bookmark', exact: true }).click();
    await page.getByRole('button', { name: 'Bookmarked', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Continue demo' }).click();
    assert.equal(await page.getByRole('radio').nth(1).isChecked(), true);
    await page.getByRole('button', { name: 'Check answer' }).click();
    await page.getByRole('heading', { name: 'A useful mistake to revisit.' }).waitFor();
    await page.reload();
    await page.getByRole('button', { name: 'Continue demo' }).click();
    await page.getByRole('heading', { name: 'A useful mistake to revisit.' }).waitFor();
    await page.getByRole('button', { name: 'Next question' }).click();
    for (let i = 0; i < 2; i++) {
      // The previous question's checked radio can satisfy check() before the
      // asynchronous Next transaction renders. Wait for the new question.
      await page.getByText(`Question ${i + 2} of 3`, { exact: false }).waitFor();
      await page.getByRole('radio').nth(1).check();
      await page.waitForFunction(() => !document.querySelector('#submit-answer').disabled);
      await page.getByRole('button', { name: 'Check answer' }).click();
      await page.getByRole('heading', { name: 'Correct.', exact: true }).waitFor();
      await page.getByRole('button', { name: i === 0 ? 'Next question' : 'Finish demo' }).click();
    }
    await page.getByRole('heading', { name: 'Your evidence is saved.' }).waitFor();
    await page.getByRole('button', { name: 'View progress' }).click();
    assert.match(await page.locator('.accuracy').textContent(), /2 correct \/ 3 attempts/);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export local data' }).click();
    const download = await downloadPromise;
    const { readFile } = await import('node:fs/promises');
    const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
    assert.equal(exported.data.events.length, 3);
    assert.equal(exported.data.settings.dailyGoal, 20);
    await page.getByRole('link', { name: 'Demo QBank' }).click();
    await page.getByRole('combobox', { name: 'Question filter' }).selectOption('incorrect');
    assert.equal(await page.locator('.question-list article').count(), 1);
    await page.getByRole('combobox', { name: 'Question filter' }).selectOption('bookmarks');
    assert.equal(await page.locator('.question-list article').count(), 1);
    await page.getByLabel('Search demo questions').fill('no match');
    await page.getByRole('heading', { name: 'No questions here yet.' }).waitFor();
    await page.getByRole('link', { name: 'Today', exact: true }).click();
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/${name}.png`, fullPage: true });
    // A forced quota failure must retain the prior ledger, keep the question visible,
    // and avoid showing success or advancing the session.
    await page.getByRole('button', { name: 'Start demo' }).click();
    await page.getByRole('radio').nth(0).check();
    await page.waitForFunction(() => !document.querySelector('#submit-answer').disabled);
    await page.evaluate(() => { IDBObjectStore.prototype.put = () => { throw new DOMException('Test quota full', 'QuotaExceededError'); }; });
    await page.getByRole('button', { name: 'Check answer' }).click();
    await page.getByRole('alert').filter({ hasText: 'Not saved' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Check answer' }).count(), 1);
    await page.reload();
    await page.getByRole('link', { name: 'Progress', exact: true }).click();
    assert.match(await page.locator('.accuracy').textContent(), /2 correct \/ 3 attempts/);
    await context.close();
    console.log(`${name}: settings, theme, countdown, answer/resume, completion, queues, export and failed-write recovery passed`);
  }
  // Real IndexedDB concurrency, independent connections: duplicate submit counts once.
  const context = await browser.newContext();
  const page = await context.newPage();
    activePage = page;
  await page.goto(origin);
  await page.getByRole('heading', { name: 'Make the next answer count.' }).waitFor();
  const result = await page.evaluate(async () => {
    const { openStore } = await import('/src/adapters/local-store.js');
    const a = await openStore(indexedDB), b = await openStore(indexedDB);
    await a.dispatch({ type: 'start', id: 'concurrent', now: 1000 });
    await a.dispatch({ type: 'select', sessionId: 'concurrent', index: 0, option: 0, now: 2000 });
    const action = { type: 'answer', sessionId: 'concurrent', index: 0, now: 3000 };
    await Promise.all([a.dispatch(action), b.dispatch(action)]);
    const state = await a.load(); a.close(); b.close(); return state;
  });
  assert.equal(result.events.length, 1);
  // A corrupt/future record cannot silently reset the existing database.
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('medical-learning-os-local-v1', 1);
    request.onsuccess = () => { const db = request.result; const tx = db.transaction('state', 'readwrite'); tx.objectStore('state').put({ schemaVersion: 999 }, 'learner'); tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
  }));
  await page.reload();
  await page.getByRole('heading', { name: 'Your saved workspace could not be opened.' }).waitFor();
  assert.equal((await page.request.get(origin + '/data/content-draft.json')).status(), 404);
  assert.equal((await page.request.get(origin + '/package.json')).status(), 404);
  await context.close();
  // Account integration: no real user or email delivery is required in CI.
  const accountContext = await browser.newContext({ viewport: { width: 820, height: 1000 } });
  const accountPage = await accountContext.newPage();
  activePage = accountPage;
  accountPage.on('pageerror', e => errors.push(e.message));
  let refreshCalls = 0;
  let reviewRecorded = false;
  let reviewBody = null;
  await accountPage.route('https://iyapppmeieqhflnzslao.supabase.co/**', async route => {
    const url = route.request().url();
    if (url.includes('/auth/v1/token?grant_type=password')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'jwt-test', refresh_token: 'refresh-test', expires_at: 2100000000, user: { id: '11111111-1111-1111-1111-111111111111', email: 'learner@example.com', email_confirmed_at: '2026-09-25T00:00:00Z' } }) });
    if (url.includes('/auth/v1/token?grant_type=refresh_token')) { refreshCalls += 1; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'jwt-refreshed', refresh_token: 'refresh-refreshed', expires_at: 2100003600, user: { id: '11111111-1111-1111-1111-111111111111', email: 'learner@example.com', email_confirmed_at: '2026-09-25T00:00:00Z' } }) }); }
    if (url.includes('/auth/v1/user')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: '22222222-2222-2222-2222-222222222222', email: 'confirmed@example.com', email_confirmed_at: '2026-09-26T00:00:00Z' }) });
    if (url.includes('/functions/v1/study-api/progress')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ attempts: 0, correct: 0, accuracy: null, concepts: [] }) });
    if (url.includes('/functions/v1/study-api/questions')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ questions: [] }) });
    if (url.includes('/functions/v1/review-api/me')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reviewerId: '11111111-1111-1111-1111-111111111111', reviewKinds: ['medical'] }) });
    if (url.includes('/functions/v1/review-api/queue?kind=medical')) {
      const items = reviewRecorded ? [] : [{
        question: {
          questionId: 'demo:review',
          questionVersionId: 'demo:review@1',
          version: 1,
          supersedes: null,
          authorId: 'fixture-author',
          changeReason: 'Review UI fixture',
          stem: 'Which review behavior is safest?',
          options: [{ optionId: 'server', text: 'Derive reviewer identity on the server' }, { optionId: 'browser', text: 'Trust a browser reviewer ID' }],
          answerOptionId: 'server',
          explanation: 'Reviewer identity must come from the authenticated server boundary.',
          conceptLinks: [{ conceptId: 'demo:review-boundary', role: 'primary' }],
          sourceIds: ['demo:review-source:v1'],
          provenance: { kind: 'original', exam: null, year: null, evidence: 'Synthetic browser verification fixture.' },
          status: 'in_review',
          reviews: [],
          publishedAt: null
        },
        sources: [{
          sourceId: 'demo:review-source:v1',
          title: 'Synthetic review source',
          url: null,
          version: '1',
          rights: { status: 'owned', evidence: 'Synthetic browser verification fixture.' }
        }]
      }];
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reviewKind: 'medical', items }) });
    }
    if (url.includes('/functions/v1/review-api/reviews')) {
      reviewBody = JSON.parse(route.request().postData() || '{}');
      reviewRecorded = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        reviewId: 'review-1',
        questionVersionId: 'demo:review@1',
        reviewKind: 'medical',
        decision: reviewBody.decision,
        targetSha256: 'a'.repeat(64),
        reviewedAt: '2026-09-26T12:00:00.000Z'
      }) });
    }
    if (url.includes('/auth/v1/logout')) return route.fulfill({ status: 204, body: '' });
    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'unexpected_test_route' }) });
  });
  await accountPage.goto(origin + '/web/account.html');
  await accountPage.getByRole('heading', { name: 'Connect your learner identity.' }).waitFor();
  const googleHref = await accountPage.getByRole('link', { name: 'Continue with Google' }).getAttribute('href');
  const googleUrl = new URL(googleHref);
  assert.equal(googleUrl.origin, 'https://iyapppmeieqhflnzslao.supabase.co');
  assert.equal(googleUrl.pathname, '/auth/v1/authorize');
  assert.equal(googleUrl.searchParams.get('provider'), 'google');
  assert.equal(googleUrl.searchParams.get('redirect_to'), origin + '/web/account.html');
  assert.equal(googleUrl.searchParams.has('client_secret'), false);
  const signIn = accountPage.locator('#signin-form');
  await signIn.getByLabel('Email').fill('learner@example.com');
  await signIn.getByLabel('Password').fill('strong-password');
  await signIn.getByRole('button', { name: 'Sign in with email' }).click();
  await accountPage.getByRole('heading', { name: 'Your learner identity is connected.' }).waitFor();
  assert.match(await accountPage.locator('.metrics').textContent(), /0Server attempts/);
  assert.match(await accountPage.locator('.metrics').textContent(), /0Published questions/);
  await accountPage.getByRole('button', { name: 'Verify session refresh', exact: true }).click();
  await accountPage.getByRole('button', { name: 'Verify session refresh', exact: true }).waitFor();
  await accountPage.getByRole('alert').filter({ hasText: 'Session refresh verified in this browser.' }).waitFor();
  assert.equal(refreshCalls, 1);
  await accountPage.getByRole('link', { name: 'Open review workspace' }).waitFor();
  await accountPage.getByRole('link', { name: 'Open review workspace' }).click();
  await accountPage.getByRole('heading', { name: 'Review one immutable version at a time.' }).waitFor();
  await accountPage.getByRole('heading', { name: 'demo:review@1' }).waitFor();
  assert.match(await accountPage.locator('.review-stem').textContent(), /Which review behavior is safest/);
  assert.match(await accountPage.locator('.review-answer').textContent(), /Derive reviewer identity on the server/);
  await accountPage.getByLabel('Review notes').fill('Synthetic browser review: answer and explanation checked.');
  await accountPage.getByRole('button', { name: 'Approve this gate' }).click();
  await accountPage.getByRole('alert').filter({ hasText: 'Approved demo:review@1' }).waitFor();
  await accountPage.getByRole('heading', { name: 'No pending targets for this gate.' }).waitFor();
  assert.deepEqual(Object.keys(reviewBody).sort(), ['decision', 'notes', 'questionVersionId', 'reviewKind']);
  assert.equal('reviewerId' in reviewBody, false);
  await accountPage.getByRole('link', { name: 'Cloud account' }).click();
  await accountPage.getByRole('heading', { name: 'Your learner identity is connected.' }).waitFor();
  await accountPage.reload();
  await accountPage.getByRole('heading', { name: 'Your learner identity is connected.' }).waitFor();
  await accountPage.getByRole('button', { name: 'Sign out' }).click();
  await accountPage.getByRole('heading', { name: 'Connect your learner identity.' }).waitFor();

  // A Supabase implicit confirmation landing on the site root is forwarded to
  // the account boundary, verified against /auth/v1/user, then scrubbed from history.
  await accountPage.goto(origin + '/#access_token=callback-jwt&refresh_token=callback-refresh&expires_in=3600&type=signup');
  await accountPage.getByRole('heading', { name: 'Your learner identity is connected.' }).waitFor();
  assert.match(await accountPage.locator('.page-heading').textContent(), /confirmed@example.com/);
  assert.equal(new URL(accountPage.url()).hash, '');
  assert.match(accountPage.url(), /\/web\/account\.html$/);
  await accountPage.getByRole('button', { name: 'Sign out' }).click();
  await accountPage.getByRole('heading', { name: 'Connect your learner identity.' }).waitFor();
  await accountContext.close();
  assert.deepEqual(errors, []);
  console.log('Concurrent submit, corrupt data protection, private-file boundary, Google/email account boundary, authenticated reviewer workflow and no browser errors passed');
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    console.error(await activePage.locator('body').innerText());
    console.error('Browser errors:', errors);
    if (process.env.SCREENSHOT_DIR) await activePage.screenshot({ path: `${process.env.SCREENSHOT_DIR}/failure.png`, fullPage: true });
  }
  throw error;
} finally { await browser.close(); }
