import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAttempt, summarizeAttempts } from '../src/domain/learning-events.js';

const attempt = (overrides = {}) => ({
  schemaVersion: 1, type: 'question.answered', eventId: 'event-1',
  learnerId: 'learner-1', questionVersionId: 'question-1:v1', conceptId: 'concept-1',
  occurredAt: '2026-09-25T00:00:00.000Z', correct: true, durationMs: 1000,
  ...overrides,
});

test('empty evidence produces unknown accuracy', () => {
  assert.deepEqual(summarizeAttempts([], 'learner-1'), {
    learnerId: 'learner-1', attempts: 0, correct: 0, accuracy: null, concepts: [],
  });
});
test('summary isolates learner and deduplicates retries regardless of key order', () => {
  const first = attempt();
  const reordered = Object.fromEntries(Object.entries(first).reverse());
  const summary = summarizeAttempts([first, reordered,
    attempt({ eventId: 'event-2', correct: false }),
    attempt({ eventId: 'event-3', learnerId: 'other' })], 'learner-1');
  assert.equal(summary.attempts, 2);
  assert.equal(summary.accuracy, 0.5);
  assert.equal(summary.concepts[0].accuracy, 0.5);
});
test('conflicting duplicate event IDs are rejected', () => {
  assert.throws(() => summarizeAttempts([attempt(), attempt({ correct: false })],
    'learner-1'), /Conflicting/);
});
test('invalid contracts and impossible dates are rejected', () => {
  for (const patch of [{ schemaVersion: 2 }, { correct: 'true' },
    { durationMs: -1 }, { durationMs: 1.5 }, { learnerId: ' ' },
    { occurredAt: '2026-02-30T00:00:00.000Z' }, { occurredAt: 'not-a-date' },
    { secret: 'unexpected' }, { type: 'unsupported' }]) {
    assert.throws(() => validateAttempt(attempt(patch)), TypeError);
  }
  const missing = attempt();
  delete missing.conceptId;
  assert.throws(() => validateAttempt(missing), TypeError);
});
test('validation creates an immutable copy without modifying input', () => {
  const original = attempt();
  const result = validateAttempt(original);
  assert.ok(Object.isFrozen(result));
  assert.notEqual(result, original);
  assert.equal(Object.isFrozen(original), false);
});
test('projection is independent of input order and handles unusual concept IDs', () => {
  const events = [attempt({ conceptId: '__proto__' }),
    attempt({ eventId: 'event-2', conceptId: 'another', correct: false })];
  assert.deepEqual(summarizeAttempts(events, 'learner-1'),
    summarizeAttempts([...events].reverse(), 'learner-1'));
  assert.equal(summarizeAttempts(events, 'learner-1').concepts.length, 2);
});
