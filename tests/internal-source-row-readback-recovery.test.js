import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesSourceRowReviewReceipt} from '../src/domain/source-row-review.js';
import {createInternalSourceRowReadbackRecovery} from '../src/domain/internal-source-row-readback-recovery.js';

const pkg='11111111-1111-4111-8111-111111111111';
const reviewer='22222222-2222-4222-8222-222222222222';
const grant='33333333-3333-4333-8333-333333333333';
const hex=c=>c.repeat(64);
const token='synthetic-auth-token-for-offline-contract-test';
const q=()=>({
 requestId:'55555555-5555-4555-8555-555555555555',
 targetType:'source-row-case',packageId:pkg,packageVersion:1,
 packageDigest:hex('a'),caseId:'source-case-a',caseVersion:1,
 caseDigest:hex('b'),sourceSha256:hex('c'),appearanceEvidenceDigest:hex('d'),
 disposition:'retain-unresolved',
 rationale:'This source row remains unresolved without independent source identity evidence.',
 attestationVersion:'source-row-review-v1'
});
const preflight=()=>({
 eligible:true,reason:'server-preflight-only',reviewerId:reviewer,
 sessionChecked:true,reviewerAuthenticated:true,
 reviewerGrantVerified:false,decisionRecorded:false,
 sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,
 examScopeApproved:false,learnerRelease:false
});
const event=(request=q())=>({
 contractId:'internal-source-row-decision-event-v1',
 decisionId:'44444444-4444-4444-8444-444444444444',
 reviewerId:reviewer,grantEventId:grant,request,
 recordedAt:'2026-11-01T10:02:43.123Z',
 sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,
 examScopeApproved:false,learnerRelease:false
});
const assertNoAuthority=result=>{
 assert.equal(result.ready,false);
 assert.equal(result.safeToResubmit,false);
 assert.equal(result.writeAttempted,false);
 for(const flag of ['transactionVerified','persistenceVerified','authorityVerified',
  'decisionRecorded','clinicalApproved','rightsApproved','examScopeApproved','learnerRelease'])
  assert.equal(result[flag],false,flag);
 assert.equal(Object.isFrozen(result),true);
};

test('recovery performs only preflight and one exact-ID read, returns unverified receipt candidate',async()=>{
 const original=q(),steps=[];
 const recover=createInternalSourceRowReadbackRecovery({
  async preflight(t,input){
   steps.push('preflight');assert.equal(t,token);assert.equal(Object.isFrozen(input),true);
   assert.deepEqual(input,original);return preflight();
  },
  async readAsUser(t,requestId){
   steps.push('read');assert.equal(t,token);assert.equal(requestId,original.requestId);
   return event(original);
  }
 });
 const result=await recover(token,original);
 assert.deepEqual(steps,['preflight','read']);
 assert.equal(result.reason,'readback-event-shape-matched-unverified');
 assert.equal(result.readbackShapeMatched,true);
 assert.equal(matchesSourceRowReviewReceipt(result.candidateReceipt,original,reviewer),true);
 assert.equal(Object.isFrozen(result.candidateReceipt),true);
 assertNoAuthority(result);
 assert.equal(JSON.stringify(result).includes(token),false);
});

test('the recovery constructor rejects omitted readback or preflight dependencies',()=>{
 assert.throws(()=>createInternalSourceRowReadbackRecovery({}),/internal_review_recovery_dependencies_invalid/);
 assert.throws(()=>createInternalSourceRowReadbackRecovery({preflight:()=>preflight()}),
  /internal_review_recovery_dependencies_invalid/);
 assert.throws(()=>createInternalSourceRowReadbackRecovery({readAsUser:()=>event()}),
  /internal_review_recovery_dependencies_invalid/);
});

test('invalid request, forged authority and token never trigger preflight or readback',async()=>{
 let called=0;
 const recover=createInternalSourceRowReadbackRecovery({
  preflight:async()=>{called++;return preflight();},
  readAsUser:async()=>{called++;return event();}
 });
 for(const input of [
  {...q(),actorId:reviewer},{...q(),reviewerId:reviewer},
  {...q(),grantEventId:grant},{...q(),learnerRelease:true},
  {...q(),requestId:'incorrect'},{...q(),rationale:'too short'}
 ]){
  const r=await recover(token,input);assertNoAuthority(r);
  assert.equal(r.reason,'invalid-original-request');
 }
 assert.equal((await recover('bad',q())).reason,'invalid-token');
 assert.equal(called,0);
});

test('revoked or unverified current preflight cannot trigger readback',async()=>{
 let reads=0;
 const states=[
  null,{...preflight(),eligible:false},{...preflight(),sessionChecked:false},
  {...preflight(),reviewerAuthenticated:false},
  {...preflight(),reviewerGrantVerified:true},
  {...preflight(),decisionRecorded:true},
  {...preflight(),reviewerId:'foreign'},
  Object.defineProperty({...preflight()},'reviewerId',{
   enumerable:true,get(){throw Error('malicious getter');}
  })
 ];
 for(const state of states){
  const recover=createInternalSourceRowReadbackRecovery({
   preflight:async()=>state,
   readAsUser:async()=>{reads++;return event();}
  });
  const r=await recover(token,q());
  assert.equal(r.reason,'review-not-eligible');
  assertNoAuthority(r);
 }
 const fails=createInternalSourceRowReadbackRecovery({
  preflight:async()=>{throw Error('auth down');},
  readAsUser:async()=>{reads++;return event();}
 });
 assert.equal((await fails(token,q())).reason,'preflight-unavailable');
 assert.equal(reads,0);
});

test('readback errors, denial or missing event never assert that a write did not commit',async()=>{
 let reads=0;
 const responses=[null,undefined];
 for(const value of responses){
  const recover=createInternalSourceRowReadbackRecovery({
   preflight:async()=>preflight(),
   readAsUser:async()=>{reads++;return value;}
  });
  const r=await recover(token,q());assertNoAuthority(r);
  assert.equal(r.reason,'readback-absent-or-inaccessible');
  assert.equal(r.readbackShapeMatched,false);
 }
 for(const reason of ['network lost','grant revoked','not found']){
  const recover=createInternalSourceRowReadbackRecovery({
   preflight:async()=>preflight(),
   readAsUser:async()=>{reads++;throw Error(reason);}
  });
  const r=await recover(token,q());assertNoAuthority(r);
  assert.equal(r.reason,'readback-unavailable-or-denied');
 }
 assert.equal(reads,5);
});

test('foreign reviewer, conflicting request, changed source and forged approval all fail closed',async()=>{
 const original=q(),originalEvent=event(original);
 const variations=[
  {...originalEvent,reviewerId:pkg},
  {...originalEvent,request:{...original,requestId:pkg}},
  {...originalEvent,request:{...original,caseDigest:hex('e')}},
  {...originalEvent,request:{...original,sourceSha256:hex('f')}},
  {...originalEvent,request:{...original,rationale:'A changed rationale of sufficient length for an attack.'}},
  {...originalEvent,grantEventId:'malformed'},
  {...originalEvent,learnerRelease:true},
  {...originalEvent,clinicalApproved:true},
  {...originalEvent,rightsApproved:true},
  {...originalEvent,examScopeApproved:true},
  {...originalEvent,unexpected:'admin'},
  {receiptDigest:hex('f'),...originalEvent}
 ];
 for(const bogus of variations){
  const recover=createInternalSourceRowReadbackRecovery({
   preflight:async()=>preflight(),readAsUser:async()=>bogus
  });
  const r=await recover(token,original);
  assert.equal(r.reason,'readback-mismatch');
  assert.equal(r.readbackShapeMatched,false);
  assert.equal('candidateReceipt' in r,false);
  assertNoAuthority(r);
 }
});

test('original request is captured before the first async preflight and stays immutable',async()=>{
 const input=q(),original=structuredClone(input);
 let release;const gate=new Promise(resolve=>{release=resolve;});
 const recover=createInternalSourceRowReadbackRecovery({
  preflight:async(_,received)=>{assert.deepEqual(received,original);await gate;return preflight();},
  readAsUser:async(_,requestId)=>{
   assert.equal(requestId,original.requestId);return event(original);
  }
 });
 const pending=recover(token,input);
 input.requestId='99999999-9999-4999-8999-999999999999';
 input.caseDigest=hex('f');
 release();
 const r=await pending;
 assert.equal(r.readbackShapeMatched,true);
 assert.equal(r.candidateReceipt.requestId,original.requestId);
 assert.equal(r.candidateReceipt.caseDigest,original.caseDigest);
 assertNoAuthority(r);
});

test('even a plausible fabricated event is only a shape match, never an authorized decision',async()=>{
 const fabricated=event(q());
 const recover=createInternalSourceRowReadbackRecovery({
  preflight:async()=>preflight(),
  readAsUser:async()=>structuredClone(fabricated)
 });
 const r=await recover(token,q());
 assert.equal(r.readbackShapeMatched,true);
 assertNoAuthority(r);
});
