import test from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseAuth, AuthError } from '../src/adapters/supabase-auth.js';

function memoryStorage() {
  const map = new Map();
  return {
    getItem: key => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
    dump: () => [...map.entries()]
  };
}
const projectUrl = 'https://example-ref.supabase.co';
const publishableKey = 'sb_publishable_test';

test('sign in stores only normalized session and refreshes near expiry', async () => {
  const storage = memoryStorage();
  const calls = [];
  const fetchFn = async (url, options) => {
    calls.push({ url, options });
    if (url.includes('grant_type=password')) {
      return Response.json({
        access_token: 'access-1', refresh_token: 'refresh-1', expires_at: 1001,
        user: { id: 'u1', email: 'learner@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' }
      });
    }
    if (url.includes('grant_type=refresh_token')) {
      return Response.json({
        access_token: 'access-2', refresh_token: 'refresh-2', expires_at: 2000,
        user: { id: 'u1', email: 'learner@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' }
      });
    }
    throw new Error('unexpected request');
  };
  const auth = createSupabaseAuth({ projectUrl, publishableKey, storage, fetchFn, now: () => 1_000_000 });
  const session = await auth.signIn('LEARNER@example.com', 'strong-password');
  assert.equal(session.accessToken, 'access-1');
  assert.equal(auth.currentUser().email, 'learner@example.com');
  const persisted = storage.dump()[0][1];
  assert.doesNotMatch(persisted, /strong-password/);
  const refreshed = await auth.getSession();
  assert.equal(refreshed.accessToken, 'access-2');
  assert.equal(calls.length, 2);
  assert.match(calls[1].url, /grant_type=refresh_token/);
});

test('signup can stop at confirmation without inventing a session', async () => {
  const storage = memoryStorage();
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage,
    fetchFn: async () => Response.json({ user: { id: 'new-user', email: 'new@example.com' }, session: null })
  });
  const result = await auth.signUp('new@example.com', 'strong-password');
  assert.equal(result.confirmationRequired, true);
  assert.equal(result.session, null);
  assert.equal(storage.dump().length, 0);
});

test('sign out clears local session even if remote logout fails', async () => {
  const storage = memoryStorage();
  let count = 0;
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage,
    fetchFn: async url => {
      count += 1;
      if (url.includes('grant_type=password')) return Response.json({
        access_token: 'access', refresh_token: 'refresh', expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'u1', email: 'x@example.com' }
      });
      return new Response(JSON.stringify({ error: 'networkish' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
  });
  await auth.signIn('x@example.com', 'strong-password');
  await assert.rejects(auth.signOut(), AuthError);
  assert.equal(auth.currentUser(), null);
  assert.equal(count, 2);
});

test('invalid credentials are rejected before network use', async () => {
  let calls = 0;
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage: memoryStorage(),
    fetchFn: async () => { calls += 1; return Response.json({}); }
  });
  await assert.rejects(auth.signIn('bad', 'short'), error => error.code === 'invalid_email');
  assert.equal(calls, 0);
});
