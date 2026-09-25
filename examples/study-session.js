import { summarizeAttempts } from '../src/domain/learning-events.js';

// Synthetic events only: no medical content or persistence.
const events = [true, false, true].map((correct, index) => ({
  schemaVersion: 1, type: 'question.answered', eventId: `demo-${index}`,
  learnerId: 'demo-learner', questionVersionId: `synthetic-${index}:v1`,
  conceptId: 'synthetic-concept', occurredAt: '2026-09-25T00:00:00.000Z',
  correct, durationMs: 30000,
}));
console.log(JSON.stringify(summarizeAttempts(events, 'demo-learner'), null, 2));
