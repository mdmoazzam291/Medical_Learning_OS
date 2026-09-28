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

function normalizedUser(value) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !value.id) return null;
  return {
    id: value.id,
    email: value.email || null,
    emailConfirmedAt: value.email_confirmed_at || null
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

export function createSupabaseAuth({ projectUrl, publishableKey, storage, fetchFn = fetch, now = Date.now }) {
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
    if (session) storage.setItem(SESSION_KEY, JSON.stringify(session));
    else storage.removeItem(SESSION_KEY);
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
      if (!session) throw new AuthError(401, 'invalid_refresh_response');
      return write(session);
    } catch (error) {
      write(null);
      throw error;
    }
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
      const user = await api('/auth/v1/user', { method: 'GET', accessToken: session.accessToken });
      const normalized = normalizedUser(user);
      if (!normalized) throw new AuthError(401, 'invalid_authenticated_user');
      session.user = normalized;
      write(session);
      return { handled: true, session };
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
