import assert from 'node:assert/strict';
import test from 'node:test';
import worker, { checkDatabase } from '../ops/cloudflare-heartbeat/worker.js';

test('Cron checks the dedicated catalog through a server-only credential', async () => {
  const key = 'sb_secret_test_only';
  let calls = 0;
  const request = async (url, options) => {
    calls++;
    assert.equal(url, 'https://iyapppmeieqhflnzslao.supabase.co/rest/v1/study_catalog?select=version&limit=1');
    assert.equal(options.headers.apikey, key);
    assert.equal(options.headers.Authorization, undefined);
    return new Response('[{"version":0}]', { status: 200 });
  };
  assert.equal(await checkDatabase({ MLOS_SUPABASE_SECRET_KEY: key }, request), 0);
  assert.equal(calls, 1);
  assert.equal((await worker.fetch()).status, 404);
});

test('Heartbeat fails closed on missing credentials, bad HTTP or malformed replies', async () => {
  await assert.rejects(checkDatabase({}, () => { throw new Error('must not call'); }), /secret is missing/);
  await assert.rejects(checkDatabase({ MLOS_SUPABASE_SECRET_KEY: 'sb_publishable_wrong' }, () => { throw new Error('must not call'); }), /secret is missing/);
  await assert.rejects(checkDatabase({ MLOS_SUPABASE_SECRET_KEY: 'sb_secret_test' }, async () => new Response('', { status: 503 })), /HTTP 503/);
  await assert.rejects(checkDatabase({ MLOS_SUPABASE_SECRET_KEY: 'sb_secret_test' }, async () => new Response('[]')), /invalid catalog version/);
});
