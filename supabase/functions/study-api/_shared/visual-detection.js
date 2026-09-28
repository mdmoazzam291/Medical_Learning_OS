function fail(message) { throw new TypeError(message); }
function text(value, label, max = 240) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`Invalid ${label}`);
  return value.trim();
}
function integer(value, label, min = 0, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) fail(`Invalid ${label}`);
  return value;
}
function primaryConceptId(question) {
  const links = Array.isArray(question?.conceptLinks) ? question.conceptLinks : [];
  const primary = links.find(link => link?.role === 'primary');
  return text(primary?.conceptId, 'primary concept id');
}
function selectedOption(question, optionId) {
  if (!Array.isArray(question?.options)) fail('Invalid question options');
  const selected = question.options.find(option => option?.optionId === optionId);
  if (!selected || typeof selected.text !== 'string' || !selected.text.trim()) fail('Invalid selected option');
  return selected;
}
function freeze(value) {
  const copy = structuredClone(value);
  const visit = item => {
    if (item && typeof item === 'object') {
      Object.values(item).forEach(visit);
      Object.freeze(item);
    }
    return item;
  };
  return visit(copy);
}

export function buildServerScoredVisualDetectionEvent({
  visualEventId,
  learnerId,
  sessionId,
  attemptEvent,
  question,
  selectedOptionId,
  mediaAssetVersionId,
  occurredAt,
  latencyMs,
  helpUsed,
  interventionRef = null
}) {
  text(visualEventId, 'visualEventId');
  text(learnerId, 'learnerId');
  text(sessionId, 'sessionId');
  text(selectedOptionId, 'selectedOptionId');
  text(mediaAssetVersionId, 'mediaAssetVersionId');
  text(occurredAt, 'occurredAt');
  integer(latencyMs, 'latencyMs', 0, 3600000);
  if (typeof helpUsed !== 'boolean') fail('Invalid helpUsed');
  if (interventionRef !== null) text(interventionRef, 'interventionRef');

  if (!attemptEvent || typeof attemptEvent !== 'object' || Array.isArray(attemptEvent)) {
    fail('Invalid attempt event');
  }
  if (attemptEvent.schemaVersion !== 1 ||
      attemptEvent.type !== 'question.answered' ||
      attemptEvent.learnerId !== learnerId) {
    fail('Attempt event identity mismatch');
  }

  const questionVersionId = text(question?.questionVersionId, 'questionVersionId');
  const conceptId = primaryConceptId(question);
  const answerOptionId = text(question?.answerOptionId, 'answerOptionId');
  const selected = selectedOption(question, selectedOptionId);
  const correct = selectedOptionId === answerOptionId;

  if (attemptEvent.questionVersionId !== questionVersionId ||
      attemptEvent.conceptId !== conceptId ||
      attemptEvent.correct !== correct) {
    fail('Attempt event scoring mismatch');
  }

  return freeze({
    schemaVersion: 1,
    eventName: 'media.interaction.completed',
    eventId: visualEventId,
    learnerId,
    sessionId,
    attemptId: text(attemptEvent.eventId, 'attempt event id'),
    questionVersionId,
    conceptId,
    mediaAssetVersionId,
    taskType: 'detection',
    occurredAt,
    latencyMs,
    response: {
      selectedConceptId: correct ? conceptId : null,
      text: selected.text.trim(),
      geometry: null
    },
    evaluation: {
      outcome: correct ? 'correct' : 'incorrect',
      targetConceptId: conceptId,
      localizationIoU: null,
      matchedAnnotationVersionId: null
    },
    helpUsed,
    interventionRef
  });
}
