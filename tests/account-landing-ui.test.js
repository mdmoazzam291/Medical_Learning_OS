import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { accountMarkup, navigationMarkup } from '../web/navigation-view.js';
import { publicFileSet } from '../scripts/public-surface.js';

const [html, landing, styles, account, serve] = await Promise.all([
  readFile(new URL('../web/account.html', import.meta.url), 'utf8'),
  readFile(new URL('../web/account-landing.js', import.meta.url), 'utf8'),
  readFile(new URL('../web/account-landing.css', import.meta.url), 'utf8'),
  readFile(new URL('../web/account.js', import.meta.url), 'utf8'),
  readFile(new URL('../scripts/serve.js', import.meta.url), 'utf8')
]);

test('account page loads the command-center signed-out presentation without replacing auth runtime', () => {
  assert.match(html, /\/web\/account-landing\.css/);
  assert.match(html, /\/web\/account\.js/);
  assert.match(html, /\/web\/account-landing\.js/);
  assert.match(landing, /data-account-landing-enhanced/);
  assert.match(landing, /MutationObserver/);
});

test('production public-surface contract exposes every account landing asset', () => {
  for (const path of [
    'web/account.html',
    'web/account.js',
    'web/account-landing.css',
    'web/account-landing.js'
  ]) {
    assert.equal(publicFileSet.has(path), true, `${path} must remain public`);
  }
  assert.match(serve, /import \{ publicFileSet \} from '\.\/public-surface\.js';/);
  assert.match(serve, /publicFileSet\.has\(path\)/);
});

test('signed-out account focuses on authentication without a second header or marketing', () => {
  assert.match(landing, /Continue your learning across devices\./);
  assert.doesNotMatch(landing, /<header|account-product-story|account-benefits|account-device-stage|account-nav-actions/);
  assert.match(landing, /New here\? Create account/);
});

test('account header avoids redundant auth links and offers one appearance menu', () => {
  for (const currentHref of ['/web/account.html', '/web/account?mode=create', '/web/account.html?returnTo=%2Fweb%2Fmedical.html']) {
    const markup = accountMarkup({ currentHref });
    assert.doesNotMatch(markup, />Sign in<|>Create account</);
    assert.match(markup, /aria-label="Appearance menu"/);
    for (const phone of [false, true]) {
      const header = navigationMarkup({ master: 'account', currentHref, phone });
      assert.equal((header.match(/data-theme/g) || []).length, 1);
    }
  }
  assert.match(accountMarkup({ currentHref: '/web/medical.html' }), />Sign in</);
});

test('landing preserves every auth hook consumed by account runtime', () => {
  for (const id of ['signin-form', 'recovery-request-form', 'signup-form']) {
    assert.match(landing, new RegExp(`id=\\"${id}\\"`));
    assert.match(account, new RegExp(`form\\.id === '${id}'`));
  }
  assert.match(landing, /oauth-google/);
  assert.match(account, /oauthAuthorizeUrl\('google'/);
});

test('landing remains presentation-only and does not gain auth or learner authority', () => {
  assert.doesNotMatch(landing, /createSupabaseAuth|createCloudStudy|fetch\(|supabase|service[_-]?role/i);
  assert.doesNotMatch(landing, /\b(?:approve|publish)\s*\(|reviewKinds|isAdmin/);
  assert.match(styles, /account-landing-grid/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /@media\(max-width:480px\)/);
});
