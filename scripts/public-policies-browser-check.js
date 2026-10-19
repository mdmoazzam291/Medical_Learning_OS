import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const origin = process.env.APP_URL || 'http://127.0.0.1:3000';
const allowedOrigin = new URL(origin).origin;
const pages = ['services', 'contact', 'terms', 'privacy', 'refunds', 'delivery'];
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
let checks = 0;
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1180, height: 820 }, { width: 1440, height: 1000 }]) {
    const context = await browser.newContext({ viewport, javaScriptEnabled: false });
    await context.route('**/*', route => new URL(route.request().url()).origin === allowedOrigin ? route.continue() : route.abort());
    const page = await context.newPage();
    for (const name of pages) {
      const response = await page.goto(`${origin}/web/${name}.html`);
      assert.equal(response.status(), 200);
      assert.equal(page.url(), `${origin}/web/${name}.html`);
      assert.equal(await page.locator('main h1').count(), 1);
      assert.equal(await page.locator('[data-public-policies] a[href="/web/contact.html"]').isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name} overflows at ${viewport.width}`);
      const links = await page.locator('a[href^="/web/"]').evaluateAll(anchors => anchors.map(a => a.getAttribute('href')));
      for (const href of new Set(links)) {
        const destination = await context.request.get(`${origin}${href.split('#')[0]}`);
        assert.equal(destination.status(), 200, `${name} broken link ${href}`);
      }
      checks++;
    }
    if (process.env.SCREENSHOT_DIR) {
      await mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
      await page.goto(`${origin}/web/contact.html`);
      await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/contact-${viewport.width}.png`, fullPage: true });
    }
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.route('**/*', route => new URL(route.request().url()).origin === allowedOrigin ? route.continue() : route.abort());
  const page = await context.newPage();
  for (const path of ['/', '/web/account.html', '/web/plans.html']) {
    await page.goto(`${origin}${path}`);
    // The account landing dispatches mlos:account-rendered, then hides legacy footers.
    if (path === '/web/account.html') await page.waitForSelector('body.account-landing-active');
    const contactLink = page.locator('[data-public-policies] a[href="/web/contact.html"]');
    await contactLink.scrollIntoViewIfNeeded();
    assert.equal(await contactLink.isVisible(), true, `${path} hides public footer after render`);
    await contactLink.click();
    await page.waitForURL(`${origin}/web/contact.html`);
    assert.match(await page.locator('main').innerText(), /Md Moazzam/);
    checks++;
  }
  await page.goto(`${origin}/web/refunds.html`);
  assert.match(await page.locator('main').innerText(), /do not currently accept payments/);
  assert.doesNotMatch(await page.locator('main').innerText(), /7 calendar days/);
  assert.equal(await page.locator('script, form, input').count(), 0);
  await context.close();
  console.log(`Public policy browser checks passed: ${checks} page/viewport and rendered-footer checks; no external service calls permitted.`);
} finally { await browser.close(); }
