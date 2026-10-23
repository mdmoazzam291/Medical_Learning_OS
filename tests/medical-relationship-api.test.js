import test from 'node:test';
import assert from 'node:assert/strict';
import {createLibraryHandler} from '../supabase/functions/content-library-api/_shared/handler.js';
const origin='https://medical-learning-os-web.medicalos.workers.dev';
const digest='a'.repeat(64);
const request=(path,body)=>new Request('https://example.test/content-library-api'+path,{method:body===undefined?'GET':'POST',headers:{Origin:origin,Authorization:'Bearer synthetic',...(body===undefined?{}:{'Content-Type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)})});
function fixture({isAdmin=true,error,signedOut=false}={}){
 const calls=[];const handler=createLibraryHandler({getUser:async()=>signedOut?null:{id:'actual-user'},runtimeAccess:async()=>({allowed:true}),allowedOrigins:[origin],admin:{rpc:async(name,args)=>{
  if(name==='content_admin_status_v1')return {data:{isAdmin}};
  calls.push({name,args});return error?{error:{message:error}}:{data:{contractId:'synthetic-receipt'}};
 }}});return {handler,calls};
}
test('relationship queue and inspection require actual Admin even when learner supplies true attestation',async()=>{
 for(const [path,body] of [['/relationships'],['/relationships/relation%401'],['/relationships',{assertion:{}}],['/relationships/relation%401/publish',{digest,reviewNotes:'Inspected',attested:true}],['/relationships/relation%401/retire',{digest,reason:'Correction'}]]){
  const f=fixture({isAdmin:false});assert.equal((await f.handler(request(path,body))).status,403);assert.deepEqual(f.calls,[]);
 }
});
test('relationship reads use service inspection with Auth-derived actor and exact version ID',async()=>{
 const f=fixture();for(const path of ['/relationships','/relationships/relation%401'])assert.equal((await f.handler(request(path))).status,200);
 assert.deepEqual(f.calls,[{name:'medical_relationship_inspect_v1',args:{p_actor:'actual-user',p_version_id:null}},{name:'medical_relationship_inspect_v1',args:{p_actor:'actual-user',p_version_id:'relation@1'}}]);
});
test('relationship staging passes only assertion and authenticated curator, rejecting injected authority',async()=>{
 const f=fixture();assert.equal((await f.handler(request('/relationships',{assertion:{relationshipId:'synthetic'},reviewerId:'forged'}))).status,400);assert.equal(f.calls.length,0);
 assert.equal((await f.handler(request('/relationships',{assertion:{relationshipId:'synthetic'}}))).status,200);
 assert.deepEqual(f.calls,[{name:'medical_relationship_stage_v1',args:{p_assertion:{relationshipId:'synthetic'},p_actor:'actual-user'}}]);
});
test('relationship publication requires exact-target human attestation and rejects caller verification flags',async()=>{
 const f=fixture();const input={digest,reviewNotes:'Inspected exact source and assertion',attested:true};
 for(const body of [{...input,attested:false},{...input,digest:'stale'},{...input,reviewNotes:' '},{...input,reviewerId:'forged'},{...input,medicalReviewVerified:true}])assert.equal((await f.handler(request('/relationships/relation%401/publish',body))).status,400);
 assert.equal(f.calls.length,0);assert.equal((await f.handler(request('/relationships/relation%401/publish',input))).status,200);
 assert.deepEqual(f.calls,[{name:'medical_relationship_publish_v1',args:{p_version_id:'relation@1',p_actor:'actual-user',p_expected_digest:digest,p_review_notes:input.reviewNotes,p_attested:true}}]);
});
test('relationship retirement binds reason and digest without accepting actor spoofing',async()=>{
 const f=fixture();for(const body of [{digest,reason:''},{digest,reason:'Correction',actorId:'forged'}])assert.equal((await f.handler(request('/relationships/relation%401/retire',body))).status,400);
 assert.equal(f.calls.length,0);assert.equal((await f.handler(request('/relationships/relation%401/retire',{digest,reason:'Correction'}))).status,200);
 assert.deepEqual(f.calls,[{name:'medical_relationship_retire_v1',args:{p_version_id:'relation@1',p_actor:'actual-user',p_expected_digest:digest,p_reason:'Correction'}}]);
});
test('relationship failure responses distinguish conflicts/authority/not-found and hide SQL internals',async()=>{
 for(const [error,status,expected] of [['stale_relationship_digest',409,'stale_relationship_digest'],['publication_rights_unresolved',409,'publication_rights_unresolved'],['reviewer_not_authorized',403,'reviewer_not_authorized'],['relationship_not_found',404,'relationship_not_found'],['password=private constraint detail',500,'relationship_unavailable']]){
  const f=fixture({error});const r=await f.handler(request('/relationships/relation%401/publish',{digest,reviewNotes:'Inspected',attested:true}));assert.equal(r.status,status);assert.deepEqual(await r.json(),{error:expected});assert.equal(r.headers.get('Cache-Control'),'no-store');
 }
});
test('relationship routes reject query injection, malformed IDs and signed-out users',async()=>{
 const f=fixture();for(const path of ['/relationships?actor=forged','/relationships/%ZZ','/relationships/%2Fforged'])assert.equal((await f.handler(request(path))).status,400);
 assert.equal(f.calls.length,0);assert.equal((await fixture({signedOut:true}).handler(request('/relationships'))).status,401);
});
