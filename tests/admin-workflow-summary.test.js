import test from 'node:test';
import assert from 'node:assert/strict';
const domain=await import('../src/domain/admin-workflow.js').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
import {buildAdminActionInbox} from '../src/domain/admin-action-inbox.js';
import {createLibraryHandler} from '../supabase/functions/content-library-api/_shared/handler.js';
const summary={contractId:'admin-workflow-summary-v1',asOf:'2026-10-24T10:00:00Z',draftImportBatches:125,draftRelationshipAssertions:131};
test('workflow evidence accepts full-history counts and rejects incomplete or invented totals',()=>{
 assert.equal(typeof domain.readAdminWorkflowSummary,'function');
 assert.deepEqual(domain.readAdminWorkflowSummary(summary),summary);
 for(const change of [{contractId:'other'},{asOf:'bad'},{draftImportBatches:'125'},{draftRelationshipAssertions:-1},{draftImportBatches:Infinity},{draftImportBatches:null}])assert.equal(domain.readAdminWorkflowSummary({...summary,...change}),null);
 assert.equal(domain.readAdminWorkflowSummary(null),null);
});
test('inbox includes separate import batches and latest relationship drafts without implying approval',()=>{
 const x=buildAdminActionInbox({content:{pendingReview:{medical:0,references:0,rights:0},openLearnerReports:0,unresolvedRights:0}},{alerts:[],workflow:summary});
 assert.deepEqual(x.actions.map(a=>[a.kind,a.count]),[['import-draft',125],['relationship-draft',131]]);
 assert.deepEqual(x.missing,[]);
 assert.ok(x.actions.every(a=>!('publish' in a)&&!('approve' in a)));
 assert.match(x.actions[1].href,/#medical-relationships$/);
});
test('missing workflow evidence and partial review queues cannot produce a complete all-clear',()=>{
 const x=buildAdminActionInbox({content:{pendingReview:{medical:0},openLearnerReports:0,unresolvedRights:0}},{alerts:[]});
 assert.ok(x.missing.includes('import drafts'));
 assert.ok(x.missing.includes('medical relationship drafts'));
 assert.ok(x.missing.includes('human-review queues'));
});
function fixture({isAdmin=true,signedIn=true,allowed=true,failure=false,payload=summary}={}){
 const calls=[];const handler=createLibraryHandler({allowedOrigins:['https://app.invalid'],getUser:async()=>signedIn?{id:'actual-actor'}:null,runtimeAccess:async()=>({allowed}),admin:{rpc:async(name,args)=>{calls.push([name,args]);if(name==='content_admin_status_v1')return {data:{isAdmin}};if(name==='admin_workflow_summary_v1')return failure?{error:{message:'temporary database failure'}}:{data:payload};throw Error(name);}}});
 const request=(method='GET',suffix='')=>new Request('https://project.invalid/functions/v1/content-library-api/admin-workflow'+suffix,{method,headers:{Origin:'https://app.invalid',Authorization:'Bearer fixture'}});
 return {handler,request,calls};
}
test('workflow endpoint derives actor and exposes only no-store count evidence',async()=>{
 const f=fixture(),r=await f.handler(f.request());assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'no-store');assert.deepEqual(await r.json(),summary);
 assert.deepEqual(f.calls,[['content_admin_status_v1',{p_user:'actual-actor'}],['admin_workflow_summary_v1',{p_actor:'actual-actor'}]]);
});
test('workflow counts remain denied to learners, missing sessions and actor/query injection',async()=>{
 for(const options of [{isAdmin:false},{signedIn:false},{allowed:false}]){const f=fixture(options),r=await f.handler(f.request());assert.ok([401,403].includes(r.status));assert.equal(f.calls.some(([n])=>n==='admin_workflow_summary_v1'),false);}
 const f=fixture();assert.equal((await f.handler(f.request('POST'))).status,405);assert.equal((await f.handler(f.request('GET','?actor=forged'))).status,400);assert.equal(f.calls.some(([n])=>n==='admin_workflow_summary_v1'),false);
});
test('failed or malformed workflow reads are unavailable rather than zero',async()=>{
 for(const options of [{failure:true},{payload:null},{payload:{...summary,draftImportBatches:'125'}}]){const f=fixture(options),r=await f.handler(f.request());assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'admin_workflow_unavailable'});}
});
