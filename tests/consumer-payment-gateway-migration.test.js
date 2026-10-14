import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { publicFileSet } from '../scripts/public-surface.js';
import { CONSUMER_PAYMENT_PROVIDER_POLICY } from '../src/domain/consumer-payment-providers.js';

test('retired Razorpay adapter, suite and document are absent from active tree', async () => {
  for (const path of [
    'src/adapters/razorpay-test.js',
    'tests/razorpay-test.test.js',
    'docs/RAZORPAY_SANDBOX_PREPARATION.md'
  ]) {
    await assert.rejects(access(new URL('../' + path, import.meta.url)), { code: 'ENOENT' });
  }
});
test('Cashfree test adapter never enters learner Pages bundle', async () => {
  for (const path of [
    'src/adapters/cashfree-test.js',
    'src/domain/consumer-payment-providers.js',
    'docs/CONSUMER_PAYMENT_GATEWAY.md'
  ]) assert.equal(publicFileSet.has(path), false);
  assert.equal(CONSUMER_PAYMENT_PROVIDER_POLICY.primary, 'cashfree');
  assert.equal(CONSUMER_PAYMENT_PROVIDER_POLICY.alternative, 'phonepe');
  assert.equal(CONSUMER_PAYMENT_PROVIDER_POLICY.productionCheckoutEnabled, false);
  assert.equal(CONSUMER_PAYMENT_PROVIDER_POLICY.recurringBillingEnabled, false);
});
test('existing consumer plan UI remains deliberately non-charging', async () => {
  const html = await readFile(new URL('../web/plans.html', import.meta.url), 'utf8');
  assert.match(html, /Checkout and recurring payments are disabled/);
  assert.match(html, /type="button" disabled/);
  assert.doesNotMatch(html, /sdk\.cashfree\.com|phonepe\.com\/checkout/i);
});
