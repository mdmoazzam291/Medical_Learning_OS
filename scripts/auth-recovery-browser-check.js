import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const browser = await chromium.launch({ headless: true });
const origin = process.env.APP_URL || 'http://127.0.0.1:3000';
const storageKey = 'mlos-supabase-auth-v1';
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.invalid', email_confirmed_at: '2026-10-01T00:00:00Z', app_metadata: { providers: ['email'] } };
const token = { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', expires_at: 2100000000, user };

async function fixture(page, state = {}) {
  await page.route('https://iyapppmeieqhflnzslao.supabase.co/**', async route => {
    const url = new URL(route.request().url());
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'refresh_token') {
        state.refreshCalls = (state.refreshCalls || 0) + 1;
        if (state.refreshFails) return route.abort('failed');
        if (state.revoked) return reply({ error_code: 'refresh_token_not_found' }, 400);
      }
      if (state.badPassword) return reply({ error_code: 'invalid_credentials' }, 400);
      return reply(token);
    }
    if (url.pathname === '/auth/v1/user') return reply(user);
    if (url.pathname.endsWith('/review-api/me')) return reply({ isAdmin: false });
    if (url.pathname.endsWith('/progress')) return reply(state.progressFails ? { error: 'fixture_outage' } : { attempts: 12, correct: 8 }, state.progressFails ? 503 : 200);
    if (url.pathname.endsWith('/questions')) return reply({ questions: [{ questionVersionId: 'fixture@1' }] });
    if (url.pathname.endsWith('/revision/due')) return reply({ dueCount: 1, unseenCount: 0, items: [] });
    if (url.pathname.includes('/exam-simulator/readiness')) return reply({ ready: false });
    if (url.pathname.endsWith('/retention-probe/consent')) return reply({ error: 'fixture_optional_outage' }, 503);
    return reply({ error: 'fixture_route_not_found' }, 404);
  });
}

async function signIn(page) {
  await page.goto(origin + '/web/account.html');
  await page.locator('#signin-form [name=email]').fill(user.email);
  await page.locator('#signin-form [name=password]').fill('synthetic-password');
  await page.locator('#signin-form button').click();
}

async function expire(page) {
  await page.evaluate(key => {
    const session = JSON.parse(localStorage.getItem(key));
    session.expiresAt = 1;
    localStorage.setItem(key, JSON.stringify(session));
  }, storageKey);
}

try {
  for (const [name, width, height] of [['phone', 390, 844], ['tablet', 820, 1180], ['desktop', 1440, 1000]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const state = { progressFails: true };
    await fixture(page, state);
    await signIn(page);
    await page.getByRole('heading', { name: 'What should you study next?' }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/');
    await page.getByRole('button', { name: 'Retry', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name + ' overflow');
    await expire(page);
    state.refreshFails = true;
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.getByRole('heading', { name: 'Your workspace could not be loaded.' }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'What should you study next?' }).count(), 0);
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).refreshToken, storageKey), 'synthetic-refresh');
    state.refreshFails = false;
    state.progressFails = false;
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await page.getByRole('heading', { name: 'What should you study next?' }).waitFor();
    await page.waitForFunction(() => /12\s*Saved attempts/.test(document.querySelector('.metrics')?.innerText || ''));
    await page.reload();
    await page.getByRole('heading', { name: 'What should you study next?' }).waitFor();
    await page.goto(origin + '/web/account.html');
    await page.getByRole('heading', { name: 'Your Medical Learning OS account.' }).waitFor();
    await page.getByText('Consent status is unavailable right now.', { exact: false }).waitFor();
    assert.match(await page.locator('.metrics').innerText(), /12\s*Recorded attempts/);
    await page.goto(origin);
    await page.getByRole('heading', { name: 'What should you study next?' }).waitFor();
    await expire(page);
    state.revoked = true;
    await page.reload();
    await page.getByRole('heading', { name: 'Your workspace could not be loaded.' }).waitFor();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), storageKey), null);
    assert.deepEqual(errors, []);
    await context.close();
  }

  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Fixture storage blocked', 'SecurityError'); } });
    Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Fixture storage blocked', 'SecurityError'); } });
  });
  const page = await blocked.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await fixture(page);
  await page.goto(origin);
  await page.getByRole('heading', { name: 'Your study workspace starts after sign-in.' }).waitFor();
  await signIn(page);
  await page.getByText('Browser storage is unavailable. Enable site storage and retry sign-in.').waitFor();
  assert.equal(await page.locator('#signin-form button').isEnabled(), true);
  assert.deepEqual(errors, []);
  await blocked.close();

  for (const type of ['signup', 'recovery']) {
    const context = await browser.newContext();
    const callback = await context.newPage();
    await fixture(callback);
    await callback.goto(origin + '/web/account.html#access_token=synthetic-access&refresh_token=synthetic-refresh&expires_at=2100000000&type=' + type);
    if (type === 'recovery') {
      await callback.getByRole('heading', { name: 'Choose a new password for this learner account.' }).waitFor();
      assert.equal(new URL(callback.url()).pathname, '/web/account.html');
    } else {
      await callback.getByRole('heading', { name: 'What should you study next?' }).waitFor();
      assert.equal(new URL(callback.url()).pathname, '/');
    }
    assert.equal(new URL(callback.url()).hash, '');
    await context.close();
  }
  console.log('Auth landing, transient refresh recovery, revocation, storage denial, account projection isolation and callback exceptions passed');
} finally {
  await browser.close();
}
