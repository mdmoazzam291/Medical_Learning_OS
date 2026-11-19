import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { adminAssuranceDecision, adminAssuranceForToken, strictModeFromEnv, tokenAssuranceLevel } from '../src/domain/admin-assurance.js';
import { auditLimit, auditTimeline, billingSummary, formatInrMinor } from '../src/domain/owner-records.js';
import { createSupabaseAuth } from '../src/adapters/supabase-auth.js';

const jwt = claims => ['e30', Buffer.from(JSON.stringify(claims)).toString('base64url'), 'sig'].join('.');
const verified = { id: '11111111-1111-4111-8111-111111111111', status: 'verified', factor_type: 'totp' };

test('token assurance level reads only aal1/aal2 and rejects malformed tokens', () => {
  assert.equal(tokenAssuranceLevel(jwt({ aal: 'aal2' })), 'aal2');
  assert.equal(tokenAssuranceLevel(jwt({ aal: 'aal1' })), 'aal1');
  assert.equal(tokenAssuranceLevel(jwt({ aal: 'aal3' })), null);
  assert.equal(tokenAssuranceLevel('not-a-jwt'), null);
  assert.equal(tokenAssuranceLevel(undefined), null);
});

test('enrolled admins need aal2; unenrolled admins pass unless strict mode is on', () => {
  assert.deepEqual(adminAssuranceDecision({ aal: 'aal1', factors: [verified] }).code, 'admin_mfa_required');
  assert.equal(adminAssuranceDecision({ aal: 'aal2', factors: [verified] }).allowed, true);
  const open = adminAssuranceDecision({ aal: 'aal1', factors: [] });
  assert.equal(open.allowed, true);
  assert.equal(open.enrollmentRecommended, true);
  assert.equal(adminAssuranceDecision({ aal: 'aal1', factors: [{ ...verified, status: 'unverified' }] }).allowed, true, 'an unverified factor grants and requires nothing');
  assert.equal(adminAssuranceDecision({ aal: 'aal1', factors: [], strict: true }).code, 'admin_mfa_enrollment_required');
  assert.equal(adminAssuranceForToken({ token: jwt({ aal: 'aal1' }), user: { factors: [verified] } }).status, 403);
  assert.equal(strictModeFromEnv(' TRUE '), true);
  assert.equal(strictModeFromEnv(undefined), false);
});

test('every admin-gated edge function enforces the assurance rule after the admin check', async () => {
  for (const path of ['owner-api/index.ts', 'nmc-admin-preview/index.ts', 'review-api/index.ts', 'content-library-api/_shared/handler.js']) {
    const source = await readFile(new URL('../supabase/functions/' + path, import.meta.url), 'utf8');
    assert.match(source, /adminAssuranceForToken\(/, path);
    assert.ok(source.indexOf('adminAssuranceForToken(') > source.indexOf('content_admin_required'), path + ' checks MFA after admin status');
  }
});

test('mfaVerify stores the upgraded aal2 session and rejects bad codes locally', async () => {
  const store = new Map([['mlos-supabase-auth-v1', JSON.stringify({ accessToken: jwt({ aal: 'aal1' }), refreshToken: 'r1', expiresAt: 9999999999, user: { id: 'u1' } })]]);
  const storage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) };
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push(url.replace('https://abc.supabase.co', ''));
    const body = url.endsWith('/challenge') ? { id: 'challenge-1' } : { access_token: jwt({ aal: 'aal2' }), refresh_token: 'r2', expires_in: 3600, user: { id: 'u1' } };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  const auth = createSupabaseAuth({ projectUrl: 'https://abc.supabase.co', publishableKey: 'sb_publishable_x', storage, fetchFn, now: () => 0 });
  await assert.rejects(auth.mfaVerify(verified.id, '12ab56'), { code: 'invalid_mfa_code' });
  await auth.mfaVerify(verified.id, '123 456');
  assert.deepEqual(calls, ['/auth/v1/factors/' + verified.id + '/challenge', '/auth/v1/factors/' + verified.id + '/verify']);
  assert.equal(tokenAssuranceLevel(JSON.parse(store.get('mlos-supabase-auth-v1')).accessToken), 'aal2');
});

test('audit timeline merges both immutable sources newest first and bounds the limit', () => {
  assert.equal(auditLimit(null), 50);
  assert.throws(() => auditLimit('500'), { code: 'audit_limit_invalid' });
  const timeline = auditTimeline({
    learnerEvents: [{ id: 'a', admin_user_id: 'o', learner_id: 'l', action: 'suspend', reason: 'r', before_state: {}, after_state: {}, created_at: '2026-11-01T00:00:00Z' }],
    featureEvents: [{ id: 'b', admin_user_id: 'o', feature_key: 'exam_mode', before_audience: 'off', after_audience: 'beta', reason: 'r', created_at: '2026-11-02T00:00:00Z' }],
    limit: 50
  });
  assert.deepEqual(timeline.events.map(e => e.id), ['b', 'a']);
  assert.equal(timeline.events[0].family, 'feature_gate');
});

test('billing summary separates sandbox from production and counts only verified captures', () => {
  const now = Date.parse('2026-11-19T00:00:00Z');
  const summary = billingSummary({
    offers: [{ offer_id: 'pro_month', status: 'draft' }],
    subscriptions: [{ environment: 'sandbox', lifecycle_status: 'active' }],
    payments: [
      { payment_id: 'p1', subscription_id: 's', environment: 'sandbox', payment_status: 'success', amount_minor: 49900, recorded_at: '2026-11-10T00:00:00Z', provider_verified_at: '2026-11-10T00:00:00Z' },
      { payment_id: 'p2', subscription_id: 's', environment: 'sandbox', payment_status: 'failed', amount_minor: 49900, recorded_at: '2026-11-11T00:00:00Z' },
      { payment_id: 'p3', subscription_id: 's', environment: 'sandbox', payment_status: 'success', amount_minor: 49900, recorded_at: '2026-09-01T00:00:00Z', provider_verified_at: '2026-09-01T00:00:00Z' }
    ],
    inbox: [{ environment: 'sandbox', processing_status: 'needs_review' }],
    now
  });
  assert.equal(summary.activation, 'not_activated');
  assert.equal(summary.sandbox.capturedMinor30d, 49900);
  assert.equal(summary.production.capturedMinor30d, 0);
  assert.equal(summary.sandbox.webhooksNeedingAttention, 1);
  assert.equal(summary.recentPayments[0].paymentId, 'p2');
  assert.equal(formatInrMinor(49900), '₹499.00');
});
