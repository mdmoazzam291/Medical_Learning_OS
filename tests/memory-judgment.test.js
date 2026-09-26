import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MEMORY_PROMPT_ID,
  MEMORY_RATING_SCALE,
  MEMORY_RATINGS,
  createMemoryJudgment,
  validateMemoryRating,
} from '../src/domain/memory-judgment.js';

test('FSRS-compatible four-grade scale remains explicit and stable', () => {
  assert.equal(MEMORY_RATING_SCALE, 'fsrs-4-v1');
  assert.equal(MEMORY_PROMPT_ID, 'post-answer-recall-v1');
  assert.deepEqual(
    Object.values(MEMORY_RATINGS).map(({ rating, label }) => [rating, label]),
    [[1, 'Again'], [2, 'Hard'], [3, 'Good'], [4, 'Easy']]
  );
});

test('memory rating rejects invented or fractional grades', () => {
  for (const value of [0, 5, 2.5, '3', null, undefined]) {
    assert.throws(() => validateMemoryRating(value), TypeError);
  }
});

test('memory judgment is immutable and independent from correctness', () => {
  const judgment = createMemoryJudgment({
    attemptId: '11111111-1111-4111-8111-111111111111',
    questionVersionId: 'question:v1',
    rating: 2,
    recordedAt: '2026-09-26T19:30:00.000Z',
  });
  assert.equal(judgment.type, 'memory.rating');
  assert.equal(judgment.ratingLabel, 'Hard');
  assert.equal(Object.hasOwn(judgment, 'correct'), false);
  assert.ok(Object.isFrozen(judgment));
});

test('memory judgment requires canonical timestamp and supported contract IDs', () => {
  const base = {
    attemptId: '11111111-1111-4111-8111-111111111111',
    questionVersionId: 'question:v1',
    rating: 3,
    recordedAt: '2026-09-26T19:30:00.000Z',
  };
  assert.throws(() => createMemoryJudgment({ ...base, recordedAt: 'not-a-date' }), TypeError);
  assert.throws(() => createMemoryJudgment({ ...base, scaleId: 'mystery-scale' }), TypeError);
  assert.throws(() => createMemoryJudgment({ ...base, promptId: 'mystery-prompt' }), TypeError);
});
