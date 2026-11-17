import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const accountSource = await readFile(new URL('../web/account.js', import.meta.url), 'utf8');

test('Google sign-in callback follows the current deployed origin', () => {
  assert.match(
    accountSource,
    /const redirectTo = new URL\('\/web\/account\.html', window\.location\.origin\)\.href;/
  );
  assert.match(
    accountSource,
    /auth\.oauthAuthorizeUrl\('google', \{ redirectTo \}\)/
  );
  assert.doesNotMatch(
    accountSource,
    /(?:redirectTo|redirect_to|redirectUri|redirect_uri)\s*[:=]\s*['"`]https?:\/\/localhost(?::\d+)?/i,
    'Google sign-in must not hardcode localhost as its callback'
  );
});

test('Google sign-in callback retains the account route, not the app root', () => {
  assert.match(
    accountSource,
    /new URL\('\/web\/account\.html', window\.location\.origin\)/
  );
});
