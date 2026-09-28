import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGtAutopsyV1 } from '../supabase/functions/study-api/_shared/gt-autopsy.js';

const completedRun = () => ({
  schemaVersion: 1,
  engineId: 'locked-time-sections-v1',
  runId: 'run-gt-1',
  examId: 'neet-pg',
  ruleSetId: 'neet-pg:2026@1',
  startedAt: '2026-09-28T00:00:00.000Z',
  scheduledEndAt: '2026-09-28T00:02:00.000Z',
  status: 'completed',
  currentSectionIndex: null,
  completedAt: '2026-09-28T00:02:00.000Z',
  assembly: { testingOnly: true, productionEquivalent: false },
  sections: [
    { sectionId: 'A', label: 'Section A', questionVersionIds: ['q1@1','q2@1'], closedAt: '2026-09-28T00:01:00.000Z' },
    { sectionId: 'B', label: 'Section B', questionVersionIds: ['q3@1','q4@1'], closedAt: '2026-09-28T00:02:00.000Z' }
  ],
  responses: {
    'q1@1': { optionId: 'A', markedForReview: false, answeredAt: '2026-09-28T00:00:10.000Z', updatedAt: '2026-09-28T00:00:20.000Z' },
    'q2@1': { optionId: 'B', markedForReview: true, answeredAt: '2026-09-28T00:00:25.000Z', updatedAt: '2026-09-28T00:00:35.000Z' },
    'q4@1': { optionId: 'C', markedForReview: false, answeredAt: '2026-09-28T00:01:20.000Z', updatedAt: '2026-09-28T00:01:20.000Z' }
  }
});

const questions = [
  { questionVersionId:'q1@1', answerOptionId:'A', conceptLinks:[{conceptId:'c1',role:'primary'}] },
  { questionVersionId:'q2@1', answerOptionId:'A', conceptLinks:[{conceptId:'c1',role:'primary'}] },
  { questionVersionId:'q3@1', answerOptionId:'B', conceptLinks:[{conceptId:'c2',role:'primary'}] },
  { questionVersionId:'q4@1', answerOptionId:'C', conceptLinks:[{conceptId:'c3',role:'primary'}] }
];
const concepts = [
  { conceptId:'c1', label:'Concept one', subjectTags:['medicine'] },
  { conceptId:'c2', label:'Concept two', subjectTags:['surgery'] },
  { conceptId:'c3', label:'Concept three', subjectTags:['pathology'] }
];
const receipt = {
  contractId:'exam-completion-v1',
  totalQuestions:4,
  correct:2,
  incorrect:1,
  unanswered:1,
  markedForReview:1,
  score:7,
  scoring:{correct:4,incorrect:-1,unanswered:0,markedForReviewScored:true}
};
const events = [
  { revision_after:1, event_type:'answer.set', event:{questionVersionId:'q1@1',optionId:'B'} },
  { revision_after:2, event_type:'answer.set', event:{questionVersionId:'q1@1',optionId:'A'} },
  { revision_after:3, event_type:'answer.set', event:{questionVersionId:'q2@1',optionId:'A'} },
  { revision_after:4, event_type:'answer.set', event:{questionVersionId:'q2@1',optionId:'B'} },
  { revision_after:5, event_type:'review.set', event:{questionVersionId:'q2@1',markedForReview:true} },
  { revision_after:6, event_type:'answer.set', event:{questionVersionId:'q4@1',optionId:'C'} }
];
const media = [
  { questionVersionId:'q2@1', modality:'radiology' },
  { questionVersionId:'q4@1', modality:'pathology' }
];

test('GT Autopsy v1 reproduces trusted result and section anatomy without mastery inference', () => {
  const result = buildGtAutopsyV1({ run:completedRun(), receipt, questions, concepts, events, media });
  assert.equal(result.contractId, 'gt-autopsy-v1');
  assert.deepEqual(result.result, {
    totalQuestions:4, correct:2, incorrect:1, unanswered:1, markedForReview:1, score:7,
    scoring:receipt.scoring
  });
  assert.deepEqual(result.sections.map(s => ({
    id:s.sectionId, correct:s.correct, incorrect:s.incorrect, unanswered:s.unanswered, score:s.score
  })), [
    { id:'A', correct:1, incorrect:1, unanswered:0, score:3 },
    { id:'B', correct:1, incorrect:0, unanswered:1, score:4 }
  ]);
  assert.equal(result.masteryInferenceEnabled, false);
  assert.equal(result.inferenceAuthority, false);
  assert.equal(result.rootCause.status, 'not_inferred');
});

test('GT Autopsy exposes concept and visual evidence without calling them mastery', () => {
  const result = buildGtAutopsyV1({ run:completedRun(), receipt, questions, concepts, events, media });
  const c1 = result.concepts.find(c => c.conceptId === 'c1');
  assert.deepEqual(c1, {
    conceptId:'c1', label:'Concept one', subjectTags:['medicine'],
    attempts:2, correct:1, incorrect:1, unanswered:0, markedForReview:1
  });
  assert.deepEqual(result.visual, {
    questionCount:2, correct:1, incorrect:1, unanswered:0, markedForReview:1,
    score:3, modalities:['pathology','radiology']
  });
  assert.match(result.limitations.join(' '), /not-mastery-estimates/);
});

test('answer-change analysis is exact observed behavior, including score impact', () => {
  const result = buildGtAutopsyV1({ run:completedRun(), receipt, questions, concepts, events, media });
  assert.deepEqual(result.behavior, {
    answerSetEventCount:5,
    answerChangedQuestionCount:2,
    answerChangeCount:2,
    beneficialChangeCount:1,
    harmfulChangeCount:1,
    wrongToWrongChangeCount:0,
    clearedAnswerCount:0,
    reviewToggleCount:1,
    answerChangeScoreImpact:0
  });
});

test('prescription layer is compressed to observed-error candidates and carries no inference authority', () => {
  const result = buildGtAutopsyV1({ run:completedRun(), receipt, questions, concepts, events, media });
  assert.equal(result.prescription.status, 'descriptive-candidates-only');
  assert.deepEqual(result.prescription.candidates.map(x => x.conceptId), ['c1','c2']);
  assert.ok(result.prescription.candidates.every(x =>
    x.suggestedAction === 'review-and-retest' && x.inferenceAuthority === false
  ));
  assert.equal(result.preventableMarksInferenceEnabled, false);
  assert.equal(result.fatigueInferenceEnabled, false);
  assert.equal(result.confidenceCalibrationEnabled, false);
});

test('GT Autopsy rejects cancelled/in-progress runs and inconsistent receipts', () => {
  const cancelled = completedRun();
  cancelled.status = 'cancelled';
  cancelled.completedAt = null;
  assert.throws(
    () => buildGtAutopsyV1({ run:cancelled, receipt, questions, concepts, events, media }),
    /requires_completed_run/
  );
  const badReceipt = { ...receipt, correct: 3 };
  assert.throws(
    () => buildGtAutopsyV1({ run:completedRun(), receipt:badReceipt, questions, concepts, events, media }),
    /receipt_mismatch/
  );
});

test('GT Autopsy result is deeply immutable', () => {
  const result = buildGtAutopsyV1({ run:completedRun(), receipt, questions, concepts, events, media });
  assert.throws(() => { result.sections[0].correct = 99; }, TypeError);
  assert.throws(() => { result.prescription.candidates[0].label = 'changed'; }, TypeError);
});
