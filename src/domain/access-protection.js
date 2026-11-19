// ADR-143: learner access protection. Pure policy; no I/O.
// - quotaBucketForRoute: which study-api requests count against a learner quota.
// - evaluateAccessSignals: turn per-learner behaviour metrics into review flags.
// Flags are evidence for a human decision. Nothing here suspends or throttles anyone.

export function quotaBucketForRoute(method, path) {
  const m = String(method || '').toUpperCase();
  const p = String(path || '');
  if (m === 'OPTIONS') return null;
  if (m === 'GET' && (p === '/questions' || /^\/sessions\/[a-zA-Z0-9-]+$/.test(p) || /^\/attempts\/[^/]+\/review$/.test(p))) return 'question';
  if (m === 'POST' && (p === '/sessions' || p === '/study-now/start' || /^\/sessions\/[a-zA-Z0-9-]+\/(answer|next)$/.test(p))) return 'question';
  if (/^\/exam-simulator\/runs\/[a-zA-Z0-9-]+(\/(answer|review|autopsy))?$/.test(p) && (m === 'GET' || m === 'POST')) return 'question';
  if (m === 'GET' && (p === '/media' || p.startsWith('/vault/'))) return 'library';
  return null;
}

const n = value => (Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0);

export const SIGNAL_RULES = Object.freeze([
  { code: 'fast_answers', strength: 'strong', label: 'Answers faster than reading is possible',
    test: r => n(r.attempts7d) >= 30 && n(r.fastAttempts7d) / n(r.attempts7d) >= 0.5,
    evidence: r => `${n(r.fastAttempts7d)} of ${n(r.attempts7d)} answers in under 3 s (7 days)` },
  { code: 'high_daily_volume', strength: 'strong', label: 'Very high daily question volume',
    test: r => n(r.maxAttemptsInDay) >= 600 || n(r.questionRequestsMaxDay) >= 2500,
    evidence: r => `peak ${n(r.maxAttemptsInDay)} answers / ${n(r.questionRequestsMaxDay)} question requests in one day` },
  { code: 'library_bulk_reading', strength: 'strong', label: 'Bulk reading of library content',
    test: r => n(r.libraryReadsMaxDay) >= 1500 || (n(r.libraryReads7d) >= 500 && n(r.attempts7d) < n(r.libraryReads7d) * 0.05),
    evidence: r => `${n(r.libraryReads7d)} library reads vs ${n(r.attempts7d)} answers (7 days); peak ${n(r.libraryReadsMaxDay)}/day` },
  { code: 'quota_hits', strength: 'strong', label: 'Repeatedly hit request limits',
    test: r => n(r.deniedRequests7d) >= 20,
    evidence: r => `${n(r.deniedRequests7d)} requests refused (7 days)` },
  { code: 'automation_agent', strength: 'strong', label: 'Signed in from an automation tool',
    test: r => n(r.automationUserAgents) > 0,
    evidence: r => `${n(r.automationUserAgents)} live session(s) with a scripted or headless browser identity (can be faked; absence proves nothing)` },
  { code: 'round_the_clock', strength: 'weak', label: 'Active almost round the clock',
    test: r => n(r.maxActiveHoursInDay) >= 18,
    evidence: r => `answered in ${n(r.maxActiveHoursInDay)} different hours of one day` },
  { code: 'many_locations', strength: 'weak', label: 'Many network locations at once',
    test: r => n(r.distinctIps) >= 6,
    evidence: r => `${n(r.distinctIps)} distinct IP addresses across ${n(r.liveSessions)} live sessions (mobile networks change IPs; possible account sharing)` }
]);

export function evaluateAccessSignals(row) {
  const flags = SIGNAL_RULES.filter(rule => rule.test(row || {})).map(rule => ({ code: rule.code, strength: rule.strength, label: rule.label, evidence: rule.evidence(row || {}) }));
  const strong = flags.filter(f => f.strength === 'strong').length;
  const weak = flags.length - strong;
  const level = strong > 0 || weak >= 2 ? 'review' : weak === 1 ? 'watch' : 'none';
  return { level, flags };
}

export function accessReview(payload) {
  if (!payload || payload.contractId !== 'owner-access-signals-v1' || !Array.isArray(payload.learners)) return null;
  const rank = { review: 0, watch: 1, none: 2 };
  const rows = payload.learners.map(row => ({ ...row, ...evaluateAccessSignals(row) }))
    .sort((a, b) => rank[a.level] - rank[b.level] || b.flags.length - a.flags.length);
  return {
    generatedAt: payload.generatedAt ?? null,
    windowDays: payload.windowDays ?? 7,
    limits: payload.limits ?? null,
    needsReview: rows.filter(r => r.level === 'review' && !r.suspendedUntil && !r.throttledUntil).length,
    watching: rows.filter(r => r.level === 'watch').length,
    rows
  };
}
