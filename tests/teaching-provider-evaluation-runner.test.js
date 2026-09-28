import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createIntelligenceProvider } from '../src/domain/intelligence-provider.js';
import {
  buildSemanticTeachingEvaluationTask,
  finalizeSemanticTeachingProviderEvaluation,
  runSemanticTeachingProviderEvaluation
} from '../src/domain/teaching-provider-evaluation-runner.js';

const evaluationSet = JSON.parse(await readFile(
  new URL('../data/evaluations/grounded-teaching-semantic-bootstrap-v1.json', import.meta.url),
  'utf8'
));

const descriptor = {
  providerId:'sandbox-provider',
  implementationId:'fake-grounded-teacher',
  version:'1',
  capabilities:['learning.teaching.render']
};

function providerResult(task, { output = null } = {}) {
  return {
    schemaVersion:1,
    taskId:task.taskId,
    provider:{
      providerId:'sandbox-provider',
      implementationId:'fake-grounded-teacher',
      version:'1'
    },
    status:'succeeded',
    output:output ?? {
      ...task.input.canonicalFallback,
      sourceMode:'provider'
    },
    citationRefs:task.grounding,
    usage:{
      inputUnits:100,
      outputUnits:50,
      unit:'token',
      estimatedCostMicrousd:1000
    },
    startedAt:'2026-09-28T09:00:00.100Z',
    completedAt:'2026-09-28T09:00:00.500Z',
    error:null,
    metadata:{sandbox:true}
  };
}

function goodProvider() {
  return createIntelligenceProvider({
    descriptor,
    execute:async task=>providerResult(task)
  });
}

function runArgs(provider = goodProvider()) {
  return {
    provider,
    evaluationSet,
    evaluationRunId:'provider-eval:bootstrap:1',
    requestedAt:'2026-09-28T09:00:00.000Z'
  };
}

function reviewFor(runCase, verdict='pass') {
  const dimensions=[
    'medicalCorrectness',
    'errorCorrection',
    'grounding',
    'unsupportedClaims',
    'verbosity'
  ].map(id=>({
    id,
    verdict,
    notes:verdict==='pass'
      ? 'Synthetic contract review pass.'
      : 'Synthetic contract review failure.'
  }));
  return {
    schemaVersion:1,
    evaluationSetId:evaluationSet.evaluationSetId,
    evaluationSetVersion:evaluationSet.version,
    caseId:runCase.caseId,
    providerRunRef:runCase.providerRunRef,
    reviewerId:'reviewer:synthetic-test',
    reviewedAt:'2026-09-28T09:10:00.000Z',
    dimensions,
    overallVerdict:verdict,
    notes:'Synthetic runner contract test only.'
  };
}

test('evaluation task is grounded, evaluation-only and exposes observed wrong option without production authority', () => {
  const item=evaluationSet.cases[0];
  const task=buildSemanticTeachingEvaluationTask(evaluationSet,item.caseId,{
    evaluationRunId:'provider-eval:task:1',
    requestedAt:'2026-09-28T09:00:00.000Z'
  });
  assert.equal(task.capability,'learning.teaching.render');
  assert.equal(task.groundingMode,'required');
  assert.equal(task.input.teachingAction,'concise_explanation');
  assert.equal(task.input.conceptId,item.conceptId);
  assert.deepEqual(task.metadata.observedError,item.learnerError);
  assert.equal(task.metadata.productionDeliveryAllowed,false);
  assert.equal(task.outputContract.id,'grounded-teaching-output');
  assert.equal(task.input.canonicalFallback.sourceMode,undefined);
});

test('valid sandbox provider run remains awaiting human semantic review and never gains production authority', async () => {
  const run=await runSemanticTeachingProviderEvaluation(runArgs());
  assert.equal(run.contractId,'semantic-teaching-provider-evaluation-run-v1');
  assert.equal(run.cases.length,6);
  assert.equal(run.summary.deterministicPassCount,6);
  assert.equal(run.summary.deterministicBlockCount,0);
  assert.equal(run.summary.providerErrorCount,0);
  assert.equal(run.summary.awaitingHumanReviewCount,6);
  assert.equal(run.productionQualificationAuthority,false);
  assert.equal(run.productionQualified,false);
  assert.ok(run.cases.every(item=>item.executionStatus==='awaiting_human_review'));
  assert.ok(run.cases.every(item=>item.deliveryPreview.source==='provider'));
  assert.ok(run.cases.every(item=>item.humanChecklist.dimensions.length===5));
  assert.ok(Object.isFrozen(run.cases[0].providerResult));
});

test('structurally invalid grounded output is blocked before human review and falls back canonically', async () => {
  let call=0;
  const provider=createIntelligenceProvider({
    descriptor,
    execute:async task=>{
      call+=1;
      if(call!==1) return providerResult(task);
      const output={
        ...task.input.canonicalFallback,
        sourceMode:'provider',
        claims:task.input.canonicalFallback.claims.map((claim,index)=>
          index===0 ? {...claim,citationRefs:[]} : claim
        )
      };
      return providerResult(task,{output});
    }
  });
  const run=await runSemanticTeachingProviderEvaluation(runArgs(provider));
  assert.equal(run.summary.deterministicPassCount,5);
  assert.equal(run.summary.deterministicBlockCount,1);
  assert.equal(run.cases[0].executionStatus,'blocked_before_human_review');
  assert.equal(run.cases[0].humanReviewRequired,false);
  assert.equal(run.cases[0].deliveryPreview.source,'canonical_fallback');
  assert.equal(run.cases[0].deliveryPreview.fallbackReason,'evaluation_failed');
});

test('provider execution exception becomes provider_error without breaking remaining cases', async () => {
  let call=0;
  const provider=createIntelligenceProvider({
    descriptor,
    execute:async task=>{
      call+=1;
      if(call===2) throw new Error('sandbox_timeout');
      return providerResult(task);
    }
  });
  const run=await runSemanticTeachingProviderEvaluation(runArgs(provider));
  assert.equal(run.summary.providerErrorCount,1);
  assert.equal(run.summary.deterministicPassCount,5);
  assert.equal(run.cases[1].executionStatus,'provider_error');
  assert.equal(run.cases[1].providerResult,null);
  assert.equal(run.cases[1].deliveryPreview.source,'canonical_fallback');
  assert.equal(run.cases[1].deliveryPreview.fallbackReason,'provider_unavailable');
  assert.equal(run.cases[2].executionStatus,'awaiting_human_review');
});

test('all human passes yield only bootstrap pass, never production qualification', async () => {
  const run=await runSemanticTeachingProviderEvaluation(runArgs());
  const summary=finalizeSemanticTeachingProviderEvaluation({
    evaluationSet,
    run,
    reviews:run.cases.map(item=>reviewFor(item,'pass'))
  });
  assert.equal(summary.bootstrapVerdict,'pass');
  assert.equal(summary.summary.humanPassCount,6);
  assert.equal(summary.summary.humanFailCount,0);
  assert.equal(summary.summary.missingHumanReviewCount,0);
  assert.equal(summary.productionQualificationAuthority,false);
  assert.equal(summary.productionQualified,false);
  assert.equal(summary.qualificationScope,'bootstrap_only');
});

test('missing human reviews keep bootstrap verdict pending', async () => {
  const run=await runSemanticTeachingProviderEvaluation(runArgs());
  const summary=finalizeSemanticTeachingProviderEvaluation({
    evaluationSet,
    run,
    reviews:run.cases.slice(0,3).map(item=>reviewFor(item,'pass'))
  });
  assert.equal(summary.bootstrapVerdict,'pending');
  assert.equal(summary.summary.humanPassCount,3);
  assert.equal(summary.summary.missingHumanReviewCount,3);
  assert.equal(summary.productionQualified,false);
});

test('one human semantic failure forces bootstrap failure instead of averaging it away', async () => {
  const run=await runSemanticTeachingProviderEvaluation(runArgs());
  const reviews=run.cases.map(item=>reviewFor(item,'pass'));
  reviews[4]=reviewFor(run.cases[4],'fail');
  const summary=finalizeSemanticTeachingProviderEvaluation({evaluationSet,run,reviews});
  assert.equal(summary.bootstrapVerdict,'fail');
  assert.equal(summary.summary.humanFailCount,1);
  assert.equal(summary.productionQualified,false);
});

test('blocked deterministic case cannot be laundered into a human pass', async () => {
  let call=0;
  const provider=createIntelligenceProvider({
    descriptor,
    execute:async task=>{
      call+=1;
      if(call!==1) return providerResult(task);
      return providerResult(task,{
        output:{
          ...task.input.canonicalFallback,
          sourceMode:'provider',
          claims:[{
            ...task.input.canonicalFallback.claims[0],
            citationRefs:[]
          }]
        }
      });
    }
  });
  const run=await runSemanticTeachingProviderEvaluation(runArgs(provider));
  assert.equal(run.cases[0].humanReviewRequired,false);
  assert.throws(()=>finalizeSemanticTeachingProviderEvaluation({
    evaluationSet,
    run,
    reviews:[reviewFor(run.cases[0],'pass')]
  }),/Blocked provider case/);
});

test('provider lacking semantic teaching capability is rejected before evaluation', async () => {
  const provider=createIntelligenceProvider({
    descriptor:{
      providerId:'wrong-provider',
      implementationId:'search-only',
      version:'1',
      capabilities:['knowledge.search']
    },
    execute:async()=>{ throw new Error('must_not_execute'); }
  });
  await assert.rejects(()=>runSemanticTeachingProviderEvaluation(runArgs(provider)),/does not support learning\.teaching\.render/);
});
