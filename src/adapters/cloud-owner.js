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

  async function request(path, { method = 'GET', body, retry = true } = {}) {
    const session = await auth.getSession();
    if (!session?.accessToken) throw new CloudOwnerError(401, 'not_authenticated');

    const response = await fetchFn(`${base}/functions/v1/owner-api${path}`, {
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
    if (!response.ok) throw new CloudOwnerError(response.status, payload?.error || 'owner_request_failed');
    return payload;
  }

  return {
    dashboard() { return request('/dashboard'); },
    contentIntegrity() { return request('/content-integrity'); },
    conceptDrafts({proposalId = null, revision = null, offset = 0} = {}) { return request('/concept-drafts' + (proposalId ? '/' + encodeURIComponent(proposalId) + (revision ? '?revision=' + revision : '') : '?offset=' + offset)); },
    saveConceptDraft(input) { return request('/concept-drafts', {method: 'POST', body: input}); },
    syllabusBaselineDrafts({baselineId=null,revision=null,offset=0}={}) { return request('/syllabus-baseline-drafts'+(baselineId?'/'+encodeURIComponent(baselineId)+(revision?'?revision='+revision:''):'?offset='+offset)); },
    saveSyllabusBaselineDraft(input) { return request('/syllabus-baseline-drafts',{method:'POST',body:input}); },
    acceptConceptDraft(input) { return request('/concept-draft-accept', {method: 'POST', body: input}); },
    contentCoverage(filters = {}) { return request('/content-coverage?' + new URLSearchParams(Object.entries(filters).filter(([,v]) => v !== '' && v != null))); },
    sourceWatch() { return request('/source-watch'); },
    recordSourceSighting(input) { return request('/source-watch/sightings', { method: 'POST', body: input }); },
    searchLearners(query) {
      return request('/learners?q=' + encodeURIComponent(String(query || '').trim()));
    },
    learnerDetail(learnerId) {
      return request('/learner?id=' + encodeURIComponent(String(learnerId || '').trim()));
    },
    learnerAction(input) {
      return request('/learner-actions', { method: 'POST', body: input });
    }
  };
}
