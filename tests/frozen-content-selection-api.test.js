import test from 'node:test';import assert from 'node:assert/strict';
import {contentSelectionRequest} from '../supabase/functions/owner-api/_shared/frozen-content-selections.js';
const actor='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const preview={contractId:'content-selection-binding-v1',digest:'a'.repeat(64),catalogVersion:446,items:[{kind:'question',canonicalId:'q',versionId:'q@1',version:1,reviewFingerprints:{medical:'a'.repeat(64),references:'b'.repeat(64),rights:'c'.repeat(64)}}],publicationAuthority:false,releaseReadiness:'not-assessed',observedAt:'2026-10-29T00:00:00Z'};
test('preview and freeze use server actor, exact binding and receipt readback',async()=>{
 const calls=[];const receipt={...preview,contractId:'frozen-content-selection-v1',selectionId:id,requestId:id,createdAt:preview.observedAt};
 const admin={async rpc(name,args){calls.push([name,args]);return {data:name.includes('preview')?preview:receipt};}};
 await contentSelectionRequest({admin,actor,action:'preview',input:{items:[{kind:'question',versionId:'q@1'}]}});
 const result=await contentSelectionRequest({admin,actor,action:'save',input:{items:[{kind:'question',versionId:'q@1'}],requestId:id,expectedDigest:preview.digest,expectedCatalogVersion:446}});
 assert.equal(result.selectionId,id);assert.deepEqual(calls.map(x=>x[0]),['owner_content_selection_preview_v1','owner_content_selection_save_v1','owner_content_selection_read_v1']);assert.equal(calls[1][1].p_actor,actor);
});
test('invalid input and database/provider errors fail safely; wrong readback is not success',async()=>{
 let calls=0;await assert.rejects(contentSelectionRequest({admin:{rpc(){calls++;}},actor,action:'preview',input:{actor,items:[]}}),e=>e.status===400);assert.equal(calls,0);
 for(const [message,status] of [['content_admin_required',403],['content_selection_stale',409],['content_selection_item_blocked',409],['PRIVATE SECRET',503]])await assert.rejects(contentSelectionRequest({admin:{async rpc(){return {error:{message}};}},actor,action:'preview',input:{items:[{kind:'question',versionId:'q@1'}]}}),e=>e.status===status&&!e.message.includes('PRIVATE'));
});

test('saved receipt can be reopened but readback mismatch cannot claim success',async()=>{
 const receipt={...preview,contractId:'frozen-content-selection-v1',selectionId:id,requestId:id,createdAt:preview.observedAt};
 const read=await contentSelectionRequest({admin:{async rpc(){return {data:receipt};}},actor,action:'read',input:{selectionId:id}});assert.equal(read.selectionId,id);
 let calls=0;await assert.rejects(contentSelectionRequest({admin:{async rpc(){calls++;return {data:calls===1?receipt:{...receipt,digest:'b'.repeat(64)}};}},actor,action:'save',input:{items:[{kind:'question',versionId:'q@1'}],requestId:id,expectedDigest:preview.digest,expectedCatalogVersion:446}}),e=>e.status===503);
});
