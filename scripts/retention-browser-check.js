import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const browser = await chromium.launch({ headless:true });
const origin = process.env.APP_URL || 'http://127.0.0.1:3000';
const widths = [['phone',390,844],['tablet',820,1180],['desktop',1440,1000]];

const assignmentId = '11111111-1111-4111-8111-111111111111';
const servedEventId = '22222222-2222-4222-8222-222222222222';
const sessionId = '33333333-3333-4333-8333-333333333333';
const questionHash = 'a'.repeat(64);
const question = {
  questionVersionId:'retention:fixture@1',
  questionId:'retention:fixture',
  version:1,
  conceptId:'retention:fixture-concept',
  stem:'Synthetic delayed-retrieval fixture: which option is first?',
  options:[
    { optionId:'a', text:'Alpha' },
    { optionId:'b', text:'Beta' },
    { optionId:'c', text:'Gamma' },
    { optionId:'d', text:'Delta' }
  ]
};

async function seedAuth(context) {
  await context.addInitScript(() => {
    localStorage.setItem('mlos-supabase-auth-v1', JSON.stringify({
      accessToken:'retention-browser-jwt',
      refreshToken:'retention-browser-refresh',
      expiresAt:Math.floor(Date.now()/1000)+3600,
      user:{ id:'44444444-4444-4444-8444-444444444444', email:'retention-fixture@example.invalid', emailConfirmedAt:'2026-09-30T00:00:00Z' }
    }));
  });
}

async function noOverflow(page,label) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, label + ' horizontal overflow');
}

const pageErrors = [];
try {
  for (const [name,width,height] of widths) {
    const context = await browser.newContext({ viewport:{ width,height } });
    await seedAuth(context);
    const page = await context.newPage();
    page.on('pageerror', error => pageErrors.push(name + ': ' + error.message));

    let state = 'available';
    let rendered = false;
    const writes = [];

    await page.route('**/functions/v1/retention-probe-api/**', async route => {
      const request = route.request();
      assert.equal(request.headers().authorization, 'Bearer retention-browser-jwt');
      assert.ok(request.headers().apikey);
      const url = new URL(request.url());
      const path = url.pathname.split('/functions/v1/retention-probe-api')[1];
      const json = payload => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(payload) });

      if (request.method() === 'GET' && path === '/inbox') {
        if (state === 'available') return json({
          contractId:'retention-probe-learner-inbox-v1',
          state:'available',
          assignmentId,
          windowCloseAt:'2026-10-08T00:00:00Z',
          automaticExecutionEnabled:false,
          studyNowAuthority:false,
          masteryInferenceAuthority:false
        });
        if (state === 'in_progress') return json({
          contractId:'retention-probe-learner-inbox-v1',
          state:'in_progress', assignmentId, servedEventId, sessionId,
          learnerQuestion:question, learnerQuestionSha256:questionHash,
          servedAt:'2026-09-30T08:00:00Z', browserRenderedConfirmed:rendered,
          learnerViewedConfirmed:false, automaticExecutionEnabled:false,
          studyNowAuthority:false, masteryInferenceAuthority:false
        });
        return json({ contractId:'retention-probe-learner-inbox-v1', state:'none', automaticExecutionEnabled:false, studyNowAuthority:false, masteryInferenceAuthority:false });
      }

      if (request.method() === 'POST' && path === '/start') {
        writes.push('start');
        const body = request.postDataJSON();
        assert.deepEqual(Object.keys(body).sort(), ['assignmentId','requestId']);
        assert.equal(body.assignmentId, assignmentId);
        assert.match(body.requestId, /^retention-serve:/);
        state = 'in_progress';
        return json({
          contractId:'retention-probe-learner-start-v1', state:'in_progress', assignmentId,
          servedEventId, sessionId, learnerQuestion:question, learnerQuestionSha256:questionHash,
          servedAt:'2026-09-30T08:00:00Z', browserRenderedConfirmed:false,
          learnerViewedConfirmed:false, resumedExisting:false,
          automaticExecutionEnabled:false, studyNowAuthority:false, masteryInferenceAuthority:false
        });
      }

      if (request.method() === 'POST' && path === '/render') {
        writes.push('render');
        const body = request.postDataJSON();
        assert.deepEqual(body, { servedEventId, learnerQuestionSha256:questionHash });
        rendered = true;
        return json({
          contractId:'retention-probe-browser-render-receipt-v1', servedEventId, assignmentId, sessionId,
          learnerQuestionSha256:questionHash, renderedAt:'2026-09-30T08:00:01Z',
          browserRenderedConfirmed:true, learnerViewedConfirmed:false, idempotentReplay:false
        });
      }

      if (request.method() === 'POST' && path === '/answer') {
        writes.push('answer');
        const body = request.postDataJSON();
        assert.deepEqual(Object.keys(body).sort(), ['optionId','requestId','servedEventId']);
        assert.equal(body.servedEventId, servedEventId);
        assert.equal(body.optionId, 'b');
        assert.match(body.requestId, /^retention-answer:/);
        assert.equal(Object.hasOwn(body,'learnerId'), false);
        assert.equal(Object.hasOwn(body,'correct'), false);
        state = 'none';
        return json({
          contractId:'retention-probe-answer-receipt-v1', servedEventId, sessionId,
          attemptReceipt:{
            event:{ eventId:'55555555-5555-4555-8555-555555555555', correct:false },
            selectedOptionId:'b', answerOptionId:'a',
            explanation:'Alpha is first in this synthetic fixture.',
            sources:[{ sourceId:'fixture-source', title:'Synthetic fixture source', url:null, version:'1' }]
          },
          responseBinding:{ cleanForPrimaryAnalysis:true, contaminationReasons:[] },
          sessionClosed:true, authoritativeScheduleRecorded:true,
          browserRenderedConfirmed:true, learnerViewedConfirmed:false,
          studyNowAuthority:false, masteryInferenceAuthority:false, causalInferenceAuthority:false
        });
      }

      return route.fulfill({ status:404, contentType:'application/json', body:JSON.stringify({ error:'unexpected_route', path }) });
    });

    await page.goto(origin + '/web/retention.html');
    await page.getByRole('heading', { name:'One delayed-retrieval question is available.' }).waitFor();
    assert.equal(writes.length, 0, name + ' opening page must not serve a question');
    assert.doesNotMatch(await page.locator('body').innerText(), /Synthetic delayed-retrieval fixture/);
    await noOverflow(page, name + ' available');

    await page.getByRole('button', { name:'Start 1-question check →' }).click();
    await page.getByText(question.stem, { exact:true }).waitFor();
    await page.getByText('Browser render recorded. This does not claim that you viewed or remembered the question.').waitFor();
    assert.deepEqual(writes.slice(0,2), ['start','render']);
    assert.doesNotMatch(await page.locator('body').innerText(), /Correct answer:/);
    assert.equal(await page.getByRole('radio', { name:/Beta/ }).isEnabled(), true);
    await noOverflow(page, name + ' question');

    await page.getByRole('radio', { name:/Beta/ }).check();
    await page.getByRole('button', { name:'Submit answer' }).click();
    await page.getByRole('heading', { name:'Incorrect.' }).waitFor();
    assert.match(await page.locator('body').innerText(), /Your answer:\s*Beta/);
    assert.match(await page.locator('body').innerText(), /Correct answer:\s*Alpha/);
    assert.match(await page.locator('body').innerText(), /does not itself activate mastery, forgetting or causal inference|No mastery label is inferred/);
    assert.deepEqual(writes, ['start','render','answer']);
    await noOverflow(page, name + ' result');

    await page.reload();
    await page.getByRole('heading', { name:'No retention check is waiting now.' }).waitFor();
    assert.deepEqual(writes, ['start','render','answer']);
    await noOverflow(page, name + ' reload');

    await context.close();
  }

  // A served event can exist even if the browser/network failed before the dedicated
  // one-question session link completed. Reload must resume that same served event,
  // link a session, then record render evidence. It must not manufacture another serve.
  {
    const context = await browser.newContext({ viewport:{ width:390,height:844 } });
    await seedAuth(context);
    const page = await context.newPage();
    page.on('pageerror', error => pageErrors.push('recovery: ' + error.message));
    const writes = [];
    let linked = false;
    let rendered = false;

    await page.route('**/functions/v1/retention-probe-api/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname.split('/functions/v1/retention-probe-api')[1];
      const json = payload => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(payload) });

      if (request.method() === 'GET' && path === '/inbox') {
        return json({
          contractId:'retention-probe-learner-inbox-v1', state:'in_progress', assignmentId,
          servedEventId, sessionId:linked ? sessionId : null,
          learnerQuestion:question, learnerQuestionSha256:questionHash,
          servedAt:'2026-09-30T08:00:00Z', browserRenderedConfirmed:rendered,
          learnerViewedConfirmed:false, automaticExecutionEnabled:false,
          studyNowAuthority:false, masteryInferenceAuthority:false
        });
      }
      if (request.method() === 'POST' && path === '/start') {
        writes.push('resume');
        const body = request.postDataJSON();
        assert.equal(body.assignmentId, assignmentId);
        assert.equal(body.requestId, `retention-resume:${servedEventId}`);
        linked = true;
        return json({
          contractId:'retention-probe-learner-inbox-v1', state:'in_progress', assignmentId,
          servedEventId, sessionId, learnerQuestion:question, learnerQuestionSha256:questionHash,
          servedAt:'2026-09-30T08:00:00Z', browserRenderedConfirmed:false,
          learnerViewedConfirmed:false, resumedExisting:true,
          automaticExecutionEnabled:false, studyNowAuthority:false, masteryInferenceAuthority:false
        });
      }
      if (request.method() === 'POST' && path === '/render') {
        writes.push('render');
        rendered = true;
        return json({
          contractId:'retention-probe-browser-render-receipt-v1', servedEventId, assignmentId, sessionId,
          learnerQuestionSha256:questionHash, renderedAt:'2026-09-30T08:00:02Z',
          browserRenderedConfirmed:true, learnerViewedConfirmed:false, idempotentReplay:false
        });
      }
      return route.fulfill({ status:500, contentType:'application/json', body:JSON.stringify({ error:'unexpected_recovery_route', path }) });
    });

    await page.goto(origin + '/web/retention.html');
    await page.getByText(question.stem, { exact:true }).waitFor();
    await page.getByText('Browser render recorded. This does not claim that you viewed or remembered the question.').waitFor();
    assert.deepEqual(writes, ['resume','render']);
    assert.equal(await page.getByRole('radio', { name:/Alpha/ }).isEnabled(), true);
    assert.doesNotMatch(await page.locator('body').innerText(), /Correct answer:/);
    await noOverflow(page, 'recovery question');
    await context.close();
  }

  assert.deepEqual(pageErrors, []);
  console.log('Retention probe explicit start, partial-start recovery, render evidence, canonical answer handoff and responsive UX checks passed');
} finally {
  await browser.close();
}
