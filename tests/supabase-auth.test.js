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

for (const failure of ['network', 429, 503, 'malformed']) {
  test(`refresh preserves persisted session after ${failure} and allows retry`, async () => {
    const storage = memoryStorage();
    let failing = true;
    storage.setItem('mlos-supabase-auth-v1', JSON.stringify({ accessToken: 'old', refreshToken: 'refresh', expiresAt: 1, user: { id: 'u1' } }));
    const auth = createSupabaseAuth({ projectUrl, publishableKey, storage, fetchFn: async () => {
      if (failing) {
        if (failure === 'network') throw new TypeError('Failed to fetch');
        if (failure === 'malformed') return Response.json({});
        return Response.json({ error: 'temporarily_unavailable' }, { status: failure });
      }
      return Response.json({ access_token: 'new', refresh_token: 'rotated', expires_at: 2100000000, user: { id: 'u1' } });
    } });
    await assert.rejects(auth.getSession());
    assert.equal(JSON.parse(storage.getItem('mlos-supabase-auth-v1')).refreshToken, 'refresh');
    failing = false;
    assert.equal((await auth.getSession()).accessToken, 'new');
  });
}

for (const code of ['refresh_token_not_found', 'refresh_token_already_used']) {
  test(`refresh clears permanently invalid ${code}`, async () => {
    const storage = memoryStorage();
    storage.setItem('mlos-supabase-auth-v1', JSON.stringify({ accessToken: 'old', refreshToken: 'refresh', expiresAt: 1, user: { id: 'u1' } }));
    const auth = createSupabaseAuth({ projectUrl, publishableKey, storage, fetchFn: async () => Response.json({ error_code: code }, { status: 400 }) });
    await assert.rejects(auth.getSession(), error => error.code === code);
    assert.equal(auth.currentUser(), null);
  });
}

test('unavailable storage fails sign-in explicitly without inventing a session', async () => {
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  const auth = createSupabaseAuth({ projectUrl, publishableKey, storage, fetchFn: async () => Response.json({ access_token: 'new', refresh_token: 'refresh', user: { id: 'u1' } }) });
  assert.equal(await auth.getSession(), null);
  await assert.rejects(auth.signIn('qa@example.com', 'synthetic-password'), error => error.code === 'auth_storage_unavailable');
  assert.equal(auth.currentUser(), null);
});

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

test('sign out targets only the current Supabase session and clears local state on failure', async () => {
  const storage = memoryStorage();
  let count = 0;
  let logoutUrl = null;
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage,
    fetchFn: async url => {
      count += 1;
      if (url.includes('grant_type=password')) return Response.json({
        access_token: 'access', refresh_token: 'refresh', expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: 'u1', email: 'x@example.com' }
      });
      logoutUrl = url;
      return new Response(JSON.stringify({ error: 'networkish' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
    }
  });
  await auth.signIn('x@example.com', 'strong-password');
  await assert.rejects(auth.signOut(), AuthError);
  assert.equal(auth.currentUser(), null);
  assert.equal(count, 2);
  assert.match(logoutUrl, /\/auth\/v1\/logout\?scope=local$/);
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


test('Google OAuth authorize URL is provider-scoped and binds a safe return URL', () => {
  const auth = createSupabaseAuth({
    projectUrl,
    publishableKey,
    storage: memoryStorage(),
    fetchFn: async () => { throw new Error('network should not be reached'); }
  });
  const href = auth.oauthAuthorizeUrl('google', {
    redirectTo: 'https://preview.example.com/web/account.html'
  });
  const url = new URL(href);
  assert.equal(url.origin, projectUrl);
  assert.equal(url.pathname, '/auth/v1/authorize');
  assert.equal(url.searchParams.get('provider'), 'google');
  assert.equal(url.searchParams.get('redirect_to'), 'https://preview.example.com/web/account.html');
  assert.equal(url.searchParams.has('client_secret'), false);
  assert.equal(url.searchParams.has('access_token'), false);
});

test('Google OAuth allows localhost return but rejects insecure remote redirect', () => {
  const auth = createSupabaseAuth({
    projectUrl,
    publishableKey,
    storage: memoryStorage(),
    fetchFn: async () => { throw new Error('network should not be reached'); }
  });
  assert.match(
    auth.oauthAuthorizeUrl('google', { redirectTo: 'http://127.0.0.1:3000/web/account.html' }),
    /provider=google/
  );
  assert.throws(
    () => auth.oauthAuthorizeUrl('google', { redirectTo: 'http://preview.example.com/web/account.html' }),
    error => error instanceof AuthError && error.code === 'invalid_redirect_url'
  );
});

test('OAuth adapter rejects unapproved providers instead of becoming an open provider launcher', () => {
  const auth = createSupabaseAuth({
    projectUrl,
    publishableKey,
    storage: memoryStorage(),
    fetchFn: async () => { throw new Error('network should not be reached'); }
  });
  assert.throws(
    () => auth.oauthAuthorizeUrl('github', { redirectTo: 'https://preview.example.com/web/account.html' }),
    error => error instanceof AuthError && error.code === 'unsupported_oauth_provider'
  );
});


test('normalized auth user preserves linked sign-in providers without storing provider secrets', async () => {
  const storage = memoryStorage();
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage,
    fetchFn: async url => {
      if (url.includes('grant_type=password')) {
        return Response.json({
          access_token: 'access',
          refresh_token: 'refresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: {
            id: 'u1',
            email: 'learner@example.com',
            email_confirmed_at: '2026-01-01T00:00:00Z',
            app_metadata: { provider: 'email', providers: ['email', 'google'] },
            identities: [
              { id: 'identity-email', provider: 'email', identity_data: { email: 'learner@example.com' } },
              { id: 'identity-google', provider: 'google', identity_data: { email: 'learner@example.com', provider_token: 'must-not-persist' } }
            ]
          }
        });
      }
      throw new Error('unexpected request');
    }
  });

  await auth.signIn('learner@example.com', 'strong-password');
  assert.deepEqual(auth.currentUser().providers, ['email', 'google']);
  const persisted = storage.dump()[0][1];
  assert.doesNotMatch(persisted, /identity-email|identity-google|provider_token|must-not-persist/);
});

test('Google-created user can add password sign-in to the same authenticated user', async () => {
  const storage = memoryStorage();
  const calls = [];
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage,
    fetchFn: async (url, options) => {
      calls.push({ url, options });
      if (url.includes('grant_type=password')) {
        return Response.json({
          access_token: 'access',
          refresh_token: 'refresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: {
            id: 'same-user',
            email: 'same@example.com',
            app_metadata: { provider: 'google', providers: ['google'] }
          }
        });
      }
      if (url.endsWith('/auth/v1/user') && options.method === 'PUT') {
        assert.equal(options.headers.Authorization, 'Bearer access');
        assert.deepEqual(JSON.parse(options.body), { password: 'new-strong-password' });
        return Response.json({
          id: 'same-user',
          email: 'same@example.com',
          email_confirmed_at: '2026-01-01T00:00:00Z',
          app_metadata: { provider: 'google', providers: ['google', 'email'] }
        });
      }
      throw new Error('unexpected request');
    }
  });

  await auth.signIn('same@example.com', 'temporary-password');
  const beforeId = auth.currentUser().id;
  const user = await auth.setPassword('new-strong-password');
  assert.equal(user.id, beforeId);
  assert.deepEqual(user.providers, ['email', 'google']);
  assert.doesNotMatch(storage.dump()[0][1], /new-strong-password/);
});

test('refreshUser enriches an existing session with current linked providers', async () => {
  const storage = memoryStorage();
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage,
    fetchFn: async (url, options) => {
      if (url.includes('grant_type=password')) {
        return Response.json({
          access_token: 'access',
          refresh_token: 'refresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: 'u1', email: 'same@example.com' }
        });
      }
      if (url.endsWith('/auth/v1/user') && options.method === 'GET') {
        return Response.json({
          id: 'u1',
          email: 'same@example.com',
          app_metadata: { providers: ['google', 'email'] }
        });
      }
      throw new Error('unexpected request');
    }
  });

  await auth.signIn('same@example.com', 'strong-password');
  assert.deepEqual(auth.currentUser().providers, []);
  const user = await auth.refreshUser();
  assert.equal(user.id, 'u1');
  assert.deepEqual(user.providers, ['email', 'google']);
});


test('password recovery request is email-scoped, uses a safe redirect, and sends no password', async () => {
  const calls = [];
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage: memoryStorage(),
    fetchFn: async (url, options) => {
      calls.push({ url, options });
      return Response.json({});
    }
  });

  const result = await auth.sendPasswordRecovery('LEARNER@example.com', {
    redirectTo: 'https://preview.example.com/web/account.html'
  });

  assert.deepEqual(result, { requested: true });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/auth\/v1\/recover\?redirect_to=https%3A%2F%2Fpreview\.example\.com%2Fweb%2Faccount\.html$/);
  assert.deepEqual(JSON.parse(calls[0].options.body), { email: 'learner@example.com' });
  assert.doesNotMatch(calls[0].options.body, /password/i);
});

test('password recovery rejects insecure remote redirect before network use', async () => {
  let calls = 0;
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage: memoryStorage(),
    fetchFn: async () => { calls += 1; return Response.json({}); }
  });
  await assert.rejects(
    auth.sendPasswordRecovery('learner@example.com', {
      redirectTo: 'http://preview.example.com/web/account.html'
    }),
    error => error instanceof AuthError && error.code === 'invalid_redirect_url'
  );
  assert.equal(calls, 0);
});

test('implicit recovery callback reports recovery type while preserving the same authenticated user', async () => {
  const storage = memoryStorage();
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage,
    fetchFn: async (url, options) => {
      assert.match(url, /\/auth\/v1\/user$/);
      assert.equal(options.headers.Authorization, 'Bearer recovery-access');
      return Response.json({
        id: 'same-user',
        email: 'learner@example.com',
        email_confirmed_at: '2026-09-29T00:00:00Z',
        app_metadata: { providers: ['email', 'google'] }
      });
    }
  });

  const result = await auth.consumeImplicitRedirect(
    'https://preview.example.com/web/account.html#access_token=recovery-access&refresh_token=recovery-refresh&expires_in=3600&type=recovery'
  );
  assert.equal(result.handled, true);
  assert.equal(result.type, 'recovery');
  assert.equal(result.session.user.id, 'same-user');
  assert.deepEqual(result.session.user.providers, ['email', 'google']);
});


test('OAuth authorization details use the authenticated Supabase session and normalize consent data', async () => {
  const storage = memoryStorage();
  const calls = [];
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage,
    fetchFn: async (url, options) => {
      calls.push({ url, options });
      if (url.includes('grant_type=password')) {
        return Response.json({
          access_token: 'access',
          refresh_token: 'refresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: 'admin-user', email: 'admin@example.com' }
        });
      }
      if (url.endsWith('/auth/v1/oauth/authorizations/auth_request_1')) {
        assert.equal(options.method, 'GET');
        assert.equal(options.headers.Authorization, 'Bearer access');
        return Response.json({
          authorization_id: 'auth_request_1',
          redirect_uri: 'https://chatgpt.com/callback',
          scope: 'email',
          client: { id: 'client-1', name: 'ChatGPT', uri: 'https://chatgpt.com' },
          user: { id: 'admin-user', email: 'admin@example.com' }
        });
      }
      throw new Error('unexpected request');
    }
  });
  await auth.signIn('admin@example.com', 'strong-password');
  const details = await auth.oauthAuthorizationDetails('auth_request_1');
  assert.equal(details.authorizationId, 'auth_request_1');
  assert.equal(details.client.name, 'ChatGPT');
  assert.equal(details.scope, 'email');
  assert.equal(details.user.email, 'admin@example.com');
  assert.equal(calls.length, 2);
});

test('OAuth consent sends only approve or deny and returns validated HTTPS redirect', async () => {
  const storage = memoryStorage();
  const calls = [];
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage,
    fetchFn: async (url, options) => {
      calls.push({ url, options });
      if (url.includes('grant_type=password')) {
        return Response.json({
          access_token: 'access',
          refresh_token: 'refresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: 'admin-user', email: 'admin@example.com' }
        });
      }
      if (url.endsWith('/auth/v1/oauth/authorizations/auth_request_2/consent')) {
        assert.equal(options.method, 'POST');
        assert.equal(options.headers.Authorization, 'Bearer access');
        assert.deepEqual(JSON.parse(options.body), { action: 'approve' });
        return Response.json({ redirect_url: 'https://chatgpt.com/callback?code=one&state=two' });
      }
      throw new Error('unexpected request');
    }
  });
  await auth.signIn('admin@example.com', 'strong-password');
  const result = await auth.oauthAuthorizationDecision('auth_request_2', 'approve');
  assert.equal(result.redirectUrl, 'https://chatgpt.com/callback?code=one&state=two');
  await assert.rejects(auth.oauthAuthorizationDecision('auth_request_2', 'publish'), error => error.code === 'invalid_oauth_authorization_action');
  assert.equal(calls.length, 2);
});

test('OAuth consent rejects malformed authorization IDs before network use', async () => {
  const storage = memoryStorage();
  let calls = 0;
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage,
    fetchFn: async url => {
      calls += 1;
      if (url.includes('grant_type=password')) {
        return Response.json({
          access_token: 'access', refresh_token: 'refresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: 'admin-user', email: 'admin@example.com' }
        });
      }
      throw new Error('unexpected request');
    }
  });
  await auth.signIn('admin@example.com', 'strong-password');
  await assert.rejects(auth.oauthAuthorizationDetails('../escape'), error => error.code === 'invalid_oauth_authorization_id');
  assert.equal(calls, 1);
});

test('previous OAuth consent response may redirect without asking twice, but only to safe client URL', async () => {
  const storage = memoryStorage();
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage,
    fetchFn: async (url) => {
      if (url.includes('grant_type=password')) {
        return Response.json({
          access_token: 'access', refresh_token: 'refresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: 'admin-user', email: 'admin@example.com' }
        });
      }
      return Response.json({ redirect_url: 'https://chatgpt.com/callback?code=already-approved' });
    }
  });
  await auth.signIn('admin@example.com', 'strong-password');
  assert.deepEqual(await auth.oauthAuthorizationDetails('auth_request_3'), {
    redirectUrl: 'https://chatgpt.com/callback?code=already-approved'
  });
});


test('OAuth authorization redirect rejects non-HTTPS remote callbacks', async () => {
  const storage = memoryStorage();
  const auth = createSupabaseAuth({
    projectUrl, publishableKey, storage,
    fetchFn: async url => {
      if (url.includes('grant_type=password')) {
        return Response.json({
          access_token: 'access', refresh_token: 'refresh',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: { id: 'admin-user', email: 'admin@example.com' }
        });
      }
      return Response.json({ redirect_url: 'http://attacker.example/callback' });
    }
  });
  await auth.signIn('admin@example.com', 'strong-password');
  await assert.rejects(
    auth.oauthAuthorizationDetails('auth_request_4'),
    error => error.code === 'invalid_oauth_redirect_url'
  );
});
