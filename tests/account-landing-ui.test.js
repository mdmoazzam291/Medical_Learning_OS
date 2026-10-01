import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

test('signed-out landing communicates the canonical learner product', () => {
  assert.match(landing, /Your intelligent preparation/);
  assert.match(landing, /command center/);
  assert.match(landing, /Study Now/);
  assert.match(landing, /QBank/);
  assert.match(landing, /Exams/);
  assert.match(landing, /NeuralVault/);
  assert.match(landing, /Progress/);
  assert.match(landing, /Continue Learning/);
  assert.match(landing, /Due for Revision/);
  assert.match(landing, /Weak Areas/);
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
  assert.doesNotMatch(landing, /approve|publish|reviewKinds|isAdmin/);
  assert.match(styles, /account-landing-grid/);
  assert.match(styles, /@media\(max-width:760px\)/);
  assert.match(styles, /@media\(max-width:480px\)/);
});
