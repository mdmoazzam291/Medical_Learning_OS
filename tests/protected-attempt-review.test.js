import test from 'node:test';
import assert from 'node:assert/strict';
import { readLearnerAttemptReview } from '../supabase/functions/study-api/_shared/attempt-review.js';
const event={eventId:'a1',learnerId:'alice',questionVersionId:'q@1',conceptId:'c1',correct:false,occurredAt:'2026-10-25T00:00:00Z',durationMs:1000};
function fixture(change={}) {
 const attempt={id:'a1',learner_id:'alice',event,recorded_at:event.occurredAt,presentation:null,receipt:{event,selectedOptionId:'a',answerOptionId:'b',explanation:'Original explanation',sources:[{sourceId:'s1',title:'Source',version:'1',url:null,rightsEvidence:'private'}],catalogVersion:5,adminNote:'secret'},...change};
 const question={questionId:'q',questionVersionId:'q@1',version:1,status:'published',publishedAt:event.occurredAt,stem:'Original prompt',options:[{optionId:'a',text:'A'},{optionId:'b',text:'B'}],sourceIds:['s1'],answerOptionId:'b',explanation:'Current explanation',reviewerNote:'secret'};
 const catalog={schemaVersion:1,questions:[question],sources:[{sourceId:'s1',rights:{status:'owned'}}]};
 const calls=[];let catalogReads=0;
 const query={select(){return this;},eq(k,v){calls.push([k,v]);return this;},async maybeSingle(){return {data:attempt,error:null};}};
 const admin={from(table){assert.equal(table,'study_attempts');return query;}};
 return {attempt,question,catalog,calls,query,run:(overrides={})=>readLearnerAttemptReview({admin,learnerId:'alice',attemptId:'a1',getCatalog:async()=>{catalogReads++;return {body:catalog};},...overrides}),reads:()=>catalogReads};
}
test('owned original review uses exact version and original receipt without a session read or rescore',async()=>{
 const f=fixture();const before=JSON.stringify(f.attempt);const r=await f.run();
 assert.deepEqual(f.calls,[['id','a1'],['learner_id','alice']]);assert.equal(r.availability,'available');assert.equal(r.question.stem,'Original prompt');assert.equal(r.receipt.explanation,'Original explanation');assert.equal(r.attempt.correct,false);assert.equal(r.receipt.answerOptionId,'b');assert.equal(r.rescored,false);assert.equal(JSON.stringify(f.attempt),before);assert.ok(!JSON.stringify(r).includes('secret'));assert.ok(!JSON.stringify(r).includes('rightsEvidence'));
});
test('missing and foreign attempts are indistinguishable and never read content',async()=>{
 for(const change of [{learner_id:'bob'},{id:'other'}]){const f=fixture(change);await assert.rejects(f.run(),/attempt_not_found/);assert.equal(f.reads(),0);}
 const f=fixture();f.query.maybeSingle=async()=>({data:null,error:null});await assert.rejects(f.run(),/attempt_not_found/);assert.equal(f.reads(),0);
});
test('retired and absent versions retain results but disclose no content or old explanation',async()=>{
 for(const missing of [false,true]){const f=fixture();f.question.status='retired';if(missing)f.catalog.questions=[];const r=await f.run();assert.equal(r.availability,'restricted');assert.equal(r.question,null);assert.equal(r.receipt,null);assert.equal(r.attempt.correct,false);assert.ok(!JSON.stringify(r).includes('Original'));}
});
test('a published successor never replaces a retired attempted version',async()=>{
 const f=fixture();f.question.status='retired';f.catalog.questions.push({...f.question,questionVersionId:'q@2',version:2,status:'published',stem:'New prompt'});const r=await f.run();assert.equal(r.question,null);assert.equal(r.attempt.questionVersionId,'q@1');
});
test('unresolved, missing and unrecognized source rights fail closed',async()=>{
 for(const status of ['unknown','withdrawn',null]){const f=fixture();f.catalog.sources[0].rights.status=status;assert.equal((await f.run()).receipt,null);}
 for(const sources of [[],null]){const f=fixture();f.catalog.sources=sources;assert.equal((await f.run()).question,null);}
});
test('concise or unknown presentations cannot be represented as the original prompt',async()=>{
 for(const representation of ['concise-practice','other']){const f=fixture({presentation:{representation}});assert.equal((await f.run()).question,null);}
});
test('receipt and event identity mismatch fail without revealing content',async()=>{
 for(const mismatch of [{eventId:'other'},{questionVersionId:'q@2'},{learnerId:'bob'},{correct:true}]){const f=fixture();f.attempt.receipt.event={...event,...mismatch};await assert.rejects(f.run(),/attempt_evidence_invalid/);assert.equal(f.reads(),0);}
});
test('read failures do not invent an empty history',async()=>{const f=fixture();f.query.maybeSingle=async()=>({data:null,error:{code:'unavailable'}});await assert.rejects(f.run(),/attempt_review_read_failed/);});
test('query overrides and unauthenticated identity are rejected before database access',async()=>{const f=fixture();await assert.rejects(f.run({search:'?learnerId=bob'}),/query_not_supported/);await assert.rejects(f.run({learnerId:''}),/learner_required/);assert.deepEqual(f.calls,[]);});
test('ambiguous version and source identities are restricted instead of guessing',async()=>{for(const duplicate of ['version','source']){const f=fixture();if(duplicate==='version')f.catalog.questions.push({...f.question});else f.catalog.sources.push({...f.catalog.sources[0]});assert.equal((await f.run()).availability,'restricted');}});
test('cloud adapter uses authenticated GET and encodes the attempt identifier',async()=>{
 const {createCloudStudy}=await import('../src/adapters/cloud-study.js');const calls=[];
 const cloud=createCloudStudy({projectUrl:'https://example-ref.supabase.co',publishableKey:'sb_publishable_test',auth:{getSession:async()=>({accessToken:'jwt'})},fetchFn:async(url,options)=>{calls.push({url,options});return Response.json({contractId:'learner-attempt-review-v1'});}});
 await cloud.attemptReview('a/b?learnerId=bob');assert.ok(calls[0].url.endsWith('/attempts/a%2Fb%3FlearnerId%3Dbob/review'));assert.equal(calls[0].options.method,'GET');assert.equal(calls[0].options.body,undefined);assert.equal(calls[0].options.headers.Authorization,'Bearer jwt');
});
