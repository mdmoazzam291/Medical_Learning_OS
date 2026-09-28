import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalGroundedTeachingFallback,
  evaluateGroundedTeachingResult,
  groundedTeachingVerbosityCap,
  resolveGroundedTeachingDelivery,
  validateGroundedTeachingOutput,
  validateGroundedTeachingTask
} from '../src/domain/grounded-teaching.js';

const sourceA = { type:'content-source', id:'source:guideline:asthma', version:'2026' };
const sourceB = { type:'content-source', id:'source:canonical-note:asthma', version:'4' };

const fallback = () => ({
  schemaVersion:1,
  contractId:'grounded-teaching-output',
  contractVersion:'1',
  renderStatus:'ready',
  teachingAction:'misconception_repair',
  conceptId:'respiratory:asthma:controller-reliever',
  headline:'LABA monotherapy is the trap.',
  claims:[
    {
      claimId:'correction-1',
      role:'correction',
      text:'In asthma, a LABA should not be used without inhaled corticosteroid treatment.',
      citationRefs:[sourceA]
    },
    {
      claimId:'discriminator-1',
      role:'discriminator',
      text:'If the regimen contains a LABA, check that anti-inflammatory ICS treatment is also present.',
      citationRefs:[sourceA,sourceB]
    }
  ],
  misconceptionCorrection:{
    learnerBelief:'LABA alone is an acceptable controller for asthma.',
    correctionClaimId:'correction-1',
    discriminatorClaimId:'discriminator-1'
  },
  nextPrompt:'Which component prevents LABA monotherapy in an asthma regimen?',
  abstentionReason:null
});

const task = () => ({
  schemaVersion:1,
  taskId:'task:teaching:asthma:1',
  capability:'learning.teaching.render',
  instructionSet:{id:'grounded-teaching',version:'1'},
  input:{
    teachingAction:'misconception_repair',
    conceptId:'respiratory:asthma:controller-reliever',
    learnerEvidenceRef:'mistake:episode:123',
    misconception:{
      observedBelief:'LABA alone is an acceptable controller for asthma.'
    },
    canonicalFallback:fallback()
  },
  grounding:[sourceA,sourceB],
  groundingMode:'required',
  outputContract:{id:'grounded-teaching-output',version:'1'},
  constraints:{maxLatencyMs:5000,maxEstimatedCostMicrousd:20000},
  requestedAt:'2026-09-28T06:00:00.000Z',
  metadata:{policyVersion:'adaptive-teaching-deterministic-v1'}
});

const providerOutput = () => ({
  ...fallback(),
  sourceMode:'provider',
  headline:'Do not separate bronchodilation from anti-inflammatory control.'
});

const success = () => ({
  schemaVersion:1,
  taskId:'task:teaching:asthma:1',
  provider:{providerId:'test-provider',implementationId:'structured-teacher',version:'1'},
  status:'succeeded',
  output:providerOutput(),
  citationRefs:[sourceA,sourceB],
  usage:{inputUnits:220,outputUnits:90,unit:'token',estimatedCostMicrousd:1800},
  startedAt:'2026-09-28T06:00:00.100Z',
  completedAt:'2026-09-28T06:00:01.100Z',
  error:null,
  metadata:{cached:false}
});

test('grounded teaching task requires the semantic capability, required grounding and canonical fallback', () => {
  const value = validateGroundedTeachingTask(task());
  assert.ok(Object.isFrozen(value));
  assert.ok(Object.isFrozen(value.input.canonicalFallback));
  assert.equal(value.input.teachingAction,'misconception_repair');
  assert.equal(value.outputContract.id,'grounded-teaching-output');

  assert.throws(() => validateGroundedTeachingTask({
    ...task(),
    capability:'knowledge.search'
  }), /learning\.teaching\.render/);

  assert.throws(() => validateGroundedTeachingTask({
    ...task(),
    groundingMode:'optional'
  }), /requires grounding/);

  assert.throws(() => validateGroundedTeachingTask({
    ...task(),
    input:{...task().input,misconception:null}
  }), /requires observed belief/);
});

test('provider teaching output binds action/concept and every medical claim to claim-level grounding', () => {
  const value = validateGroundedTeachingOutput(providerOutput(),{
    task:validateGroundedTeachingTask(task()),
    allowedResultCitations:[sourceA,sourceB]
  });
  assert.equal(value.sourceMode,'provider');
  assert.equal(value.claims.length,2);
  assert.ok(value.claims.every(claim => claim.citationRefs.length > 0));
  assert.ok(Object.isFrozen(value.claims[0].citationRefs));

  const invented = { type:'content-source', id:'source:invented', version:'1' };
  assert.throws(() => validateGroundedTeachingOutput({
    ...providerOutput(),
    claims:[
      ...providerOutput().claims,
      {claimId:'bad',role:'example',text:'Unsupported medical claim.',citationRefs:[invented]}
    ]
  },{
    task:validateGroundedTeachingTask(task()),
    allowedResultCitations:[sourceA,sourceB]
  }), /outside task grounding/);
});

test('valid grounded misconception repair passes deterministic evaluation', () => {
  const evaluation = evaluateGroundedTeachingResult(task(),success());
  assert.equal(evaluation.passed,true);
  assert.deepEqual(evaluation.failureCodes,[]);
  assert.ok(evaluation.checks.some(item => item.id==='output.grounding' && item.passed));
  assert.ok(evaluation.checks.some(item => item.id==='output.misconception_correction' && item.passed));
  assert.ok(evaluation.checks.some(item => item.id==='output.verbosity' && item.passed));
});

test('uncited or result-unreported claim grounding fails closed', () => {
  const missing = success();
  missing.output.claims[0].citationRefs=[];
  const missingEval = evaluateGroundedTeachingResult(task(),missing);
  assert.equal(missingEval.passed,false);
  assert.ok(missingEval.failureCodes.includes('output.grounding'));

  const unreported = success();
  unreported.citationRefs=[sourceA];
  const unreportedEval = evaluateGroundedTeachingResult(task(),unreported);
  assert.equal(unreportedEval.passed,false);
  assert.ok(unreportedEval.failureCodes.includes('output.grounding'));
});

test('misconception repair must correct the observed belief through correction and discriminator claims', () => {
  const wrongBelief = success();
  wrongBelief.output.misconceptionCorrection.learnerBelief='A different misconception.';
  const evaluation = evaluateGroundedTeachingResult(task(),wrongBelief);
  assert.equal(evaluation.passed,false);
  assert.ok(evaluation.failureCodes.includes('output.misconception_correction'));

  const missingDiscriminator = success();
  missingDiscriminator.output.claims = missingDiscriminator.output.claims
    .filter(claim => claim.role !== 'discriminator');
  const evaluation2 = evaluateGroundedTeachingResult(task(),missingDiscriminator);
  assert.equal(evaluation2.passed,false);
  assert.ok(evaluation2.failureCodes.includes('output.misconception_correction'));
});

test('verbosity ceilings fail closed instead of rewarding tutor chatter', () => {
  const verbose = success();
  verbose.output.claims[0].text = Array.from(
    {length:groundedTeachingVerbosityCap('misconception_repair') + 10},
    () => 'word'
  ).join(' ');
  const evaluation = evaluateGroundedTeachingResult(task(),verbose);
  assert.equal(evaluation.passed,false);
  assert.ok(evaluation.failureCodes.includes('output.verbosity'));
});

test('provider abstention is safe and deterministically falls back to canonical teaching', () => {
  const abstained = success();
  abstained.output = {
    schemaVersion:1,
    contractId:'grounded-teaching-output',
    contractVersion:'1',
    renderStatus:'abstained',
    sourceMode:'provider',
    teachingAction:'misconception_repair',
    conceptId:'respiratory:asthma:controller-reliever',
    headline:null,
    claims:[],
    misconceptionCorrection:null,
    nextPrompt:null,
    abstentionReason:'insufficient_grounding'
  };
  const evaluation = evaluateGroundedTeachingResult(task(),abstained);
  assert.equal(evaluation.passed,false);
  assert.ok(evaluation.failureCodes.includes('output.abstained'));

  const delivery = resolveGroundedTeachingDelivery(task(),abstained);
  assert.equal(delivery.source,'canonical_fallback');
  assert.equal(delivery.fallbackReason,'provider_abstained');
  assert.equal(delivery.teaching.sourceMode,'canonical_fallback');
  assert.equal(delivery.teaching.headline,fallback().headline);
});

test('provider failure never blocks deterministic canonical teaching fallback', () => {
  const failed = {
    ...success(),
    status:'failed',
    output:null,
    citationRefs:[],
    error:{category:'provider_unavailable',code:'timeout'}
  };
  const delivery = resolveGroundedTeachingDelivery(task(),failed);
  assert.equal(delivery.source,'canonical_fallback');
  assert.equal(delivery.fallbackReason,'provider_failed');
  assert.equal(delivery.teaching.renderStatus,'ready');

  const absent = resolveGroundedTeachingDelivery(task(),null);
  assert.equal(absent.source,'canonical_fallback');
  assert.equal(absent.fallbackReason,'provider_unavailable');
});

test('invalid successful provider output is never leaked to learner delivery', () => {
  const invalid = success();
  invalid.output.claims[0].citationRefs=[];
  const delivery = resolveGroundedTeachingDelivery(task(),invalid);
  assert.equal(delivery.source,'canonical_fallback');
  assert.equal(delivery.fallbackReason,'evaluation_failed');
  assert.equal(delivery.teaching.sourceMode,'canonical_fallback');
  assert.notEqual(delivery.teaching,invalid.output);
});

test('canonical fallback itself is grounded, action-matched and deeply immutable', () => {
  const value = canonicalGroundedTeachingFallback(task());
  assert.equal(value.sourceMode,'canonical_fallback');
  assert.equal(value.teachingAction,'misconception_repair');
  assert.equal(value.conceptId,'respiratory:asthma:controller-reliever');
  assert.throws(() => { value.claims[0].text='changed'; },TypeError);

  const bad = task();
  bad.input.canonicalFallback.claims[0].citationRefs=[
    {type:'content-source',id:'source:outside',version:'1'}
  ];
  assert.throws(() => validateGroundedTeachingTask(bad),/outside task grounding/);
});

test('contrastive and prerequisite actions require their structural teaching mechanisms', () => {
  const contrastive = task();
  contrastive.input.teachingAction='contrastive_explanation';
  contrastive.input.misconception=null;
  contrastive.input.canonicalFallback={
    ...fallback(),
    teachingAction:'contrastive_explanation',
    misconceptionCorrection:null
  };
  contrastive.input.canonicalFallback.claims=[
    {claimId:'explain',role:'explanation',text:'Synthetic explanation.',citationRefs:[sourceA]}
  ];
  assert.throws(() => validateGroundedTeachingTask(contrastive),/discriminator/);

  const prerequisite = task();
  prerequisite.input.teachingAction='prerequisite_remediation';
  prerequisite.input.misconception=null;
  prerequisite.input.canonicalFallback={
    ...fallback(),
    teachingAction:'prerequisite_remediation',
    misconceptionCorrection:null,
    claims:[{claimId:'explain',role:'explanation',text:'Synthetic explanation.',citationRefs:[sourceA]}]
  };
  assert.throws(() => validateGroundedTeachingTask(prerequisite),/prerequisite claim/);
});
