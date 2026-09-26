import { validateAttempt } from './learning-events.js';
import {
  MEMORY_PROMPT_ID,
  MEMORY_RATING_SCALE,
  createMemoryJudgment
} from './memory-judgment.js';

function normalizeJudgment(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Memory judgment must be an object');
  }
  return createMemoryJudgment({
    attemptId: input.attemptId,
    questionVersionId: input.questionVersionId,
    rating: input.rating,
    recordedAt: input.recordedAt,
    scaleId: input.scaleId ?? MEMORY_RATING_SCALE,
    promptId: input.promptId ?? MEMORY_PROMPT_ID
  });
}

export function buildFsrsShadowEvidence({ attempts, judgments, learnerId }) {
  if (!Array.isArray(attempts) || !Array.isArray(judgments) ||
      typeof learnerId !== 'string' || !learnerId.trim()) {
    throw new TypeError('attempts, judgments and learnerId are required');
  }

  const attemptById = new Map();
  const learnerAttempts = [];
  for (const input of attempts) {
    const attempt = validateAttempt(input);
    if (attempt.learnerId !== learnerId) continue;
    const fingerprint = JSON.stringify(attempt);
    const prior = attemptById.get(attempt.eventId);
    if (prior && prior.fingerprint !== fingerprint) {
      throw new Error(`Conflicting attempt eventId: ${attempt.eventId}`);
    }
    if (!prior) {
      attemptById.set(attempt.eventId, { attempt, fingerprint });
      learnerAttempts.push(attempt);
    }
  }

  const judgmentByAttempt = new Map();
  for (const input of judgments) {
    const judgment = normalizeJudgment(input);
    const linked = attemptById.get(judgment.attemptId)?.attempt;
    if (!linked) throw new Error(`Memory judgment references unknown learner attempt: ${judgment.attemptId}`);
    if (linked.questionVersionId !== judgment.questionVersionId) {
      throw new Error(`Memory judgment question mismatch: ${judgment.attemptId}`);
    }
    const prior = judgmentByAttempt.get(judgment.attemptId);
    if (prior && JSON.stringify(prior) !== JSON.stringify(judgment)) {
      throw new Error(`Conflicting memory judgment: ${judgment.attemptId}`);
    }
    judgmentByAttempt.set(judgment.attemptId, judgment);
  }

  learnerAttempts.sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt) ||
    a.eventId.localeCompare(b.eventId));

  const ratingCounts = { Again: 0, Hard: 0, Good: 0, Easy: 0 };
  let correctAgain = 0;
  let incorrectGoodOrEasy = 0;
  const reviews = [];

  for (const attempt of learnerAttempts) {
    const judgment = judgmentByAttempt.get(attempt.eventId);
    if (!judgment) continue;
    ratingCounts[judgment.ratingLabel] += 1;
    if (attempt.correct && judgment.rating === 1) correctAgain += 1;
    if (!attempt.correct && judgment.rating >= 3) incorrectGoodOrEasy += 1;

    reviews.push(Object.freeze({
      attemptId: attempt.eventId,
      questionVersionId: attempt.questionVersionId,
      conceptId: attempt.conceptId,
      reviewedAt: attempt.occurredAt,
      ratedAt: judgment.recordedAt,
      rating: judgment.rating,
      ratingLabel: judgment.ratingLabel,
      correct: attempt.correct,
      durationMs: attempt.durationMs,
      ratingLagMs: Math.max(0, Date.parse(judgment.recordedAt) - Date.parse(attempt.occurredAt))
    }));
  }

  const totalAttempts = learnerAttempts.length;
  const ratedAttempts = reviews.length;
  const questionIds = new Set(reviews.map(review => review.questionVersionId));

  return Object.freeze({
    learnerId,
    scaleId: MEMORY_RATING_SCALE,
    promptId: MEMORY_PROMPT_ID,
    livePolicyId: 'bootstrap-binary-v1',
    fsrsControlsDueDates: false,
    totalAttempts,
    ratedAttempts,
    unratedAttempts: totalAttempts - ratedAttempts,
    ratingCoverage: totalAttempts ? ratedAttempts / totalAttempts : null,
    ratedQuestionCount: questionIds.size,
    ratingCounts: Object.freeze({ ...ratingCounts }),
    discordance: Object.freeze({
      correctAgain,
      incorrectGoodOrEasy,
      total: correctAgain + incorrectGoodOrEasy
    }),
    hasReplayableEvidence: ratedAttempts > 0,
    reviews: Object.freeze(reviews)
  });
}
