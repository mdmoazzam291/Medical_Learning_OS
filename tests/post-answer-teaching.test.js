import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCanonicalPostAnswerTeaching } from '../supabase/functions/study-api/_shared/post-answer-teaching.js';
import {
  validateGroundedTeachingOutput,
  validateGroundedTeachingTask
} from '../src/domain/grounded-teaching.js';

const sources = [
  { sourceId:'source:one', title:'One', url:'https://example.com/1', version:'2026' },
  { sourceId:'source:two', title:'Two', url:'https://example.com/2', version:'4' }
];

function taskFor(teaching) {
  return {
    schemaVersion:1,
    taskId:'task:post-answer:1',
    capability:'learning.teaching.render',
    instructionSet:{id:'grounded-teaching',version:'1'},
    input:{
      teachingAction:'concise_explanation',
      conceptId:'concept:test',
      learnerEvidenceRef:'attempt:test',
      misconception:null,
      canonicalFallback:{
        ...teaching,
        sourceMode:undefined
      }
    },
    grounding:teaching.claims[0].citationRefs,
    groundingMode:'required',
    outputContract:{id:'grounded-teaching-output',version:'1'},
    constraints:{maxLatencyMs:5000,maxEstimatedCostMicrousd:0},
    requestedAt:'2026-09-28T07:00:00.000Z',
    metadata:{policyVersion:'post-answer-canonical-v1'}
  };
}

function canonicalFallbackShape(teaching) {
  const { sourceMode, ...rest } = teaching;
  return rest;
}

test('incorrect answer produces a grounded canonical concise explanation', () => {
  const result = buildCanonicalPostAnswerTeaching({
    correct:false,
    conceptId:'concept:test',
    explanation:'This is the reviewed canonical explanation.',
    sources
  });
  assert.ok(result);
  assert.deepEqual(result.decision,{
    policyId:'post-answer-canonical-v1',
    policyVersion:'1',
    trigger:'incorrect_answer',
    teachingAction:'concise_explanation'
  });
  assert.equal(result.teaching.sourceMode,'canonical_fallback');
  assert.equal(result.teaching.claims[0].citationRefs.length,2);
  assert.ok(Object.isFrozen(result.teaching));
  assert.ok(Object.isFrozen(result.teaching.claims[0].citationRefs[0]));
});

test('post-answer producer output satisfies the M09b grounded teaching contract', () => {
  const produced = buildCanonicalPostAnswerTeaching({
    correct:false,
    conceptId:'concept:test',
    explanation:'This is the reviewed canonical explanation.',
    sources
  });
  const taskValue = taskFor(produced.teaching);
  taskValue.input.canonicalFallback = canonicalFallbackShape(produced.teaching);
  const validatedTask = validateGroundedTeachingTask(taskValue);
  const validatedOutput = validateGroundedTeachingOutput(produced.teaching,{
    task:validatedTask,
    requireProviderSource:false
  });
  assert.equal(validatedOutput.contractId,'grounded-teaching-output');
  assert.equal(validatedOutput.teachingAction,'concise_explanation');
  assert.equal(validatedOutput.conceptId,'concept:test');
});

test('correct answer does not create unnecessary teaching chatter', () => {
  assert.equal(buildCanonicalPostAnswerTeaching({
    correct:true,
    conceptId:'concept:test',
    explanation:'Reviewed explanation.',
    sources
  }),null);
});

test('producer fails soft when no canonical source identity is available', () => {
  assert.equal(buildCanonicalPostAnswerTeaching({
    correct:false,
    conceptId:'concept:test',
    explanation:'Reviewed explanation.',
    sources:[{title:'No identity',url:'https://example.com'}]
  }),null);
});

test('producer never truncates overlong canonical medical explanation', () => {
  const longExplanation = Array.from({length:130},()=>'word').join(' ');
  assert.equal(buildCanonicalPostAnswerTeaching({
    correct:false,
    conceptId:'concept:test',
    explanation:longExplanation,
    sources
  }),null);
});

test('duplicate source references are collapsed without losing version identity', () => {
  const result = buildCanonicalPostAnswerTeaching({
    correct:false,
    conceptId:'concept:test',
    explanation:'Reviewed explanation.',
    sources:[sources[0],sources[0],{...sources[0],version:'2027'}]
  });
  assert.deepEqual(result.teaching.claims[0].citationRefs,[
    {type:'content-source',id:'source:one',version:'2026'},
    {type:'content-source',id:'source:one',version:'2027'}
  ]);
});
