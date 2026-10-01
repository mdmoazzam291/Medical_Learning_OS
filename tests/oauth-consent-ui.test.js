import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { publicFileSet } from '../scripts/public-surface.js';

const read = path => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('server exposes the configured OAuth consent path from the explicit public allow-list', async () => {
  const source = await read('scripts/serve.js');
  assert.equal(publicFileSet.has('web/oauth-consent.html'), true);
  assert.equal(publicFileSet.has('web/oauth-consent.js'), true);
  assert.match(source, /pathname === '\/oauth\/consent'/);
  assert.match(source, /\? 'web\/oauth-consent\.html'/);
  assert.match(source, /publicFileSet\.has\(path\)/);
});

test('consent UI preserves only a short-lived same-origin authorization return across sign-in', async () => {
  const consent = await read('web/oauth-consent.js');
  const account = await read('web/account.js');
  assert.match(consent, /mlos-oauth-consent-return-v1/);
  assert.match(consent, /10 \* 60 \* 1000/);
  assert.match(consent, /authorization_id=/);
  assert.match(consent, /sessionStorage\.setItem/);
  assert.match(account, /OAUTH_RETURN_MAX_AGE_MS = 10 \* 60 \* 1000/);
  assert.match(account, /target\.origin !== window\.location\.origin/);
  assert.match(account, /target\.pathname !== '\/oauth\/consent'/);
  assert.match(account, /sessionStorage\.removeItem\(OAUTH_RETURN_KEY\)/);
});

test('consent UI shows requested scopes and uses explicit approve or deny actions', async () => {
  const source = await read('web/oauth-consent.js');
  assert.match(source, /oauthAuthorizationDetails/);
  assert.match(source, /oauthAuthorizationDecision/);
  assert.match(source, /\['approve', 'deny'\]/);
  assert.match(source, /data-scope/);
  assert.match(source, /Connecting does not grant admin powers by itself/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|sb_secret_[A-Za-z0-9_-]+/);
  assert.doesNotMatch(source, /client_secret\s*[:=]/i);
});

test('consent page ships no third-party runtime script or embedded secret', async () => {
  const html = await read('web/oauth-consent.html');
  assert.match(html, /\/web\/oauth-consent\.js/);
  assert.doesNotMatch(html, /https:\/\/[^"']+\.js/i);
  assert.doesNotMatch(html, /sb_secret_|service_role|client_secret/i);
});

test('admin MCP advertises email-only OAuth scope and no OIDC dependency', async () => {
  const source = await read('src/server/admin-mcp.js');
  assert.match(source, /scopes: \['email'\]/);
  assert.match(source, /scopes_supported: \['email'\]/);
  assert.match(source, /scope="email"/);
  assert.doesNotMatch(source, /scope="openid/);
});
