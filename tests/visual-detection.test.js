import test from 'node:test';
import assert from 'node:assert/strict';
import { buildServerScoredVisualDetectionEvent } from '../supabase/functions/study-api/_shared/visual-detection.js';

const question = {
  questionVersionId:'visual:pathology:clear-cell-rcc@1',
  answerOptionId:'ccrcc',
  conceptLinks:[{ role:'primary', conceptId:'visual:pathology:clear-cell-rcc' }],
  options:[
    { optionId:'ccrcc', text:'Clear cell renal cell carcinoma' },
    { optionId:'papillary-rcc', text:'Papillary renal cell carcinoma' }
  ]
};

function attempt(optionId) {
  return {
    schemaVersion:1,
    type:'question.answered',
    eventId:'11111111-1111-4111-8111-111111111111',
    learnerId:'22222222-2222-4222-8222-222222222222',
    questionVersionId:question.questionVersionId,
    conceptId:'visual:pathology:clear-cell-rcc',
    occurredAt:'2026-09-28T11:30:00.000Z',
    correct:optionId==='ccrcc',
    durationMs:4000
  };
}

const base = {
  visualEventId:'33333333-3333-4333-8333-333333333333',
  learnerId:'22222222-2222-4222-8222-222222222222',
  sessionId:'44444444-4444-4444-8444-444444444444',
  question,
  mediaAssetVersionId:'media:pathology:clear-cell-rcc-grade1@1',
  occurredAt:'2026-09-28T11:30:00.000Z',
  latencyMs:4000,
  helpUsed:false,
  interventionRef:null
};

test('server-scored visual detection derives correct outcome from canonical answer key', () => {
  const event=buildServerScoredVisualDetectionEvent({
    ...base,
    attemptEvent:attempt('ccrcc'),
    selectedOptionId:'ccrcc'
  });
  assert.equal(event.evaluation.outcome,'correct');
  assert.equal(event.response.selectedConceptId,'visual:pathology:clear-cell-rcc');
  assert.equal(event.response.text,'Clear cell renal cell carcinoma');
  assert.equal(event.attemptId,'11111111-1111-4111-8111-111111111111');
});

test('wrong option is preserved without inventing a distractor concept', () => {
  const event=buildServerScoredVisualDetectionEvent({
    ...base,
    attemptEvent:attempt('papillary-rcc'),
    selectedOptionId:'papillary-rcc'
  });
  assert.equal(event.evaluation.outcome,'incorrect');
  assert.equal(event.response.selectedConceptId,null);
  assert.equal(event.response.text,'Papillary renal cell carcinoma');
});

test('helper rejects client/server scoring disagreement', () => {
  assert.throws(() => buildServerScoredVisualDetectionEvent({
    ...base,
    attemptEvent:{ ...attempt('papillary-rcc'), correct:true },
    selectedOptionId:'papillary-rcc'
  }),/scoring mismatch/);
});
