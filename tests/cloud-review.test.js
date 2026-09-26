import test from 'node:test';
import assert from 'node:assert/strict';
import { createCloudReview, CloudReviewError } from '../src/adapters/cloud-review.js';

function fakeAuth(session = { accessToken: 'jwt-one' }) {
  let refreshes = 0;
  let current = session;
  return {
    async getSession({ forceRefresh = false } = {}) {
      if (forceRefresh) {
        refreshes += 1;
        current = current ? { ...current, accessToken: 'jwt-two' } : null;
      }
      return current;
    },
    refreshCount() { return refreshes; }
  };
}

test('review adapter derives reviewer identity from auth token and never sends reviewerId', async () => {
  const calls = [];
  const auth = fakeAuth();
  const review = createCloudReview({
    projectUrl: 'https://iyapppmeieqhflnzslao.supabase.co',
    publishableKey: 'sb_publishable_test',
    auth,
    fetchFn: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ reviewId: 'r1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  });

  await review.record({
    questionVersionId: 'demo:q@1',
    reviewKind: 'medical',
    decision: 'approved',
    notes: 'Checked against source.'
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/functions\/v1\/review-api\/reviews$/);
  assert.equal(calls[0].init.headers.Authorization, 'Bearer jwt-one');
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(Object.keys(body).sort(), ['decision', 'notes', 'questionVersionId', 'reviewKind']);
  assert.equal('reviewerId' in body, false);
});

test('review queue kind is encoded and server errors stay code-only', async () => {
  const auth = fakeAuth();
  let called;
  const review = createCloudReview({
    projectUrl: 'https://iyapppmeieqhflnzslao.supabase.co',
    publishableKey: 'sb_publishable_test',
    auth,
    fetchFn: async url => {
      called = url;
      return new Response(JSON.stringify({ error: 'reviewer_not_authorized' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }
  });

  await assert.rejects(() => review.queue('medical rights'), error => {
    assert.ok(error instanceof CloudReviewError);
    assert.equal(error.status, 403);
    assert.equal(error.code, 'reviewer_not_authorized');
    return true;
  });
  assert.match(called, /kind=medical%20rights/);
});

test('review adapter refreshes once on 401 and retries with rotated token', async () => {
  const auth = fakeAuth();
  const authHeaders = [];
  let count = 0;
  const review = createCloudReview({
    projectUrl: 'https://iyapppmeieqhflnzslao.supabase.co',
    publishableKey: 'sb_publishable_test',
    auth,
    fetchFn: async (_url, init) => {
      authHeaders.push(init.headers.Authorization);
      count += 1;
      if (count === 1) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ reviewerId: 'u1', reviewKinds: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  });

  const me = await review.me();
  assert.deepEqual(me.reviewKinds, []);
  assert.deepEqual(authHeaders, ['Bearer jwt-one', 'Bearer jwt-two']);
  assert.equal(auth.refreshCount(), 1);
});

test('review adapter fails closed without an authenticated session', async () => {
  const review = createCloudReview({
    projectUrl: 'https://iyapppmeieqhflnzslao.supabase.co',
    publishableKey: 'sb_publishable_test',
    auth: fakeAuth(null),
    fetchFn: async () => { throw new Error('should not fetch'); }
  });
  await assert.rejects(() => review.me(), /not_authenticated/);
});


test('source rights resolution never sends reviewer identity', async () => {
  const calls = [];
  const review = createCloudReview({
    projectUrl: 'https://iyapppmeieqhflnzslao.supabase.co',
    publishableKey: 'sb_publishable_test',
    auth: fakeAuth(),
    fetchFn: async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({
        rightsEventId: 'rights-1',
        sourceId: 'source:v1',
        rightsStatus: 'public_domain',
        sourceFingerprintSha256: 'a'.repeat(64),
        reviewedAt: '2026-09-26T12:00:00.000Z'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  });

  await review.resolveRights({
    sourceId: 'source:v1',
    rightsStatus: 'public_domain',
    evidence: 'Official policy reviewed.'
  });

  assert.match(calls[0].url, /\/functions\/v1\/review-api\/source-rights$/);
  const body = JSON.parse(calls[0].init.body);
  assert.deepEqual(Object.keys(body).sort(), ['evidence', 'rightsStatus', 'sourceId']);
  assert.equal('reviewerId' in body, false);
});
