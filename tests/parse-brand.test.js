import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PRODUCT_BRAND, BRAND_GLYPH } from '../web/brand.js';
import { navigationMarkup } from '../web/navigation-view.js';
import { publicFiles } from '../scripts/public-surface.js';

const file = path => readFile(new URL('../' + path, import.meta.url), 'utf8');
const publicPages = [
  'index', 'account', 'medical', 'library', 'exam', 'vault',
  'retention', 'retention-origin', 'content-import', 'workspace',
  'review', 'admin', 'oauth-consent'
];

test('candidate brand is canonical and not represented as legally cleared', () => {
  assert.equal(PRODUCT_BRAND.name, 'PARSE');
  assert.equal(PRODUCT_BRAND.descriptor, 'The Medical Learning OS');
  assert.equal(PRODUCT_BRAND.clearanceStatus, 'pending');
  assert.match(BRAND_GLYPH, /<svg\b/);
  assert.match(BRAND_GLYPH, /aria-hidden="true"/);
});

test('every entry page has PARSE browser identity without changing the original routes', async () => {
  for (const slug of publicPages) {
    const html = await file('web/' + slug + '.html');
    assert.match(html, /<title>[^<]*PARSE[^<]*<\/title>/, slug);
    assert.match(html, /href="\/web\/favicon\.svg"/, slug);
    assert.doesNotMatch(html, /<title>[^<]*Medical Learning OS[^<]*<\/title>/, slug);
  }
  const home = await file('web/index.html');
  assert.match(home, /PARSE \| The Medical Learning OS/);
  assert.match(home, /PARSE: The Medical Learning OS/);
});

test('common navigation displays PARSE with an accessible home name', () => {
  const rendered = navigationMarkup();
  assert.match(rendered, /aria-label="PARSE Home"/);
  assert.match(rendered, /<strong class="mlos-brand-full">PARSE<\/strong>/);
  assert.match(rendered, /The Medical Learning OS/);
  assert.doesNotMatch(rendered, />m\.<\/span>/);
  assert.match(rendered, /aria-label="Main navigation"/);
});

test('new presentation module is in the explicit production allowlist', async () => {
  assert.ok(publicFiles.includes('web/brand.js'));
  const landing = await file('web/account-landing.js');
  assert.match(landing, /import \{ PRODUCT_BRAND, BRAND_GLYPH \} from '\.\/brand\.js'/);
  assert.match(landing, /account-brand-lockup/);
  assert.match(landing, /\$\{BRAND_GLYPH\}/);
});

test('both approved palettes and established persistence namespace survive branding', async () => {
  const css = await file('web/navigation.css');
  assert.match(css, /sage_precision/);
  assert.match(css, /lavender_precision/);
  assert.match(css, /--bg:#FAFAF7/);
  assert.match(css, /--bg:#DBD8E9/);
  assert.match(css, /--brand-accent/);
  const home = await file('web/app.js');
  assert.match(home, /mlos-study-duration-v1/);
  const shell = await file('web/navigation.js');
  assert.match(shell, /mlosNavigationAdmin/);
});
