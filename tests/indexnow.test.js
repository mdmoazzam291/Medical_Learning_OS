import test from 'node:test';
import assert from 'node:assert/strict';
import { submitIndexNow } from '../scripts/indexnow-submit.js';

test('IndexNow verifies live key and deployed homepage before sending one fixed public URL', async () => {
  const calls = [];
  const key = '0123456789abcdef0123456789abcdef';
  const result = await submitIndexNow({ key, expectedHomepage: 'homepage', fetchImpl: async (url, options) => {
    calls.push([url, options]);
    if (url.endsWith('.txt')) return new Response(key);
    if (url === 'https://medretica.com/') return new Response('homepage');
    return new Response(null, { status: 202 });
  }});
  assert.equal(result, 202);
  assert.equal(calls.length, 3);
  assert.equal(calls[2][0], 'https://api.indexnow.org/indexnow');
  assert.deepEqual(JSON.parse(calls[2][1].body).urlList, ['https://medretica.com/']);
});

test('IndexNow does not submit with a wrong key, old deployment or fetch failure', async () => {
  for (const scenario of ['wrong-key', 'old-homepage', 'forbidden']) {
    let submitted = false;
    await assert.rejects(submitIndexNow({ key: '0123456789abcdef0123456789abcdef', expectedHomepage: 'new', fetchImpl: async url => {
      if (url.includes('api.indexnow.org')) { submitted = true; return new Response(); }
      if (scenario === 'forbidden') return new Response('blocked', { status: 403 });
      return new Response(url.endsWith('.txt') ? (scenario === 'wrong-key' ? 'wrong' : '0123456789abcdef0123456789abcdef') : 'old');
    }}));
    assert.equal(submitted, false);
  }
});

test('IndexNow reports submission rejection and validates key before fetching', async () => {
  await assert.rejects(submitIndexNow({key: 'invalid', expectedHomepage: '', fetchImpl: () => {throw Error('must not fetch');}}), /invalid_key/);
  await assert.rejects(submitIndexNow({key: '0123456789abcdef0123456789abcdef', expectedHomepage: 'home', fetchImpl: async url => new Response(url.endsWith('.txt') ? '0123456789abcdef0123456789abcdef' : 'home', {status: url.includes('api.indexnow.org') ? 422 : 200})}), /submission_http_422/);
});

test('IndexNow public verification file is in the deployed asset allowlist', async () => {
  const { INDEXNOW_KEY } = await import('../scripts/indexnow-submit.js');
  const { publicFileSet } = await import('../scripts/public-surface.js');
  const { readFile } = await import('node:fs/promises');
  assert.equal(publicFileSet.has(`${INDEXNOW_KEY}.txt`), true);
  assert.equal((await readFile(new URL(`../${INDEXNOW_KEY}.txt`, import.meta.url), 'utf8')).trim(), INDEXNOW_KEY);
});
