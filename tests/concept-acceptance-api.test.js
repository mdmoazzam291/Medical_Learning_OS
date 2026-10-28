import test from 'node:test';
import assert from 'node:assert/strict';
import {acceptConceptDraft} from '../supabase/functions/owner-api/_shared/concept-acceptance.js';
import {CONCEPT_ACCEPT_ATTESTATION} from '../src/domain/concept-acceptance.js';
const actor='11111111-1111-4111-8111-111111111111';
const input={schemaVersion:1,requestId:actor,proposalId:'22222222-2222-4222-8222-222222222222',revision:1,digest:'a'.repeat(64),reviewNotes:'Owner explicitly checked classification for a synthetic concept.',attestation:CONCEPT_ACCEPT_ATTESTATION};
test('server-bound Admin actor passed to acceptance RPC, never client supplied',async()=>{
 const calls=[];const data=await acceptConceptDraft({admin:{async rpc(name,args){calls.push({name,args});return{data:{status:'concept_accepted'},error:null};}},actor,method:'POST',params:new URLSearchParams(),input});
 assert.equal(data.status,'concept_accepted');assert.equal(calls[0].name,'concept_draft_accept_v1');assert.equal(calls[0].args.p_actor,actor);
});
test('method, query and acceptance authority cannot be forged',async()=>{
 let calls=0;const admin={async rpc(){calls++;return{data:{},error:null};}};
 for(const change of [{method:'GET'},{params:new URLSearchParams('actor=forged')},{input:{...input,status:'published'}}])
 await assert.rejects(acceptConceptDraft({admin,actor,method:'POST',params:new URLSearchParams(),input,...change}),e=>e.status===405||e.status===400);
 assert.equal(calls,0);
});
test('stale review, identity conflict and unavailable SQL are sanitized',async()=>{
 for(const [message,status] of [['concept_accept_stale',409],['concept_accept_identity_conflict',409],['content_admin_required',403],['private sql fault',503]])
 await assert.rejects(acceptConceptDraft({admin:{async rpc(){return{error:{message}};}},actor,method:'POST',params:new URLSearchParams(),input}),e=>e.status===status&&!e.message.includes('private'));
});
