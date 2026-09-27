export class CloudReviewError extends Error {
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

export function createCloudReview({ projectUrl, publishableKey, auth, fetchFn = fetch }) {
  const base = cleanBase(projectUrl);
  if (typeof publishableKey !== 'string' || !publishableKey.startsWith('sb_publishable_')) throw new Error('invalid_publishable_key');
  if (!auth || typeof auth.getSession !== 'function') throw new Error('invalid_auth');

  async function request(path, { method = 'GET', body, retry = true } = {}) {
    const session = await auth.getSession();
    if (!session?.accessToken) throw new CloudReviewError(401, 'not_authenticated');

    const response = await fetchFn(`${base}/functions/v1/review-api${path}`, {
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
    if (!response.ok) throw new CloudReviewError(response.status, payload?.error || 'review_request_failed');
    return payload;
  }

  return {
    me() { return request('/me'); },
    pipelineStatus() { return request('/pipeline-status'); },
    queue(reviewKind) { return request(`/queue?kind=${encodeURIComponent(reviewKind)}`); },
    noteQueue(reviewKind) { return request(`/note-queue?kind=${encodeURIComponent(reviewKind)}`); },
    resolveRights({ sourceId, rightsStatus, evidence }) {
      return request('/source-rights', {
        method: 'POST',
        body: { sourceId, rightsStatus, evidence }
      });
    },
    record({ questionVersionId, reviewKind, decision, notes }) {
      return request('/reviews', {
        method: 'POST',
        body: { questionVersionId, reviewKind, decision, notes }
      });
    },
    recordNote({ noteVersionId, reviewKind, decision, notes }) {
      return request('/note-reviews', {
        method: 'POST',
        body: { noteVersionId, reviewKind, decision, notes }
      });
    }
  };
}
