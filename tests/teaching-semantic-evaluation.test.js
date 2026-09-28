import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  semanticTeachingChecklist,
  validateSemanticTeachingEvaluationSet,
  validateSemanticTeachingReview
} from '../src/domain/teaching-semantic-evaluation.js';

const evaluationSet = JSON.parse(await readFile(
  new URL('../data/evaluations/grounded-teaching-semantic-bootstrap-v1.json', import.meta.url),
  'utf8'
));
const breadthSet = JSON.parse(await readFile(
  new URL('../data/evaluations/grounded-teaching-semantic-breadth-v2.json', import.meta.url),
  'utf8'
));

test('semantic teaching bootstrap set is immutable, human-reviewed and non-authoritative for production', () => {
  const value = validateSemanticTeachingEvaluationSet(evaluationSet);
  assert.equal(value.schemaVersion,1);
  assert.equal(value.reviewMode,'human_semantic_review_required');
  assert.equal(value.productionQualificationAuthority,false);
  assert.equal(value.cases.length,6);
  assert.ok(Object.isFrozen(value));
  assert.ok(Object.isFrozen(value.cases[0].gold.requiredFacts));
});

test('bootstrap set covers all six currently published reviewed question versions exactly once', () => {
  const value = validateSemanticTeachingEvaluationSet(evaluationSet);
  assert.deepEqual(new Set(value.cases.map(item=>item.questionVersionId)),new Set([
    'emergency:anaphylaxis:first-line-drug@1',
    'infectious:rabies:adult-im-vaccine-site@1',
    'infectious:rabies:category-iii-rig-infiltration@1',
    'infectious:rabies:id-pep-days-india@1',
    'infectious:rabies:im-pep-days-india@1',
    'infectious:rabies:pep-wound-wash-15min@1'
  ]));
  assert.equal(new Set(value.cases.map(item=>item.caseId)).size,6);
});

test('every case requires human medical correctness, error correction and unsupported-claim review', () => {
  const value = validateSemanticTeachingEvaluationSet(evaluationSet);
  for(const item of value.cases){
    assert.equal(item.rubric.medicalCorrectness,'human_required');
    assert.equal(item.rubric.errorCorrection,'human_required');
    assert.equal(item.rubric.unsupportedClaims,'human_required');
    assert.equal(item.rubric.grounding,'contract_plus_human');
    assert.equal(item.rubric.maxWords,120);
    assert.ok(item.gold.requiredFacts.length>=1);
    assert.ok(item.gold.forbiddenClaims.length>=1);
    assert.ok(item.grounding.length>=1);
  }
});

test('checklist keeps semantic review explicit instead of pretending deterministic checks prove truth', () => {
  const checklist = semanticTeachingChecklist(evaluationSet,'gt-semantic:anaphylaxis-first-line@1');
  assert.equal(checklist.contractId,'semantic-teaching-checklist-v1');
  assert.equal(checklist.dimensions.length,5);
  assert.equal(checklist.dimensions.find(x=>x.id==='medicalCorrectness').reviewMode,'human_required');
  assert.equal(checklist.dimensions.find(x=>x.id==='grounding').reviewMode,'contract_plus_human');
  assert.match(checklist.dimensions.find(x=>x.id==='unsupportedClaims').prompt,/unsupported medical claim/);
});

function passingReview(){
  return {
    schemaVersion:1,
    evaluationSetId:evaluationSet.evaluationSetId,
    evaluationSetVersion:evaluationSet.version,
    caseId:'gt-semantic:anaphylaxis-first-line@1',
    providerRunRef:'provider-run:test:1',
    reviewerId:'reviewer:test',
    reviewedAt:'2026-09-28T08:00:00.000Z',
    dimensions:[
      {id:'medicalCorrectness',verdict:'pass',notes:'Meaning matches reviewed canonical explanation.'},
      {id:'errorCorrection',verdict:'pass',notes:'Wrong hydrocortisone-first belief is corrected.'},
      {id:'grounding',verdict:'pass',notes:'Claim is supported by supplied CDC grounding.'},
      {id:'unsupportedClaims',verdict:'pass',notes:'No unsupported medical claims observed.'},
      {id:'verbosity',verdict:'pass',notes:'Within the 120-word micro-remediation ceiling.'}
    ],
    overallVerdict:'pass',
    notes:'Synthetic contract test only.'
  };
}

test('semantic review passes only when every required dimension passes', () => {
  const value = validateSemanticTeachingReview(evaluationSet,passingReview());
  assert.equal(value.overallVerdict,'pass');
  assert.ok(Object.isFrozen(value.dimensions));

  const failed = passingReview();
  failed.dimensions[2].verdict='fail';
  failed.dimensions[2].notes='Citation does not actually support the claim.';
  failed.overallVerdict='fail';
  assert.equal(validateSemanticTeachingReview(evaluationSet,failed).overallVerdict,'fail');

  const invalid = passingReview();
  invalid.dimensions[2].verdict='fail';
  invalid.dimensions[2].notes='Citation does not actually support the claim.';
  assert.throws(()=>validateSemanticTeachingReview(evaluationSet,invalid),/Overall semantic verdict/);
});

test('bootstrap set rejects attempts to automate away human semantic review or grant production authority', () => {
  assert.throws(()=>validateSemanticTeachingEvaluationSet({
    ...evaluationSet,
    reviewMode:'automatic'
  }),/Human semantic review/);

  assert.throws(()=>validateSemanticTeachingEvaluationSet({
    ...evaluationSet,
    productionQualificationAuthority:true
  }),/cannot qualify production provider/);

  const modified=structuredClone(evaluationSet);
  modified.cases[0].rubric.medicalCorrectness='keyword_match';
  assert.throws(()=>validateSemanticTeachingEvaluationSet(modified),/cannot be automated away/);
});

test('cases require both positive facts and explicit dangerous/incorrect claims to detect', () => {
  const noRequired=structuredClone(evaluationSet);
  noRequired.cases[0].gold.requiredFacts=[];
  assert.throws(()=>validateSemanticTeachingEvaluationSet(noRequired),/required fact/);

  const noForbidden=structuredClone(evaluationSet);
  noForbidden.cases[0].gold.forbiddenClaims=[];
  assert.throws(()=>validateSemanticTeachingEvaluationSet(noForbidden),/forbidden claim/);
});


test('semantic teaching breadth v2 expands specialties, actions and task representations without production authority', () => {
  const value=validateSemanticTeachingEvaluationSet(breadthSet);
  assert.equal(value.schemaVersion,2);
  assert.equal(value.cases.length,12);
  assert.equal(value.productionQualificationAuthority,false);
  assert.equal(value.reviewMode,'human_semantic_review_required');
  assert.deepEqual(
    new Set(value.cases.map(item=>item.teachingAction)),
    new Set([
      'concise_explanation',
      'contrastive_explanation',
      'misconception_repair',
      'prerequisite_remediation'
    ])
  );
  assert.deepEqual(
    new Set(value.cases.map(item=>item.representation)),
    new Set([
      'factual_recall',
      'clinical_vignette',
      'management_decision',
      'discrimination'
    ])
  );
  assert.equal(new Set(value.cases.map(item=>item.questionVersionId)).size,12);
  assert.ok(value.notes.some(note=>/development-only|development/i.test(note)));
});

test('breadth v2 enforces action-specific canonical teaching structure', () => {
  const value=validateSemanticTeachingEvaluationSet(breadthSet);
  const contrastive=value.cases.find(item=>item.teachingAction==='contrastive_explanation');
  const misconception=value.cases.find(item=>item.teachingAction==='misconception_repair');
  const prerequisite=value.cases.find(item=>item.teachingAction==='prerequisite_remediation');

  assert.ok(contrastive.gold.canonicalClaims.some(claim=>claim.role==='discriminator'));
  assert.ok(misconception.gold.canonicalClaims.some(claim=>claim.role==='correction'));
  assert.ok(misconception.gold.canonicalClaims.some(claim=>claim.role==='discriminator'));
  assert.ok(misconception.learnerError.observedBelief);
  assert.ok(prerequisite.gold.canonicalClaims.some(claim=>claim.role==='prerequisite'));

  const badContrastive=structuredClone(breadthSet);
  const item=badContrastive.cases.find(caseItem=>caseItem.teachingAction==='contrastive_explanation');
  item.gold.canonicalClaims=item.gold.canonicalClaims.filter(claim=>claim.role!=='discriminator');
  assert.throws(()=>validateSemanticTeachingEvaluationSet(badContrastive),/discriminator/);

  const badMisconception=structuredClone(breadthSet);
  badMisconception.cases.find(caseItem=>caseItem.teachingAction==='misconception_repair').learnerError.observedBelief=null;
  assert.throws(()=>validateSemanticTeachingEvaluationSet(badMisconception),/observed belief/);

  const badPrerequisite=structuredClone(breadthSet);
  const prereq=badPrerequisite.cases.find(caseItem=>caseItem.teachingAction==='prerequisite_remediation');
  prereq.gold.canonicalClaims=prereq.gold.canonicalClaims.filter(claim=>claim.role!=='prerequisite');
  assert.throws(()=>validateSemanticTeachingEvaluationSet(badPrerequisite),/prerequisite claim/);
});

test('breadth v2 checklist carries action and representation into human semantic review', () => {
  const caseId='gt-breadth:septic-shock-norepinephrine@1';
  const checklist=semanticTeachingChecklist(breadthSet,caseId);
  assert.equal(checklist.teachingAction,'misconception_repair');
  assert.equal(checklist.representation,'management_decision');
  assert.match(checklist.dimensions.find(item=>item.id==='errorCorrection').prompt,/misconception_repair/);
  assert.equal(checklist.maxWords,160);
});

test('breadth v2 remains explicitly human semantic review and rejects authority escalation', () => {
  const modified=structuredClone(breadthSet);
  modified.productionQualificationAuthority=true;
  assert.throws(()=>validateSemanticTeachingEvaluationSet(modified),/cannot qualify production provider/);

  const automated=structuredClone(breadthSet);
  automated.cases[0].rubric.medicalCorrectness='keyword_match';
  assert.throws(()=>validateSemanticTeachingEvaluationSet(automated),/cannot be automated away/);
});
