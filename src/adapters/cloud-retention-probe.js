export class CloudRetentionProbeError extends Error {
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

export function createCloudRetentionProbe({ projectUrl, publishableKey, auth, fetchFn = fetch }) {
  const base = cleanBase(projectUrl);
  if (typeof publishableKey !== 'string' || !publishableKey.startsWith('sb_publishable_')) throw new Error('invalid_publishable_key');
  if (!auth || typeof auth.getSession !== 'function') throw new Error('invalid_auth');

  async function request(path, { method = 'GET', body, retry = true } = {}) {
    const session = await auth.getSession();
    if (!session?.accessToken) throw new CloudRetentionProbeError(401, 'not_authenticated');
    const response = await fetchFn(`${base}/functions/v1/retention-probe-api${path}`, {
      method,
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${session.accessToken}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (response.status === 401 && retry) {
      const refreshed = await auth.getSession({ forceRefresh: true });
      if (refreshed?.accessToken && refreshed.accessToken !== session.accessToken) {
        return request(path, { method, body, retry: false });
      }
    }
    let payload = null;
    try { payload = await response.json(); } catch {}
    if (!response.ok) throw new CloudRetentionProbeError(response.status, payload?.error || 'retention_probe_request_failed');
    return payload;
  }

  return {
    inbox() { return request('/inbox'); },
    start({ assignmentId, requestId }) {
      return request('/start', { method: 'POST', body: { assignmentId, requestId } });
    },
    rendered({ servedEventId, learnerQuestionSha256 }) {
      return request('/render', { method: 'POST', body: { servedEventId, learnerQuestionSha256 } });
    },
    answer({ servedEventId, requestId, optionId }) {
      return request('/answer', { method: 'POST', body: { servedEventId, requestId, optionId } });
    }
  };
}
