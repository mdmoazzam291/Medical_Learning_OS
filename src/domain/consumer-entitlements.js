// Proposed consumer capabilities. No payment system is active by importing this module.
// Call resolveConsumerAccess only with grants verified by a trusted server boundary.
export const CONSUMER_PRICE_VERSION = '2026-10-14-proposal-v1';
export const CONSUMER_PLAN_IDS = Object.freeze(['free', 'pro', 'ai_pro']);
const free = Object.freeze([
  'learner.history.read', 'learner.history.export', 'learner.notes.personal',
  'learning.graph.basic', 'learning.study.basic', 'learning.memory.basic',
  'learning.mistakes.basic', 'assessment.sample', 'learning.questions.sample',
  'ai.trial'
]);
const proExtras = Object.freeze([
  'learning.questions.premium', 'assessment.full', 'assessment.autopsy',
  'learning.study.adaptive', 'learning.memory.adaptive',
  'learning.mistakes.advanced', 'learning.analytics.advanced',
  'ai.standard'
]);
const aiExtras = Object.freeze([
  'ai.tutor.advanced', 'ai.synthesis.advanced', 'ai.clinical.multimodal'
]);
const definitions = Object.freeze({
  free: Object.freeze({ id: 'free', label: 'Free OS', capabilities: free }),
  pro: Object.freeze({ id: 'pro', label: 'Pro', capabilities: Object.freeze([...free, ...proExtras]) }),
  ai_pro: Object.freeze({ id: 'ai_pro', label: 'AI Pro', capabilities: Object.freeze([...free, ...proExtras, ...aiExtras]) })
});
const prices = Object.freeze({
  free: Object.freeze({ month: 0, quarter: 0, year: 0 }),
  pro: Object.freeze({ month: 49900, quarter: 139900, year: 399900 }),
  ai_pro: Object.freeze({ month: 89900, quarter: 249900, year: 699900 })
});
const validSource = new Set(['verified_payment', 'server_trial', 'server_scholarship']);
const validCapabilities = new Set(definitions.ai_pro.capabilities);
export const CONSUMER_CAPABILITIES = Object.freeze([...validCapabilities]);
export const CONSUMER_PLAN_DEFINITIONS = definitions;

// All amounts are minor units (paise), hypothetical GST-inclusive consumer prices.
// This is a planning catalog, never a gateway price ID or a sellable offer.
export function proposedConsumerPrice(plan, interval) {
  if (!Object.hasOwn(prices, plan) || !['month', 'quarter', 'year'].includes(interval)) {
    throw new TypeError('Unknown consumer plan or interval');
  }
  return Object.freeze({
    plan, interval, amountMinor: prices[plan][interval],
    currency: 'INR', priceVersion: CONSUMER_PRICE_VERSION,
    status: 'proposal_only', includesEstimatedGst: true
  });
}

function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return NaN;
  return Date.parse(value);
}
const level = Object.freeze({ free: 0, pro: 1, ai_pro: 2 });
function validGrant(grant, at) {
  if (!grant || typeof grant !== 'object' || !Object.hasOwn(level, grant.plan) || grant.plan === 'free') return false;
  if (grant.status !== 'active' || grant.issuer !== 'trusted_server' || !validSource.has(grant.source)) return false;
  if (typeof grant.id !== 'string' || !grant.id.trim() || typeof grant.subjectId !== 'string' || !grant.subjectId.trim()) return false;
  const start = timestamp(grant.startsAt), end = timestamp(grant.endsAt);
  const verified = timestamp(grant.verifiedAt);
  return Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(verified) &&
    verified <= at && start <= at && at < end && end > start;
}

// This evaluator has no access to the network, identity, finance or learner state.
// The caller must supply server-authenticated subjectId and server-verified grants.
export function resolveConsumerAccess({ subjectId, grants = [], at = new Date().toISOString(), premiumReleaseEnabled = false } = {}) {
  const current = timestamp(at);
  if (!Number.isFinite(current)) throw new TypeError('Invalid evaluation time');
  if (!Array.isArray(grants)) throw new TypeError('Invalid grants');
  let plan = 'free';
  if (premiumReleaseEnabled === true && typeof subjectId === 'string' && subjectId.trim()) {
    for (const grant of grants) {
      if (grant.subjectId === subjectId && validGrant(grant, current) && level[grant.plan] > level[plan]) {
        plan = grant.plan;
      }
    }
  }
  return Object.freeze({
    plan,
    capabilities: Object.freeze([...definitions[plan].capabilities]),
    premiumReleaseEnabled: premiumReleaseEnabled === true
  });
}
export function hasConsumerCapability(access, capability) {
  if (!validCapabilities.has(capability)) throw new TypeError('Unknown consumer capability');
  return Boolean(access && CONSUMER_PLAN_IDS.includes(access.plan) &&
    access.capabilities?.includes(capability) && definitions[access.plan].capabilities.includes(capability));
}
