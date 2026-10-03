export class CloudOwnerError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function cleanBase(url) {
  if (typeof url !== 'string' || !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) throw new Error('invalid_supabase_url');
  return url.replace(/\/$/, '');
}

export function createCloudOwner({ projectUrl, publishableKey, auth, fetchFn = fetch }) {
  const base = cleanBase(projectUrl);
  if (typeof publishableKey !== 'string' || !publishableKey.startsWith('sb_publishable_')) throw new Error('invalid_publishable_key');
  if (!auth || typeof auth.getSession !== 'function') throw new Error('invalid_auth');

  async function request(path, { retry = true } = {}) {
    const session = await auth.getSession();
    if (!session?.accessToken) throw new CloudOwnerError(401, 'not_authenticated');

    const response = await fetchFn(`${base}/functions/v1/owner-api${path}`, {
      method: 'GET',
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${session.accessToken}`
      }
    });

    if (response.status === 401 && retry) {
      const refreshed = await auth.getSession({ forceRefresh: true });
      if (refreshed?.accessToken && refreshed.accessToken !== session.accessToken) {
        return request(path, { retry: false });
      }
    }

    let payload = null;
    try { payload = await response.json(); } catch {}
    if (!response.ok) throw new CloudOwnerError(response.status, payload?.error || 'owner_request_failed');
    return payload;
  }

  return {
    dashboard() { return request('/dashboard'); },
    searchLearners(query) {
      return request('/learners?q=' + encodeURIComponent(String(query || '').trim()));
    }
  };
}
