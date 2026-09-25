// Isolated browser contract with synthetic content/Auth/API; no real account.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const browser = await chromium.launch({ headless: true });
const origin = process.env.APP_URL || 'http://127.0.0.1:3000';
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'synthetic@example.invalid', aud: 'authenticated' };
const sessionId = '33333333-3333-4333-8333-333333333333';
try {
  for (const [name, width, height] of [['phone', 390, 844], ['tablet', 820, 1180], ['desktop', 1440, 1000]]) {
    const context = await browser.newContext({ viewport: { width, height }, acceptDownloads: true });
    const page = await context.newPage(), errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(user => localStorage.setItem('mlos-account-auth', JSON.stringify({
      access_token: 'synthetic-access-token', refresh_token: 'synthetic-refresh-token', token_type: 'bearer',
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user,
    })), user);
    let receipt = null, closed = false, failFirstAnswer = true;
    const question = { questionVersionId: 'demo:concept-identity@1', stem: 'Synthetic identity question',
      options: [{ optionId: 'same-id', text: 'Same' }, { optionId: 'copies', text: 'Copies' }] };
    const reply = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    await page.route('**/auth-config', route => reply(route, {
      url: 'https://iyapppmeieqhflnzslao.supabase.co', publishableKey: 'sb_publishable_test_only',
    }));
    await page.route('**/api/**', route => {
      const req = route.request(), path = new URL(req.url()).pathname;
      if (path === '/api/questions') return reply(route, { questions: [question] });
      if (path === '/api/progress') return reply(route, { attempts: receipt ? 1 : 0, accuracy: receipt ? 0 : null });
      if (path === '/api/export') return reply(route, { events: receipt ? [receipt.event] : [], bookmarks: [], sessions: [] });
      if (path === '/api/sessions') return reply(route, { sessionId, position: 0, total: 1, closed,
        question: closed ? null : question, receipt });
      if (path === `/api/sessions/${sessionId}/answer`) {
        const input = req.postDataJSON(); requests.push(input);
        if (receipt && (input.requestId !== requests[0].requestId || input.optionId !== requests[0].optionId))
          return reply(route, { error: 'conflicting_retry' }, 409);
        receipt ||= { event: { correct: false, questionVersionId: question.questionVersionId },
          selectedOptionId: input.optionId, answerOptionId: 'same-id', explanation: 'Synthetic explanation' };
        if (failFirstAnswer) { failFirstAnswer = false; return route.abort('failed'); }
        return reply(route, receipt);
      }
      if (path === `/api/sessions/${sessionId}/next`) { closed = true; return reply(route, {
        sessionId, position: 1, total: 1, closed, question: null, receipt: null,
      }); }
      return reply(route, { error: 'not_found' }, 404);
    });
    await page.goto(origin + '/web/account.html');
    await page.getByRole('heading', { name: 'Your study workspace' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name} overflow`);
    await page.getByRole('button', { name: 'Start or resume session' }).click();
    await page.getByRole('radio', { name: 'Copies' }).check();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await page.locator('#account-notice').getByText(/Unable to complete request/).waitFor();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await page.getByRole('heading', { name: 'Incorrect' }).waitFor();
    assert.equal(requests.length, 2);
    assert.equal(requests[0].requestId, `${sessionId}:0`);
    assert.equal(requests[1].requestId, requests[0].requestId);
    await page.reload();
    await page.getByRole('button', { name: 'Start or resume session' }).click();
    await page.getByRole('heading', { name: 'Incorrect' }).waitFor();
    await page.getByRole('button', { name: 'Next question' }).click();
    await page.getByRole('heading', { name: 'Session complete' }).waitFor();
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`${name}: account retry, receipt recovery, completion and responsive layout passed`);
    const resetContext = await browser.newContext({ viewport: { width, height } });
    const resetPage = await resetContext.newPage();
    const resetErrors = [], resetRequests = [];
    resetPage.on('pageerror', error => resetErrors.push(error.message));
    await resetPage.route('**/auth-config', route => reply(route, {
      url: 'https://iyapppmeieqhflnzslao.supabase.co', publishableKey: 'sb_publishable_test_only',
    }));
    await resetPage.route('**/auth/v1/recover**', route => {
      resetRequests.push({ url: route.request().url(), body: route.request().postDataJSON() });
      return reply(route, {});
    });
    await resetPage.goto(origin + '/web/account.html');
    await resetPage.getByRole('heading', { name: 'Sign in to study.' }).waitFor();
    await resetPage.locator('#reset-request-form input[name=email]').fill('learner@example.invalid');
    await resetPage.getByRole('button', { name: 'Send password reset link' }).click();
    try {
      await resetPage.locator('#account-notice').getByText(/If this account can receive mail/).waitFor({ timeout: 8000 });
    } catch {
      throw new Error(`${name} reset request failed: notice=${await resetPage.locator('#account-notice').textContent()} requests=${resetRequests.length} pageErrors=${resetErrors.join(',')}`);
    }
    assert.equal(resetRequests.length, 1);
    assert.equal(resetRequests[0].body.email, 'learner@example.invalid');
    assert.equal(new URL(resetRequests[0].url).searchParams.get('redirect_to'), origin + '/web/account.html');
    assert.deepEqual(resetErrors, []);
    await resetContext.close();
    console.log(`${name}: password reset request passed`);
  }
} finally { await browser.close(); }
