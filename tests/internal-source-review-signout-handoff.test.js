import test from 'node:test';
import assert from 'node:assert/strict';
import {createInternalSourceReviewSignoutHandoff} from '../src/domain/internal-source-review-signout-handoff.js';
const token='synthetic-token-for-server-only-offline-contract';
const userId='11111111-1111-4111-8111-111111111111';
const sessionId='22222222-2222-4222-8222-222222222222';
const verified=()=>({verified:true,userId,sessionId});
const acknowledged=()=>({revoked:true,userId,sessionId});
const signedOut=()=>({error:null,scope:'local'});
const noTrust=o=>{
 assert.equal(Object.isFrozen(o),true);
 assert.equal(o.ready,false);
 assert.equal(o.reviewAccessVerifiedDenied,false);
 assert.equal(o.providerSessionEndedVerified,false);
 assert.equal(o.providerOnlySignoutHandled,false);
 assert.equal(o.transactionVerified,false);
 assert.equal(o.automaticRetryAllowed,false);
 for(const k of ['clinicalApproved','rightsApproved','examScopeApproved','learnerRelease'])
  assert.equal(o[k],false);
 assert.equal(JSON.stringify(o).includes(token),false);
};
test('requires three trusted injected dependencies',()=>{
 for(const params of [{},{verifyIdentity:()=>verified()},
  {verifyIdentity:()=>verified(),revokeOwnedSessionAsUser:()=>acknowledged()},
  {revokeOwnedSessionAsUser:()=>acknowledged(),providerSignOutLocal:()=>signedOut()}]){
  assert.throws(()=>createInternalSourceReviewSignoutHandoff(params),
   /internal_review_signout_dependencies_invalid/);
 }
});
test('all acknowledgement still never asserts persisted or provider-session closure',async()=>{
 const steps=[];
 const handoff=createInternalSourceReviewSignoutHandoff({
  verifyIdentity:async t=>{assert.equal(t,token);steps.push('identity');return verified();},
  revokeOwnedSessionAsUser:async t=>{assert.equal(t,token);steps.push('revoke-owned');return acknowledged();},
  providerSignOutLocal:async t=>{assert.equal(t,token);steps.push('provider-local');return signedOut();}
 });
 const r=await handoff(token);
 assert.deepEqual(steps,['identity','revoke-owned','provider-local']);
 assert.equal(r.reason,'dual-acknowledgement-unverified');
 assert.equal(r.ownedRevocationAcknowledged,true);
 assert.equal(r.providerSignoutAcknowledged,true);
 assert.equal(r.bothStepsAcknowledged,true);
 assert.equal(r.needsReconciliation,false);
 noTrust(r);
});
test('invalid token, forged identity and malformed accessor never revoke or sign out',async()=>{
 let calls=0;
 const handoff=state=>createInternalSourceReviewSignoutHandoff({
  verifyIdentity:async()=>state,
  revokeOwnedSessionAsUser:async()=>{calls++;return acknowledged();},
  providerSignOutLocal:async()=>{calls++;return signedOut();}
 });
 assert.equal((await handoff(verified())('not-a-token')).reason,'invalid-token');
 for(const state of [
  null,{...verified(),verified:false},{...verified(),userId:'invalid'},
  {...verified(),sessionId:'invalid'},
  {...verified(),verified:'true'},Object.create({...verified()})
 ]){
  const r=await handoff(state)(token);
  assert.equal(r.reason,'identity-unverified');noTrust(r);
 }
 const hostile={...verified()};
 let read=false;
 Object.defineProperty(hostile,'userId',{enumerable:true,get(){read=true;return userId;}});
 const r=await handoff(hostile)(token);
 assert.equal(r.reason,'identity-unverified');
 assert.equal(read,false);
 const poisoned=new Proxy(verified(),{getPrototypeOf(){throw Error('proxy trap');}});
 const blocked=await handoff(poisoned)(token);
 assert.equal(blocked.reason,'identity-unverified');
 noTrust(blocked);
 assert.equal(calls,0);
});
test('provider signout still attempted once if owned revocation is ambiguous or denied',async()=>{
 for(const failure of [
  async()=>{throw Error('db connection lost after write');},
  async()=>null,
  async()=>({revoked:true,userId,sessionId:'33333333-3333-4333-8333-333333333333'}),
  async()=>({revoked:false,userId,sessionId})
 ]){
  const steps=[];
  const run=createInternalSourceReviewSignoutHandoff({
   verifyIdentity:async()=>verified(),
   revokeOwnedSessionAsUser:async()=>{steps.push('owned');return failure();},
   providerSignOutLocal:async()=>{steps.push('provider');return signedOut();}
  });
  const r=await run(token);
  assert.deepEqual(steps,['owned','provider']);
  assert.equal(r.reason,'owned-revocation-unconfirmed');
  assert.equal(r.needsReconciliation,true);
  assert.equal(r.ownedRevocationAcknowledged,false);
  assert.equal(r.providerSignoutAcknowledged,true);
  noTrust(r);
 }
});
test('unknown provider outcome never asserts provider signout even after owned ack',async()=>{
 for(const failure of [
  async()=>{throw Error('provider response lost');},async()=>null,
  async()=>({error:null,scope:'global'}),async()=>({error:Error('failed'),scope:'local'})
 ]){
  const r=await createInternalSourceReviewSignoutHandoff({
   verifyIdentity:async()=>verified(),
   revokeOwnedSessionAsUser:async()=>acknowledged(),
   providerSignOutLocal:failure
  })(token);
  assert.equal(r.reason,'provider-signout-unconfirmed');
  assert.equal(r.ownedRevocationAcknowledged,true);
  assert.equal(r.providerSignoutAcknowledged,false);
  assert.equal(r.needsReconciliation,true);
  noTrust(r);
 }
});
test('identity failure prevents both operations, never retries',async()=>{
 let attempts=0;
 const r=await createInternalSourceReviewSignoutHandoff({
  verifyIdentity:async()=>{attempts++;throw Error('unavailable');},
  revokeOwnedSessionAsUser:async()=>{attempts++;return acknowledged();},
  providerSignOutLocal:async()=>{attempts++;return signedOut();}
 })(token);
 assert.equal(attempts,1);
 assert.equal(r.reason,'identity-unavailable');noTrust(r);
});
test('both dependencies uncertain generate an explicit reconciliation state',async()=>{
 const r=await createInternalSourceReviewSignoutHandoff({
  verifyIdentity:async()=>verified(),
  revokeOwnedSessionAsUser:async()=>{throw Error('timeout');},
  providerSignOutLocal:async()=>{throw Error('timeout');}
 })(token);
 assert.equal(r.reason,'both-unconfirmed');
 assert.equal(r.needsReconciliation,true);noTrust(r);
});
