import test from 'node:test';
import assert from 'node:assert/strict';
import {checkRuntimeAccess} from '../supabase/functions/owner-api/_shared/runtime-access.ts';
const actor='11111111-1111-4111-8111-111111111111',session='22222222-2222-4222-8222-222222222222';
const token=payload=>'fixture.'+Buffer.from(JSON.stringify(payload)).toString('base64url')+'.fixture';
test('existing runtime helper binds session to the separately verified actor, not token sub',async()=>{
 const calls=[],admin={async rpc(name,args){calls.push({name,args});return {data:{allowed:true,sessionActive:true},error:null};}};
 assert.equal((await checkRuntimeAccess(admin,token({session_id:session,sub:'untrusted-other-actor'}),actor)).allowed,true);
 assert.deepEqual(calls,[{name:'learner_runtime_access_v1',args:{p_user:actor,p_session:session}}]);
});
test('missing or malformed session claims fail closed before RPC',async()=>{
 let calls=0;const admin={async rpc(){calls++;throw Error('must not call');}};
 for(const value of ['', 'a.b',token({sub:actor}),token({session_id:'bad'}),'a.invalid-json.c'])assert.equal((await checkRuntimeAccess(admin,value,actor)).allowed,false);
 assert.equal(calls,0);
});
test('existing session/account denials remain denied through runtime helper',async()=>{
 for(const reason of ['session_inactive','account_suspended','account_unavailable']){
  const result=await checkRuntimeAccess({async rpc(){return {data:{allowed:false,reason},error:null};}},token({session_id:session}),actor);
  assert.equal(result.allowed,false);assert.equal(result.reason,reason);
 }
});
test('runtime lookup error, missing result and thrown failure never become allow',async()=>{
 for(const response of [{data:null,error:null},{data:null,error:{message:'synthetic unavailable'}}]){
  assert.equal((await checkRuntimeAccess({async rpc(){return response;}},token({session_id:session}),actor)).allowed,false);
 }
 assert.equal((await checkRuntimeAccess({async rpc(){throw Error('synthetic failure');}},token({session_id:session}),actor)).allowed,false);
});
