import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const origin = process.env.APP_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.invalid', email_confirmed_at: '2026-10-19T00:00:00Z', app_metadata: { providers: ['email'] } };
const token = { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', expires_at: 2100000000, user };
const errors = [];
let checks = 0;
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1440, height: 1000 }]) {
    for (const javaScriptEnabled of [false, true]) {
      const context = await browser.newContext({ viewport, javaScriptEnabled });
      let signupCalls = 0;
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin === origin) return route.continue();
        if (url.hostname !== 'iyapppmeieqhflnzslao.supabase.co') return route.abort();
        const reply = body => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
        if (url.pathname === '/auth/v1/signup') { signupCalls++; return reply({ user, session: null }); }
        if (url.pathname === '/auth/v1/token') return reply(token);
        if (url.pathname === '/auth/v1/user') return reply(user);
        if (url.pathname.endsWith('/me')) return reply({ isAdmin: false, reviewKinds: [] });
        if (url.pathname.endsWith('/progress')) return reply({ attempts: 0, correct: 0 });
        if (url.pathname.endsWith('/questions')) return reply({ questions: [] });
        if (url.pathname.endsWith('/revision/due')) return reply({ dueCount: 0, unseenCount: 0, items: [] });
        if (url.pathname.includes('/exam-simulator/readiness')) return reply({ ready: false, eligibleUniqueQuestions: 0, requiredUniqueQuestions: 180 });
        return route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"fixture_not_found"}' });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(origin);
      await page.getByRole('heading', { name: 'Your Medical Learning Operating System.', exact: true }).waitFor();
      assert.equal(await page.locator('main h1').count(), 1);
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://medretica.com/');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.match(await page.locator('main').innerText(), /reviewed and published/);
      if (process.env.SCREENSHOT_DIR) {
        await mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/home-${viewport.width}-${javaScriptEnabled}.png`, fullPage: true });
      }
      await page.getByRole('link', { name: 'Sign in / create account' }).click();
      await page.waitForURL(`${origin}/web/account.html`);
      if (javaScriptEnabled) {
        await page.waitForSelector('body.account-landing-active');
        await page.locator('#create-account summary').click();
        await page.locator('#signup-form input[name="email"]').fill(user.email);
        await page.locator('#signup-form input[name="password"]').fill('synthetic-password-123');
        await page.locator('#signup-form button').click();
        await page.getByRole('alert').filter({ hasText: 'check your inbox' }).waitFor();
        assert.equal(signupCalls, 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.locator('#signin-form input[name="email"]').fill(user.email);
        await page.locator('#signin-form input[name="password"]').fill('synthetic-password-123');
        await page.locator('#signin-form button').click();
        await page.getByRole('heading', { name: 'What should you study next?' }).waitFor();
        await page.getByRole('link', { name: 'Open Study →', exact: true }).click();
        await page.waitForURL(`${origin}/web/medical.html`);
        await page.locator('#study-entry-title').waitFor();
        assert.match(await page.locator('#medical-app').innerText(), /0|No|available/);
      }
      await context.close();
      checks++;
    }
  }
  assert.deepEqual(errors, []);
  console.log(`Public homepage checks passed: ${checks} viewport/script combinations; fixture signup confirmation, sign-in and Study entry; no real provider writes.`);
} finally { await browser.close(); }
