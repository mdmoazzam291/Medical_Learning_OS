import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_URL || 'playwright');
const browser = await chromium.launch({ headless: true });
const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:3000';
const errors = [];
try {
  for (const [name, width, height] of [['phone', 390, 844], ['tablet', 820, 1180], ['desktop', 1440, 1000]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    await context.addInitScript(() => localStorage.setItem('mlos-supabase-auth-v1', JSON.stringify({ accessToken: 'jwt-test', refreshToken: 'refresh-test', expiresAt: 2100000000, user: { id: 'fixture-learner', email: 'fixture@example.invalid' } })));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const concepts = ['alpha', 'beta'].map(id => ({ conceptId: id, label: 'Fixture ' + id, subjectTags: [], annotationCount: 0 }));
    let annotation = { annotationId: 'draft-note', annotationKind: 'note', revision: 1, bodyMarkdown: 'Saved original', anchorState: 'current' };
    let rejectCreate = true;
    let rejectUpdate = true;
    const writes = [];
    await page.route('https://iyapppmeieqhflnzslao.supabase.co/**', async route => {
      const req = route.request();
      const path = new URL(req.url()).pathname.split('/functions/v1/study-api')[1];
      const fulfill = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
      if (req.method() !== 'GET') writes.push({ path, body: req.postDataJSON() });
      if (path === '/vault/concepts') return fulfill({ concepts, catalogVersion: 1 });
      if (path === '/vault/search') return fulfill({ results: concepts });
      if (path?.startsWith('/vault/concepts/')) return fulfill({ concept: concepts.find(c => c.conceptId === path.split('/').at(-1)), canonicalNote: { noteVersionId: 'note-v1', title: 'Synthetic reading fixture', bodyMarkdown: 'No clinical content.', contentSha256: 'a'.repeat(64), version: 1 }, annotations: path.endsWith('/alpha') && annotation ? [annotation] : [] });
      if (path === '/vault/annotations' && req.method() === 'POST') return rejectCreate ? fulfill({ error: 'unavailable' }, 503) : fulfill({ saved: true });
      if (path === '/vault/annotations/draft-note' && req.method() === 'PATCH') {
        if (rejectUpdate) return fulfill({ error: 'neural_annotation_revision_conflict' }, 409);
        assert.equal(req.postDataJSON().expectedRevision, annotation.revision);
        annotation = { ...annotation, bodyMarkdown: req.postDataJSON().bodyMarkdown, revision: annotation.revision + 1 };
        return fulfill(annotation);
      }
      if (path === '/vault/corrections' || path === '/content-reports') return fulfill({ error: 'unavailable' }, 503);
      return fulfill({ error: 'unexpected_fixture_route' }, 404);
    });
    await page.goto(origin + '/web/vault.html?concept=alpha');
    await page.getByLabel('Add a personal note').fill('Draft <script>literal text</script>');
    await page.getByLabel('Your note', { exact: true }).fill('My pending edit');
    assert.equal(writes.length, 0);
    // Search redraw and clearing search cannot erase either form.
    if (width <= 800) await page.locator('#vault-concept-browser > summary').click();
    await page.getByLabel('Search NeuralVault').fill('fixture');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByRole('button', { name: 'Clear', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Add a personal note').inputValue(), 'Draft <script>literal text</script>');
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    // Drafts belong to one concept, and navigation itself writes nothing.
    await page.getByRole('button', { name: 'Fixture beta', exact: false }).click();
    await page.getByRole('heading', { name: 'Fixture beta', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Add a personal note').inputValue(), '');
    assert.match(await page.locator('[data-vault-draft-count]').innerText(), /2 unsaved drafts/);
    if (width <= 800) await page.locator('#vault-concept-browser > summary').click();
    await page.getByRole('button', { name: 'Fixture alpha', exact: false }).click();
    await page.getByRole('heading', { name: 'Fixture alpha', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Your note', { exact: true }).inputValue(), 'My pending edit');
    assert.equal(writes.length, 0);
    // A failed save preserves typed text and the other form's draft.
    await page.getByRole('button', { name: 'Save note', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Note was not saved.' }).waitFor();
    await page.getByRole('button', { name: 'Dismiss message', exact: true }).click();
    assert.equal(await page.getByLabel('Add a personal note').inputValue(), 'Draft <script>literal text</script>');
    assert.equal(await page.getByLabel('Your note', { exact: true }).inputValue(), 'My pending edit');
    // A conflict retains the original expected revision; no silent rebase.
    await page.getByRole('button', { name: 'Save changes', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'This note changed elsewhere.' }).waitFor();
    await page.getByRole('button', { name: 'Dismiss message', exact: true }).click();
    assert.equal(writes.at(-1).body.expectedRevision, 1);
    annotation = { ...annotation, revision: 2, bodyMarkdown: 'Saved on another device' };
    if (width <= 800) await page.locator('#vault-concept-browser > summary').click();
    await page.getByRole('button', { name: 'Fixture alpha', exact: false }).click();
    await page.getByText('The saved version changed.', { exact: false }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Save changes', exact: true }).isEnabled(), false);
    assert.equal(await page.getByLabel('Your note', { exact: true }).inputValue(), 'My pending edit');
    const edit = page.locator('form[data-form="update-note"]');
    await edit.getByRole('button', { name: 'Discard this draft', exact: true }).click();
    assert.equal(await page.getByLabel('Your note', { exact: true }).inputValue(), 'Saved on another device');
    assert.equal(await edit.getAttribute('data-revision'), '2');
    assert.equal(writes.length, 2);
    // Saving one form cannot erase a draft in another, or auto-share a correction.
    await page.locator('.personal-correction-composer > summary').click();
    await page.getByLabel('My correction', { exact: true }).fill('Private correction draft');
    rejectCreate = false;
    await page.getByRole('button', { name: 'Save note', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Personal note saved.' }).waitFor();
    await page.getByRole('button', { name: 'Dismiss message', exact: true }).click();
    await page.getByLabel('Add a personal note').waitFor();
    assert.equal(await page.getByLabel('Add a personal note').inputValue(), '');
    assert.equal(await page.getByLabel('My correction', { exact: true }).inputValue(), 'Private correction draft');
    assert.equal(writes.length, 3);
    await page.getByRole('button', { name: 'Save private correction', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Private correction was not saved.' }).waitFor();
    await page.getByRole('button', { name: 'Dismiss message', exact: true }).click();
    assert.equal(await page.getByLabel('My correction', { exact: true }).inputValue(), 'Private correction draft');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.evaluate(() => { document.activeElement.blur(); window.scrollTo(0, 0); });
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: process.env.SCREENSHOT_DIR + '/vault-drafts-' + name + '.png', fullPage: true });
    // Leaving has an unsaved-work guard. Discard clears it without a write.
    const dismissed = page.waitForEvent('dialog').then(dialog => { assert.equal(dialog.type(), 'beforeunload'); return dialog.dismiss(); });
    await page.getByRole('link', { name: '← Home', exact: true }).click({ noWaitAfter: true });
    await dismissed;
    assert.match(page.url(), /vault\.html/);
    await page.locator('form[data-form="create-correction"]').getByRole('button', { name: 'Discard this draft', exact: true }).click();
    assert.equal(await page.locator('[data-vault-draft-count]').isVisible(), false);
    // A removed target must leave a recoverable copy, not an invisible draft.
    await page.getByLabel('Your note', { exact: true }).fill('Recover this orphaned edit');
    annotation = null;
    if (width <= 800) await page.locator('#vault-concept-browser > summary').click();
    await page.getByRole('button', { name: 'Fixture alpha', exact: false }).click();
    await page.getByLabel('Recovered unsaved draft').waitFor();
    assert.equal(await page.getByLabel('Recovered unsaved draft').inputValue(), 'Recover this orphaned edit');
    assert.equal(await page.getByLabel('Add a personal note').inputValue(), '', 'never reanchor silently');
    await page.getByRole('button', { name: 'Discard recovered draft', exact: true }).click();
    await page.reload();
    await page.getByLabel('Add a personal note').waitFor();
    assert.equal(await page.getByLabel('Add a personal note').inputValue(), '');
    assert.equal(writes.length, 4);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('Vault drafts survive redraw, search, concept switching and failed writes; conflicts, explicit discard and exit guard pass at all three widths');
} finally { await browser.close(); }
