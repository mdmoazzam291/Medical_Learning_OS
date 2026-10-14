import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicFileSet } from '../scripts/public-surface.js';
import { routeIdentity } from '../src/domain/app-navigation.js';
import { accountMarkup } from '../web/navigation-view.js';
const read = p => readFile(new URL('../' + p, import.meta.url), 'utf8');
test('proposed plan page is reachable from the account menu but not a sixth master nav destination', async () => {
  const nav = accountMarkup({ signedIn: false });
  assert.match(nav, /href="\/web\/plans\.html"/);
  assert.deepEqual(routeIdentity('/web/plans.html'), { master: 'account', section: 'overview' });
  assert.equal(publicFileSet.has('web/plans.html'), true);
  assert.equal(publicFileSet.has('web/plans.css'), true);
  assert.equal(publicFileSet.has('web/plans.js'), true);
  assert.equal(publicFileSet.has('src/domain/consumer-entitlements.js'), true);
});
test('plan comparison remains preview-only and does not expose payment actions', async () => {
  const html = await read('web/plans.html');
  const js = await read('web/plans.js');
  assert.match(html, /Preview only/);
  assert.match(html, /Checkout and recurring payments are disabled/);
  assert.match(html, /type="button" disabled/);
  assert.match(html, /\/web\/navigation\.js/);
  assert.doesNotMatch(html + js, /checkout\.js|api\.razorpay|razorpay_key|fetch\(|processPayment/);
});
test('plan cards use permanent palette tokens and do not force glass onto reading surfaces', async () => {
  const css = await read('web/plans.css');
  assert.match(css, /var\(--hero\)/);
  assert.match(css, /var\(--surface\)/);
  assert.match(css, /var\(--card/);
  assert.doesNotMatch(css, /backdrop-filter|#[a-f0-9]{6}/i);
  assert.match(css, /@media\(max-width:700px\)/);
});
