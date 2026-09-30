import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const browser = await chromium.launch({ headless: true });
const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:3000';
const errors = [];
const conceptId = 'interface:reading';
const alternateId = 'interface:empty';
const noteVersionId = '11111111-1111-4111-8111-111111111112';
const annotationId = '11111111-1111-4111-8111-111111111113';
const concepts = [
  { conceptId, label: 'Connecting a concept', aliases: ['Synthetic interface fixture'], subjectTags: ['Interface fixture'], annotationCount: 0, canonicalNote: { noteVersionId } },
  { conceptId: alternateId, label: 'Unpublished concept fixture', aliases: [], subjectTags: [], annotationCount: 0 }
];
try {
  for (const [name, width, height] of [['phone', 390, 844], ['tablet', 820, 1180], ['desktop', 1440, 1000]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => localStorage.setItem('mlos-supabase-auth-v1', JSON.stringify({ accessToken: 'jwt-test', refreshToken: 'refresh-test', expiresAt: 2100000000, user: { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.invalid', emailConfirmedAt: '2026-09-29T00:00:00Z' } })));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    let annotation = null;
    const writes = [];
    await page.route('https://iyapppmeieqhflnzslao.supabase.co/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname.split('/functions/v1/study-api')[1];
      const method = request.method();
      const fulfill = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (method !== 'GET') writes.push({ path, method, body: request.postDataJSON() });
      if (path === '/vault/concepts') return fulfill({ catalogVersion: 1, concepts });
      if (path === '/vault/search') return fulfill({ results: [concepts[1]] });
      if (path?.startsWith('/vault/concepts/')) {
        const concept = concepts.find(item => item.conceptId === decodeURIComponent(path.split('/').at(-1)));
        return fulfill({ concept, canonicalNote: concept.conceptId === conceptId ? { noteVersionId, version: 1, title: 'A place to connect your knowledge', bodyMarkdown: 'Synthetic interface fixture — no clinical teaching.\n\nThe published note stays visible while personal notes and private corrections occupy their own sections.\n\nLiteral text: <script>window.fixtureInjected = true</script>', contentSha256: 'e'.repeat(64) } : null, annotations: concept.conceptId === conceptId && annotation ? [annotation] : [] });
      }
      if (path === '/vault/annotations' && method === 'POST') {
        const body = request.postDataJSON();
        annotation = { ...body, annotationId, annotationKind: 'note', revision: 1, anchorState: 'current' };
        return fulfill(annotation);
      }
      if (path === '/vault/annotations/' + annotationId && method === 'PATCH') {
        const body = request.postDataJSON();
        annotation = { ...annotation, bodyMarkdown: body.bodyMarkdown, revision: 2 };
        return fulfill(annotation);
      }
      if (path === '/vault/annotations/' + annotationId && method === 'DELETE') { annotation = null; return fulfill({ deleted: true }); }
      return fulfill({ error: 'unexpected_fixture_route' }, 404);
    });
    await page.goto(origin + '/web/vault.html?concept=' + encodeURIComponent(conceptId) + '&returnSession=vault-fixture&from=study-now&reason=due-revision');
    await page.getByRole('heading', { name: 'Connecting a concept', exact: true }).waitFor();
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('#vault-concept-browser').getAttribute('open') !== null, width > 800);
    assert.equal(await page.locator('.personal-correction-composer').getAttribute('open'), null);
    assert.equal(await page.evaluate(() => window.fixtureInjected), undefined);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name + ' overflow');
    assert.equal(await page.locator('#reviewed-note').evaluate(el => el.getBoundingClientRect().top < innerHeight), true, name + ' reviewed note starts in viewport');
    await page.getByRole('link', { name: 'My notes (0)', exact: true }).click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'my-notes-title');
    await page.getByRole('link', { name: 'My corrections (0)', exact: true }).click();
    await page.locator('.personal-correction-composer > summary').click();
    await page.getByLabel('My correction', { exact: true }).waitFor();
    await page.locator('.personal-correction-composer > summary').click();
    await page.getByRole('link', { name: 'Reviewed note', exact: true }).click();
    await page.locator('.vault-provenance > summary').click();
    await page.locator('.vault-entry-context > summary').click();
    assert.deepEqual(writes, [], 'reading, navigation and disclosures are read-only');
    await page.locator('.vault-provenance > summary').click();
    await page.locator('.vault-entry-context > summary').click();
    await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: process.env.SCREENSHOT_DIR + '/ux-vault-' + name + '.png', fullPage: true, animations: 'disabled' });
    await page.getByLabel('Add a personal note').fill('Private fixture <b>literal</b>');
    await page.getByRole('button', { name: 'Save note', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Personal note saved.' }).waitFor();
    await page.getByLabel('Your note', { exact: true }).waitFor();
    assert.equal(writes[0].body.conceptId, conceptId);
    assert.equal(writes[0].body.anchorNoteVersionId, noteVersionId);
    await page.reload();
    assert.equal(await page.getByLabel('Your note', { exact: true }).inputValue(), 'Private fixture <b>literal</b>');
    await page.getByLabel('Your note', { exact: true }).fill('Updated fixture');
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Personal note updated.' }).waitFor();
    await page.getByText('Revision 2', { exact: true }).waitFor();
    assert.equal(writes[1].body.expectedRevision, 1);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Personal note deleted.' }).waitFor();
    if (width <= 800) await page.locator('#vault-concept-browser > summary').click();
    await page.getByLabel('Search NeuralVault').fill('empty');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByRole('button', { name: 'Unpublished concept fixture', exact: false }).click();
    await page.getByRole('heading', { name: 'No reviewed canonical note is published yet.' }).waitFor();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'concept-title');
    assert.equal(new URL(page.url()).searchParams.get('concept'), alternateId);
    assert.equal(new URL(await page.getByRole('link', { name: 'Return to study' }).getAttribute('href'), origin).searchParams.get('resume'), 'vault-fixture');
    assert.equal(await page.locator('.vault-entry-context').count(), 0, 'handoff context belongs to original concept');
    await page.reload();
    await page.getByRole('heading', { name: 'Unpublished concept fixture', exact: true }).waitFor();
    assert.equal(await page.locator('.personal-correction-composer').count(), 0);
    assert.deepEqual(writes.map(({ method }) => method), ['POST', 'PATCH', 'DELETE']);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('Responsive canonical-first Vault, read-only section navigation, concept search/reload, escaped content and note persistence passed');
} finally { await browser.close(); }
