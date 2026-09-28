const taskTypes = new Set(['detection','localization','description','interpretation','discrimination']);
const outcomes = new Set(['correct','incorrect','partial','unanswered']);
const geometryKinds = new Set(['point','bbox','polygon']);

function fail(message) { throw new TypeError(message); }
function plain(value) { return !!value && typeof value === 'object' && !Array.isArray(value); }
function exact(value, keys, label) {
  if (!plain(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    fail(`Invalid ${label}`);
  }
}
function text(value, label, max = 240) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) fail(`Invalid ${label}`);
  return value.trim();
}
function nullableText(value, label, max = 480) {
  return value === null ? null : text(value, label, max);
}
function timestamp(value, label) {
  text(value, label, 40);
  if (!Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail(`Invalid ${label}`);
  return value;
}
function normalized(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) fail(`Invalid ${label}`);
}
function geometry(value) {
  if (value === null) return;
  if (!plain(value) || !geometryKinds.has(value.kind)) fail('Invalid response geometry');
  if (value.kind === 'point') {
    exact(value, ['kind','x','y'], 'point geometry'); normalized(value.x,'x'); normalized(value.y,'y'); return;
  }
  if (value.kind === 'bbox') {
    exact(value, ['kind','x','y','width','height'], 'bbox geometry');
    normalized(value.x,'x'); normalized(value.y,'y'); normalized(value.width,'width'); normalized(value.height,'height');
    if (value.width <= 0 || value.height <= 0 || value.x + value.width > 1 || value.y + value.height > 1) fail('Invalid bbox geometry');
    return;
  }
  exact(value, ['kind','points'], 'polygon geometry');
  if (!Array.isArray(value.points) || value.points.length < 3 || value.points.length > 64) fail('Invalid polygon geometry');
  for (const point of value.points) {
    exact(point,['x','y'],'polygon point'); normalized(point.x,'x'); normalized(point.y,'y');
  }
}
function freeze(value) {
  const copy = structuredClone(value);
  const visit = item => {
    if (item && typeof item === 'object') { Object.values(item).forEach(visit); Object.freeze(item); }
    return item;
  };
  return visit(copy);
}

export function validateVisualInteractionEvent(input) {
  exact(input, [
    'schemaVersion','eventName','eventId','learnerId','sessionId','attemptId','questionVersionId',
    'conceptId','mediaAssetVersionId','taskType','occurredAt','latencyMs','response','evaluation',
    'helpUsed','interventionRef'
  ], 'visual interaction event');
  if (input.schemaVersion !== 1 || input.eventName !== 'media.interaction.completed') fail('Unsupported visual interaction event');
  for (const key of ['eventId','learnerId','sessionId','attemptId','questionVersionId','conceptId','mediaAssetVersionId']) text(input[key], key);
  if (!taskTypes.has(input.taskType)) fail('Invalid visual task type');
  timestamp(input.occurredAt, 'occurredAt');
  if (!Number.isSafeInteger(input.latencyMs) || input.latencyMs < 0 || input.latencyMs > 3600000) fail('Invalid latencyMs');

  exact(input.response, ['selectedConceptId','text','geometry'], 'visual response');
  if (input.response.selectedConceptId !== null) text(input.response.selectedConceptId,'selectedConceptId');
  nullableText(input.response.text,'response text',2000);
  geometry(input.response.geometry);

  exact(input.evaluation, ['outcome','targetConceptId','localizationIoU','matchedAnnotationVersionId'], 'visual evaluation');
  if (!outcomes.has(input.evaluation.outcome)) fail('Invalid visual outcome');
  text(input.evaluation.targetConceptId,'targetConceptId');
  if (input.evaluation.localizationIoU !== null) normalized(input.evaluation.localizationIoU,'localizationIoU');
  if (input.evaluation.matchedAnnotationVersionId !== null) text(input.evaluation.matchedAnnotationVersionId,'matchedAnnotationVersionId');

  if (input.taskType === 'localization' && input.response.geometry === null) fail('Localization requires learner geometry');
  if (input.taskType !== 'localization' && input.evaluation.localizationIoU !== null) fail('IoU is localization-only');
  if (input.taskType === 'detection' && input.response.selectedConceptId === null && input.response.text === null) fail('Detection requires an observable response');
  if (typeof input.helpUsed !== 'boolean') fail('Invalid helpUsed');
  if (input.interventionRef !== null) text(input.interventionRef,'interventionRef');

  return freeze(input);
}

export function visualMistakeObservation(event) {
  const current = validateVisualInteractionEvent(event);
  if (current.evaluation.outcome === 'correct') return null;
  return freeze({
    schemaVersion: 1,
    observationType: 'visual_error',
    eventId: current.eventId,
    conceptId: current.conceptId,
    mediaAssetVersionId: current.mediaAssetVersionId,
    taskType: current.taskType,
    outcome: current.evaluation.outcome,
    selectedConceptId: current.response.selectedConceptId,
    targetConceptId: current.evaluation.targetConceptId,
    localizationIoU: current.evaluation.localizationIoU,
    helpUsed: current.helpUsed
  });
}

export function visualStudySignal(event) {
  const current = validateVisualInteractionEvent(event);
  return freeze({
    schemaVersion: 1,
    signalType: 'visual_learning_evidence',
    eventId: current.eventId,
    conceptId: current.conceptId,
    taskType: current.taskType,
    outcome: current.evaluation.outcome,
    latencyMs: current.latencyMs,
    helpUsed: current.helpUsed,
    authoritativeForMastery: false
  });
}
