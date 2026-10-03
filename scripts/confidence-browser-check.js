import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPages } from './build-pages.js';
import { publicFileSet } from './public-surface.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const output = await mkdtemp(join(tmpdir(), 'mlos-confidence-browser-'));
await buildPages({ outputDirectory: output });
const bundleHeaders = Object.fromEntries((await readFile(join(output, '_headers'), 'utf8'))
  .split('\n').filter(line => /^\s+[^:]+:/.test(line)).map(line => {
    const separator = line.indexOf(':');
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
  }));
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', json: 'application/json' };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  const path = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (path !== 'index.html' && !publicFileSet.has(path)) {
    response.writeHead(404); return response.end();
  }
  try {
    const content = await readFile(join(output, path));
    response.writeHead(200, { ...bundleHeaders, 'Content-Type': types[path.split('.').at(-1)] || 'application/octet-stream' });
    response.end(content);
  } catch { response.writeHead(404); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const sessionId = '22222222-2222-4222-8222-222222222222';
const errors = [];

async function fixture(viewport, options = {}) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => localStorage.setItem('mlos-supabase-auth-v1', JSON.stringify({
    accessToken: 'synthetic-access', refreshToken: 'synthetic-refresh', expiresAt: 2100000000,
    user: { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.invalid', emailConfirmedAt: '2026-10-01T00:00:00Z' }
  })));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const state = { position: 0, receipt: null, writes: [], confidenceWrites: [], ...options };
  const question = () => ({ questionVersionId: `interface:confidence-${state.position}@1`, conceptId: 'interface:confidence',
    stem: 'Synthetic interface question: choose the first option.', options: [{ optionId: 'a', text: 'First option' }, { optionId: 'b', text: 'Second option' }] });
  const session = () => ({ sessionId, position: state.position, total: 2, closed: false, question: question(), receipt: state.receipt, memoryJudgment: null });
  await page.route('https://iyapppmeieqhflnzslao.supabase.co/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const reply = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path.endsWith('/learner-experiment-api/status')) return reply({
      contractId: 'answer-confidence-feature-status-v1', featureKey: 'answer_confidence_capture',
      enabled: state.enabled !== false, authority: 'server_entitlement'
    }, state.statusFailure ? 503 : 200);
    if (path.endsWith('/learner-experiment-api/confidence')) {
      state.confidenceWrites.push(request.postDataJSON());
      return reply(state.confidenceFailure ? { error: 'confidence_unavailable' } : {
        contractId: 'answer-confidence-receipt-v1', type: 'confidence.recorded', confidence: request.postDataJSON().confidence
      }, state.confidenceFailure ? 503 : 200);
    }
    if (path.endsWith(`/study-api/sessions/${sessionId}`)) return reply(session());
    if (path.endsWith(`/study-api/sessions/${sessionId}/answer`)) {
      const body = request.postDataJSON();
      state.writes.push({ path: 'answer', body });
      if (state.answerGate) await state.answerGate;
      if (state.answerFailure) return reply({ error: 'answer_unavailable' }, 503);
      state.receipt = { selectedOptionId: body.optionId, answerOptionId: 'a', explanation: 'Nonclinical interface fixture.',
        sources: [], event: { eventId: `synthetic-attempt-${state.position}`, correct: body.optionId === 'a' } };
      return reply(state.receipt);
    }
    if (path.endsWith(`/study-api/sessions/${sessionId}/next`)) {
      state.writes.push({ path: 'next', body: request.postDataJSON() });
      state.position += 1; state.receipt = null; return reply(session());
    }
    if (path.endsWith('/study-api/progress')) return reply({ attempts: state.receipt ? 1 : 0, correct: state.receipt?.event.correct ? 1 : 0 });
    if (path.endsWith('/study-api/revision/due')) return reply({ dueCount: 0, unseenCount: 0, items: [] });
    if (path.endsWith('/study-api/questions')) return reply({ questions: [question()] });
    throw new Error(`Unexpected fixture request: ${request.method()} ${path}`);
  });
  await page.goto(`${origin}/web/medical.html?resume=${sessionId}`);
  await page.getByRole('group', { name: 'Synthetic interface question: choose the first option.' }).waitFor();
  return { context, page, state };
}

try {
  browser = await chromium.launch({ headless: true });
  for (const [name, width, height] of [['phone', 390, 844], ['tablet', 820, 1180], ['desktop', 1440, 1000]]) {
    const viewport = { width, height };
    const { context, page, state } = await fixture(viewport);
    await page.getByRole('radio', { name: 'Certain', exact: true }).check();
    await page.getByRole('radio', { name: /First option/ }).check();
    assert.equal(await page.getByRole('radio', { name: 'Certain', exact: true }).isChecked(), true,
      'changing an answer must preserve confidence for the same question');
    await page.getByRole('radio', { name: /Second option/ }).check();
    assert.equal(await page.getByRole('radio', { name: 'Certain', exact: true }).isChecked(), true);
    if (process.env.SCREENSHOT_DIR) {
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, `confidence-prompt-${name}.png`), fullPage: true });
    }
    let releaseAnswer;
    state.answerGate = new Promise(resolve => { releaseAnswer = resolve; });
    await page.getByRole('button', { name: 'Check answer' }).click();
    await page.waitForFunction(() => document.querySelector('#medical-answer-form fieldset')?.disabled === true);
    assert.deepEqual(state.confidenceWrites, [], 'confidence cannot write before an accepted answer');
    assert.equal(await page.getByRole('radio', { name: 'Certain', exact: true }).isDisabled(), true,
      'confidence must be frozen while the answer is being saved');
    releaseAnswer(); state.answerGate = null;
    await page.locator('[data-confidence-status]').waitFor();
    assert.match(await page.locator('[data-confidence-status]').textContent(), /confidence saved/i);
    assert.deepEqual(state.confidenceWrites, [{ sessionId, confidence: 'certain' }]);
    assert.equal(state.writes.length, 1);
    assert.deepEqual(Object.keys(state.writes[0].body).sort(), ['optionId', 'position', 'requestId']);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name + ' overflow');
    if (process.env.SCREENSHOT_DIR) {
      await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
      await page.screenshot({ path: join(process.env.SCREENSHOT_DIR, `confidence-saved-${name}.png`), fullPage: true });
    }
    await page.reload();
    await page.getByRole('heading', { name: 'Incorrect. Review the reasoning.', exact: true }).waitFor();
    assert.equal(state.confidenceWrites.length, 1, 'reload cannot recreate confidence evidence');
    await page.getByRole('button', { name: 'Next question' }).click();
    await page.getByText('Question 2 of 2').waitFor();
    await page.getByRole('radio', { name: /First option/ }).check();
    assert.equal(await page.locator('input[name="answer-confidence"]:checked').count(), 0,
      'confidence must not carry into the next question');
    await page.getByRole('button', { name: 'Check answer' }).click();
    await page.getByText('Choose one confidence level before checking this answer.').waitFor();
    assert.equal(state.writes.filter(write => write.path === 'answer').length, 1);
    await context.close();

    const failed = await fixture(viewport, { answerFailure: true, confidenceFailure: true });
    await failed.page.getByRole('radio', { name: /First option/ }).check();
    await failed.page.getByRole('radio', { name: 'Unsure', exact: true }).check();
    await failed.page.getByRole('button', { name: 'Check answer' }).click();
    await failed.page.getByText(/Answer was not confirmed:/).waitFor();
    assert.deepEqual(failed.state.confidenceWrites, [], 'failed answers cannot create confidence evidence');
    assert.equal(await failed.page.getByRole('radio', { name: 'Unsure', exact: true }).isChecked(), true,
      'retry must preserve the learner confidence choice');
    failed.state.answerFailure = false;
    await failed.page.getByRole('button', { name: 'Check answer' }).click();
    await failed.page.locator('[data-confidence-status]').waitFor();
    assert.match(await failed.page.locator('[data-confidence-status]').textContent(), /Answer saved.*not saved/);
    await failed.page.getByRole('heading', { name: 'Correct.', exact: true }).waitFor();
    assert.equal(failed.state.writes[0].body.requestId, failed.state.writes[1].body.requestId);
    assert.deepEqual(failed.state.confidenceWrites, [{ sessionId, confidence: 'unsure' }]);
    await failed.context.close();

    for (const options of [{ enabled: false }, { statusFailure: true }]) {
      const disabled = await fixture(viewport, options);
      await disabled.page.getByRole('radio', { name: /First option/ }).check();
      assert.equal(await disabled.page.locator('[data-confidence-beta]').count(), 0);
      await disabled.page.getByRole('button', { name: 'Check answer' }).click();
      await disabled.page.getByRole('heading', { name: 'Correct.', exact: true }).waitFor();
      assert.deepEqual(disabled.state.confidenceWrites, [], 'disabled/unavailable experiment cannot block or write');
      await disabled.context.close();
    }
  }
  assert.deepEqual(errors, []);
  console.log('Built static bundle: confidence preservation, pre-answer ordering, retry, fail-soft delivery, beta gating and no replay passed on phone/tablet/desktop. Synthetic fixtures only.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  await rm(output, { recursive: true, force: true });
}
