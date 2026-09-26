import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFsrsShadowEvidence } from '../src/domain/fsrs-shadow.js';

const attempt = (overrides = {}) => ({
  schemaVersion: 1,
  type: 'question.answered',
  eventId: overrides.eventId ?? 'a1',
  learnerId: overrides.learnerId ?? 'learner-a',
  questionVersionId: overrides.questionVersionId ?? 'q@1',
  conceptId: overrides.conceptId ?? 'c1',
  occurredAt: overrides.occurredAt ?? '2026-09-27T00:00:00.000Z',
  correct: overrides.correct ?? true,
  durationMs: overrides.durationMs ?? 30000
});

const judgment = (overrides = {}) => ({
  attemptId: overrides.attemptId ?? 'a1',
  questionVersionId: overrides.questionVersionId ?? 'q@1',
  rating: overrides.rating ?? 3,
  recordedAt: overrides.recordedAt ?? '2026-09-27T00:00:05.000Z',
  scaleId: 'fsrs-4-v1',
  promptId: 'post-answer-recall-v1'
});

test('shadow evidence preserves missing ratings instead of inferring them', () => {
  const result = buildFsrsShadowEvidence({
    learnerId: 'learner-a',
    attempts: [
      attempt({ eventId: 'a1' }),
      attempt({ eventId: 'a2', occurredAt: '2026-09-27T01:00:00.000Z' })
    ],
    judgments: [judgment({ attemptId: 'a1' })]
  });
  assert.equal(result.totalAttempts, 2);
  assert.equal(result.ratedAttempts, 1);
  assert.equal(result.unratedAttempts, 1);
  assert.equal(result.ratingCoverage, 0.5);
  assert.equal(result.fsrsControlsDueDates, false);
});

test('shadow replay log keeps correctness and rating as independent signals', () => {
  const result = buildFsrsShadowEvidence({
    learnerId: 'learner-a',
    attempts: [
      attempt({ eventId: 'wrong', correct: false }),
      attempt({ eventId: 'right', correct: true, occurredAt: '2026-09-27T01:00:00.000Z' })
    ],
    judgments: [
      judgment({ attemptId: 'wrong', rating: 4, recordedAt: '2026-09-27T00:00:03.000Z' }),
      judgment({ attemptId: 'right', rating: 1, recordedAt: '2026-09-27T01:00:02.000Z' })
    ]
  });
  assert.equal(result.discordance.incorrectGoodOrEasy, 1);
  assert.equal(result.discordance.correctAgain, 1);
  assert.equal(result.discordance.total, 2);
  assert.equal(result.reviews[0].correct, false);
  assert.equal(result.reviews[0].ratingLabel, 'Easy');
});

test('shadow replay is chronological and records rating lag', () => {
  const result = buildFsrsShadowEvidence({
    learnerId: 'learner-a',
    attempts: [
      attempt({ eventId: 'later', occurredAt: '2026-09-27T02:00:00.000Z' }),
      attempt({ eventId: 'earlier', occurredAt: '2026-09-27T01:00:00.000Z' })
    ],
    judgments: [
      judgment({ attemptId: 'later', recordedAt: '2026-09-27T02:00:07.000Z' }),
      judgment({ attemptId: 'earlier', recordedAt: '2026-09-27T01:00:04.000Z' })
    ]
  });
  assert.deepEqual(result.reviews.map(review => review.attemptId), ['earlier', 'later']);
  assert.deepEqual(result.reviews.map(review => review.ratingLagMs), [4000, 7000]);
});

test('shadow evidence rejects orphan and mismatched judgments', () => {
  assert.throws(() => buildFsrsShadowEvidence({
    learnerId: 'learner-a',
    attempts: [attempt()],
    judgments: [judgment({ attemptId: 'missing' })]
  }), /unknown learner attempt/);

  assert.throws(() => buildFsrsShadowEvidence({
    learnerId: 'learner-a',
    attempts: [attempt()],
    judgments: [judgment({ questionVersionId: 'other@1' })]
  }), /question mismatch/);
});

test('no ratings means no replayable FSRS evidence and no fabricated coverage', () => {
  const result = buildFsrsShadowEvidence({
    learnerId: 'learner-a',
    attempts: [attempt()],
    judgments: []
  });
  assert.equal(result.ratedAttempts, 0);
  assert.equal(result.hasReplayableEvidence, false);
  assert.equal(result.ratingCoverage, 0);
  assert.deepEqual(result.reviews, []);
});
