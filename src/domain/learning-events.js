const fields = ['schemaVersion', 'type', 'eventId', 'learnerId',
  'questionVersionId', 'conceptId', 'occurredAt', 'correct', 'durationMs'];

export function validateAttempt(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new TypeError('Attempt must be an object');
  }
  if (Object.keys(event).length !== fields.length ||
      fields.some(key => !Object.hasOwn(event, key))) {
    throw new TypeError('Unexpected or missing attempt fields');
  }
  if (event.schemaVersion !== 1 || event.type !== 'question.answered') {
    throw new TypeError('Unsupported event contract');
  }
  for (const key of ['eventId', 'learnerId', 'questionVersionId', 'conceptId']) {
    if (typeof event[key] !== 'string' || !event[key].trim()) {
      throw new TypeError(`Invalid ${key}`);
    }
  }
  if (typeof event.occurredAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(event.occurredAt) ||
      !Number.isFinite(Date.parse(event.occurredAt)) ||
      new Date(event.occurredAt).toISOString() !== event.occurredAt) {
    throw new TypeError('occurredAt must be a canonical UTC ISO timestamp');
  }
  if (typeof event.correct !== 'boolean' ||
      !Number.isSafeInteger(event.durationMs) || event.durationMs < 0) {
    throw new TypeError('Invalid answer outcome or duration');
  }
  return Object.freeze(Object.fromEntries(fields.map(key => [key, event[key]])));
}

export function summarizeAttempts(events, learnerId) {
  if (!Array.isArray(events) || typeof learnerId !== 'string' || !learnerId.trim()) {
    throw new TypeError('Events and a learnerId are required');
  }
  const seen = new Map();
  const concepts = new Map();
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
    if (event.learnerId !== learnerId) continue;
    const row = concepts.get(event.conceptId) ?? {
      conceptId: event.conceptId, attempts: 0, correct: 0,
    };
    row.attempts += 1;
    row.correct += Number(event.correct);
    concepts.set(event.conceptId, row);
  }
  const rows = [...concepts.values()].sort((a, b) =>
    a.conceptId < b.conceptId ? -1 : a.conceptId > b.conceptId ? 1 : 0);
  const attempts = rows.reduce((sum, row) => sum + row.attempts, 0);
  const correct = rows.reduce((sum, row) => sum + row.correct, 0);
  return {
    learnerId, attempts, correct, accuracy: attempts ? correct / attempts : null,
    concepts: rows.map(row => ({ ...row, accuracy: row.correct / row.attempts })),
  };
}
