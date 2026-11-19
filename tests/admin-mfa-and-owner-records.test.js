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

test('two-factor gate migration denies aal1 sessions only for users with a verified factor', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261119150000_two_factor_runtime_gate_and_learner_funnel.sql', import.meta.url), 'utf8');
  assert.match(sql, /status='verified'/);
  assert.match(sql, /session_aal from s\) <> 'aal2' then 'mfa_required'/);
  assert.match(sql, /grant execute on function public\.learner_runtime_access_v1\(uuid,uuid\) to service_role/);
  assert.match(sql, /revoke all on function public\.owner_learner_funnel_v1\(\) from public,anon,authenticated/);
  assert.doesNotMatch(sql.slice(sql.indexOf('owner_learner_funnel_v1()')), /'email',|u\.email\b/, 'funnel returns aggregates only');
});

test('account two-factor panel: off, on for learner, and admin cannot turn it off', async () => {
  const { runInNewContext } = await import('node:vm');
  const { verifiedTotpFactors } = await import('../src/domain/admin-assurance.js');
  const source = (await readFile(new URL('../web/two-factor-view.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  const ctx = { verifiedTotpFactors, Date };
  runInNewContext(source + '\nthis.view = { accountTwoFactorMarkup, signInCodePromptMarkup };', ctx);
  const { accountTwoFactorMarkup, signInCodePromptMarkup } = ctx.view;
  assert.match(accountTwoFactorMarkup({ factors: [] }), /Two-factor sign-in: Off[\s\S]*Turn on two-factor sign-in/);
  const on = accountTwoFactorMarkup({ factors: [verified], aal: 'aal2' });
  assert.match(on, /Two-factor sign-in: On/);
  assert.match(on, /data-two-factor-form="disable"/);
  const admin = accountTwoFactorMarkup({ factors: [verified], aal: 'aal2', isAdmin: true });
  assert.doesNotMatch(admin, /data-two-factor-form="disable"/);
  assert.match(admin, /admin-security/);
  assert.doesNotMatch(accountTwoFactorMarkup({ factors: [verified], aal: 'aal1' }), /data-two-factor-form="disable"/, 'turning off needs a code-verified session');
  assert.match(signInCodePromptMarkup({ factors: [verified] }), /autocomplete="one-time-code"[\s\S]*data-mfa-gate-signout/);
  assert.match(accountTwoFactorMarkup({ enrollment: { factorId: verified.id, uri: 'otpauth://totp/x?a=1&b=2', secret: 'ABC' } }), /otpauth:\/\/totp\/x\?a=1&amp;b=2/);
});

test('learner funnel panel shows shares and fails closed', async () => {
  const { runInNewContext } = await import('node:vm');
  const source = (await readFile(new URL('../web/owner-records-console.js', import.meta.url), 'utf8'));
  const body = source.slice(source.indexOf('const n = value'), source.indexOf('function panel('));
  const ctx = {};
  runInNewContext("const escape = v => String(v ?? '').replace(/[&<>\"']/g, '');\n" + body.replace(/^export /gm, '') + '\nthis.funnelMarkup = funnelMarkup;', ctx);
  assert.match(ctx.funnelMarkup(null), /not evidence of zero learners/);
  const html = ctx.funnelMarkup({ contractId: 'owner-learner-funnel-v1', accounts: 8, emailConfirmed: 6, studiedOnce: 4, studiedOnTwoOrMoreDays: 2, studiedAgain7DaysAfterFirst: 1, eligibleFor7DayReturn: 2, activeLearners7d: 3, activeLearners30d: 4, twoFactorEnabled: 0, signups7d: 1, signups30d: 2, weeklySignups: [] });
  assert.match(html, /Answered at least one question<\/span><strong>4 \(50%\)/);
  assert.match(html, /not mastery/);
});
