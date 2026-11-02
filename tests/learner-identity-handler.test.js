import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import {allocateLearnerCode,normalizeLearnerCode} from '../ops/prototypes/learner-identity/learner-code.js';
const owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',session='33333333-3333-4333-8333-333333333333',code='ML-0123-4567-89AB-CDEF';
const token='e30.'+Buffer.from(JSON.stringify({sub:other,session_id:session})).toString('base64url')+'.synthetic';
const source=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/learner-identity-api/index.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''),{mode:'transform'});
const runtime=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/learner-experiment-api/_shared/runtime-access.ts',import.meta.url),'utf8').replace('export async function','async function'),{mode:'transform'});
function harness({rejectToken=false,outage=false,suspend=false,revokeDuringRead=false,revokeDuringInsert=false,badRow=false,lostWrite=false,assigned=false,outageDuringRead=false,throwRuntime=false,throwRuntimeAfter=0}={}){
 const calls={auth:[],runtime:[],reads:[],inserts:[]};let handler,revoked=false,storageOutage=false,stored=assigned?{auth_user_id:owner,learner_code:code}:null;
 const env={SUPABASE_URL:'https://example.invalid',SUPABASE_ANON_KEY:'public-fixture',SUPABASE_SERVICE_ROLE_KEY:'private-fixture'};
 const table={select(){return this;},eq(k,id){assert.equal(k,'auth_user_id');calls.reads.push(id);return this;},async maybeSingle(){if(revokeDuringRead)revoked=true;if(outageDuringRead)storageOutage=true;return {data:badRow?{auth_user_id:other,learner_code:code}:stored,error:null};},async insert(row){calls.inserts.push(row);stored=row;if(revokeDuringInsert)revoked=true;if(lostWrite)return {error:{code:'connection_lost',message:'private-fixture token SQL secret'}};return {error:null};}};
 const createClient=(url,key)=>({auth:{async getUser(t){calls.auth.push(t);return {data:{user:rejectToken?null:{id:owner}},error:rejectToken?{message:'secret'}:null};}},async rpc(name,args){calls.runtime.push({name,args});if(throwRuntime&&calls.runtime.length>throwRuntimeAfter)throw Error('private-fixture transport secret '+token);return (outage||storageOutage)?{data:null,error:{message:'secret'}}:{data:{allowed:!revoked&&!suspend,reason:suspend?'account_suspended':revoked?'session_inactive':'allowed'},error:null};},from(name){assert.equal(key,'private-fixture');assert.equal(name,'learner_reference_codes');return table;}});
 const context=vm.createContext({Request,Response,URL,TextEncoder,atob,crypto,setTimeout,clearTimeout,createClient,allocateLearnerCode,normalizeLearnerCode,Deno:{env:{get:k=>env[k]},serve:fn=>{handler=fn;}}});
 vm.runInContext(runtime+'\n'+source,context);
 async function request(path='/me',{method='GET',auth=true,origin='http://localhost:3000',body}={}){
  const headers={origin};if(auth)headers.authorization='Bearer '+token;
  const r=await handler(new Request('https://example.invalid/functions/v1/learner-identity-api'+path,{method,headers,...(body===undefined?{}:{body,...(body instanceof ReadableStream?{duplex:'half'}:{})})}));return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};
 }
 return {calls,request,get stored(){return stored;}};
}
test('actual identity handler uses verified Auth ID and only current self mapping',async()=>{
 const h=harness(),r=await h.request();assert.equal(r.status,200);assert.equal(r.body.status,'not_assigned');assert.equal(r.body.learnerCode,null);assert.equal(r.cache,'no-store, private');
 assert.deepEqual(h.calls.auth,[token]);assert.ok(h.calls.runtime.every(c=>c.args.p_user===owner&&c.args.p_session===session));assert.deepEqual(h.calls.reads,[owner]);
 const assigned=await h.request('/ensure',{method:'POST'});assert.equal(assigned.status,200);assert.equal(assigned.body.status,'assigned');assert.equal(h.stored.auth_user_id,owner);
 assert.equal((await h.request()).body.learnerCode,assigned.body.learnerCode);
});
test('actual handler rejects anonymous, rejected token, bad origin, supplied body and query before storage',async()=>{
 for(const [options,path,requestOptions,status] of [[{},'/me',{auth:false},401],[{rejectToken:true},'/me',{},401],[{},'/me',{origin:'https://evil.invalid'},403],[{},'/ensure',{method:'POST',body:'{}'},400],[{},'/me?user='+other,{},400]]){
  const h=harness(options),r=await h.request(path,requestOptions);assert.equal(r.status,status);assert.equal(h.calls.reads.length,0);assert.equal(h.calls.inserts.length,0);assert.ok(!JSON.stringify(r.body).includes('private-fixture'));
 }
});
test('actual handler runtime outage and suspension fail closed before mapping access',async()=>{
 for(const [options,status,error] of [[{outage:true},503,'identity_session_check_unavailable'],[{suspend:true},403,'account_suspended']]){
  const h=harness(options),r=await h.request('/ensure',{method:'POST'});assert.equal(r.status,status);assert.equal(r.body.error,error);assert.equal(h.calls.reads.length,0);assert.equal(h.calls.inserts.length,0);
 }
});
test('actual handler rejects wrong-user readback and uncertain writes without leaking code or backend details',async()=>{
 const bad=harness({badRow:true});assert.equal((await bad.request()).status,503);
 const lost=harness({lostWrite:true}),r=await lost.request('/ensure',{method:'POST'});assert.equal(r.status,503);assert.ok(lost.stored);assert.equal(lost.calls.inserts.length,1);assert.equal(r.body.error,'learner_code_allocation_unavailable');assert.equal(r.body.learnerCode,undefined);
});
test('session revocation during GET readback withholds response',async()=>{
 const h=harness({revokeDuringRead:true,assigned:true}),r=await h.request();assert.equal(r.status,403);assert.equal(r.body.error,'runtime_access_denied');assert.equal(r.body.learnerCode,undefined);
});
test('session revocation after ensure insert withholds code while preserving persisted mapping',async()=>{
 const h=harness({revokeDuringInsert:true}),r=await h.request('/ensure',{method:'POST'});assert.equal(r.status,403);assert.ok(h.stored);assert.equal(h.calls.inserts.length,1);assert.equal(r.body.learnerCode,undefined);
});

test('session check outage after stored code readback withholds code as unavailable',async()=>{
 const h=harness({outageDuringRead:true,assigned:true}),r=await h.request();assert.equal(r.status,503);assert.equal(r.body.error,'identity_session_check_unavailable');assert.equal(r.body.learnerCode,undefined);
});

test('hosted-style empty POST body stream permits ensure after Auth',async()=>{
 const h=harness();const body=new ReadableStream({start(c){c.close();}});
 const r=await h.request('/ensure',{method:'POST',body});assert.equal(r.status,200);assert.equal(r.body.status,'assigned');assert.equal(h.calls.inserts.length,1);
});
test('first nonempty chunk of a streamed body rejects before Auth or storage',async()=>{
 const h=harness();const body=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{'));c.close();}});
 const r=await h.request('/ensure',{method:'POST',body});assert.equal(r.status,400);assert.equal(r.body.error,'body_not_supported');assert.equal(h.calls.auth.length,0);assert.equal(h.calls.inserts.length,0);
});

test('stalled POST body is cancelled and rejected within the read deadline',{timeout:5000},async()=>{
 let cancelled=false;const h=harness();const body=new ReadableStream({cancel(){cancelled=true;}});
 const r=await h.request('/ensure',{method:'POST',body});assert.equal(r.status,400);assert.equal(cancelled,true);assert.equal(h.calls.auth.length,0);assert.equal(h.calls.inserts.length,0);
});


test('thrown runtime RPC failure is unavailable before mapping access on GET and POST',async()=>{
 for(const [path,method] of [['/me','GET'],['/ensure','POST']]){
  const h=harness({throwRuntime:true}),r=await h.request(path,{method});assert.equal(r.status,503);assert.equal(r.body.error,'identity_session_check_unavailable');assert.equal(r.cache,'no-store, private');assert.equal(h.calls.reads.length,0);assert.equal(h.calls.inserts.length,0);assert.equal(r.body.learnerCode,undefined);assert.ok(!JSON.stringify(r).includes('private-fixture'));assert.ok(!JSON.stringify(r).includes(token));
 }
});
test('thrown final runtime RPC failure withholds stored or newly committed code as unavailable',async()=>{
 for(const [path,method,assigned] of [['/me','GET',true],['/ensure','POST',false]]){
  const h=harness({throwRuntime:true,throwRuntimeAfter:1,assigned}),r=await h.request(path,{method});assert.equal(r.status,503);assert.equal(r.body.error,'identity_session_check_unavailable');assert.equal(r.body.learnerCode,undefined);assert.ok(h.stored);assert.equal(h.calls.inserts.length,method==='POST'?1:0);assert.equal(h.calls.runtime.length,2);assert.ok(!JSON.stringify(r).includes('private-fixture'));
 }
});

test('runtime checker distinguishes invalid claims from unavailable RPC without leaking errors',async()=>{
 const check=vm.runInNewContext(runtime+';checkRuntimeAccess',{atob});let calls=0;
 const admin={async rpc(){calls++;throw Error('private-fixture transport secret');}};
 for(const [input,reason] of [['not-a-token','session_claim_missing'],['e30.!.synthetic','session_claim_invalid'],['e30.'+Buffer.from('{}').toString('base64url')+'.synthetic','session_claim_missing']]){
  const result=await check(admin,input,owner);assert.equal(result.allowed,false);assert.equal(result.reason,reason);
 }
 assert.equal(calls,0);
 for(const rpc of [async()=>{throw Error('private-fixture transport secret');},async()=>({data:null,error:{message:'private-fixture'}}),async()=>undefined]){
  const result=await check({rpc},token,owner);assert.equal(result.allowed,false);assert.equal(result.reason,'runtime_access_unavailable');assert.ok(!JSON.stringify(result).includes('private-fixture'));
 }
});
