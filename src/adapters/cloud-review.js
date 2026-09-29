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
    learnerReports() { return request('/learner-reports'); },
    triageLearnerReports({
      reportIds,
      reviewKind,
      decision,
      reasonCode,
      attestationVersion = 'learner-content-issue-triage-attestation-v1',
      attested
    }) {
      return request('/learner-reports/triage', {
        method: 'POST',
        body: { reportIds, reviewKind, decision, reasonCode, attestationVersion, attested }
      });
    },
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
    recordFullQuestionReview({
      questionVersionId,
      medicalNotes,
      referencesNotes,
      rightsNotes,
      attestationVersion = 'full-question-review-attestation-v1',
      attested
    }) {
      return request('/full-question-review', {
        method: 'POST',
        body: {
          questionVersionId,
          medicalNotes,
          referencesNotes,
          rightsNotes,
          attestationVersion,
          attested
        }
      });
    },
    recordStructuredBatch({
      targetType,
      targetIds,
      reviewKind,
      decision,
      reasonCode,
      attestationVersion = 'structured-human-review-v1',
      attested
    }) {
      return request('/structured-review-batch', {
        method: 'POST',
        body: {
          targetType,
          targetIds,
          reviewKind,
          decision,
          reasonCode,
          attestationVersion,
          attested
        }
      });
    },
    recordMeasurement({
      reviewId,
      workflowMode,
      experimentId,
      clientSessionId,
      foregroundActiveMs,
      elapsedWallMs,
      queueSize
    }) {
      return request('/review-measurements', {
        method: 'POST',
        body: {
          reviewId,
          workflowMode,
          experimentId,
          clientSessionId,
          foregroundActiveMs,
          elapsedWallMs,
          queueSize
        }
      });
    },
    measurementSummary(experimentId) {
      return request('/review-measurements/summary?experimentId=' + encodeURIComponent(experimentId));
    },
    recordReferencesBatch({
      questionVersionIds,
      decisions,
      notes,
      experimentId,
      workflowMode,
      clientSessionId,
      foregroundActiveMs,
      elapsedWallMs,
      queueSize,
      attestationVersion = 'references-batch-attestation-v1',
      attested
    }) {
      return request('/reference-review-batch', {
        method: 'POST',
        body: {
          questionVersionIds,
          decisions,
          notes,
          experimentId,
          workflowMode,
          clientSessionId,
          foregroundActiveMs,
          elapsedWallMs,
          queueSize,
          attestationVersion,
          attested
        }
      });
    },
    batchMeasurementSummary(experimentId) {
      return request('/reference-review-batch/summary?experimentId=' + encodeURIComponent(experimentId));
    },
    transferPairs() {
      return request('/transfer-pairs');
    },
    validateTransferPair({
      questionVersionA,
      questionVersionB,
      decision,
      surfaceNovelty,
      constructAlignment,
      reasoningAlignment,
      difficultyComparability,
      cueOverlapRisk,
      retentionProbeComparable,
      notes,
      attestationVersion = 'transfer-pair-human-validation-v1',
      attested
    }) {
      return request('/transfer-pairs/validate', {
        method: 'POST',
        body: {
          questionVersionA,
          questionVersionB,
          decision,
          surfaceNovelty,
          constructAlignment,
          reasoningAlignment,
          difficultyComparability,
          cueOverlapRisk,
          retentionProbeComparable,
          notes,
          attestationVersion,
          attested
        }
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
