import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildPages } from '../scripts/build-pages.js';
import { publicFileSet } from '../scripts/public-surface.js';

const pages = ['terms', 'privacy', 'refunds', 'contact', 'services', 'delivery'];

test('public policy bundle provides readable unauthenticated pages without private drafts', async () => {
  for (const name of pages) assert.ok(publicFileSet.has(`web/${name}.html`), `${name} must be public`);
  const output = await mkdtemp(join(tmpdir(), 'medretica-policies-'));
  try {
    await buildPages({ outputDirectory: output });
    for (const name of pages) {
      const html = await readFile(join(output, `web/${name}.html`), 'utf8');
      assert.match(html, /<main\b/);
      assert.match(html, /<h1\b/);
      assert.match(html, /Medretica/);
      assert.deepEqual([...html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)].map(x => x[0]), ['<script type="module" src="/web/navigation.js"></script>']);
      assert.doesNotMatch(html, /<form\b|OWNER INPUT|PLACEHOLDER|TODO|waiting for approval/i);
      for (const match of html.matchAll(/(?:href|src)="(\/[^"#]*)(?:#[^"]*)?"/g)) {
        const pathname = new URL(match[1], 'https://medretica.invalid').pathname;
        const path = pathname === '/' ? 'index.html' : pathname.slice(1);
        await assert.doesNotReject(readFile(join(output, path)), `${name} link must resolve: ${path}`);
      }
    }
    const refund = await readFile(join(output, 'web/refunds.html'), 'utf8');
    assert.match(refund, /do not currently accept payments/i);
    assert.doesNotMatch(refund, /7 calendar days|5 business days|no refunds allowed/i);
    const contact = await readFile(join(output, 'web/contact.html'), 'utf8');
    assert.match(contact, /Md Moazzam/);
    assert.match(contact, /sole proprietor/);
    assert.match(contact, /845454/);
    assert.match(contact, /mailto:support@medretica\.com/);
    assert.doesNotMatch(contact, /tel:/);
    const terms = await readFile(join(output, 'web/terms.html'), 'utf8');
    assert.match(terms, /prospectively/i);
    assert.match(terms, /material changes/i);
    assert.equal(publicFileSet.has('docs/merchant-policy-drafts/future-refund-proposal.md'), false);
  } finally { await rm(output, { recursive: true, force: true }); }
});

test('home, account and plans expose policy links outside dynamically replaced app content', async () => {
  for (const page of ['index', 'account', 'plans']) {
    const html = await readFile(new URL(`../web/${page}.html`, import.meta.url), 'utf8');
    const footer = html.match(/<footer\b[^>]*\bdata-public-policies\b[^>]*>([\s\S]*?)<\/footer>/)?.[1];
    assert.ok(footer, `${page} needs a persistent public footer`);
    for (const name of pages) assert.ok(footer.includes(`/web/${name}.html`), `${page} links ${name}`);
    if (page !== 'plans') {
      const appId = page === 'index' ? 'app' : 'account-app';
      assert.ok(html.indexOf('data-public-policies') > html.indexOf(`id="${appId}"`));
    }
  }
});
