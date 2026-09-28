// Synthetic transport fixture: no production credentials or review writes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const pilot = JSON.parse(readFileSync('data/evaluations/source-grounding-cdc-co-v1.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const origin = process.env.APP_URL || 'http://127.0.0.1:3000';
try {
  for (const width of [390, 820, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript(() => localStorage.setItem('mlos-supabase-auth-v1', JSON.stringify({
      accessToken: 'synthetic', refreshToken: 'synthetic', expiresAt: 4102444800,
      user: { id: 'synthetic', email: 'synthetic@example.test' }
    })));
    const items = pilot.questions.map(q => ({ question: {
      questionVersionId: q.questionVersionId, stem: 'Synthetic browser fixture', explanation: 'Inspect the source.',
      conceptLinks: [{ role: 'primary', conceptId: q.primaryConceptId }], options: [], provenance: {}
    }, sources: [{ sourceId: pilot.sourceSnapshot.sourceId, version: pilot.sourceSnapshot.registeredVersion,
      url: pilot.sourceSnapshot.url, rights: { status: 'unknown' } }] }));
    let writes = 0;
    await context.route('**/functions/v1/review-api/**', async route => {
      if (route.request().method() !== 'GET') writes++;
      const path = new URL(route.request().url()).pathname;
      const body = path.endsWith('/me') ? { reviewKinds: ['references', 'rights'] }
        : path.endsWith('/queue') ? { items } : {};
      await route.fulfill({ json: body });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/web/review.html');
    await page.getByRole('heading', { name: 'Inspect shared evidence before individual decisions' }).waitFor();
    assert.equal(await page.locator('.review-decision-form').count(), 7);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
    await page.reload();
    await page.getByRole('heading', { name: 'Inspect shared evidence before individual decisions' }).waitFor();
    await page.locator('#review-kind').selectOption('rights');
    await page.getByRole('heading', { name: 'Resolve unique sources before repeated question review' }).waitFor();
    assert.equal(await page.locator('.review-decision-form').count(), 0);
    await page.locator('#review-kind').selectOption('references');
    await page.getByRole('heading', { name: 'Inspect shared evidence before individual decisions' }).waitFor();
    await page.route('**/data/evaluations/source-grounding-cdc-co-v1.json', route => route.fulfill({ status: 503, body: 'unavailable' }));
    await page.reload();
    await page.getByRole('heading', { name: 'Claim evidence unavailable' }).waitFor();
    assert.equal(await page.locator('.review-decision-form').count(), 7);
    assert.equal(writes, 0);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`References browser flow passed at ${width}px`);
  }
} finally { await browser.close(); }
