const SESSION_KEY = 'mlos-supabase-auth-v1';

export class AuthError extends Error {
  constructor(status, code, message = code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function cleanBase(url) {
  if (typeof url !== 'string' || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) throw new Error('invalid_supabase_url');
  return url.replace(/\/$/, '');
}

function cleanEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || value.length > 254) throw new AuthError(400, 'invalid_email');
  return value;
}

function cleanPassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new AuthError(400, 'invalid_password');
  return password;
}

function cleanRedirectUrl(value) {
  let redirect;
  try { redirect = new URL(String(value)); } catch { throw new AuthError(400, 'invalid_redirect_url'); }
  const localhost = ['127.0.0.1', 'localhost'].includes(redirect.hostname);
  if (redirect.protocol !== 'https:' && !(localhost && redirect.protocol === 'http:')) {
    throw new AuthError(400, 'invalid_redirect_url');
  }
  return redirect;
}

function normalizedProviders(value) {
  const providers = new Set();
  if (Array.isArray(value?.identities)) {
    for (const identity of value.identities) {
      if (typeof identity?.provider === 'string' && identity.provider) providers.add(identity.provider);
    }
  }
  if (Array.isArray(value?.app_metadata?.providers)) {
    for (const provider of value.app_metadata.providers) {
      if (typeof provider === 'string' && provider) providers.add(provider);
    }
  }
  if (typeof value?.app_metadata?.provider === 'string' && value.app_metadata.provider) {
    providers.add(value.app_metadata.provider);
  }
  return [...providers].sort();
}

function normalizedUser(value) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !value.id) return null;
  return {
    id: value.id,
    email: value.email || null,
    emailConfirmedAt: value.email_confirmed_at || null,
    providers: normalizedProviders(value)
  };
}

function normalizeSession(value) {
  if (!value || typeof value !== 'object' || typeof value.access_token !== 'string' || typeof value.refresh_token !== 'string') return null;
  const expiresAt = Number(value.expires_at || 0) || Math.floor(Date.now() / 1000) + Number(value.expires_in || 3600);
  return {
    accessToken: value.access_token,
    refreshToken: value.refresh_token,
    expiresAt,
    user: normalizedUser(value.user)
  };
}

function implicitParams(urlLike) {
  let url;
  try { url = new URL(String(urlLike)); } catch { throw new AuthError(400, 'invalid_callback_url'); }
  const params = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
  const hasAuthSignal = ['access_token', 'refresh_token', 'error', 'error_code', 'error_description'].some(key => params.has(key));
  return hasAuthSignal ? params : null;
}

function cleanAuthorizationId(value) {
  const id = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(id)) throw new AuthError(400, 'invalid_oauth_authorization_id');
  return id;
}

function cleanOAuthClientRedirect(value) {
  let redirect;
  try { redirect = new URL(String(value || '')); } catch { throw new AuthError(502, 'invalid_oauth_redirect_url'); }
  const localhost = ['127.0.0.1', 'localhost'].includes(redirect.hostname);
  if (redirect.protocol !== 'https:' && !(localhost && redirect.protocol === 'http:')) {
    throw new AuthError(502, 'invalid_oauth_redirect_url');
  }
  return redirect.href;
}

function browserSessionStorage() {
  // Resolve the accessor inside each operation: privacy settings can make it throw.
  return {
    getItem: key => globalThis.localStorage.getItem(key),
    setItem: (key, value) => globalThis.localStorage.setItem(key, value),
    removeItem: key => globalThis.localStorage.removeItem(key)
  };
}

export function createSupabaseAuth({ projectUrl, publishableKey, storage = browserSessionStorage(), fetchFn = fetch, now = Date.now }) {
  const base = cleanBase(projectUrl);
  if (typeof publishableKey !== 'string' || !publishableKey.startsWith('sb_publishable_')) throw new Error('invalid_publishable_key');
  if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') throw new Error('invalid_storage');

  const read = () => {
    try {
      const parsed = JSON.parse(storage.getItem(SESSION_KEY) || 'null');
      return parsed && typeof parsed.accessToken === 'string' && typeof parsed.refreshToken === 'string' ? parsed : null;
    } catch {
      return null;
    }
  };
  const write = session => {
    try {
      if (session) storage.setItem(SESSION_KEY, JSON.stringify(session));
      else storage.removeItem(SESSION_KEY);
    } catch { throw new AuthError(0, 'auth_storage_unavailable'); }
    return session;
  };

  async function api(path, { method = 'POST', body, accessToken } = {}) {
    const response = await fetchFn(base + path, {
      method,
      headers: {
        apikey: publishableKey,
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    let payload = null;
    try { payload = await response.json(); } catch {}
    if (!response.ok) {
      const code = payload?.error_code || payload?.code || payload?.msg || payload?.error || 'auth_request_failed';
      throw new AuthError(response.status, String(code), payload?.message || String(code));
    }
    return payload;
  }

  async function refresh(refreshToken) {
    if (!refreshToken) return write(null);
    try {
      const data = await api('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: refreshToken } });
      const session = normalizeSession(data);
      if (!session) throw new AuthError(502, 'invalid_refresh_response');
      return write(session);
    } catch (error) {
      const permanentCodes = ['refresh_token_not_found', 'refresh_token_already_used', 'session_not_found', 'session_expired', 'invalid_credentials', 'user_banned', 'user_not_found'];
      if (error instanceof AuthError && (error.status === 401 || error.status === 403 || permanentCodes.includes(error.code))) write(null);
      throw error;
    }
  }

  async function authenticatedSession() {
    let session = read();
    if (!session) throw new AuthError(401, 'not_authenticated');
    if (session.expiresAt * 1000 <= now() + 60_000) {
      session = await refresh(session.refreshToken);
    }
    if (!session?.accessToken) throw new AuthError(401, 'not_authenticated');
    return session;
  }

  async function fetchCurrentUser(session) {
    const data = await api('/auth/v1/user', { method: 'GET', accessToken: session.accessToken });
    const user = normalizedUser(data?.user ?? data);
    if (!user) throw new AuthError(401, 'invalid_authenticated_user');
    return user;
  }

  return {
    oauthAuthorizeUrl(provider, { redirectTo } = {}) {
      if (provider !== 'google') throw new AuthError(400, 'unsupported_oauth_provider');
      const redirect = cleanRedirectUrl(redirectTo);
      const url = new URL(base + '/auth/v1/authorize');
      url.searchParams.set('provider', provider);
      url.searchParams.set('redirect_to', redirect.href);
      return url.href;
    },
    async consumeImplicitRedirect(urlLike) {
      const params = implicitParams(urlLike);
      if (!params) return { handled: false, session: read() };
      if (params.get('error') || params.get('error_code')) {
        const code = params.get('error_code') || params.get('error') || 'auth_callback_failed';
        throw new AuthError(400, code, params.get('error_description') || code);
      }
      const session = normalizeSession({
        access_token: params.get('access_token'),
        refresh_token: params.get('refresh_token'),
        expires_at: params.get('expires_at'),
        expires_in: params.get('expires_in')
      });
      if (!session) throw new AuthError(400, 'invalid_auth_callback');
      const normalized = await fetchCurrentUser(session);
      session.user = normalized;
      write(session);
      return { handled: true, session, type: params.get('type') || null };
    },
    async oauthAuthorizationDetails(authorizationId) {
      const session = await authenticatedSession();
      const id = cleanAuthorizationId(authorizationId);
      const data = await api(`/auth/v1/oauth/authorizations/${encodeURIComponent(id)}`, {
        method: 'GET',
        accessToken: session.accessToken
      });
      if (!data || typeof data !== 'object') throw new AuthError(502, 'invalid_oauth_authorization_response');
      if (typeof data.redirect_url === 'string' && !('authorization_id' in data)) {
        return { redirectUrl: cleanOAuthClientRedirect(data.redirect_url) };
      }
      if (String(data.authorization_id || '') !== id) throw new AuthError(502, 'oauth_authorization_mismatch');
      return {
        authorizationId: id,
        redirectUri: typeof data.redirect_uri === 'string' ? data.redirect_uri : null,
        scope: typeof data.scope === 'string' ? data.scope : '',
        client: data.client && typeof data.client === 'object' ? {
          id: typeof data.client.id === 'string' ? data.client.id : null,
          name: typeof data.client.name === 'string' ? data.client.name : null,
          uri: typeof data.client.uri === 'string' ? data.client.uri : null,
          logoUri: typeof data.client.logo_uri === 'string' ? data.client.logo_uri : null
        } : null,
        user: data.user && typeof data.user === 'object' ? {
          id: typeof data.user.id === 'string' ? data.user.id : null,
          email: typeof data.user.email === 'string' ? data.user.email : null
        } : null
      };
    },
    async oauthAuthorizationDecision(authorizationId, action) {
      const session = await authenticatedSession();
      const id = cleanAuthorizationId(authorizationId);
      if (!['approve', 'deny'].includes(action)) throw new AuthError(400, 'invalid_oauth_authorization_action');
      const data = await api(`/auth/v1/oauth/authorizations/${encodeURIComponent(id)}/consent`, {
        method: 'POST',
        accessToken: session.accessToken,
        body: { action }
      });
      if (!data || typeof data.redirect_url !== 'string') throw new AuthError(502, 'invalid_oauth_consent_response');
      return { redirectUrl: cleanOAuthClientRedirect(data.redirect_url) };
    },
    async sendPasswordRecovery(email, { redirectTo } = {}) {
      let path = '/auth/v1/recover';
      if (redirectTo !== undefined) {
        const redirect = cleanRedirectUrl(redirectTo);
        path += `?redirect_to=${encodeURIComponent(redirect.href)}`;
      }
      await api(path, { body: { email: cleanEmail(email) } });
      return { requested: true };
    },
    async signUp(email, password, { emailRedirectTo } = {}) {
      let path = '/auth/v1/signup';
      if (emailRedirectTo !== undefined) {
        const redirect = cleanRedirectUrl(emailRedirectTo);
        path += `?redirect_to=${encodeURIComponent(redirect.href)}`;
      }
      const data = await api(path, { body: { email: cleanEmail(email), password: cleanPassword(password) } });
      const session = normalizeSession(data);
      if (session) write(session);
      return { user: data?.user || null, session, confirmationRequired: !session };
    },
    async signIn(email, password) {
      const data = await api('/auth/v1/token?grant_type=password', { body: { email: cleanEmail(email), password: cleanPassword(password) } });
      const session = normalizeSession(data);
      if (!session) throw new AuthError(401, 'session_missing');
      write(session);
      return session;
    },
    async getSession({ forceRefresh = false } = {}) {
      const session = read();
      if (!session) return null;
      const expiresSoon = session.expiresAt * 1000 <= now() + 60_000;
      if (forceRefresh || expiresSoon) return refresh(session.refreshToken);
      return session;
    },
    async refreshUser() {
      const session = await authenticatedSession();
      const user = await fetchCurrentUser(session);
      session.user = user;
      write(session);
      return user;
    },
    async setPassword(password) {
      const session = await authenticatedSession();
      const data = await api('/auth/v1/user', {
        method: 'PUT',
        accessToken: session.accessToken,
        body: { password: cleanPassword(password) }
      });
      const user = normalizedUser(data?.user ?? data) || await fetchCurrentUser(session);
      session.user = user;
      write(session);
      return user;
    },
    async signOut() {
      const session = read();
      try {
        if (session?.accessToken) await api('/auth/v1/logout?scope=local', { accessToken: session.accessToken, body: {} });
      } finally {
        write(null);
      }
    },
    clear() { write(null); },
    currentUser() { return read()?.user || null; }
  };
}
