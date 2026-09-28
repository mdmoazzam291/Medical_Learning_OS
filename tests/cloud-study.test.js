import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudStudy, CloudStudyError } from '../src/adapters/cloud-study.js';

const projectUrl = 'https://example-ref.supabase.co';
const publishableKey = 'sb_publishable_test';

test('cloud study sends authenticated requests and never sends learner ids', async () => {
  const seen = [];
  const auth = { getSession: async () => ({ accessToken: 'jwt-1' }) };
  const cloud = createCloudStudy({
    projectUrl, publishableKey, auth,
    fetchFn: async (url, options) => {
      seen.push({ url, options });
      return Response.json({ questions: [] });
    }
  });
  const result = await cloud.questions('incorrect');
  assert.deepEqual(result, { questions: [] });
  assert.match(seen[0].url, /study-api\/questions\?filter=incorrect$/);
  assert.equal(seen[0].options.headers.Authorization, 'Bearer jwt-1');
  assert.equal(seen[0].options.headers.apikey, publishableKey);
  assert.equal(seen[0].options.body, undefined);
  assert.doesNotMatch(JSON.stringify(seen[0]), /learnerId/);
});

test('cloud study retries once with a refreshed access token', async () => {
  let forceRefresh = false;
  const auth = {
    getSession: async options => {
      if (options?.forceRefresh) { forceRefresh = true; return { accessToken: 'jwt-2' }; }
      return { accessToken: forceRefresh ? 'jwt-2' : 'jwt-1' };
    }
  };
  const tokens = [];
  const cloud = createCloudStudy({
    projectUrl, publishableKey, auth,
    fetchFn: async (_url, options) => {
      tokens.push(options.headers.Authorization);
      if (tokens.length === 1) return Response.json({ error: 'unauthorized' }, { status: 401 });
      return Response.json({ attempts: 0, correct: 0, accuracy: null, concepts: [] });
    }
  });
  const result = await cloud.progress();
  assert.equal(result.attempts, 0);
  assert.deepEqual(tokens, ['Bearer jwt-1', 'Bearer jwt-2']);
});

test('cloud study rejects use without an account session', async () => {
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => null },
    fetchFn: async () => { throw new Error('network should not be reached'); }
  });
  await assert.rejects(cloud.progress(), error => error instanceof CloudStudyError && error.code === 'not_authenticated');
});

test('mutation payload contains request identity but no correctness claim', async () => {
  let body;
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (_url, options) => {
      body = JSON.parse(options.body);
      return Response.json({ event: { correct: true } });
    }
  });
  await cloud.answer('session-1', { requestId: 'req-1', position: 0, optionId: 'a' });
  assert.deepEqual(body, { requestId: 'req-1', position: 0, optionId: 'a' });
  assert.equal(Object.hasOwn(body, 'correct'), false);
});


test('cloud study exposes authenticated revision due queue', async () => {
  let seenUrl = '';
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url) => {
      seenUrl = url;
      return Response.json({
        generatedAt: '2026-09-26T17:30:00.000Z',
        policy: { id: 'bootstrap-binary-v1', version: 1, evidence: 'binary-correctness', provisional: true },
        dueCount: 0,
        returnedCount: 0,
        nextDueAt: null,
        items: []
      });
    }
  });

  const result = await cloud.due(12);
  assert.match(seenUrl, /study-api\/revision\/due\?limit=12$/);
  assert.equal(result.policy.provisional, true);
  assert.equal(result.dueCount, 0);
});


test('cloud Study Now sends time budget but never learner identity', async () => {
  let seen;
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url, options) => {
      seen = { url, body: JSON.parse(options.body) };
      return Response.json({ plan: { selectedCount: 0 }, session: null });
    }
  });

  await cloud.studyNow(20, 12);
  assert.match(seen.url, /study-api\/study-now\/start$/);
  assert.deepEqual(seen.body, { availableMinutes: 20, maxItems: 12 });
  assert.equal(Object.hasOwn(seen.body, 'learnerId'), false);
});


test('cloud Study Now outcomes use authenticated learner context only', async () => {
  let seenUrl = '';
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url) => {
      seenUrl = url;
      return Response.json({
        generatedAt: '2026-09-26T19:30:00.000Z',
        scope: 'descriptive-recommendation-outcomes',
        causal: false,
        outcomes: []
      });
    }
  });

  const result = await cloud.studyNowOutcomes();
  assert.match(seenUrl, /study-api\/study-now\/outcomes$/);
  assert.equal(result.causal, false);
  assert.deepEqual(result.outcomes, []);
});


test('cloud memory judgment submits only attempt identity and explicit rating', async () => {
  let seen = null;
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url, options) => {
      seen = { url, options };
      return Response.json({
        schemaVersion: 1,
        type: 'memory.rating',
        attemptId: '11111111-1111-4111-8111-111111111111',
        rating: 2,
        ratingLabel: 'Hard'
      });
    }
  });
  const result = await cloud.memoryJudgment('11111111-1111-4111-8111-111111111111', 2);
  assert.match(seen.url, /study-api\/memory-judgments$/);
  assert.deepEqual(JSON.parse(seen.options.body), {
    attemptId: '11111111-1111-4111-8111-111111111111',
    rating: 2
  });
  assert.equal(result.ratingLabel, 'Hard');
});


test('cloud FSRS shadow readiness uses authenticated learner context', async () => {
  let seenUrl = '';
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url) => {
      seenUrl = url;
      return Response.json({
        mode: 'shadow-readiness',
        schedulerControl: false,
        livePolicyId: 'bootstrap-binary-v1',
        evidence: { ratedAttempts: 0, hasReplayableEvidence: false },
        shadowSchedule: null,
        shadowScheduleReason: 'no_real_memory_ratings'
      });
    }
  });
  const result = await cloud.fsrsShadow();
  assert.match(seenUrl, /study-api\/revision\/fsrs-shadow$/);
  assert.equal(result.schedulerControl, false);
  assert.equal(result.shadowSchedule, null);
  assert.equal(result.evidence.ratedAttempts, 0);
});


test('cloud policy evaluation uses authenticated learner context', async () => {
  let seenUrl = '';
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url) => {
      seenUrl = url;
      return Response.json({
        scope: 'descriptive-schedule-policy-outcomes',
        causal: false,
        livePolicyId: 'bootstrap-binary-v1',
        outcomes: []
      });
    }
  });
  const result = await cloud.policyEvaluation();
  assert.match(seenUrl, /study-api\/revision\/policy-evaluation$/);
  assert.equal(result.causal, false);
  assert.equal(result.livePolicyId, 'bootstrap-binary-v1');
  assert.deepEqual(result.outcomes, []);
});


test('cloud NeuralVault adapter reads concepts and performs revision-safe annotation mutations', async () => {
  const seen = [];
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url, options = {}) => {
      seen.push({ url, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null });
      return Response.json({ ok: true });
    }
  });

  await cloud.vaultConcept('emergency:anaphylaxis:first-line-treatment');
  await cloud.createVaultAnnotation({
    conceptId: 'emergency:anaphylaxis:first-line-treatment',
    bodyMarkdown: 'My note'
  });
  await cloud.updateVaultAnnotation('11111111-1111-4111-8111-111111111111', 2, 'Updated note');
  await cloud.deleteVaultAnnotation('11111111-1111-4111-8111-111111111111');

  assert.match(seen[0].url, /vault\/concepts\/emergency%3Aanaphylaxis%3Afirst-line-treatment$/);
  assert.equal(seen[1].method, 'POST');
  assert.equal(seen[1].body.anchorNoteVersionId, null);
  assert.equal(seen[2].method, 'PATCH');
  assert.deepEqual(seen[2].body, { expectedRevision: 2, bodyMarkdown: 'Updated note' });
  assert.equal(seen[3].method, 'DELETE');
});


test('cloud NeuralVault concept index uses authenticated API', async () => {
  let seenUrl = '';
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url) => {
      seenUrl = url;
      return Response.json({ catalogVersion: 1, count: 0, concepts: [] });
    }
  });
  const result = await cloud.vaultConcepts();
  assert.match(seenUrl, /study-api\/vault\/concepts$/);
  assert.deepEqual(result.concepts, []);
});


test('cloud NeuralVault search encodes the learner query', async () => {
  let seenUrl = '';
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url) => {
      seenUrl = url;
      return Response.json({ query: 'anaphylaxis first', count: 0, results: [] });
    }
  });
  await cloud.vaultSearch('anaphylaxis first');
  assert.match(seenUrl, /study-api\/vault\/search\?q=anaphylaxis%20first$/);
});


test('cloud concept diagnostics use authenticated learner context', async () => {
  let seenUrl = '';
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url) => {
      seenUrl = url;
      return Response.json({
        contractId: 'concept-observation-v1',
        scope: 'observed-concept-evidence',
        inferenceEnabled: false,
        concepts: []
      });
    }
  });
  const result = await cloud.conceptDiagnostics();
  assert.match(seenUrl, /study-api\/diagnostics\/concepts$/);
  assert.equal(result.inferenceEnabled, false);
  assert.deepEqual(result.concepts, []);
});


test('cloud mistake diagnostics use authenticated learner context', async () => {
  let seenUrl = '';
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url) => {
      seenUrl = url;
      return Response.json({
        contractId: 'mistake-observation-v1',
        scope: 'observed-mistake-evidence',
        causeInferenceEnabled: false,
        fingerprints: []
      });
    }
  });
  const result = await cloud.mistakeDiagnostics();
  assert.match(seenUrl, /study-api\/diagnostics\/mistakes$/);
  assert.equal(result.causeInferenceEnabled, false);
  assert.deepEqual(result.fingerprints, []);
});


test('cloud Exam DNA adapter requests descriptive evidence with an optional encoded exam ID', async () => {
  const seen = [];
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url) => {
      seen.push(url);
      return Response.json({
        contractId: 'exam-dna-observation-v1',
        scope: 'descriptive-historical-pyq-evidence',
        predictiveInferenceEnabled: false,
        concepts: []
      });
    }
  });

  const all = await cloud.examDna();
  const neet = await cloud.examDna('neet-pg');
  assert.match(seen[0], /study-api\/exam-dna$/);
  assert.match(seen[1], /study-api\/exam-dna\?examId=neet-pg$/);
  assert.equal(all.predictiveInferenceEnabled, false);
  assert.equal(neet.predictiveInferenceEnabled, false);
});


test('cloud exam simulator readiness requires an exact encoded ruleset ID', async () => {
  let seenUrl = '';
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url) => {
      seenUrl = url;
      return Response.json({
        contractId: 'exam-mock-readiness-v1',
        ruleSetId: 'neet-pg:2026@1',
        requiredUniqueQuestions: 180,
        eligibleUniqueQuestions: 1,
        shortage: 179,
        ready: false
      });
    }
  });
  const result = await cloud.examSimulatorReadiness('neet-pg:2026@1');
  assert.match(seenUrl, /study-api\/exam-simulator\/readiness\?ruleSetId=neet-pg%3A2026%401$/);
  assert.equal(result.ready, false);
  assert.equal(result.shortage, 179);
});


test('cloud exam run adapter starts and resumes without sending learner identity', async () => {
  const seen = [];
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url, options = {}) => {
      seen.push({
        url,
        method: options.method || 'GET',
        body: options.body ? JSON.parse(options.body) : null
      });
      return Response.json({ contractId: 'exam-run-view-v1', runId: 'run-1' });
    }
  });

  await cloud.startExamRun('neet-pg:2026@1');
  await cloud.resumeExamRun();

  assert.match(seen[0].url, /study-api\/exam-simulator\/runs$/);
  assert.equal(seen[0].method, 'POST');
  assert.deepEqual(seen[0].body, { ruleSetId: 'neet-pg:2026@1' });
  assert.equal(Object.hasOwn(seen[0].body, 'learnerId'), false);
  assert.match(seen[1].url, /study-api\/exam-simulator\/runs\/current$/);
  assert.equal(seen[1].method, 'GET');
});

test('cloud exam run mutations send revisioned intent but no scoring claim', async () => {
  const seen = [];
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url, options = {}) => {
      seen.push({ url, body: JSON.parse(options.body) });
      return Response.json({ contractId: 'exam-run-view-v1', revision: 2 });
    }
  });

  await cloud.setExamRunAnswer('run-1', {
    requestId: 'request-1',
    expectedRevision: 0,
    questionVersionId: 'qv-1',
    optionId: 'b'
  });
  await cloud.setExamRunReview('run-1', {
    requestId: 'request-2',
    expectedRevision: 1,
    questionVersionId: 'qv-1',
    markedForReview: true
  });

  assert.match(seen[0].url, /exam-simulator\/runs\/run-1\/answer$/);
  assert.deepEqual(seen[0].body, {
    requestId: 'request-1',
    expectedRevision: 0,
    questionVersionId: 'qv-1',
    optionId: 'b'
  });
  assert.equal(Object.hasOwn(seen[0].body, 'correct'), false);
  assert.equal(Object.hasOwn(seen[0].body, 'answerOptionId'), false);

  assert.match(seen[1].url, /exam-simulator\/runs\/run-1\/review$/);
  assert.deepEqual(seen[1].body, {
    requestId: 'request-2',
    expectedRevision: 1,
    questionVersionId: 'qv-1',
    markedForReview: true
  });
});


test('cloud media prompt requests exact question version without learner or answer data', async () => {
  let seenUrl = '';
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url) => {
      seenUrl = url;
      return Response.json({
        contractId: 'content-media-prompt-v1',
        questionVersionId: 'radiology:demo@1',
        media: []
      });
    }
  });
  const result = await cloud.mediaPrompt('radiology:demo@1');
  assert.match(seenUrl, /study-api\/media\?questionVersionId=radiology%3Ademo%401$/);
  assert.equal(result.questionVersionId, 'radiology:demo@1');
  assert.deepEqual(result.media, []);
});


test('cloud exam cancellation sends revisioned terminal intent without learner or score data', async () => {
  let seen = null;
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url, options = {}) => {
      seen = { url, method: options.method || 'GET', body: JSON.parse(options.body) };
      return Response.json({ contractId: 'exam-run-view-v1', status: 'cancelled', receipt: null });
    }
  });

  await cloud.cancelExamRun('run-1', {
    requestId: 'cancel-1',
    expectedRevision: 7
  });

  assert.match(seen.url, /exam-simulator\/runs\/run-1\/cancel$/);
  assert.equal(seen.method, 'POST');
  assert.deepEqual(seen.body, {
    requestId: 'cancel-1',
    expectedRevision: 7
  });
  assert.equal(Object.hasOwn(seen.body, 'learnerId'), false);
  assert.equal(Object.hasOwn(seen.body, 'score'), false);
  assert.equal(Object.hasOwn(seen.body, 'correct'), false);
});


test('cloud GT Autopsy reads one exact run without learner or scoring inputs', async () => {
  let seen = null;
  const client = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url, options = {}) => {
      seen = { url, method: options.method || 'GET', body: options.body };
      return Response.json({
        contractId:'gt-autopsy-v1',
        runId:'run-1',
        inferenceAuthority:false,
        masteryInferenceEnabled:false
      });
    }
  });

  const result = await client.examRunAutopsy('run-1');
  assert.match(seen.url, /exam-simulator\/runs\/run-1\/autopsy$/);
  assert.equal(seen.method, 'GET');
  assert.equal(seen.body, undefined);
  assert.equal(result.inferenceAuthority, false);
  assert.equal(result.masteryInferenceEnabled, false);
});


test('cloud internal exam readiness and start use separate test-only routes', async () => {
  const seen = [];
  const client = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url, options = {}) => {
      seen.push({ url, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : null });
      return Response.json({ ready:true, contractId:'exam-mock-test-readiness-v1' });
    }
  });
  await client.examSimulatorTestReadiness('neet-pg:2026@1');
  await client.startTestExamRun('neet-pg:2026@1');
  assert.match(seen[0].url, /exam-simulator\/test-readiness\?ruleSetId=neet-pg%3A2026%401$/);
  assert.equal(seen[0].method, 'GET');
  assert.match(seen[1].url, /exam-simulator\/test-runs$/);
  assert.equal(seen[1].method, 'POST');
  assert.deepEqual(seen[1].body, { ruleSetId:'neet-pg:2026@1' });
  assert.equal(Object.hasOwn(seen[1].body, 'learnerId'), false);
});


test('cloud visual detection sends only learner response intent and media identity', async () => {
  let seen = null;
  const cloud = createCloudStudy({
    projectUrl, publishableKey,
    auth: { getSession: async () => ({ accessToken: 'jwt' }) },
    fetchFn: async (url, options = {}) => {
      seen = { url, method: options.method || 'GET', body: JSON.parse(options.body) };
      return Response.json({
        contractId:'server-scored-visual-detection-v1',
        serverScored:true,
        attemptReceipt:{ event:{ eventId:'attempt-1' } },
        visualReceipt:{ eventId:'visual-1' }
      });
    }
  });

  await cloud.visualDetection('session-1', {
    requestId:'request-1',
    position:0,
    optionId:'ccrcc',
    mediaAssetVersionId:'media:pathology:clear-cell-rcc-grade1@1',
    helpUsed:false,
    interventionRef:null
  });

  assert.match(seen.url, /study-api\/sessions\/session-1\/visual-detection$/);
  assert.equal(seen.method, 'POST');
  assert.deepEqual(seen.body, {
    requestId:'request-1',
    position:0,
    optionId:'ccrcc',
    mediaAssetVersionId:'media:pathology:clear-cell-rcc-grade1@1',
    helpUsed:false,
    interventionRef:null
  });
  for (const forbidden of ['learnerId','correct','outcome','targetConceptId','answerOptionId']) {
    assert.equal(Object.hasOwn(seen.body, forbidden), false);
  }
});
