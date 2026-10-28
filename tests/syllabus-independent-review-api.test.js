import test from 'node:test';import assert from 'node:assert/strict';
import {saveSyllabusScopeReviewerGrant} from '../supabase/functions/owner-api/_shared/syllabus-scope-reviewer-grants.js';
import {syllabusScopeReviewRequest} from '../supabase/functions/review-api/_shared/syllabus-scope-review.js';
const owner='11111111-1111-4111-8111-111111111111',reviewer='33333333-3333-4333-8333-333333333333';
const bid='22222222-2222-4222-8222-222222222222';
const grant=()=>({requestId:owner,baselineId:bid,reviewerUserId:reviewer,action:'grant',reason:'Independent review of this synthetic syllabus proposal'});
const decision=()=>({requestId:owner,baselineId:bid,revision:2,digest:'a'.repeat(64),
 decision:'changes-required',evidenceLocator:'Synthetic source rights dossier',evidenceSha256:'b'.repeat(64),
 note:'This synthetic proposed syllabus scope requires correction.',
 attestationVersion:'independent-syllabus-scope-review-v1'});
test('owner grants are actor-bound, authenticated and cannot override scope or review outcome',async()=>{
 let args;const r=await saveSyllabusScopeReviewerGrant({actor:owner,input:grant(),admin:{async rpc(name,input){args={name,input};return{data:{contractId:'syllabus-scope-grant-event-v1',baselineId:bid,
 reviewerUserId:reviewer,action:'grant',learnerRelease:false},error:null};}}});
 assert.equal(args.name,'syllabus_scope_reviewer_grant_v1');assert.equal(args.input.p_actor,owner);
 assert.equal(r.learnerRelease,false);
 await assert.rejects(saveSyllabusScopeReviewerGrant({actor:owner,input:{...grant(),isAdmin:true},
 admin:{async rpc(){throw Error('called');}}}),e=>e.status===400);
});
test('reviewer route allows exact scoped read, requires verified actor for decision and rejects forged fields',async()=>{
 const calls=[];
 const admin={async rpc(name,args){calls.push({name,args});return name.includes('inspect')?
  {data:{contractId:'syllabus-scope-review-target-v1',baselineId:bid,revision:2,reviewerId:reviewer,
   officialSyllabusCertified:false,curriculumActivated:false,learnerRelease:false},error:null}:
  {data:{contractId:'syllabus-scope-review-receipt-v1',decisionId:owner,
   baselineId:bid,revision:2,draftDigest:'a'.repeat(64),reviewerId:reviewer,
   decision:'changes-required',receiptDigest:'c'.repeat(64),scopeReviewOnly:true,
   officialSyllabusCertified:false,curriculumActivated:false,learnerRelease:false},error:null};}};
 await syllabusScopeReviewRequest({admin,reviewerId:reviewer,method:'GET',baselineId:bid,
  params:new URLSearchParams('revision=2')});
 const receipt=await syllabusScopeReviewRequest({admin,reviewerId:reviewer,method:'POST',baselineId:bid,
  params:new URLSearchParams(),input:decision()});
 assert.equal(receipt.learnerRelease,false);assert.equal(calls[0].args.p_reviewer,reviewer);
 assert.equal(calls[1].args.p_registry_version,'pg-preparation:foundation@1');
 assert.equal(calls[1].args.p_reviewer,reviewer);
 for(const p of [{input:{...decision(),reviewerId:owner}},
 {input:{...decision(),approval:'official'}},
 {input:{...decision(),evidenceSha256:'bad'}},{params:new URLSearchParams('actor=forged')},
 {baselineId:'notuuid'}])
 await assert.rejects(syllabusScopeReviewRequest({admin,reviewerId:reviewer,method:'POST',baselineId:bid,
  params:new URLSearchParams(),input:decision(),...p}),e=>e.status===400);
 assert.equal(calls.length,2);
});
test('reviewer errors do not leak SQL, revoked grants get 403, stale decisions conflict',async()=>{
 for(const [message,status] of [['syllabus_scope_reviewer_not_authorized',403],
 ['syllabus_scope_review_stale',409],['unexpected auth secret',503]])await assert.rejects(
 syllabusScopeReviewRequest({admin:{async rpc(){return{error:{message}};}},reviewerId:reviewer,
 method:'POST',baselineId:bid,params:new URLSearchParams(),input:decision()}),
 e=>e.status===status&&!e.message.includes('secret'));
});
