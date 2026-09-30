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
  let revisionMode = 'ready';

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
      if (revisionMode === 'unavailable') return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({error: 'revision_unavailable'}) });
      if (revisionMode === 'empty') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ dueCount: 0, unseenCount: 0, nextDueAt: '2026-10-02T03:00:00Z' }) });
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
    if (url.includes('/functions/v1/study-api/sessions/beta-study-now/summary')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        contractId: 'study-session-summary-v1', sessionId: 'beta-study-now', closed: true,
        selectedCount: 1, answeredCount: 1, correctCount: 1, incorrectCount: 0,
        unansweredCount: 0, completedAllSelected: true, concepts: [],
        revision: { available: true, scheduledCount: 1, missingCount: 0, dueNowCount: 0, nextDueAt: '2026-10-02T03:00:00Z' }
      }) });
    }
    if (url.includes('/functions/v1/study-api/sessions/beta-study-now/answer')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        event: {
          schemaVersion: 1,
          type: 'question.answered',
          eventId: '22222222-2222-4222-8222-222222222222',
          questionVersionId: 'published:one@1',
          conceptId: 'published:one',
          correct: true,
          durationMs: 42000
        },
        selectedOptionId: 'a',
        answerOptionId: 'a',
        explanation: 'Reviewed explanation.',
        sources: []
      }) });
    }
    if (url.includes('/functions/v1/study-api/sessions/beta-study-now/next')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        sessionId: 'beta-study-now',
        position: 1,
        total: 1,
        closed: true,
        question: null,
        receipt: null,
        memoryJudgment: null,
        recommendationContext: null
      }) });
    }
    if (url.includes('/functions/v1/study-api/study-now/integrity')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        contractId: 'study-now-completion-integrity-v1',
        recommendationCount: 1,
        completeEvidenceChainCount: 1,
        hostedBrowserGateSatisfied: true,
        openRecommendationSessionCount: 0,
        memoryRatingRequiredForCompletion: false,
        latestRecommendation: {
          recommendationId: '33333333-3333-4333-8333-333333333333',
          sessionId: 'beta-study-now',
          sessionClosed: true,
          selectedCount: 1,
          attemptedCount: 1,
          authoritativeScheduleCount: 1,
          memoryRatingCount: 0,
          hostedBrowserAnswerCount: 1,
          evidenceChainComplete: true,
          hostedM05cGateSatisfied: true,
          blockers: []
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
        contractId: 'admin-transfer-pair-queue-v2',
        activationAuthority: false,
        probeSchedulingEnabled: false,
        researchGate: {
          contractId: 'admin-retention-research-gate-v1',
          pendingHumanPairReviews: 1,
          activationControlAvailable: false,
          activationAuthority: false,
          probeSchedulingEnabled: false,
          nextAction: {
            kind: 'human-transfer-pair-validation',
            priority: 'blocking',
            pendingCount: 1
          },
          activationReadiness: {
            readiness: {
              hasPublishedAlternateItemPair: true,
              protocolPreregistered: true,
              validatedPairMetadataAvailable: false,
              learnerOptInPathAvailable: true,
              canActivate: false,
              blockingReasons: [
                'validated-alternate-pair-metadata-not-yet-available',
                'separate-activation-authorization-required'
              ]
            },
            activationAuthority: false,
            probeSchedulingEnabled: false
          },
          feasibilityReport: {
            contractId: 'study-retention-probe-feasibility-report-v1',
            funnel: {
              assignmentCount: 0,
              serverServedCount: 0,
              responseCount: 0,
              cleanResponseCount: 0
            },
            primaryOutcome: {
              definition: 'alternate_item_correct_within_6_to_8_day_window',
              cleanResponseCount: 0,
              cleanCorrectCount: 0,
              cleanAccuracy: null,
              descriptiveOnly: true
            },
            limitations: [
              'descriptive-feasibility-only',
              'no-causal-inference',
              'no-hypothesis-testing'
            ]
          }
        },
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
            explanation: 'Immediate intramuscular epinephrine is first-line.',
            reviewPacket: {
              sourceIds: ['cdc:immunization-adverse-reactions:2024-07-25'],
              sources: [{
                sourceId: 'cdc:immunization-adverse-reactions:2024-07-25',
                title: 'CDC: Preventing and Managing Adverse Reactions',
                version: '2024-07-25',
                rightsStatus: 'citation_only'
              }],
              provenance: { kind: 'ai_generated' },
              changeReason: 'Initial source-grounded medical seed',
              reviewSummary: [
                { kind: 'medical', decision: 'approved' },
                { kind: 'references', decision: 'approved' },
                { kind: 'rights', decision: 'approved' }
              ]
            },
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
            explanation: 'Skin findings are not required before treating anaphylaxis.',
            reviewPacket: {
              sourceIds: ['cdc:immunization-adverse-reactions:2024-07-25'],
              sources: [{
                sourceId: 'cdc:immunization-adverse-reactions:2024-07-25',
                title: 'CDC: Preventing and Managing Adverse Reactions',
                version: '2024-07-25',
                rightsStatus: 'citation_only'
              }],
              provenance: { kind: 'ai_generated' },
              changeReason: 'Targeted alternate-item candidate',
              reviewSummary: [
                { kind: 'medical', decision: 'approved' },
                { kind: 'references', decision: 'approved' },
                { kind: 'rights', decision: 'approved' }
              ]
            },
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
  await page.getByRole('button', { name: 'Send password reset link' }).waitFor();
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

  for (const [name, width, height] of [['phone', 390, 844], ['tablet', 820, 1180], ['desktop', 1440, 1000]]) {
    await page.setViewportSize({ width, height });
    await page.getByRole('button', { name: '10 min', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: '10 min', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await page.getByRole('link', { name: 'Start 10 min' }).getAttribute('href'), '/web/medical.html?studyNow=10');
    await page.reload();
    await page.getByRole('link', { name: 'Start 10 min' }).waitFor();
    assert.equal(await page.getByRole('button', { name: '10 min', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(studyNowCalls, 0, 'duration selection/reload must not create a session');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name + ' home overflow');
    await page.getByRole('button', { name: '20 min', exact: true }).click();
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: process.env.SCREENSHOT_DIR + '/ux-home-' + name + '.png', fullPage: true, animations: 'disabled' });
  }
  revisionMode = 'unavailable';
  await page.reload();
  await page.getByRole('link', { name: 'Open Study', exact: false }).waitFor();
  assert.match(await page.locator('.study-next').innerText(), /schedule is temporarily unavailable/);
  assert.doesNotMatch(await page.locator('.study-next').innerText(), /up to date|No future review/);
  assert.equal(await page.getByRole('link', { name: /Start \d+ min/ }).count(), 0);
  revisionMode = 'empty';
  await page.reload();
  await page.getByRole('heading', { name: 'Your scheduled reviews are up to date.' }).waitFor();
  assert.equal(await page.getByRole('button', { name: '20 min', exact: true }).count(), 0);
  assert.equal(studyNowCalls, 0, 'empty/upcoming-only schedule must not create a session');
  revisionMode = 'ready';
  await page.reload();
  await page.getByRole('link', { name: 'Start 20 min' }).waitFor();
  await page.getByRole('link', { name: 'Start 20 min' }).click();
  await page.getByText('Question 1 of 1', { exact: false }).waitFor();
  assert.equal(studyNowCalls, 1);
  assert.equal(new URL(page.url()).searchParams.has('studyNow'), false);
  await page.locator('input[name="answer"][value="a"]').check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await page.getByRole('button', { name: 'Finish session →' }).click();
  await page.getByText('Study Now loop verified.', { exact: true }).waitFor();
  assert.match(await page.locator('.completion').innerText(), /Hosted browser answer evidence is also present/);
  await page.getByRole('heading', { name: 'This session', exact: true }).waitFor();
  assert.match(await page.locator('.session-results').innerText(), /1 \/ 1/);
  assert.match(await page.locator('.session-results').innerText(), /Next review:/);
  for (const [width, height] of [[390, 844], [820, 1180], [1440, 1000]]) {
    await page.setViewportSize({ width, height });
    await page.reload();
    await page.getByRole('heading', { name: 'This session', exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('summary'), 'beta-study-now');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'summary overflow at ' + width);
    assert.match(await page.locator('.session-results').innerText(), /1 \/ 1/);
    assert.equal(await page.getByRole('link', { name: 'Plan my next session' }).getAttribute('href'), '/#study-next');
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: process.env.SCREENSHOT_DIR + '/ux-summary-' + width + '.png', fullPage: true, animations: 'disabled' });
  }

  await page.getByRole('link', { name: 'Plan my next session' }).click();
  await page.getByRole('link', { name: 'Start 20 min' }).waitFor();
  assert.equal(new URL(page.url()).hash, '#study-next');
  assert.equal(studyNowCalls, 1, 'planning next session is read-only');

  await page.goto(origin + '/web/admin.html');
  await page.getByRole('heading', { name: 'Review authority stays out of the learner product.' }).waitFor();
  await page.getByRole('heading', { name: 'Human pair validation is the next research gate.' }).waitFor();
  await page.getByText('FEASIBILITY EVIDENCE · DESCRIPTIVE ONLY', { exact: true }).waitFor();
  assert.match(await page.locator('#research-gate').innerText(), /Clean accuracy: not estimable yet/);
  assert.match(await page.locator('#research-gate').innerText(), /No causal inference/);
  assert.equal(await page.getByRole('button', { name: /activate/i }).count(), 0);
  await page.getByRole('heading', { name: 'emergency:anaphylaxis:first-line-treatment' }).waitFor();
  assert.equal(await page.getByText('HUMAN REVIEW PACKET', { exact: true }).count(), 2);
  assert.match(await page.locator('.transfer-pair-form').locator('..').innerText(), /CDC: Preventing and Managing Adverse Reactions/);
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
