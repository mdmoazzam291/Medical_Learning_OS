import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const browser = await chromium.launch({ headless:true });
const origin = process.env.APP_URL || 'http://127.0.0.1:3000';
const widths = [['phone',390,844],['tablet',820,1180],['desktop',1440,1000]];
const learnerId = '44444444-4444-4444-8444-444444444444';

async function seedAuth(context) {
  await context.addInitScript(({ learnerId }) => {
    localStorage.setItem('mlos-supabase-auth-v1', JSON.stringify({
      accessToken:'retention-origin-browser-jwt',
      refreshToken:'retention-origin-browser-refresh',
      expiresAt:Math.floor(Date.now()/1000)+3600,
      user:{ id:learnerId, email:'retention-origin@example.invalid', emailConfirmedAt:'2026-09-30T00:00:00Z' }
    }));
  }, { learnerId });
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
    const writes = [];

    await page.route('**/functions/v1/retention-probe-api/**', async route => {
      const request = route.request();
      assert.equal(request.headers().authorization, 'Bearer retention-origin-browser-jwt');
      assert.ok(request.headers().apikey);
      const path = new URL(request.url()).pathname.split('/functions/v1/retention-probe-api')[1];
      const json = payload => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(payload) });
      if (request.method() === 'GET' && path === '/origin') {
        return json({
          contractId:'study-retention-probe-origin-readiness-v1',
          state:'origin_available',
          blockingReasons:[],
          originQuestionVersionId:'fixture:previously-seen@1',
          originAttemptRecorded:false,
          targetStillUnseen:true,
          learnerMustStart:true,
          ordinaryCanonicalAnswerRequired:true,
          automaticExecutionEnabled:false,
          studyNowAuthority:false,
          masteryInferenceAuthority:false
        });
      }
      if (request.method() === 'POST' && path === '/origin/start') {
        writes.push('start-origin');
        const body = request.postDataJSON();
        assert.deepEqual(Object.keys(body), ['sessionId']);
        assert.match(body.sessionId, /^[0-9a-f-]{36}$/i);
        assert.equal(Object.hasOwn(body,'learnerId'), false);
        return json({
          contractId:'retention-probe-origin-session-receipt-v1',
          sessionId:body.sessionId,
          state:'origin_started',
          originQuestionVersionId:'fixture:previously-seen@1',
          originAttemptRecorded:false,
          idempotentReplay:false,
          ordinaryStudySession:true,
          automaticExecutionEnabled:false,
          studyNowAuthority:false,
          masteryInferenceAuthority:false
        });
      }
      return route.fulfill({ status:404, contentType:'application/json', body:JSON.stringify({ error:'unexpected_route', path }) });
    });

    await page.goto(origin + '/web/retention-origin.html');
    await page.getByRole('heading', { name:'A pilot setup question is available.' }).waitFor();
    assert.equal(writes.length, 0, name + ' opening setup must not create a session');
    assert.doesNotMatch(await page.locator('body').innerText(), /beta-blocker|delayed target.*question/i);
    await noOverflow(page, name + ' ready');

    await page.getByRole('button', { name:'Start setup question →' }).click();
    await page.waitForURL('**/web/medical.html?source=retention-origin');
    assert.deepEqual(writes, ['start-origin']);
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport:{ width:390,height:844 } });
    await seedAuth(context);
    const page = await context.newPage();
    page.on('pageerror', error => pageErrors.push('waiting: ' + error.message));
    let writes = 0;
    await page.route('**/functions/v1/retention-probe-api/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname.split('/functions/v1/retention-probe-api')[1];
      if (request.method() === 'GET' && path === '/origin') {
        return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({
          contractId:'study-retention-probe-origin-readiness-v1',
          state:'waiting', originAttemptRecorded:true,
          originAttemptedAt:'2026-09-30T11:30:00Z',
          windowOpenAt:'2026-10-06T11:30:00Z',
          windowCloseAt:'2026-10-08T11:30:00Z',
          targetStillUnseen:true,
          automaticExecutionEnabled:false,
          studyNowAuthority:false,
          masteryInferenceAuthority:false
        }) });
      }
      if (request.method() === 'POST') writes += 1;
      return route.fulfill({ status:500, contentType:'application/json', body:JSON.stringify({ error:'unexpected_waiting_route' }) });
    });
    await page.goto(origin + '/web/retention-origin.html');
    await page.getByRole('heading', { name:'Setup response recorded.' }).waitFor();
    assert.equal(await page.getByRole('button', { name:'Start setup question →' }).count(), 0);
    assert.equal(writes, 0);
    await noOverflow(page, 'waiting');
    await context.close();
  }

  assert.deepEqual(pageErrors, []);
  console.log('Retention origin read-only open, explicit session start, Study handoff and waiting-state checks passed');
} finally {
  await browser.close();
}
