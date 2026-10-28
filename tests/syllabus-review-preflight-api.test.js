import test from 'node:test';
import assert from 'node:assert/strict';
import {readSyllabusReviewPreflight} from '../supabase/functions/owner-api/_shared/syllabus-review-preflight.js';
const actor='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const params=new URLSearchParams('revision=1');
const sqlPacket={
 contractId:'admin-syllabus-review-preflight-v1',baselineId:id,revision:1,digest:'a'.repeat(64),
 authoredCatalogVersion:2,currentCatalogVersion:2,registryVersion:'pg-preparation:foundation@1',
 pathwayVersionId:'neet-pg:preparation@1',scopeDeclaration:'partial',sourceKind:'historical',
 sourceLocator:'Synthetic source only',sourceVersion:'synthetic@1',isLatest:true,
 members:[{conceptId:'one',label:'Synthetic',exists:true}]};
test('Admin actor is server-bound; empty curriculum never invents approved objectives or syllabus percentage',async()=>{
 let args;
 const value=await readSyllabusReviewPreflight({admin:{async rpc(name,input){args={name,input};return{data:sqlPacket,error:null};}},
 actor,method:'GET',params,baselineId:id});
 assert.equal(args.name,'syllabus_baseline_review_preflight_v1');
 assert.equal(args.input.p_actor,actor);assert.equal(args.input.p_revision,1);
 assert.equal(value.status,'review-required');assert.equal(value.exactMappedConcepts,0);
 assert.equal(value.coverageFraction,null);assert.equal(value.checklistApproved,false);
});
test('write, forged actor query, malformed revision and baseline id are rejected before RPC',async()=>{
 let calls=0;const admin={async rpc(){calls++;return{data:sqlPacket,error:null};}};
 for(const p of [
 {method:'POST'},{params:new URLSearchParams('revision=1&actor=forged')},
 {baselineId:'bad'}, {params:new URLSearchParams('revision=0')},
 {params:new URLSearchParams('revision=1&revision=1')}
 ])await assert.rejects(readSyllabusReviewPreflight({admin,actor,method:'GET',params,baselineId:id,...p}),
 e=>[400,405].includes(e.status));
 assert.equal(calls,0);
});
test('SQL errors are normalized and malformed/released packets fail closed',async()=>{
 for(const [message,expected] of [['content_admin_required',403],['syllabus_baseline_not_found',404],['sql secret',503]]){
 await assert.rejects(readSyllabusReviewPreflight({admin:{async rpc(){return{error:{message}};}},actor,method:'GET',params,baselineId:id}),
 e=>e.status===expected&&!e.message.includes('secret'));
 }
 await assert.rejects(readSyllabusReviewPreflight({admin:{async rpc(){return{data:{...sqlPacket,members:[{conceptId:'one',label:'Synthetic',exists:true,answerKey:'private'}]},error:null};}},actor,method:'GET',params,baselineId:id}),
 e=>e.status===503);
});
