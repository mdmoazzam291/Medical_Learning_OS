import test from 'node:test';
import assert from 'node:assert/strict';
import {digestCanonical} from '../src/domain/canonical-integrity.js';
import {matchesSourceRowReviewReceipt} from '../src/domain/source-row-review.js';
import {
 projectInternalSourceRowReceipt,compareInternalSourceRowReviewEvents
} from '../src/domain/internal-source-row-receipt-parity.js';

const id='11111111-1111-4111-8111-111111111111';
const reviewer='22222222-2222-4222-8222-222222222222';
const grant='33333333-3333-4333-8333-333333333333';
const decision='44444444-4444-4444-8444-444444444444';
const hex=c=>c.repeat(64);
const request=()=>({
 requestId:'55555555-5555-4555-8555-555555555555',
 targetType:'source-row-case',packageId:id,packageVersion:1,
 packageDigest:hex('a'),caseId:'case-a',caseVersion:1,
 caseDigest:hex('b'),sourceSha256:hex('c'),
 appearanceEvidenceDigest:hex('d'),
 disposition:'retain-unresolved',
 rationale:'The original source row needs independently qualified source adjudication.',
 attestationVersion:'source-row-review-v1'
});
const event=(q=request())=>({
 contractId:'internal-source-row-decision-event-v1',decisionId:decision,
 reviewerId:reviewer,grantEventId:grant,request:q,
 recordedAt:'2026-11-01T10:02:43.123Z',
 sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,
 examScopeApproved:false,learnerRelease:false
});
test('exact source event yields canonical receipt and digest of immutable event payload shape',async()=>{
 const q=request(),e=event(q);
 const r=await projectInternalSourceRowReceipt(e,q,reviewer);
 assert.equal(matchesSourceRowReviewReceipt(r,q,reviewer),true);
 assert.equal(r.receiptDigest,(await digestCanonical(e)).digestHex);
 assert.equal(Object.isFrozen(r),true);
 assert.deepEqual(Object.keys(r).sort(),[
  ...Object.keys(q),'contractId','decisionId','reviewerId','grantEventId',
  'receiptDigest','recordedAt','sourceReviewOnly','clinicalApproved',
  'rightsApproved','examScopeApproved','learnerRelease'
 ].sort());
});

test('JSON object order is irrelevant to event digest and readback parity',async()=>{
 const q=request(),e=event(q);
 const reordered=Object.fromEntries(Object.entries(e).reverse());
 reordered.request=Object.fromEntries(Object.entries(q).reverse());
 const one=await projectInternalSourceRowReceipt(e,q,reviewer);
 const two=await projectInternalSourceRowReceipt(reordered,q,reviewer);
 assert.equal(one.receiptDigest,two.receiptDigest);
 const parity=await compareInternalSourceRowReviewEvents(e,reordered,q,reviewer);
 assert.equal(parity.eventParity,true);
 assert.equal(parity.receipt.receiptDigest,one.receiptDigest);
 for(const key of ['transactionVerified','persistenceVerified','authorityVerified',
  'decisionRecorded','clinicalApproved','rightsApproved','examScopeApproved','learnerRelease'])
  assert.equal(parity[key],false);
 assert.equal(Object.isFrozen(parity),true);
});

test('every changed request binding and event identity rejects receipt or parity',async()=>{
 const q=request(),e=event(q);
 for(const key of Object.keys(q)){
  const changed={...q,[key]:typeof q[key]==='number'?q[key]+1:q[key]+'-altered'};
  await assert.rejects(projectInternalSourceRowReceipt({...e,request:changed},q,reviewer),
   /internal_source_review_event_invalid/,key);
 }
 for(const key of ['decisionId','grantEventId','reviewerId','recordedAt']){
  const changed={...e,[key]:key==='recordedAt'?'not-a-time':id};
  await assert.rejects(compareInternalSourceRowReviewEvents(e,changed,q,reviewer),
   /internal_source_review_event_invalid|Invalid/,key);
 }
 await assert.rejects(projectInternalSourceRowReceipt(e,q,id),/internal_source_review_event_invalid/);
 const changedDecision={...e,decisionId:'66666666-6666-4666-8666-666666666666'};
 await assert.rejects(compareInternalSourceRowReviewEvents(e,changedDecision,q,reviewer),
  /internal_source_review_event_invalid/);
});

test('rejects forged publication/rights/clinical/exam authority and unsupported contracts',async()=>{
 const q=request(),e=event(q);
 for(const key of ['clinicalApproved','rightsApproved','examScopeApproved','learnerRelease']){
  await assert.rejects(projectInternalSourceRowReceipt({...e,[key]:true},q,reviewer),
   /internal_source_review_event_invalid/,key);
 }
 for(const changed of [
  {...e,contractId:'source-row-review-receipt-v1'},
  {...e,sourceReviewOnly:false},
  {...e,grantEventId:'incorrect-grant'},
  {...e,request:{...q,reviewerId:reviewer}},
  {...e,request:{...q,rationale:'changed after signing but long enough to be valid'}},
  {...e,unknownAuthority:'approved'}
 ]){
  await assert.rejects(projectInternalSourceRowReceipt(changed,q,reviewer),
   /internal_source_review_event_invalid/);
 }
});

test('hidden, symbol, accessor and inherited event properties fail before getter invocation',async()=>{
 const q=request();
 for(const key of ['hidden',Symbol('secret')]){
  const e=event(q);
  Object.defineProperty(e,key,{value:'injected'});
  await assert.rejects(projectInternalSourceRowReceipt(e,q,reviewer),
   /internal_source_review_event_invalid/);
 }
 let invoked=false;
 const e=event(q);
 Object.defineProperty(e,'decisionId',{enumerable:true,get(){invoked=true;throw Error('getter invoked');}});
 await assert.rejects(projectInternalSourceRowReceipt(e,q,reviewer),
  /internal_source_review_event_invalid/);
 assert.equal(invoked,false);
 await assert.rejects(projectInternalSourceRowReceipt(Object.assign(
  Object.create({grants:'all'}),event(q)),q,reviewer),/internal_source_review_event_invalid/);
});

test('the event is snapshotted synchronously before digest work',async()=>{
 const q=request(),e=event(q);
 const original=structuredClone(e),task=projectInternalSourceRowReceipt(e,q,reviewer);
 e.request.rationale='untrusted late mutation';
 e.decisionId=id;
 const r=await task;
 assert.equal(r.decisionId,original.decisionId);
 assert.equal(r.rationale,original.request.rationale);
 assert.equal(r.receiptDigest,(await digestCanonical(original)).digestHex);
});

test('a valid-looking fabricated JSON has parity but still cannot prove real DB authority',async()=>{
 const q=request(),fake=event(q);
 const parity=await compareInternalSourceRowReviewEvents(fake,structuredClone(fake),q,reviewer);
 assert.equal(parity.eventParity,true);
 assert.equal(parity.transactionVerified,false);
 assert.equal(parity.persistenceVerified,false);
 assert.equal(parity.decisionRecorded,false);
 assert.equal(parity.authorityVerified,false);
});
