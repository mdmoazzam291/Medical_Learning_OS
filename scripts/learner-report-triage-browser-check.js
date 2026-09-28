// Synthetic transport fixture: no production credentials or review writes.
import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const browser = await chromium.launch({ headless: true });
const origin = process.env.APP_URL || 'http://127.0.0.1:3000';

try {
  const context = await browser.newContext({ viewport: { width: 820, height: 1100 } });
  await context.addInitScript(() => localStorage.setItem('mlos-supabase-auth-v1', JSON.stringify({
    accessToken: 'synthetic',
    refreshToken: 'synthetic',
    expiresAt: 4102444800,
    user: { id: 'reviewer-synthetic', email: 'reviewer@example.test' }
  })));

  const reportId = '11111111-1111-4111-8111-111111111111';
  const questionVersionId = 'demo:learner-report@1';
  let triaged = false;
  const writes = [];

  await context.route('**/functions/v1/review-api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET') {
      writes.push({
        path,
        body: request.postData() ? JSON.parse(request.postData()) : null
      });
    }

    let body = {};
    if (path.endsWith('/me')) {
      body = { reviewerId: 'server-derived', reviewKinds: ['medical', 'references'] };
    } else if (path.endsWith('/pipeline-status')) {
      body = {
        contractId: 'content-intake-status-v1',
        intake: { stagedBatches: 0, stagedQuestions: 0 },
        review: { medicalPending: 0, referencesPending: 0, rightsPending: 0 },
        catalog: { publishedStableQuestions: 180 },
        publicationAuthority: false
      };
    } else if (path.endsWith('/queue')) {
      body = { reviewKind: 'medical', items: [] };
    } else if (path.endsWith('/learner-reports')) {
      body = triaged ? {
        contractId: 'learner-content-issue-triage-queue-v1',
        reportCount: 0,
        groupCount: 0,
        groups: [],
        learnerIdentityExposed: false,
        canonicalMutationAuthority: false
      } : {
        contractId: 'learner-content-issue-triage-queue-v1',
        reportCount: 1,
        groupCount: 1,
        learnerIdentityExposed: false,
        canonicalMutationAuthority: false,
        groups: [{
          targetType: 'question_version',
          targetId: questionVersionId,
          targetSha256: 'a'.repeat(64),
          conceptId: 'demo:concept',
          targetState: 'current',
          target: {
            question: {
              questionVersionId,
              status: 'published',
              stem: 'Which intervention is first line?',
              options: [
                { optionId: 'A', text: 'Correct option' },
                { optionId: 'B', text: 'Distractor' }
              ],
              answerOptionId: 'A',
              explanation: 'Reviewed canonical explanation.',
              sourceIds: ['source:demo']
            }
          },
          sources: [{
            sourceId: 'source:demo',
            title: 'Demo source',
            version: '1',
            url: 'https://example.test/source',
            rights: { status: 'public_domain', evidence: 'Synthetic fixture.' }
          }],
          reportCount: 1,
          oldestReportAt: '2026-09-29T00:00:00.000Z',
          reports: [{
            reportId,
            reportKind: 'incorrect',
            details: 'Learner thinks the explanation needs correction.',
            suggestedCorrection: 'Learner-shared correction text.',
            createdAt: '2026-09-29T00:00:00.000Z'
          }]
        }]
      };
    } else if (path.endsWith('/learner-reports/triage')) {
      triaged = true;
      body = {
        contractId: 'learner-content-issue-triage-receipt-v1',
        targetType: 'question_version',
        targetId: questionVersionId,
        targetSha256: 'a'.repeat(64),
        reviewKind: 'medical',
        decision: 'correction_required',
        reasonCode: 'medical_correction_required',
        decisionCount: 1,
        triageEvents: [{ reportId }],
        canonicalMutation: false,
        publicationAuthority: false,
        learnerModelAuthority: false
      };
    }

    await route.fulfill({ json: body });
  });

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(origin + '/web/review.html');
  await page.getByRole('heading', { name: 'Inspect exact reported versions before routing corrections' }).waitFor();

  const panelText = await page.locator('.learner-report-group').innerText();
  assert.match(panelText, /Which intervention is first line/);
  assert.match(panelText, /Learner-shared correction text/);
  assert.match(panelText, /Learner identity is intentionally not exposed/);
  assert.match(panelText, /creates no edit and no publication/);

  const form = page.locator('.learner-report-triage-form');
  await form.getByLabel('Reviewer gate').selectOption('medical');
  await form.getByLabel('Final triage outcome').selectOption('correction_required');
  await form.getByLabel('Reason').selectOption('medical_correction_required');
  await form.getByRole('checkbox').check();
  await form.getByRole('button', { name: 'Record triage decision' }).click();

  await page.getByText(/Correction required recorded for 1 learner report/).waitFor();
  await page.getByRole('heading', { name: 'No open learner-reported content issues.' }).waitFor();

  assert.equal(writes.length, 1);
  assert.match(writes[0].path, /\/learner-reports\/triage$/);
  assert.deepEqual(writes[0].body.reportIds, [reportId]);
  assert.equal(writes[0].body.reviewKind, 'medical');
  assert.equal(writes[0].body.decision, 'correction_required');
  assert.equal(writes[0].body.reasonCode, 'medical_correction_required');
  assert.equal(writes[0].body.attested, true);
  assert.equal(Object.hasOwn(writes[0].body, 'reviewerId'), false);
  assert.equal(Object.hasOwn(writes[0].body, 'learnerId'), false);
  assert.deepEqual(errors, []);

  await context.close();
  console.log('Learner report triage browser flow passed');
} finally {
  await browser.close();
}
