import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSupabaseIdentity } from '../src/server/supabase-identity.js';
import { StudyService } from '../src/server/study-service.js';
import { createStudyApi } from '../src/server/http-api.js';

const url = 'https://iyapppmeieqhflnzslao.supabase.co';
const key = 'sb_publishable_test_only';
const one = '761eb19b-70b8-49ed-abd5-a5c33bd43d6b';
const two = '6198ff2e-9c09-4489-8b1c-265a1fb89b2a';

test('account identity uses the verified Auth response rather than untrusted token claims', async () => {
  const seen = [];
  const identity = createSupabaseIdentity({ url, publishableKey: key,
    client: { auth: { getUser: async token => { seen.push(token); return { data: { user: { id: one } }, error: null }; } } } });
  assert.equal(await identity('valid-auth-token-of-sufficient-length'), one);
  assert.deepEqual(seen, ['valid-auth-token-of-sufficient-length']);
  await assert.rejects(identity('short'), { status: 401 });
  await assert.rejects(createSupabaseIdentity({ url, publishableKey: key,
    client: { auth: { getUser: async () => ({ data: { user: { id: 'not-a-uuid' } }, error: null }) } } })('another-long-auth-token-value'),
  { status: 401 });
  await assert.rejects(createSupabaseIdentity({ url, publishableKey: key,
    client: { auth: { getUser: async () => { throw new Error('network'); } } } })('another-long-auth-token-value'),
  { status: 503 });
});

test('HTTP account requests are isolated by verified user ID', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'mlos-account-test-'));
  const service = new StudyService(join(directory, 'study.sqlite'));
  const authenticate = createSupabaseIdentity({ url, publishableKey: key,
    client: { auth: { getUser: async token => token === 'token-for-account-one-long'
      ? { data: { user: { id: one } }, error: null }
      : token === 'token-for-account-two-long'
        ? { data: { user: { id: two } }, error: null }
        : { data: { user: null }, error: { message: 'invalid' } } } } });
  const server = createStudyApi(service, { authenticate });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); service.close(); rmSync(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  service.bookmark(one, { questionVersionId: 'concept@1', bookmarked: false });
  const request = token => fetch(base + '/api/export', { headers: { Authorization: `Bearer ${token}` } });
  assert.equal((await request('invalid-account-token-long')).status, 401);
  const first = await (await request('token-for-account-one-long')).json();
  const second = await (await request('token-for-account-two-long')).json();
  assert.equal(first.learnerId, one);
  assert.equal(second.learnerId, two);
  assert.notEqual(first.learnerId, second.learnerId);
});
