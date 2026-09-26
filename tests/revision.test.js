import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bootstrapRevisionPolicy,
  buildRevisionQueue,
  createIntervalRevisionPolicy,
  projectQuestionEvidence
} from '../src/domain/revision.js';

const event = (overrides = {}) => ({
  schemaVersion: 1,
  type: 'question.answered',
  eventId: overrides.eventId ?? crypto.randomUUID(),
  learnerId: overrides.learnerId ?? 'learner-a',
  questionVersionId: overrides.questionVersionId ?? 'q@1',
  conceptId: overrides.conceptId ?? 'concept:a',
  occurredAt: overrides.occurredAt ?? '2026-09-26T10:00:00.000Z',
  correct: overrides.correct ?? true,
  durationMs: overrides.durationMs ?? 1000
});

test('revision evidence is rebuilt from immutable attempts and learner-scoped', () => {
  const rows = projectQuestionEvidence([
    event({ eventId: 'e1', correct: true }),
    event({ eventId: 'e2', occurredAt: '2026-09-27T10:00:00.000Z', correct: true }),
    event({ eventId: 'e3', learnerId: 'learner-b', correct: false })
  ], 'learner-a');

  assert.deepEqual(rows, [{
    questionVersionId: 'q@1',
    conceptId: 'concept:a',
    attempts: 2,
    correct: 2,
    incorrect: 0,
    consecutiveCorrect: 2,
    latestCorrect: true,
    firstAttemptAt: '2026-09-26T10:00:00.000Z',
    lastAttemptAt: '2026-09-27T10:00:00.000Z',
    lastDurationMs: 1000
  }]);
});

test('incorrect answer resets consecutive correctness without erasing history', () => {
  const [row] = projectQuestionEvidence([
    event({ eventId: 'e1', correct: true }),
    event({ eventId: 'e2', occurredAt: '2026-09-27T10:00:00.000Z', correct: false })
  ], 'learner-a');

  assert.equal(row.attempts, 2);
  assert.equal(row.correct, 1);
  assert.equal(row.incorrect, 1);
  assert.equal(row.consecutiveCorrect, 0);
  assert.equal(row.latestCorrect, false);
});

test('revision queue uses explicit versioned policy and deterministic due ordering', () => {
  const policy = createIntervalRevisionPolicy({
    id: 'test-policy-v1',
    incorrectIntervalMs: 0,
    correctIntervalsMs: [24 * 60 * 60 * 1000]
  });
  const queue = buildRevisionQueue({
    events: [
      event({ eventId: 'a', questionVersionId: 'a@1', correct: false, occurredAt: '2026-09-26T09:00:00.000Z' }),
      event({ eventId: 'b', questionVersionId: 'b@1', conceptId: 'concept:b', correct: true, occurredAt: '2026-09-26T09:00:00.000Z' })
    ],
    learnerId: 'learner-a',
    now: '2026-09-26T10:00:00.000Z',
    policy
  });

  assert.equal(queue[0].questionVersionId, 'a@1');
  assert.equal(queue[0].due, true);
  assert.equal(queue[0].policyId, 'test-policy-v1');
  assert.equal(queue[1].due, false);
});

test('bootstrap policy is explicitly provisional binary scheduling, not mastery', () => {
  assert.equal(bootstrapRevisionPolicy.id, 'bootstrap-binary-v1');
  assert.equal(bootstrapRevisionPolicy.kind, 'interval-policy');
  assert.equal(bootstrapRevisionPolicy.version, 1);
});

test('identical retries deduplicate and conflicting event ids fail closed', () => {
  const same = event({ eventId: 'same' });
  assert.equal(projectQuestionEvidence([same, same], 'learner-a')[0].attempts, 1);
  assert.throws(() => projectQuestionEvidence([
    same,
    { ...same, correct: false }
  ], 'learner-a'), /Conflicting eventId/);
});


test('projection is deterministic when input event order changes', () => {
  const first = event({ eventId: 'first', correct: true, occurredAt: '2026-09-26T09:00:00.000Z' });
  const second = event({ eventId: 'second', correct: false, occurredAt: '2026-09-26T10:00:00.000Z' });
  const ordered = projectQuestionEvidence([first, second], 'learner-a');
  const reversed = projectQuestionEvidence([second, first], 'learner-a');
  assert.deepEqual(reversed, ordered);
  assert.equal(ordered[0].latestCorrect, false);
  assert.equal(ordered[0].consecutiveCorrect, 0);
});
