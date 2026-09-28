import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateVisualInteractionEvent,
  visualMistakeObservation,
  visualStudySignal
} from '../src/domain/visual-interaction.js';

function event(overrides = {}) {
  return {
    schemaVersion: 1,
    eventName: 'media.interaction.completed',
    eventId: 'evt:visual:1',
    learnerId: 'learner:1',
    sessionId: 'session:1',
    attemptId: 'attempt:1',
    questionVersionId: 'question:image@1',
    conceptId: 'concept:visual-finding',
    mediaAssetVersionId: 'media:cxr@1',
    taskType: 'localization',
    occurredAt: '2026-09-28T10:00:00.000Z',
    latencyMs: 4200,
    response: { selectedConceptId: 'concept:visual-finding', text: null, geometry: { kind:'bbox', x:0.2, y:0.2, width:0.2, height:0.3 } },
    evaluation: { outcome:'incorrect', targetConceptId:'concept:visual-finding', localizationIoU:0.31, matchedAnnotationVersionId:'annotation:cxr@1' },
    helpUsed: false,
    interventionRef: null,
    ...overrides
  };
}

test('visual interaction preserves exact media/question/concept evidence without inferring mastery', () => {
  const result = validateVisualInteractionEvent(event());
  assert.equal(result.taskType, 'localization');
  assert.equal(result.mediaAssetVersionId, 'media:cxr@1');
  assert.throws(() => { result.evaluation.outcome = 'correct'; }, TypeError);
  const signal = visualStudySignal(result);
  assert.equal(signal.authoritativeForMastery, false);
});

test('localization requires learner geometry and keeps IoU localization-only', () => {
  const missing = event();
  missing.response = { ...missing.response, geometry:null };
  assert.throws(() => validateVisualInteractionEvent(missing), /Localization/);

  const interpretation = event({ taskType:'interpretation' });
  interpretation.response = { selectedConceptId:'concept:visual-finding', text:'finding', geometry:null };
  assert.throws(() => validateVisualInteractionEvent(interpretation), /IoU/);
});

test('visual errors become bounded mistake observations, not causal diagnoses', () => {
  const observation = visualMistakeObservation(event());
  assert.deepEqual(Object.keys(observation).sort(), [
    'conceptId','eventId','helpUsed','localizationIoU','mediaAssetVersionId','observationType',
    'outcome','schemaVersion','selectedConceptId','targetConceptId','taskType'
  ]);
  assert.equal(observation.observationType, 'visual_error');
  assert.equal('cause' in observation, false);
  assert.equal('mastery' in observation, false);
});

test('correct visual interactions do not create mistake observations', () => {
  const value = event();
  value.evaluation = { ...value.evaluation, outcome:'correct', localizationIoU:0.8 };
  assert.equal(visualMistakeObservation(value), null);
});

test('all five phase-1 visual task types are accepted', () => {
  for (const taskType of ['detection','localization','description','interpretation','discrimination']) {
    const value = event({ taskType });
    if (taskType !== 'localization') {
      value.response = { selectedConceptId:'concept:visual-finding', text:'observed response', geometry:null };
      value.evaluation = { ...value.evaluation, localizationIoU:null };
    }
    assert.equal(validateVisualInteractionEvent(value).taskType, taskType);
  }
});

test('geometry is normalized and bounded', () => {
  const value = event();
  value.response = { ...value.response, geometry:{ kind:'bbox', x:0.9, y:0.9, width:0.2, height:0.2 } };
  assert.throws(() => validateVisualInteractionEvent(value), /bbox/);
});

test('detection cannot record an empty learner response', () => {
  const value = event({ taskType:'detection' });
  value.response = { selectedConceptId:null, text:null, geometry:null };
  value.evaluation = { ...value.evaluation, localizationIoU:null };
  assert.throws(() => validateVisualInteractionEvent(value), /observable response/);
});


test('visual target concept must match the canonical event concept', () => {
  const value = event();
  value.evaluation = { ...value.evaluation, targetConceptId:'concept:other' };
  assert.throws(() => validateVisualInteractionEvent(value), /target concept mismatch/);
});

test('localization IoU requires the exact matched annotation version', () => {
  const value = event();
  value.evaluation = { ...value.evaluation, matchedAnnotationVersionId:null };
  assert.throws(() => validateVisualInteractionEvent(value), /matched annotation/);
});
