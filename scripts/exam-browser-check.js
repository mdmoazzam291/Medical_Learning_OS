import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const browser = await chromium.launch({ headless: true });
const origin = process.env.APP_URL || 'http://127.0.0.1:3000';

const widths = [
  ['phone', 390, 844],
  ['tablet', 820, 1180],
  ['desktop', 1440, 1000]
];

function questions() {
  return Array.from({ length: 36 }, (_, index) => ({
    questionVersionId: 'exam:test:q' + String(index + 1).padStart(2, '0') + '@1',
    stem: 'Engineering mock question ' + (index + 1) + '?',
    options: [
      { optionId:'a', text:'Option A' },
      { optionId:'b', text:'Option B' },
      { optionId:'c', text:'Option C' },
      { optionId:'d', text:'Option D' }
    ],
    media: []
  }));
}

function freshRun() {
  const now = Date.now();
  const qs = questions();
  return {
    contractId:'exam-run-view-v1',
    runId:'11111111-1111-4111-8111-111111111111',
    examId:'neet-pg',
    ruleSetId:'neet-pg:2026@1',
    engineId:'locked-section-v1',
    revision:0,
    status:'in_progress',
    startedAt:new Date(now - 5000).toISOString(),
    scheduledEndAt:new Date(now + 5 * 42 * 60_000).toISOString(),
    completedAt:null,
    serverNow:new Date(now).toISOString(),
    caveats:['internal test fixture'],
    assembly:{ testingOnly:true, productionEquivalent:false },
    termination:null,
    resumedExisting:false,
    progress:{
      currentSectionIndex:0,
      sectionCount:5,
      completedSections:0,
      currentSectionId:'A'
    },
    currentSection:{
      sectionId:'A',
      label:'Section A',
      scheduledStartAt:new Date(now - 5000).toISOString(),
      scheduledEndAt:new Date(now + 42 * 60_000).toISOString(),
      closedAt:null,
      questions:qs,
      responses:Object.fromEntries(qs.map(q => [
        q.questionVersionId,
        { optionId:null, markedForReview:false, answeredAt:null, updatedAt:null }
      ]))
    },
    receipt:null
  };
}

function completedRun(previous) {
  return {
    ...previous,
    revision:previous.revision + 1,
    status:'completed',
    completedAt:new Date().toISOString(),
    serverNow:new Date().toISOString(),
    currentSection:null,
    progress:{
      currentSectionIndex:null,
      sectionCount:5,
      completedSections:5,
      currentSectionId:null
    },
    receipt:{
      score:4,
      correct:1,
      incorrect:0,
      unanswered:179
    }
  };
}

function autopsyFixture(runId) {
  return {
    contractId:'gt-autopsy-v1',
    runId,
    inferenceAuthority:false,
    masteryInferenceEnabled:false,
    result:{ score:4, correct:1, incorrect:0, unanswered:179 },
    sections:[
      { sectionId:'A', label:'Section A', correct:1, incorrect:0, unanswered:35, score:4 },
      { sectionId:'B', label:'Section B', correct:0, incorrect:0, unanswered:36, score:0 },
      { sectionId:'C', label:'Section C', correct:0, incorrect:0, unanswered:36, score:0 },
      { sectionId:'D', label:'Section D', correct:0, incorrect:0, unanswered:36, score:0 },
      { sectionId:'E', label:'Section E', correct:0, incorrect:0, unanswered:36, score:0 }
    ],
    visual:{ questionCount:0, correct:0, incorrect:0, unanswered:0, modalities:[] },
    behavior:{
      answerChangeCount:0,
      beneficialChangeCount:0,
      harmfulChangeCount:0,
      wrongToWrongChangeCount:0,
      answerChangeScoreImpact:0
    },
    prescription:{ candidates:[] }
  };
}

function readiness({ testing }) {
  return {
    contractId:testing ? 'exam-mock-test-readiness-v1' : 'exam-mock-readiness-v1',
    ruleSetId:'neet-pg:2026@1',
    requiredUniqueQuestions:180,
    eligibleUniqueQuestions:testing ? 180 : 6,
    shortage:testing ? 0 : 174,
    ready:testing
  };
}

async function noHorizontalOverflow(page, label) {
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    true,
    label + ' horizontal overflow'
  );
}

const errors = [];
try {
  for (const [name, width, height] of widths) {
    const context = await browser.newContext({ viewport:{ width, height } });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(name + ': ' + error.message));

    await page.addInitScript(() => {
      localStorage.setItem('mlos-supabase-auth-v1', JSON.stringify({
        accessToken:'browser-test-jwt',
        refreshToken:'browser-test-refresh',
        expiresAt:Math.floor(Date.now() / 1000) + 3600,
        user:{
          id:'22222222-2222-4222-8222-222222222222',
          email:'exam-browser@example.com',
          emailConfirmedAt:'2026-09-28T00:00:00.000Z'
        }
      }));
    });

    let run = null;
    let autopsyCalls = 0;
    const mutations = [];

    await page.route('**/functions/v1/study-api/**', async route => {
      const request = route.request();
      const url = new URL(request.url());
      const marker = '/functions/v1/study-api';
      const path = url.pathname.slice(url.pathname.indexOf(marker) + marker.length);
      const method = request.method();
      const json = payload => route.fulfill({
        status:200,
        contentType:'application/json',
        body:JSON.stringify(payload)
      });

      assert.equal(request.headers().authorization, 'Bearer browser-test-jwt');
      assert.ok(request.headers().apikey);

      if (method === 'GET' && path === '/exam-simulator/runs/current') {
        return json(run ?? {});
      }
      if (method === 'GET' && path === '/exam-simulator/readiness') {
        assert.equal(url.searchParams.get('ruleSetId'), 'neet-pg:2026@1');
        return json(readiness({ testing:false }));
      }
      if (method === 'GET' && path === '/exam-simulator/test-readiness') {
        assert.equal(url.searchParams.get('ruleSetId'), 'neet-pg:2026@1');
        return json(readiness({ testing:true }));
      }
      if (method === 'POST' && path === '/exam-simulator/test-runs') {
        const body = request.postDataJSON();
        assert.deepEqual(body, { ruleSetId:'neet-pg:2026@1' });
        run = freshRun();
        return json(run);
      }
      if (method === 'GET' && /^\/exam-simulator\/runs\/[^/]+$/.test(path)) {
        assert.ok(run);
        return json({ ...run, serverNow:new Date().toISOString() });
      }
      if (method === 'POST' && path.endsWith('/answer')) {
        const body = request.postDataJSON();
        for (const forbidden of ['learnerId','correct','answerOptionId']) {
          assert.equal(Object.hasOwn(body, forbidden), false);
        }
        assert.equal(body.expectedRevision, run.revision);
        const response = run.currentSection.responses[body.questionVersionId];
        assert.ok(response);
        response.optionId = body.optionId;
        response.answeredAt = response.answeredAt || new Date().toISOString();
        response.updatedAt = new Date().toISOString();
        run.revision += 1;
        run.serverNow = new Date().toISOString();
        mutations.push('answer');
        return json(run);
      }
      if (method === 'POST' && path.endsWith('/review')) {
        const body = request.postDataJSON();
        assert.equal(body.expectedRevision, run.revision);
        const response = run.currentSection.responses[body.questionVersionId];
        assert.ok(response);
        response.markedForReview = body.markedForReview;
        response.updatedAt = new Date().toISOString();
        run.revision += 1;
        run.serverNow = new Date().toISOString();
        mutations.push('review');
        return json(run);
      }
      if (method === 'POST' && path.endsWith('/cancel')) {
        const body = request.postDataJSON();
        assert.equal(body.expectedRevision, run.revision);
        assert.equal(Object.hasOwn(body, 'score'), false);
        run = {
          ...run,
          revision:run.revision + 1,
          status:'cancelled',
          serverNow:new Date().toISOString(),
          termination:{ reason:'user_abandoned' },
          receipt:null
        };
        mutations.push('cancel');
        return json(run);
      }
      if (method === 'GET' && path.endsWith('/autopsy')) {
        autopsyCalls += 1;
        assert.equal(run?.status, 'completed');
        return json(autopsyFixture(run.runId));
      }

      return route.fulfill({
        status:404,
        contentType:'application/json',
        body:JSON.stringify({ error:'unexpected_browser_test_route', method, path })
      });
    });

    await page.goto(origin + '/web/exam.html');
    await page.getByRole('heading', { name:'Rule-faithful, locked-section simulation.' }).waitFor();
    await noHorizontalOverflow(page, name + ' home');
    assert.match(await page.locator('body').innerText(), /6 \/ 180 questions ready/);
    assert.match(await page.locator('body').innerText(), /180 \/ 180 questions ready/);

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name:/Start internal test mock/ }).click();
    await page.getByText('INTERNAL ENGINEERING TEST', { exact:true }).waitFor();
    await page.getByText('QUESTION 1 OF 36', { exact:true }).waitFor();
    assert.equal(await page.locator('.exam-palette-button').count(), 36);
    await noHorizontalOverflow(page, name + ' active');

    await page.getByRole('radio').nth(1).check();
    await page.getByRole('button', { name:'Mark for review' }).waitFor();
    assert.equal(await page.getByRole('radio').nth(1).isChecked(), true);
    await page.getByRole('button', { name:'Mark for review' }).click();
    await page.getByRole('button', { name:'Unmark review' }).waitFor();
    await page.getByRole('button', { name:'Question 1, marked for review' }).waitFor();
    assert.deepEqual(mutations.slice(0, 2), ['answer','review']);
    assert.doesNotMatch(await page.locator('body').innerText(), /Correct answer/i);

    await page.getByRole('button', { name:'Next →' }).click();
    await page.getByText('QUESTION 2 OF 36', { exact:true }).waitFor();
    await page.getByRole('button', { name:'Question 36, unanswered' }).click();
    await page.getByText('QUESTION 36 OF 36', { exact:true }).waitFor();
    assert.equal(await page.getByRole('button', { name:'Next →' }).isDisabled(), true);
    await page.getByRole('button', { name:'← Previous' }).click();
    await page.getByText('QUESTION 35 OF 36', { exact:true }).waitFor();

    await page.reload();
    await page.getByText('QUESTION 1 OF 36', { exact:true }).waitFor();
    assert.equal(await page.getByRole('radio').nth(1).isChecked(), true);
    await page.getByRole('button', { name:'Unmark review' }).waitFor();
    assert.doesNotMatch(await page.locator('body').innerText(), /Correct answer/i);

    run = completedRun(run);
    await page.reload();
    await page.getByRole('heading', { name:'Exam submitted by the server clock.' }).waitFor();
    await page.getByRole('heading', { name:'Where the marks went' }).waitFor();
    assert.equal(autopsyCalls, 1);
    assert.match(await page.locator('body').innerText(), /does not infer mastery, fatigue, confidence or preventable marks/);
    await noHorizontalOverflow(page, name + ' completed');

    if (process.env.SCREENSHOT_DIR) {
      await page.screenshot({
        path:process.env.SCREENSHOT_DIR + '/exam-' + name + '-completed.png',
        fullPage:true
      });
    }

    await page.getByRole('button', { name:'Back to Exam Mode' }).click();
    await page.getByRole('heading', { name:'Rule-faithful, locked-section simulation.' }).waitFor();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name:/Start internal test mock/ }).click();
    await page.getByText('QUESTION 1 OF 36', { exact:true }).waitFor();

    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name:'Abandon mock' }).click();
    await page.getByRole('heading', { name:'No completion score was created.' }).waitFor();
    assert.match(await page.locator('body').innerText(), /receives no GT Autopsy/);
    assert.equal(autopsyCalls, 1);
    assert.equal(mutations.at(-1), 'cancel');
    await noHorizontalOverflow(page, name + ' cancelled');

    await context.close();
  }

  assert.deepEqual(errors, []);
  console.log('Exam Mode phone/tablet/desktop interaction, persistence, autopsy resume and cancellation checks passed');
} finally {
  await browser.close();
}
