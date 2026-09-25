import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseAuth } from '../src/adapters/supabase-auth.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key)
  };
}

test('sign-in uses only the publishable browser credential and persists session', async () => {
  let observed;
  const auth = createSupabaseAuth({
    projectUrl: 'https://iyapppmeieqhflnzslao.supabase.co',
    publishableKey: 'sb_publishable_test',
    storage: memoryStorage(),
    fetchFn: async (url, init) => {
      observed = { url, init };
      return {
        ok: true,
        json: async () => ({
          access_token: 'jwt',
          refresh_token: 'refresh',
          expires_in: 3600,
          user: { id: '11111111-1111-4111-8111-111111111111', email: 'learner@example.test' }
        })
      };
    }
  });
  const session = await auth.signIn('Learner@example.test', 'correct horse battery staple');
  assert.equal(session.user.id, '11111111-1111-4111-8111-111111111111');
  assert.match(observed.url, /\/auth\/v1\/token\?grant_type=password$/);
  assert.equal(observed.init.headers.apikey, 'sb_publishable_test');
  assert.equal(observed.init.headers.Authorization, undefined);
  assert.equal((await auth.getSession()).accessToken, 'jwt');
});

test('expired session refreshes and replaces the access token', async () => {
  const storage = memoryStorage();
  let calls = 0;
  const auth = createSupabaseAuth({
    projectUrl: 'https://iyapppmeieqhflnzslao.supabase.co',
    publishableKey: 'sb_publishable_test',
    storage,
    now: () => 2_000_000,
    fetchFn: async (url) => {
      calls += 1;
      if (url.includes('grant_type=password')) return {
        ok: true,
        json: async () => ({ access_token: 'old', refresh_token: 'r1', expires_at: 1, user: { id: 'u1' } })
      };
      return {
        ok: true,
        json: async () => ({ access_token: 'new', refresh_token: 'r2', expires_in: 3600, user: { id: 'u1' } })
      };
    }
  });
  await auth.signIn('learner@example.test', '12345678');
  const session = await auth.getSession();
  assert.equal(session.accessToken, 'new');
  assert.equal(calls, 2);
});

test('signup without session reports email confirmation required', async () => {
  const auth = createSupabaseAuth({
    projectUrl: 'https://iyapppmeieqhflnzslao.supabase.co',
    publishableKey: 'sb_publishable_test',
    storage: memoryStorage(),
    fetchFn: async () => ({ ok: true, json: async () => ({ user: { id: 'u1' } }) })
  });
  const result = await auth.signUp('learner@example.test', '12345678');
  assert.equal(result.confirmationRequired, true);
  assert.equal(result.session, null);
});
