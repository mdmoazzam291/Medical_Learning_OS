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
    await page.getByLabel('Show', { exact: true }).selectOption('incorrect');
    assert.equal(await page.locator('.question-list article').count(), 1);
    await page.getByLabel('Show', { exact: true }).selectOption('bookmarks');
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
  assert.deepEqual(errors, []);
  console.log('Concurrent submit, corrupt data protection, private-file boundary and no browser errors passed');
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    console.error(await activePage.locator('body').innerText());
    console.error('Browser errors:', errors);
    if (process.env.SCREENSHOT_DIR) await activePage.screenshot({ path: `${process.env.SCREENSHOT_DIR}/failure.png`, fullPage: true });
  }
  throw error;
} finally { await browser.close(); }
