import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const browser = await chromium.launch({ headless: true });
const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:3000';
const errors = [];
const conceptId = 'interface:journey';
const alternateId = 'interface:alternate';
const sessionId = 'journey-session';
const noteVersionId = '11111111-1111-4111-8111-111111111112';
const question = { questionVersionId: 'interface:journey@1', conceptId, stem: 'Synthetic journey fixture: choose the first option.', options: [{ optionId: 'a', text: 'First option' }, { optionId: 'b', text: 'Second option' }] };
const receipt = { event: { eventId: 'journey-attempt', correct: false, conceptId }, selectedOptionId: 'b', answerOptionId: 'a', explanation: 'This nonclinical fixture asks for the first option.', sources: [] };
const concepts = [
  { conceptId, label: 'Journey fixture concept', aliases: [], subjectTags: ['Interface fixture'], annotationCount: 0 },
  { conceptId: alternateId, label: 'Alternate fixture concept', aliases: [], subjectTags: ['Interface fixture'], annotationCount: 0 }
];
try {
  for (const [name, width, height] of [['phone', 390, 844], ['tablet', 820, 1180], ['desktop', 1440, 1000]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => localStorage.setItem('mlos-supabase-auth-v1', JSON.stringify({ accessToken: 'jwt-test', refreshToken: 'refresh-test', expiresAt: 2100000000, user: { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.invalid', emailConfirmedAt: '2026-09-29T00:00:00Z' } })));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const writes = [];
    let answered = false;
    let closed = false;
    let annotation = null;
    let questionsUnavailable = false;
    let revisionUnavailable = false;
    let releaseAlternate;
    let slowAlternate = null;
    const summary = () => ({ contractId: 'study-session-summary-v1', sessionId, closed: true, selectedCount: 1, answeredCount: 1, correctCount: 0, incorrectCount: 1, unansweredCount: 0, completedAllSelected: true, concepts: [{ conceptId, label: concepts[0].label, incorrectCount: 1 }], revision: { available: false } });
    await page.route('https://iyapppmeieqhflnzslao.supabase.co/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname.split('/functions/v1/study-api')[1];
      const fulfill = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (request.method() !== 'GET') writes.push(path);
      if (url.pathname.endsWith('/review-api/me')) return fulfill({ isAdmin: false });
      if (path === '/progress') return fulfill({ error: 'progress_unavailable' }, 503);
      if (path === '/questions') return fulfill(questionsUnavailable ? { error: 'questions_unavailable' } : { questions: [question] }, questionsUnavailable ? 503 : 200);
      if (path === '/revision/due') return fulfill(revisionUnavailable ? { error: 'revision_unavailable' } : { dueCount: 1, unseenCount: 0, items: [] }, revisionUnavailable ? 503 : 200);
      if (path?.startsWith('/exam-simulator/readiness')) return fulfill({ eligibleUniqueQuestions: 1, requiredUniqueQuestions: 180, shortage: 179, ready: false });
      const session = () => ({ sessionId, position: 0, total: 1, closed, question: closed ? null : question, receipt: closed ? null : answered ? receipt : null, memoryJudgment: null, recommendationContext: { reason: 'due-revision' } });
      if (path === '/study-now/start') return fulfill({ plan: { resumedExisting: false }, session: session() });
      if (path === '/sessions/' + sessionId) return fulfill(session());
      if (path === '/sessions/' + sessionId + '/answer') { answered = true; return fulfill(receipt); }
      if (path === '/sessions/' + sessionId + '/next') { closed = true; return fulfill(session()); }
      if (path === '/sessions/' + sessionId + '/summary') return fulfill(summary());
      if (path === '/study-now/integrity') return fulfill({ latestRecommendation: null });
      if (path === '/vault/concepts') return fulfill({ catalogVersion: 1, concepts: concepts.map(c => ({ ...c, annotationCount: c.conceptId === conceptId && annotation ? 1 : 0 })) });
      if (path?.startsWith('/vault/concepts/')) {
        const id = decodeURIComponent(path.split('/').at(-1));
        if (id === alternateId && slowAlternate) await slowAlternate;
        return fulfill({ concept: concepts.find(c => c.conceptId === id), canonicalNote: { noteVersionId, version: 1, title: 'Synthetic concept reading surface', bodyMarkdown: 'A nonclinical fixture for the connected learning journey.', contentSha256: 'e'.repeat(64) }, annotations: id === conceptId && annotation ? [annotation] : [] });
      }
      if (path === '/vault/annotations') {
        annotation = { ...request.postDataJSON(), annotationId: '11111111-1111-4111-8111-111111111113', annotationKind: 'note', revision: 1, anchorState: 'current' };
        return fulfill(annotation);
      }
      return fulfill({ error: 'not_found' }, 404);
    });
    const screenshot = async suffix => {
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name + ' ' + suffix + ' overflow');
      await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
      if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: process.env.SCREENSHOT_DIR + '/ux-journey-' + name + '-' + suffix + '.png', fullPage: true, animations: 'disabled' });
    };
    await page.goto(origin);
    await page.getByRole('link', { name: 'Start 20 min' }).waitFor();
    assert.match(await page.locator('.learning-snapshot').innerText(), /—\s*Saved attempts/);
    assert.match(await page.locator('.learning-snapshot').innerText(), /1\s*Reviewed questions/);
    assert.equal(await page.getByRole('link', { name: 'Admin', exact: true }).count(), 0);
    await page.getByRole('button', { name: '10 min', exact: true }).click();
    assert.deepEqual(writes, []);
    await screenshot('home');
    await page.getByRole('link', { name: 'Start 10 min' }).click();
    await page.getByText('Question 1 of 1', { exact: false }).waitFor();
    await page.reload();
    await page.getByText('Question 1 of 1', { exact: false }).waitFor();
    await page.locator('input[name="answer"][value="b"]').check();
    await page.getByRole('button', { name: 'Check answer' }).click();
    await page.getByRole('heading', { name: 'Incorrect. Review the reasoning.' }).waitFor();
    await page.getByRole('button', { name: 'Dismiss message' }).click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'answer-feedback-title');
    await screenshot('answer');
    await page.getByRole('link', { name: 'Review concept / add private correction' }).click();
    await page.getByRole('heading', { name: concepts[0].label, exact: true }).waitFor();
    await page.getByRole('link', { name: 'My notes (0)', exact: true }).click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'my-notes-title');
    await page.getByLabel('Add a personal note').fill('My synthetic recall cue.');
    await page.getByRole('button', { name: 'Save note', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Personal note saved.' }).waitFor();
    await page.reload();
    assert.equal(await page.getByLabel('Your note', { exact: true }).inputValue(), 'My synthetic recall cue.');
    await screenshot('vault');
    await page.getByRole('link', { name: 'Return to study' }).click();
    await page.getByRole('heading', { name: 'Incorrect. Review the reasoning.' }).waitFor();
    await page.getByRole('button', { name: 'Finish session' }).click();
    await page.getByRole('heading', { name: 'This session', exact: true }).waitFor();
    assert.match(await page.locator('.session-results').innerText(), /1 \/ 1/);
    await page.getByRole('button', { name: 'Dismiss message' }).click();
    assert.equal(await page.getByRole('link', { name: 'Plan my next session' }).evaluate(el => el === document.activeElement), true);
    assert.equal(await page.getByRole('link', { name: 'Plan my next session' }).getAttribute('tabindex'), null, 'primary link remains in normal tab order');
    await screenshot('results');
    const revisit = page.getByRole('link', { name: concepts[0].label, exact: false });
    assert.equal(new URL(await revisit.getAttribute('href'), origin).searchParams.get('returnSession'), sessionId);
    await revisit.click();
    await page.getByRole('heading', { name: concepts[0].label, exact: true }).waitFor();
    await page.reload();
    await page.getByRole('link', { name: 'Return to study' }).click();
    await page.getByRole('heading', { name: 'This session', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('summary'), sessionId);
    assert.match(await page.locator('.session-results').innerText(), /1\s*Incorrect/);
    await page.getByRole('link', { name: 'Plan my next session' }).click();
    await page.getByRole('link', { name: 'Start 10 min' }).waitFor();
    assert.deepEqual(writes, ['/study-now/start', '/sessions/' + sessionId + '/answer', '/vault/annotations', '/sessions/' + sessionId + '/next'], 'detours and planning do not start, answer, rate or advance');
    questionsUnavailable = true;
    await page.goto(origin + '/web/medical.html');
    await page.getByRole('heading', { name: 'Study temporarily unavailable.' }).waitFor();
    assert.equal(await page.getByRole('link', { name: 'Browse reviewed questions' }).count(), 0, 'no link to absent browser');
    assert.equal(await page.getByRole('button', { name: 'Reload Study' }).count(), 1);
    questionsUnavailable = false; revisionUnavailable = true;
    await page.getByRole('button', { name: 'Reload Study' }).click();
    await page.getByRole('heading', { name: 'Schedule temporarily unavailable.' }).waitFor();
    await page.getByRole('link', { name: 'Browse reviewed questions' }).click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'question-browser-title');
    assert.equal(await page.locator('.question-browser-list').getAttribute('open') !== null, true);
    await page.goto(origin + '/web/vault.html?concept=' + encodeURIComponent(conceptId));
    await page.getByRole('heading', { name: concepts[0].label, exact: true }).waitFor();
    slowAlternate = new Promise(resolve => { releaseAlternate = resolve; });
    if (width <= 800) await page.locator('#vault-concept-browser > summary').click();
    await page.getByRole('button', { name: concepts[1].label, exact: false }).click();
    if (width <= 800) await page.locator('#vault-concept-browser > summary').click();
    await page.getByRole('button', { name: concepts[0].label, exact: false }).click();
    await page.getByRole('heading', { name: concepts[0].label, exact: true }).waitFor();
    const delayedResponse = page.waitForResponse(response => response.url().endsWith('/vault/concepts/' + encodeURIComponent(alternateId)));
    releaseAlternate();
    await delayedResponse;
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(new URL(page.url()).searchParams.get('concept'), conceptId);
    assert.equal(await page.getByRole('heading', { name: concepts[1].label, exact: true }).count(), 0, 'late detail cannot replace selected concept');
    assert.equal(writes.length, 4);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('Integrated responsive Home → saved Study → note → return → results → Vault → results → next plan, outage recovery and stale concept response checks passed');
} finally { await browser.close(); }
