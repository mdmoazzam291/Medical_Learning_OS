import assert from 'node:assert/strict';

const moduleUrl = process.env.PLAYWRIGHT_MODULE_URL;
if (!moduleUrl) throw new Error('PLAYWRIGHT_MODULE_URL is required');
const { chromium } = await import(moduleUrl);

const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 820, height: 1100 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

const conceptId = 'emergency:anaphylaxis:first-line-treatment';
const noteVersionId = '6ac9305b-2ce1-4fdb-9705-fa22c8eefa12';
const questionVersionId = 'emergency:anaphylaxis:first-line-drug@1';
const correctionId = '8525e69f-68ed-400a-bfcb-e47dc2691dc2';
let correction = null;
const correctionBodies = [];
const reportBodies = [];

await page.route('https://iyapppmeieqhflnzslao.supabase.co/**', async route => {
  const url = route.request().url();
  if (url.includes('/functions/v1/study-api/vault/concepts/') && !url.endsWith('/vault/concepts')) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        concept: {
          conceptId,
          label: 'Anaphylaxis first-line treatment',
          aliases: ['anaphylaxis treatment'],
          subjectTags: ['emergency']
        },
        canonicalNote: {
          noteVersionId,
          conceptId,
          version: 1,
          title: 'Anaphylaxis: first-line treatment',
          bodyMarkdown: 'Canonical reviewed content: intramuscular epinephrine is first-line treatment.',
          sourceIds: ['cdc:immunization-adverse-reactions:2024-07-25'],
          contentSha256: 'e'.repeat(64),
          publishedAt: '2026-09-27T00:00:00.000Z'
        },
        annotations: correction ? [{
          annotationId: correctionId,
          annotationKind: 'correction',
          conceptId,
          bodyMarkdown: correction,
          anchorNoteVersionId: null,
          anchorState: 'unanchored',
          targetType: 'question_version',
          targetId: questionVersionId,
          targetSha256: 'a'.repeat(64),
          targetState: 'current',
          targetLabel: 'Question: first-line treatment',
          revision: 1,
          createdAt: '2026-09-29T00:00:00.000Z',
          updatedAt: '2026-09-29T00:00:00.000Z'
        }] : []
      })
    });
  }
  if (url.endsWith('/functions/v1/study-api/vault/concepts')) {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        catalogVersion: 36,
        count: 1,
        concepts: [{
          conceptId,
          label: 'Anaphylaxis first-line treatment',
          aliases: ['anaphylaxis treatment'],
          subjectTags: ['emergency'],
          canonicalNote: {
            noteVersionId,
            version: 1,
            title: 'Anaphylaxis: first-line treatment',
            publishedAt: '2026-09-27T00:00:00.000Z'
          },
          annotationCount: correction ? 1 : 0,
          correctionCount: correction ? 1 : 0
        }]
      })
    });
  }
  if (url.endsWith('/functions/v1/study-api/vault/corrections')) {
    const body = JSON.parse(route.request().postData() || '{}');
    correctionBodies.push(body);
    correction = body.bodyMarkdown;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        annotationId: correctionId,
        annotationKind: 'correction',
        conceptId,
        bodyMarkdown: correction,
        targetType: body.targetType,
        targetId: body.targetId,
        targetSha256: 'a'.repeat(64),
        anchorNoteVersionId: null,
        revision: 1,
        canonicalAuthority: false
      })
    });
  }
  if (url.endsWith('/functions/v1/study-api/content-reports')) {
    const body = JSON.parse(route.request().postData() || '{}');
    reportBodies.push(body);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        reportId: crypto.randomUUID(),
        contractId: 'learner-content-issue-report-v1',
        conceptId,
        targetType: body.targetType,
        targetId: body.targetId,
        targetSha256: 'a'.repeat(64),
        reportKind: body.reportKind,
        sharedCorrection: body.shareCorrection,
        canonicalAuthority: false,
        learnerModelAuthority: false
      })
    });
  }
  return route.fulfill({
    status: 404,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'unexpected_test_route' })
  });
});

await page.goto(origin + '/web/vault.html');
await page.evaluate(() => {
  localStorage.setItem('mlos-supabase-auth-v1', JSON.stringify({
    accessToken: 'jwt-test',
    refreshToken: 'refresh-test',
    expiresAt: 2100000000,
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'learner@example.com',
      emailConfirmedAt: '2026-09-29T00:00:00.000Z'
    }
  }));
});

await page.goto(
  origin + '/web/vault.html?concept=' + encodeURIComponent(conceptId) +
  '&correctionTargetType=question_version&correctionTargetId=' + encodeURIComponent(questionVersionId)
);

await page.getByRole('heading', { name: 'Anaphylaxis first-line treatment' }).waitFor();
assert.match(await page.locator('.vault-detail').textContent(), /Canonical reviewed content: intramuscular epinephrine is first-line treatment/);
assert.match(await page.locator('.vault-detail').textContent(), /PRIVATE CORRECTION OVERLAY/);

const correctionText = 'My private wording: give IM epinephrine immediately.';
await page.getByLabel('My correction').nth(1).fill(correctionText);
await page.getByRole('button', { name: 'Save private correction' }).nth(1).click();
await page.getByRole('alert').filter({ hasText: 'Private correction saved. Canonical content was not changed.' }).waitFor();

assert.equal(correctionBodies.length, 1);
assert.equal(correctionBodies[0].targetType, 'question_version');
assert.equal(correctionBodies[0].targetId, questionVersionId);
await page.getByText('MY CORRECTION · PRIVATE').waitFor();
assert.match(await page.locator('.personal-correction').textContent(), /Learner-only/);
assert.match(await page.locator('.vault-detail').textContent(), /Canonical reviewed content: intramuscular epinephrine is first-line treatment/);
assert.equal(await page.locator('.personal-correction textarea[name="bodyMarkdown"]').inputValue(), correctionText);

const reportForm = page.locator('form[data-form="content-report"]').filter({ has: page.locator('input[name="shareCorrection"]') });
await reportForm.getByLabel('Why might the shared content need review?').selectOption('incorrect');
await reportForm.getByLabel('Optional details').fill('Please recheck the shared wording.');
await reportForm.getByRole('button', { name: 'Report possible canonical error' }).click();
await page.getByRole('alert').filter({ hasText: 'Your private correction was not shared.' }).waitFor();

assert.equal(reportBodies.length, 1);
assert.equal(reportBodies[0].shareCorrection, false);
assert.equal(reportBodies[0].correctionAnnotationId, null);
assert.equal(Object.hasOwn(reportBodies[0], 'bodyMarkdown'), false);

const shareForm = page.locator('form[data-form="content-report"]').filter({ has: page.locator('input[name="shareCorrection"]') });
await shareForm.getByLabel('Why might the shared content need review?').selectOption('outdated');
await shareForm.getByLabel('Include my private correction text in this report.').check();
await shareForm.getByRole('button', { name: 'Report possible canonical error' }).click();
await page.getByRole('alert').filter({ hasText: 'Your correction text was shared with the report by your choice.' }).waitFor();

assert.equal(reportBodies.length, 2);
assert.equal(reportBodies[1].shareCorrection, true);
assert.equal(reportBodies[1].correctionAnnotationId, correctionId);
assert.equal(Object.hasOwn(reportBodies[1], 'bodyMarkdown'), false);
assert.deepEqual(errors, []);

await context.close();
await browser.close();
console.log('Learner-private correction overlay, canonical separation and explicit report sharing passed');
