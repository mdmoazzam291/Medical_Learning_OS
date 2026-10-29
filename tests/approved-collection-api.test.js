import test from 'node:test';
import assert from 'node:assert/strict';
import {readApprovedCollection} from '../supabase/functions/owner-api/_shared/approved-collection.js';
const actor='11111111-1111-4111-8111-111111111111';
test('invalid filters fail before database access',async()=>{
 let calls=0;await assert.rejects(readApprovedCollection({admin:{rpc(){calls++;}},actor,params:new URLSearchParams('actor=x')}),e=>e.status===400);assert.equal(calls,0);
});
test('server actor and metadata-only snapshot used without writes',async()=>{
 const calls=[];const admin={async rpc(name,args){calls.push([name,args]);return {data:{contractId:'approved-collection-snapshot-v1',catalogVersion:1,asOf:'2026-10-29T00:00:00Z',rows:[]}};}};
 const p=await readApprovedCollection({admin,actor});assert.equal(p.publicationAuthority,false);assert.deepEqual(calls,[['owner_approved_collection_preflight_v1',{p_actor:actor}]]);
});
test('database failures and invalid snapshots fail closed with safe errors',async()=>{
 for(const [message,status] of [['content_admin_required',403],['PRIVATE BODY',503]])await assert.rejects(readApprovedCollection({admin:{async rpc(){return {error:{message}};}},actor}),e=>e.status===status&&!e.message.includes('PRIVATE'));
 await assert.rejects(readApprovedCollection({admin:{async rpc(){return {data:{rows:[]}};}},actor}),e=>e.status===503);
});
