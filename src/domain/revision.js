import { validateAttempt } from './learning-events.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function canonicalInstant(value, field) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString() !== value) {
    throw new TypeError(`${field} must be a canonical UTC ISO timestamp`);
  }
  return value;
}

function nonnegativeInteger(value, field) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${field} must be a nonnegative safe integer`);
  }
  return value;
}

export function createIntervalRevisionPolicy({
  id,
  correctIntervalsMs,
  incorrectIntervalMs
}) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('Policy id is required');
  if (!Array.isArray(correctIntervalsMs) || !correctIntervalsMs.length) {
    throw new TypeError('At least one correct interval is required');
  }
  const correct = correctIntervalsMs.map((value, index) =>
    nonnegativeInteger(value, `correctIntervalsMs[${index}]`));
  const incorrect = nonnegativeInteger(incorrectIntervalMs, 'incorrectIntervalMs');

  return Object.freeze({
    id: id.trim(),
    kind: 'interval-policy',
    version: 1,
    schedule(evidence) {
      const intervalMs = evidence.latestCorrect
        ? correct[Math.min(Math.max(0, evidence.consecutiveCorrect - 1), correct.length - 1)]
        : incorrect;
      return Object.freeze({ intervalMs });
    }
  });
}

export const bootstrapRevisionPolicy = createIntervalRevisionPolicy({
  id: 'bootstrap-binary-v1',
  incorrectIntervalMs: 10 * 60 * 1000,
  correctIntervalsMs: [DAY_MS, 3 * DAY_MS, 7 * DAY_MS, 14 * DAY_MS, 30 * DAY_MS]
});

export function projectQuestionEvidence(events, learnerId) {
  if (!Array.isArray(events) || typeof learnerId !== 'string' || !learnerId.trim()) {
    throw new TypeError('Events and a learnerId are required');
  }

  const seen = new Map();
  const relevant = [];

  for (const input of events) {
    const event = validateAttempt(input);
    const fingerprint = JSON.stringify(event);
    if (seen.has(event.eventId)) {
      if (seen.get(event.eventId) !== fingerprint) {
        throw new Error(`Conflicting eventId: ${event.eventId}`);
      }
      continue;
    }
    seen.set(event.eventId, fingerprint);
    if (event.learnerId === learnerId) relevant.push(event);
  }

  relevant.sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt) ||
    a.eventId.localeCompare(b.eventId));

  const rows = new Map();
  for (const event of relevant) {
    const current = rows.get(event.questionVersionId) ?? {
      questionVersionId: event.questionVersionId,
      conceptId: event.conceptId,
      attempts: 0,
      correct: 0,
      incorrect: 0,
      consecutiveCorrect: 0,
      latestCorrect: false,
      firstAttemptAt: event.occurredAt,
      lastAttemptAt: event.occurredAt,
      lastDurationMs: event.durationMs
    };

    if (current.conceptId !== event.conceptId) {
      throw new Error(`Question version mapped to multiple primary concepts: ${event.questionVersionId}`);
    }

    current.attempts += 1;
    if (event.correct) {
      current.correct += 1;
      current.consecutiveCorrect += 1;
    } else {
      current.incorrect += 1;
      current.consecutiveCorrect = 0;
    }
    current.latestCorrect = event.correct;
    if (event.occurredAt < current.firstAttemptAt) current.firstAttemptAt = event.occurredAt;
    if (event.occurredAt >= current.lastAttemptAt) {
      current.lastAttemptAt = event.occurredAt;
      current.lastDurationMs = event.durationMs;
      current.latestCorrect = event.correct;
    }
    rows.set(event.questionVersionId, current);
  }

  return [...rows.values()]
    .sort((a, b) => a.questionVersionId.localeCompare(b.questionVersionId))
    .map(row => Object.freeze({ ...row }));
}

export function buildRevisionQueue({
  events,
  learnerId,
  now,
  policy = bootstrapRevisionPolicy
}) {
  const at = canonicalInstant(now, 'now');
  if (!policy || typeof policy.id !== 'string' || typeof policy.schedule !== 'function') {
    throw new TypeError('A revision policy is required');
  }

  const nowMs = Date.parse(at);
  return projectQuestionEvidence(events, learnerId)
    .map(evidence => {
      const decision = policy.schedule(evidence);
      const intervalMs = nonnegativeInteger(decision?.intervalMs, 'policy intervalMs');
      const dueAtMs = Date.parse(evidence.lastAttemptAt) + intervalMs;
      const dueAt = new Date(dueAtMs).toISOString();
      return Object.freeze({
        questionVersionId: evidence.questionVersionId,
        conceptId: evidence.conceptId,
        policyId: policy.id,
        dueAt,
        due: dueAtMs <= nowMs,
        overdueMs: Math.max(0, nowMs - dueAtMs),
        evidence
      });
    })
    .sort((a, b) =>
      Number(b.due) - Number(a.due) ||
      b.overdueMs - a.overdueMs ||
      a.dueAt.localeCompare(b.dueAt) ||
      a.questionVersionId.localeCompare(b.questionVersionId));
}
