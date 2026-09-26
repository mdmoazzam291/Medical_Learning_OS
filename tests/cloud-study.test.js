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
