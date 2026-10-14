import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSUMER_PLAN_IDS, CONSUMER_PLAN_DEFINITIONS, proposedConsumerPrice,
  resolveConsumerAccess, hasConsumerCapability
} from '../src/domain/consumer-entitlements.js';

const now = '2026-10-14T12:00:00.000Z';
const grant = overrides => ({
  id: 'verified-1', subjectId: 'learner-1', issuer: 'trusted_server', source: 'verified_payment',
  plan: 'pro', status: 'active', startsAt: '2026-10-01T00:00:00Z',
  endsAt: '2027-10-01T00:00:00Z', verifiedAt: '2026-10-02T00:00:00Z', ...overrides
});
test('consumer prices are labeled proposals in paise and frozen', () => {
  assert.deepEqual(CONSUMER_PLAN_IDS, ['free', 'pro', 'ai_pro']);
  assert.equal(proposedConsumerPrice('pro', 'year').amountMinor, 399900);
  assert.equal(proposedConsumerPrice('ai_pro', 'quarter').amountMinor, 249900);
  assert.equal(proposedConsumerPrice('free', 'month').amountMinor, 0);
  assert.equal(proposedConsumerPrice('pro', 'month').status, 'proposal_only');
  assert.throws(() => proposedConsumerPrice('institution', 'year'), TypeError);
  assert.ok(Object.isFrozen(CONSUMER_PLAN_DEFINITIONS.ai_pro.capabilities));
});
test('consumer premium is disabled by default even with a paid-looking grant', () => {
  const access = resolveConsumerAccess({ subjectId: 'learner-1', grants: [grant()], at: now });
  assert.equal(access.plan, 'free');
  assert.equal(hasConsumerCapability(access, 'learner.notes.personal'), true);
  assert.equal(hasConsumerCapability(access, 'learning.study.adaptive'), false);
});
test('only trusted, active, matching, nonexpired grants unlock premium when separately enabled', () => {
  const good = resolveConsumerAccess({ subjectId: 'learner-1', grants: [grant()], at: now, premiumReleaseEnabled: true });
  assert.equal(good.plan, 'pro');
  assert.equal(hasConsumerCapability(good, 'learning.study.adaptive'), true);
  for (const bad of [
    grant({ subjectId: 'learner-2' }), grant({ issuer: 'browser' }),
    grant({ source: 'checkout_redirect' }), grant({ status: 'cancelled' }),
    grant({ endsAt: '2026-10-14T12:00:00.000Z' }),
    grant({ startsAt: '2026-11-01T00:00:00Z' }),
    grant({ verifiedAt: '2026-11-01T00:00:00Z' }),
    grant({ plan: 'institution' }), grant({ id: '' })
  ]) {
    assert.equal(resolveConsumerAccess({ subjectId: 'learner-1', grants: [bad], at: now, premiumReleaseEnabled: true }).plan, 'free');
  }
});
test('grant precedence is AI Pro above Pro; expiry safely downgrades without deleting history', () => {
  const active = resolveConsumerAccess({
    subjectId: 'learner-1', grants: [grant(), grant({ id: 'higher', plan: 'ai_pro', endsAt: '2026-10-15T00:00:00Z' })],
    at: now, premiumReleaseEnabled: true
  });
  assert.equal(active.plan, 'ai_pro');
  assert.equal(hasConsumerCapability(active, 'ai.tutor.advanced'), true);
  const expired = resolveConsumerAccess({ subjectId: 'learner-1', grants: [grant({ endsAt: '2026-10-01T00:00:00Z' })], at: now, premiumReleaseEnabled: true });
  assert.equal(expired.plan, 'free');
  assert.equal(hasConsumerCapability(expired, 'learner.history.export'), true);
  assert.throws(() => hasConsumerCapability(active, 'institution.faculty'), TypeError);
});
