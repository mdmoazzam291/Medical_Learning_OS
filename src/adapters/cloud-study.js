export class CloudStudyError extends Error {
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

export function createCloudStudy({ projectUrl, publishableKey, auth, fetchFn = fetch }) {
  const base = cleanBase(projectUrl);
  if (typeof publishableKey !== 'string' || !publishableKey.startsWith('sb_publishable_')) throw new Error('invalid_publishable_key');
  if (!auth || typeof auth.getSession !== 'function') throw new Error('invalid_auth');

  async function request(path, { method = 'GET', body, retry = true } = {}) {
    const session = await auth.getSession();
    if (!session?.accessToken) throw new CloudStudyError(401, 'not_authenticated');
    const response = await fetchFn(`${base}/functions/v1/study-api${path}`, {
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
    if (!response.ok) throw new CloudStudyError(response.status, payload?.error || 'cloud_request_failed');
    return payload;
  }

  return {
    questions(filter = 'all') { return request(`/questions?filter=${encodeURIComponent(filter)}`); },
    progress() { return request('/progress'); },
    due(limit = 20) { return request(`/revision/due?limit=${encodeURIComponent(limit)}`); },
    studyNow(availableMinutes, maxItems = 50) {
      return request('/study-now/start', {
        method: 'POST',
        body: { availableMinutes, maxItems }
      });
    },
    studyNowOutcomes() { return request('/study-now/outcomes'); },
    exportData() { return request('/export'); },
    start({ limit = 15, filter = 'all' } = {}) { return request('/sessions', { method: 'POST', body: { limit, filter } }); },
    session(id) { return request(`/sessions/${encodeURIComponent(id)}`); },
    answer(id, { requestId, position, optionId }) {
      return request(`/sessions/${encodeURIComponent(id)}/answer`, { method: 'POST', body: { requestId, position, optionId } });
    },
    next(id, position) { return request(`/sessions/${encodeURIComponent(id)}/next`, { method: 'POST', body: { position } }); },
    cancel(id) { return request(`/sessions/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: {} }); },
    bookmark(questionVersionId, bookmarked) {
      return request('/bookmarks', { method: 'POST', body: { questionVersionId, bookmarked } });
    }
  };
}
