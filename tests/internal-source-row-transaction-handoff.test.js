import test from 'node:test';
import assert from 'node:assert/strict';
import {createInternalSourceRowTransactionHandoff} from '../src/domain/internal-source-row-transaction-handoff.js';

const id='11111111-1111-4111-8111-111111111111';
const reviewer='22222222-2222-4222-8222-222222222222';
const reqId='33333333-3333-4333-8333-333333333333';
const hex=c=>c.repeat(64),token='mock-real-provider-token-for-contract-only';
const request=()=>({
 requestId:reqId,targetType:'source-row-case',packageId:id,packageVersion:1,
 packageDigest:hex('a'),caseId:'case-1',caseVersion:1,caseDigest:hex('b'),
 sourceSha256:hex('c'),appearanceEvidenceDigest:hex('d'),
 disposition:'retain-unresolved',
 rationale:'Source evidence is not independently verified and requires expert review.',
 attestationVersion:'source-row-review-v1'
});
const preflight=()=>({
 eligible:true,reason:'server-preflight-only',reviewerId:reviewer,
 sessionChecked:true,reviewerAuthenticated:true,
 reviewerGrantVerified:false,decisionRecorded:false,sourceReviewOnly:true,
 clinicalApproved:false,rightsApproved:false,examScopeApproved:false,learnerRelease:false
});
const receipt=q=>({
 ...q,contractId:'source-row-review-receipt-v1',
 decisionId:'44444444-4444-4444-8444-444444444444',
 reviewerId:reviewer,grantEventId:'55555555-5555-4555-8555-555555555555',
 receiptDigest:hex('e'),recordedAt:'2026-11-01T08:00:00.000Z',
 sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,
 examScopeApproved:false,learnerRelease:false
});

test('eligible preflight enables one exact user-scoped handoff but cannot claim a committed event',async()=>{
 const q=request(),events=[];
 const run=createInternalSourceRowTransactionHandoff({
  async preflight(t,r){events.push('preflight');assert.equal(t,token);
   assert.equal(Object.isFrozen(r),true);assert.deepEqual(r,q);
   return preflight();},
  async commitAsUser(t,r){events.push('commit');assert.equal(t,token);
   assert.equal(Object.isFrozen(r),true);assert.deepEqual(r,q);
   assert.equal('reviewerId' in r,false);assert.equal('actorId' in r,false);
   assert.equal('grantEventId' in r,false);return receipt(r);}
 });
 const result=await run(token,q);
 assert.deepEqual(events,['preflight','commit']);
 assert.equal(result.ready,true);
 assert.equal(result.receiptShapeMatched,true);
 assert.equal(result.transactionVerified,false);
 assert.equal(result.decisionRecorded,false);
 for(const f of ['clinicalApproved','rightsApproved','examScopeApproved','learnerRelease'])
  assert.equal(result[f],false);
 assert.equal(JSON.stringify(result).includes(token),false);
 assert.equal(Object.isFrozen(result),true);
});

test('reject invalid request and token without authentication or DB call',async()=>{
 const events=[];
 const run=createInternalSourceRowTransactionHandoff({
  preflight:async()=>{events.push('preflight');return preflight();},
  commitAsUser:async()=>{events.push('commit');return null;}
 });
 for(const q of [
  {...request(),reviewerId:reviewer},
  {...request(),actorId:reviewer},
  {...request(),grantEventId:id},
  {...request(),learnerRelease:true},
  {...request(),rationale:'\u200b'.repeat(40)},
  {...request(),disposition:'approve-publication'}
 ]){
  assert.equal((await run(token,q)).ready,false);
 }
 assert.equal((await run('bad',request())).ready,false);
 assert.deepEqual(events,[]);
});

test('absent, revoked or contradictory preflight never attempts DB handoff',async()=>{
 let commits=0;
 const variations=[
  null,{}, {...preflight(),eligible:false},
  {...preflight(),sessionChecked:false},
  {...preflight(),reviewerAuthenticated:false},
  {...preflight(),reviewerGrantVerified:true},
  {...preflight(),decisionRecorded:true},
  {...preflight(),reviewerId:'foreign-id'},
  Object.defineProperty({...preflight()},'reviewerId',{
    get(){throw Error('untrusted getter');},enumerable:true
  })
 ];
 for(const entry of variations){
  const run=createInternalSourceRowTransactionHandoff({
   preflight:async()=>entry,
   commitAsUser:async()=>{commits++;return receipt(request());}
  });
  const result=await run(token,request());
  assert.equal(result.ready,false);
  assert.equal(result.decisionRecorded,false);
 }
 assert.equal(commits,0);
});

test('reject forged or mismatched receipts without marking decision recorded',async()=>{
 const q=request();
 const variations=[
  null,{}, {...receipt(q),reviewerId:id},
  {...receipt(q),caseDigest:hex('0')},
  {...receipt(q),recordedAt:'yesterday'},
  {...receipt(q),learnerRelease:true},
  {...receipt(q),rightsApproved:true},
  {...receipt(q),extraClaim:'issued'},
  Object.defineProperty({...receipt(q)},'grantEventId',{
   get(){throw Error('untrusted getter');},enumerable:true
  })
 ];
 for(const entry of variations){
  const run=createInternalSourceRowTransactionHandoff({
   preflight:async()=>preflight(),commitAsUser:async()=>entry
  });
  const result=await run(token,q);
  assert.equal(result.ready,false);
  assert.equal(result.decisionRecorded,false);
  assert.equal(result.transactionVerified,false);
 }
});

test('unavailable preflight and ambiguous commit outcome fail closed without retry',async()=>{
 let attempted=0;
 const untrusted=createInternalSourceRowTransactionHandoff({
  preflight:async()=>{throw Error('auth backend unavailable');},
  commitAsUser:async()=>{attempted++;return receipt(request());}
 });
 assert.equal((await untrusted(token,request())).ready,false);
 assert.equal(attempted,0);
 const ambiguous=createInternalSourceRowTransactionHandoff({
  preflight:async()=>preflight(),
  commitAsUser:async()=>{attempted++;throw Error('connection closed after commit');}
 });
 const result=await ambiguous(token,request());
 assert.equal(attempted,1);
 assert.equal(result.reason,'commit-unconfirmed');
 assert.equal(result.decisionRecorded,false);
});

test('source review request is captured before asynchronous server preflight',async()=>{
 let release;
 const gate=new Promise(resolve=>{release=resolve;});
 const q=request(),original=structuredClone(q);
 const handoff=createInternalSourceRowTransactionHandoff({
  preflight:async()=>{await gate;return preflight();},
  commitAsUser:async(_,captured)=>{
   assert.deepEqual(captured,original);
   return receipt(captured);
  }
 });
 const result=handoff(token,q);
 q.caseDigest=hex('f');q.disposition='accept-proposed-interpretation';
 release();
 assert.equal((await result).ready,true);
});

test('no legacy SQL actor-bound API or unscoped grant is part of the handoff contract',async()=>{
 assert.throws(()=>createInternalSourceRowTransactionHandoff({
  preflight:()=>preflight()
 }),/internal_review_handoff_dependencies_invalid/);
 const outcome=await createInternalSourceRowTransactionHandoff({
  preflight:async()=>preflight(),
  commitAsUser:async(_token,q)=>{
   assert.deepEqual(Object.keys(q).sort(),Object.keys(request()).sort());
   return receipt(q);
  }
 })(token,request());
 assert.equal(outcome.transactionVerified,false);
 assert.equal(Object.hasOwn(outcome,'grantEventId'),false);
 assert.equal(Object.hasOwn(outcome,'reviewerId'),false);
});
