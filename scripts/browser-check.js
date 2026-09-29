import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const browser = await chromium.launch({ headless: true });
const origin = process.env.APP_URL || 'http://127.0.0.1:3000';
const errors = [];
let activePage;

function sessionPayload(email = 'admin@example.com') {
  return {
    access_token: 'jwt-test',
    refresh_token: 'refresh-test',
    expires_at: 2100000000,
    user: {
      id: '11111111-1111-1111-1111-111111111111',
      email,
      email_confirmed_at: '2026-09-25T00:00:00Z',
      app_metadata: {
        provider: email === 'admin@example.com' ? 'google' : 'email',
        providers: email === 'admin@example.com' ? ['google', 'email'] : ['email']
      }
    }
  };
}

try {
  for (const [name, width, height] of [['phone', 390, 844], ['tablet', 820, 1180], ['desktop', 1440, 1000]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    activePage = page;
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.getByRole('heading', { name: 'Your study workspace starts after sign-in.' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name + ' horizontal overflow');
    await page.getByRole('link', { name: 'Sign in / create account' }).waitFor();
    const body = await page.locator('body').innerText();
    assert.equal(/Demo QBank|LOCAL PREVIEW|Start demo|three-question local demo/i.test(body), false);
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: process.env.SCREENSHOT_DIR + '/' + name + '.png', fullPage: true });
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 1180, height: 900 } });
  const page = await context.newPage();
  activePage = page;
  page.on('pageerror', error => errors.push(error.message));

  let isAdmin = true;
  let validationBody = null;
  let studyNowCalls = 0;

  await page.route('https://iyapppmeieqhflnzslao.supabase.co/**', async route => {
    const url = route.request().url();

    if (url.includes('/auth/v1/token?grant_type=password')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessionPayload(isAdmin ? 'admin@example.com' : 'learner@example.com')) });
    }
    if (url.includes('/auth/v1/token?grant_type=refresh_token')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sessionPayload(isAdmin ? 'admin@example.com' : 'learner@example.com')) });
    }
    if (url.includes('/auth/v1/logout')) return route.fulfill({ status: 204, body: '' });

    if (url.includes('/functions/v1/study-api/retention-probe/consent')) {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
          contractId: 'retention-probe-learner-consent-receipt-v1',
          decision: body.decision,
          optedIn: body.decision === 'opt_in',
          activationAuthority: false,
          probeSchedulingEnabled: false,
          masteryInferenceAuthority: false
        }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        contractId: 'retention-probe-learner-consent-v1',
        protocol: {
          protocolId: 'retention-probe-feasibility-v1',
          protocolVersion: 1,
          protocolSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          targetDays: 7,
          windowStartDays: 6,
          windowEndDays: 8,
          maxProbeAssignmentsPerLearnerPer7Days: 1,
          maxTotalAssignments: 20,
          mayDisplaceDueOrMistakeRepairWork: false
        },
        decision: 'not_decided',
        optedIn: false,
        activationAuthority: false,
        probeSchedulingEnabled: false,
        masteryInferenceAuthority: false
      }) });
    }
    if (url.includes('/functions/v1/study-api/progress')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ attempts: 4, correct: 3, accuracy: 0.75, concepts: [] }) });
    }
    if (url.includes('/functions/v1/study-api/questions')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ questions: [
        { questionId: 'published:one', questionVersionId: 'published:one@1', stem: 'Published beta question?' }
      ] }) });
    }
    if (url.includes('/functions/v1/study-api/revision/due')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        dueCount: 2,
        unseenCount: 1,
        nextDueAt: '2026-09-30T08:00:00.000Z',
        policy: { id: 'bootstrap-binary-v1' },
        items: []
      }) });
    }
    if (url.includes('/functions/v1/study-api/exam-simulator/readiness')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        ruleSetId: 'neet-pg:2026@1',
        eligibleUniqueQuestions: 7,
        requiredUniqueQuestions: 180,
        shortage: 173,
        ready: false
      }) });
    }
    if (url.includes('/functions/v1/study-api/study-now/start')) {
      studyNowCalls += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        plan: { generatedAt: '2026-09-29T03:00:00.000Z', availableMinutes: 20, strategy: 'resume-existing', provisional: true, resumedExisting: true },
        session: {
          sessionId: 'beta-study-now',
          position: 0,
          total: 1,
          closed: false,
          question: {
            questionVersionId: 'published:one@1',
            conceptId: 'published:one',
            stem: 'Published beta question?',
            options: [
              { optionId: 'a', text: 'Answer A' },
              { optionId: 'b', text: 'Answer B' }
            ]
          },
          receipt: null,
          memoryJudgment: null,
          recommendationContext: { reason: 'due-revision' }
        }
      }) });
    }

    if (url.includes('/functions/v1/review-api/me')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        reviewerId: '11111111-1111-1111-1111-111111111111',
        isAdmin,
        reviewKinds: isAdmin ? ['medical', 'references', 'rights'] : []
      }) });
    }
    if (url.includes('/functions/v1/review-api/transfer-pairs') && route.request().method() === 'GET') {
      if (!isAdmin) return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'content_admin_required' }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        contractId: 'admin-transfer-pair-queue-v1',
        activationAuthority: false,
        probeSchedulingEnabled: false,
        pairs: [{
          primaryConceptId: 'emergency:anaphylaxis:first-line-treatment',
          questionA: {
            questionId: 'emergency:anaphylaxis:first-line-drug',
            questionVersionId: 'emergency:anaphylaxis:first-line-drug@1',
            stem: 'Patient with anaphylaxis: first medication?',
            options: [
              { optionId: 'epinephrine', text: 'Intramuscular epinephrine' },
              { optionId: 'steroid', text: 'Hydrocortisone' }
            ],
            answerOptionId: 'epinephrine',
            explanation: 'Immediate intramuscular epinephrine is first-line.'
          },
          questionB: {
            questionId: 'emergency:anaphylaxis:no-rash-first-action',
            questionVersionId: 'emergency:anaphylaxis:no-rash-first-action@1',
            stem: 'Wheeze and hypotension without rash: immediate action?',
            options: [
              { optionId: 'wait', text: 'Wait for rash' },
              { optionId: 'epinephrine', text: 'Give intramuscular epinephrine' }
            ],
            answerOptionId: 'epinephrine',
            explanation: 'Skin findings are not required before treating anaphylaxis.'
          },
          validation: null
        }]
      }) });
    }
    if (url.includes('/functions/v1/review-api/transfer-pairs/validate')) {
      if (!isAdmin) return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'content_admin_required' }) });
      validationBody = JSON.parse(route.request().postData() || '{}');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        contractId: 'admin-transfer-pair-validation-receipt-v1',
        activationAuthority: false,
        probeSchedulingEnabled: false,
        receipt: {
          validation_id: '33333333-3333-4333-8333-333333333333',
          transfer_evidence_valid: true,
          retention_probe_comparable: true
        }
      }) });
    }

    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'unexpected_test_route', url }) });
  });

  await page.goto(origin + '/web/account.html');
  await page.getByRole('heading', { name: 'Sign in to Medical Learning OS.' }).waitFor();
  const form = page.locator('#signin-form');
  await form.getByLabel('Email').fill('admin@example.com');
  await form.getByLabel('Password').fill('strong-password');
  await form.getByRole('button', { name: 'Sign in with email' }).click();
  await page.getByRole('heading', { name: 'Your Medical Learning OS account.' }).waitFor();
  await page.getByRole('heading', { name: 'One learner account, two ways in.' }).waitFor();
  await page.getByRole('button', { name: 'Opt in to retention feasibility' }).waitFor();
  await page.getByRole('link', { name: 'Open Admin Console' }).waitFor();

  await page.goto(origin);
  await page.getByRole('heading', { name: 'What should you study next?' }).waitFor();
  await page.waitForFunction(() => /2\s*Due reviews/.test(document.querySelector('.metrics')?.innerText || ''));
  assert.match(await page.locator('.metrics').innerText(), /2\s*Due reviews/);
  await page.getByRole('link', { name: 'Admin' }).waitFor();

  await page.getByRole('link', { name: 'Start 20 min' }).click();
  await page.getByText('Question 1 of 1', { exact: false }).waitFor();
  assert.equal(studyNowCalls, 1);
  assert.equal(new URL(page.url()).searchParams.has('studyNow'), false);

  await page.goto(origin + '/web/admin.html');
  await page.getByRole('heading', { name: 'Review authority stays out of the learner product.' }).waitFor();
  await page.getByRole('heading', { name: 'emergency:anaphylaxis:first-line-treatment' }).waitFor();
  const pairForm = page.locator('.transfer-pair-form');
  await pairForm.getByLabel('Decision').selectOption('validated');
  await pairForm.getByLabel('Surface novelty').selectOption('moderate');
  await pairForm.getByLabel('Construct alignment').selectOption('same_primary_construct');
  await pairForm.getByLabel('Reasoning alignment').selectOption('bounded_difference');
  await pairForm.getByLabel('Difficulty comparability').selectOption('bounded_difference');
  await pairForm.getByLabel('Cue-overlap risk').selectOption('moderate');
  await pairForm.getByLabel('Also valid for the preregistered retention-probe feasibility protocol').check();
  await pairForm.getByLabel('Validation notes').fill('Both items test immediate epinephrine use, while the alternate removes skin findings and changes the clinical cue pattern.');
  await pairForm.getByLabel('I personally inspected both exact published question versions and this judgment is my human research validation.').check();
  await pairForm.getByRole('button', { name: 'Record immutable validation' }).click();
  await page.getByRole('alert').filter({ hasText: 'Pair validated as retention-probe comparable' }).waitFor();
  assert.equal(validationBody.attestationVersion, 'transfer-pair-human-validation-v1');
  assert.equal(validationBody.attested, true);
  assert.equal(validationBody.retentionProbeComparable, true);
  assert.equal('validatorId' in validationBody, false);

  await page.goto(origin + '/web/account.html');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByRole('heading', { name: 'Sign in to Medical Learning OS.' }).waitFor();

  isAdmin = false;
  await form.getByLabel('Email').fill('learner@example.com').catch(() => {});
  const learnerForm = page.locator('#signin-form');
  await learnerForm.getByLabel('Email').fill('learner@example.com');
  await learnerForm.getByLabel('Password').fill('strong-password');
  await learnerForm.getByRole('button', { name: 'Sign in with email' }).click();
  await page.getByRole('heading', { name: 'Your Medical Learning OS account.' }).waitFor();
  await page.getByRole('heading', { name: 'Email + password is connected.' }).waitFor();
  assert.equal(await page.getByRole('link', { name: 'Open Admin Console' }).count(), 0);
  await page.goto(origin + '/web/admin.html');
  await page.getByRole('heading', { name: 'Admin access only.' }).waitFor();

  assert.equal((await page.request.get(origin + '/src/domain/demo-study.js')).status(), 404);
  assert.equal((await page.request.get(origin + '/src/adapters/local-store.js')).status(), 404);
  assert.equal((await page.request.get(origin + '/data/content-draft.json')).status(), 404);
  assert.equal((await page.request.get(origin + '/package.json')).status(), 404);

  await context.close();
  assert.deepEqual(errors, []);
  console.log('Beta entry, responsive layout, Study Now deep-link, singleton admin visibility, admin pair validation, learner denial and private-file boundary passed');
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    console.error(await activePage.locator('body').innerText());
    console.error('Browser errors:', errors);
    if (process.env.SCREENSHOT_DIR) await activePage.screenshot({ path: process.env.SCREENSHOT_DIR + '/failure.png', fullPage: true });
  }
  throw error;
} finally {
  await browser.close();
}
