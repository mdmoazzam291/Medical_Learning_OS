import test from 'node:test';
import assert from 'node:assert/strict';
import {syllabusBaselineDraftRequest} from '../supabase/functions/owner-api/_shared/syllabus-baseline-drafts.js';
const actor='11111111-1111-4111-8111-111111111111';
const input=()=>({schemaVersion:1,requestId:actor,baselineId:null,expectedDigest:null,document:{
 label:'Synthetic checklist',pathwayVersionId:'neet-pg:preparation@1',sourceKind:'historical',sourceLocator:'Synthetic source edition and section',
 sourceVersion:'fiction@1',scopeDeclaration:'partial',conceptIds:[],changeReason:'Create synthetic scoped baseline'}});
test('owner API binds real actor and registry, without any approved status',async()=>{
 let called;
 const r=await syllabusBaselineDraftRequest({admin:{async rpc(name,args){called={name,args};return{data:{status:'draft'},error:null};}},
 actor,method:'POST',params:new URLSearchParams(),input:input()});
 assert.equal(r.status,'draft');assert.equal(called.name,'syllabus_baseline_draft_save_v1');
 assert.equal(called.args.p_actor,actor);assert.equal(called.args.p_registry_version,'pg-preparation:foundation@1');
 assert.equal(Object.hasOwn(called.args.p_input,'status'),false);
});
test('forged actor, approval status, unknown pathway and cross-route writes rejected',async()=>{
 let calls=0;const admin={async rpc(){calls++;return{data:{},error:null};}};
 for(const args of [{method:'DELETE'}, {params:new URLSearchParams('actor=other')},
  {input:{...input(),actor:'other'}}, {input:{...input(),status:'approved'}},
  {input:{...input(),document:{...input().document,pathwayVersionId:'other'}}},
  {method:'POST',baselineId:actor}])
 await assert.rejects(syllabusBaselineDraftRequest({admin,actor,method:'POST',params:new URLSearchParams(),input:input(),...args}),e=>e.status===400||e.status===405);
 assert.equal(calls,0);
});
test('RPC errors never leak private SQL and stale revisions are conflicts',async()=>{
 for(const [message,status] of [['syllabus_baseline_stale',409],['syllabus_baseline_unknown_concept',409],['content_admin_required',403],['unexpected secret error',503]])
 await assert.rejects(syllabusBaselineDraftRequest({admin:{async rpc(){return{error:{message}};}},actor,
 method:'GET',params:new URLSearchParams()}),e=>e.status===status&&!e.message.includes('secret'));
});
