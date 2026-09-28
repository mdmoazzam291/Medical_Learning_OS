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
    mediaPrompt(questionVersionId) {
      return request(`/media?questionVersionId=${encodeURIComponent(questionVersionId)}`);
    },
    progress() { return request('/progress'); },
    due(limit = 20) { return request(`/revision/due?limit=${encodeURIComponent(limit)}`); },
    fsrsShadow() { return request('/revision/fsrs-shadow'); },
    policyEvaluation() { return request('/revision/policy-evaluation'); },
    conceptDiagnostics() { return request('/diagnostics/concepts'); },
    mistakeDiagnostics() { return request('/diagnostics/mistakes'); },
    examDna(examId = null) {
      const suffix = examId === null ? '' : `?examId=${encodeURIComponent(examId)}`;
      return request(`/exam-dna${suffix}`);
    },
    examSimulatorReadiness(ruleSetId) {
      return request(`/exam-simulator/readiness?ruleSetId=${encodeURIComponent(ruleSetId)}`);
    },
    examSimulatorTestReadiness(ruleSetId) {
      return request(`/exam-simulator/test-readiness?ruleSetId=${encodeURIComponent(ruleSetId)}`);
    },
    startTestExamRun(ruleSetId) {
      return request('/exam-simulator/test-runs', {
        method: 'POST',
        body: { ruleSetId }
      });
    },
    startExamRun(ruleSetId) {
      return request('/exam-simulator/runs', {
        method: 'POST',
        body: { ruleSetId }
      });
    },
    resumeExamRun() {
      return request('/exam-simulator/runs/current');
    },
    examRun(runId) {
      return request(`/exam-simulator/runs/${encodeURIComponent(runId)}`);
    },
    examRunAutopsy(runId) {
      return request(`/exam-simulator/runs/${encodeURIComponent(runId)}/autopsy`);
    },
    setExamRunAnswer(runId, { requestId, expectedRevision, questionVersionId, optionId }) {
      return request(`/exam-simulator/runs/${encodeURIComponent(runId)}/answer`, {
        method: 'POST',
        body: { requestId, expectedRevision, questionVersionId, optionId }
      });
    },
    setExamRunReview(runId, { requestId, expectedRevision, questionVersionId, markedForReview }) {
      return request(`/exam-simulator/runs/${encodeURIComponent(runId)}/review`, {
        method: 'POST',
        body: { requestId, expectedRevision, questionVersionId, markedForReview }
      });
    },
    cancelExamRun(runId, { requestId, expectedRevision }) {
      return request(`/exam-simulator/runs/${encodeURIComponent(runId)}/cancel`, {
        method: 'POST',
        body: { requestId, expectedRevision }
      });
    },
    vaultConcepts() { return request('/vault/concepts'); },
    vaultSearch(query) { return request(`/vault/search?q=${encodeURIComponent(query)}`); },
    vaultConcept(conceptId) {
      return request(`/vault/concepts/${encodeURIComponent(conceptId)}`);
    },
    createVaultAnnotation({ conceptId, bodyMarkdown, anchorNoteVersionId = null }) {
      return request('/vault/annotations', {
        method: 'POST',
        body: { conceptId, bodyMarkdown, anchorNoteVersionId }
      });
    },
    updateVaultAnnotation(annotationId, expectedRevision, bodyMarkdown) {
      return request(`/vault/annotations/${encodeURIComponent(annotationId)}`, {
        method: 'PATCH',
        body: { expectedRevision, bodyMarkdown }
      });
    },
    deleteVaultAnnotation(annotationId) {
      return request(`/vault/annotations/${encodeURIComponent(annotationId)}`, {
        method: 'DELETE'
      });
    },
    studyNow(availableMinutes, maxItems = 50) {
      return request('/study-now/start', {
        method: 'POST',
        body: { availableMinutes, maxItems }
      });
    },
    studyNowOutcomes() { return request('/study-now/outcomes'); },
    memoryJudgment(attemptId, rating) {
      return request('/memory-judgments', { method: 'POST', body: { attemptId, rating } });
    },
    exportData() { return request('/export'); },
    start({ limit = 15, filter = 'all' } = {}) { return request('/sessions', { method: 'POST', body: { limit, filter } }); },
    session(id) { return request(`/sessions/${encodeURIComponent(id)}`); },
    answer(id, { requestId, position, optionId }) {
      return request(`/sessions/${encodeURIComponent(id)}/answer`, { method: 'POST', body: { requestId, position, optionId } });
    },
    visualDetection(id, {
      requestId,
      position,
      optionId,
      mediaAssetVersionId,
      helpUsed = false,
      interventionRef = null
    }) {
      return request(`/sessions/${encodeURIComponent(id)}/visual-detection`, {
        method: 'POST',
        body: { requestId, position, optionId, mediaAssetVersionId, helpUsed, interventionRef }
      });
    },
    next(id, position) { return request(`/sessions/${encodeURIComponent(id)}/next`, { method: 'POST', body: { position } }); },
    cancel(id) { return request(`/sessions/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: {} }); },
    bookmark(questionVersionId, bookmarked) {
      return request('/bookmarks', { method: 'POST', body: { questionVersionId, bookmarked } });
    }
  };
}
