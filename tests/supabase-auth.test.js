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
  let observedUrl;
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage,
    fetchFn: async url => { observedUrl = url; return Response.json({ user: { id: 'new-user', email: 'new@example.com' }, session: null }); }
  });
  const result = await auth.signUp('new@example.com', 'strong-password', { emailRedirectTo: 'https://preview.example.com/web/account.html' });
  assert.equal(result.confirmationRequired, true);
  assert.equal(result.session, null);
  assert.equal(storage.dump().length, 0);
  assert.match(observedUrl, /\/auth\/v1\/signup\?redirect_to=https%3A%2F%2Fpreview\.example\.com%2Fweb%2Faccount\.html$/);
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


test('implicit confirmation callback verifies user before persisting session', async () => {
  const storage = memoryStorage();
  const calls = [];
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage,
    fetchFn: async (url, options) => {
      calls.push({ url, options });
      assert.match(url, /\/auth\/v1\/user$/);
      assert.equal(options.method, 'GET');
      assert.equal(options.headers.Authorization, 'Bearer callback-access');
      return Response.json({ id: 'confirmed-user', email: 'confirmed@example.com', email_confirmed_at: '2026-09-26T00:00:00Z' });
    }
  });
  const result = await auth.consumeImplicitRedirect('http://127.0.0.1:3000/#access_token=callback-access&refresh_token=callback-refresh&expires_in=3600&type=signup');
  assert.equal(result.handled, true);
  assert.equal(result.session.user.id, 'confirmed-user');
  assert.equal(auth.currentUser().email, 'confirmed@example.com');
  assert.equal(calls.length, 1);
  assert.doesNotMatch(storage.dump()[0][1], /password/);
});

test('implicit callback errors are rejected without creating a session', async () => {
  const storage = memoryStorage();
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage,
    fetchFn: async () => { throw new Error('network should not be reached'); }
  });
  await assert.rejects(
    auth.consumeImplicitRedirect('http://127.0.0.1:3000/#error=access_denied&error_code=otp_expired&error_description=Expired'),
    error => error instanceof AuthError && error.code === 'otp_expired'
  );
  assert.equal(storage.dump().length, 0);
});

test('ordinary application hashes are not treated as auth callbacks', async () => {
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage: memoryStorage(),
    fetchFn: async () => { throw new Error('network should not be reached'); }
  });
  const result = await auth.consumeImplicitRedirect('http://127.0.0.1:3000/#today');
  assert.equal(result.handled, false);
  assert.equal(result.session, null);
});


test('signup confirmation redirect rejects insecure non-local HTTP origins', async () => {
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage: memoryStorage(),
    fetchFn: async () => { throw new Error('network should not be reached'); }
  });
  await assert.rejects(
    auth.signUp('new@example.com', 'strong-password', { emailRedirectTo: 'http://preview.example.com/web/account.html' }),
    error => error instanceof AuthError && error.code === 'invalid_redirect_url'
  );
});
