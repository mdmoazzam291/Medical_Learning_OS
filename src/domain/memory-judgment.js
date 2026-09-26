export const MEMORY_RATING_SCALE = 'fsrs-4-v1';
export const MEMORY_PROMPT_ID = 'post-answer-recall-v1';

export const MEMORY_RATINGS = Object.freeze({
  1: Object.freeze({ rating: 1, label: 'Again' }),
  2: Object.freeze({ rating: 2, label: 'Hard' }),
  3: Object.freeze({ rating: 3, label: 'Good' }),
  4: Object.freeze({ rating: 4, label: 'Easy' }),
});

export function validateMemoryRating(value) {
  if (!Number.isSafeInteger(value) || !MEMORY_RATINGS[value]) {
    throw new TypeError('Memory rating must be an integer from 1 to 4');
  }
  return value;
}

export function createMemoryJudgment({
  attemptId,
  questionVersionId,
  rating,
  recordedAt,
  scaleId = MEMORY_RATING_SCALE,
  promptId = MEMORY_PROMPT_ID,
}) {
  if (typeof attemptId !== 'string' || !attemptId.trim()) {
    throw new TypeError('attemptId is required');
  }
  if (typeof questionVersionId !== 'string' || !questionVersionId.trim()) {
    throw new TypeError('questionVersionId is required');
  }
  validateMemoryRating(rating);
  if (typeof recordedAt !== 'string' ||
      !Number.isFinite(Date.parse(recordedAt)) ||
      new Date(recordedAt).toISOString() !== recordedAt) {
    throw new TypeError('recordedAt must be a canonical UTC ISO timestamp');
  }
  if (scaleId !== MEMORY_RATING_SCALE || promptId !== MEMORY_PROMPT_ID) {
    throw new TypeError('Unsupported memory judgment contract');
  }
  return Object.freeze({
    schemaVersion: 1,
    type: 'memory.rating',
    attemptId,
    questionVersionId,
    rating,
    ratingLabel: MEMORY_RATINGS[rating].label,
    scaleId,
    promptId,
    recordedAt,
  });
}
