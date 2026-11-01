import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {probeStagingAuthGetUser} from '../scripts/internal-source-review-staging-auth-getuser-probe.mjs';

const STAGING='vwtdwafjrraptrgeshzt';
const USER='11111111-1111-4111-8111-111111111111';
const SESSION='22222222-2222-4222-8222-222222222222';
const ORIGIN='https://'+STAGING+'.supabase.co';
const key='sb_publishable_'+'a'.repeat(32);
const encode=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const claims=()=>({
 iss:ORIGIN+'/auth/v1',aud:'authenticated',role:'authenticated',
 sub:USER,session_id:SESSION,exp:Math.floor(Date.now()/1000)+3600
});
const token=(body=claims(),header={alg:'HS256',typ:'JWT'})=>
 encode(header)+'.'+encode(body)+'.'+'A'.repeat(43);
const policy=()=>({
 approvedStagingProjectRef:STAGING,productionProjectRef:'iyapppmeieqhflnzslao',
 excludedLegacyProjectRefs:['ueuguguoladoqvtxkumt'],
 requiredStagingProjectName:'medical_learning_os_staging',
 requiresExplicitOwnerApproval:true
});
const env=()=>({
 MLOS_STAGING_READONLY_CONFIRM:'STAGING_AUTH_GETUSER_NO_WRITES',
 MLOS_STAGING_REF:STAGING,MLOS_STAGING_URL:ORIGIN,
 MLOS_STAGING_TEST_USER_ID:USER,MLOS_STAGING_TEST_SESSION_ID:SESSION,
 MLOS_STAGING_PUBLISHABLE_KEY:key,
 MLOS_STAGING_TEST_ACCESS_TOKEN:token()
});
function closed(out){
 assert.equal(Object.isFrozen(out),true);
 for(const prop of ['productionSourceReviewApproved','managedMigrationApproved',
  'stagingSourceReviewWriteApproved','stagingReaderRpcApproved',
  'reviewerGrantAuthorityVerified','transactionalProviderSignoutVerified',
  'readbackReceiptVerified','clinicalApproved','rightsApproved',
  'examScopeApproved','learnerRelease','automaticWriteRetryAllowed'])
  assert.equal(out[prop],false,prop);
 assert.equal(JSON.stringify(out).includes(key),false);
 assert.equal(JSON.stringify(out).includes(USER),false);
}
const response=(status,body)=>({status,async json(){return body;}});
test('no configuration, wrong project, production or legacy origin causes ZERO HTTP',async()=>{
 let calls=0;
 const fetcher=async()=>{calls++;throw Error('unexpected_network_call');};
 const data=env();
 for(const wrong of [
  {},
  {...data,MLOS_STAGING_READONLY_CONFIRM:''},
  {...data,MLOS_STAGING_URL:'https://iyapppmeieqhflnzslao.supabase.co'},
  {...data,MLOS_STAGING_REF:'iyapppmeieqhflnzslao'},
  {...data,MLOS_STAGING_REF:'ueuguguoladoqvtxkumt'},
  {...data,MLOS_STAGING_URL:ORIGIN+'/'},
  {...data,MLOS_STAGING_URL:ORIGIN+'@attacker.example'},
  {...data,MLOS_STAGING_PUBLISHABLE_KEY:'sb_secret_abc'},
  {...data,MLOS_STAGING_TEST_USER_ID:'33333333-3333-4333-8333-333333333333'},
  {...data,MLOS_STAGING_TEST_SESSION_ID:'33333333-3333-4333-8333-333333333333'},
  {...data,MLOS_STAGING_TEST_ACCESS_TOKEN:'not a bearer token'},
  {...data,MLOS_STAGING_TEST_ACCESS_TOKEN:token({...claims(),exp:1})},
  {...data,MLOS_STAGING_TEST_ACCESS_TOKEN:token({...claims(),role:'service_role'})},
  {...data,MLOS_STAGING_TEST_ACCESS_TOKEN:token({...claims(),aud:'anon'})},
  {...data,MLOS_STAGING_TEST_ACCESS_TOKEN:token({...claims(),iss:'https://other.supabase.co/auth/v1'})},
  {...data,MLOS_STAGING_TEST_ACCESS_TOKEN:token(claims(),{alg:'none'})}
 ]){
  const result=await probeStagingAuthGetUser(wrong,policy(),fetcher);
  assert.equal(result.reason,'staging-probe-not-configured');
  closed(result);
 }
 for(const fake of [
  {...policy(),approvedStagingProjectRef:'iyapppmeieqhflnzslao'},
  {...policy(),excludedLegacyProjectRefs:[]},
  {...policy(),requiresExplicitOwnerApproval:false},
  {...policy(),productionProjectRef:'vwtdwafjrraptrgeshzt'}
 ]){
  const r=await probeStagingAuthGetUser(data,fake,fetcher);
  assert.equal(r.reason,'staging-probe-not-configured');
 }
 assert.equal(calls,0);
});
test('positive simulated Auth response plus two negatives makes only read-only Auth evidence',async()=>{
 const provided=env();
 const calls=[];
 const fake=async(url,options)=>{
  calls.push({url,method:options.method,headers:options.headers,cache:options.cache,redirect:options.redirect});
  assert.equal(url,ORIGIN+'/auth/v1/user');
  assert.equal(options.method,'GET');
  assert.equal(options.cache,'no-store');
  assert.equal(options.redirect,'error');
  assert.equal(options.headers.apikey,key);
  if(calls.length===1){
   assert.equal(options.headers.Authorization,'Bearer '+provided.MLOS_STAGING_TEST_ACCESS_TOKEN);
   return response(200,{id:USER,email:'private@example.invalid'});
  }
  if(calls.length===2){
   assert.equal(options.headers.Authorization,undefined);
   return response(401,{});
  }
  assert.notEqual(options.headers.Authorization,'Bearer '+provided.MLOS_STAGING_TEST_ACCESS_TOKEN);
  return response(401,{});
 };
 const out=await probeStagingAuthGetUser(provided,policy(),fake);
 assert.equal(out.reason,'staging-auth-getuser-readonly-pass');
 assert.equal(out.hostedAuthGetUserChecked,true);
 assert.equal(out.anonymousGetUserDenied,true);
 assert.equal(out.forgedJwtDenied,true);
 assert.equal(out.hostedJwtReadOnlyEvidence,true);
 assert.equal(calls.length,3);
 closed(out);
});
test('hosted identity mismatch or rejected good token never pass Auth acceptance',async()=>{
 const badUser=await probeStagingAuthGetUser(env(),policy(),async()=>response(200,{id:'33333333-3333-4333-8333-333333333333'}));
 assert.equal(badUser.reason,'staging-auth-user-mismatch');
 closed(badUser);
 const denied=await probeStagingAuthGetUser(env(),policy(),async()=>response(401,{}));
 assert.equal(denied.reason,'staging-token-not-verified');
 closed(denied);
});
test('anonymous or forged bearer accepted by server fails closed',async()=>{
 for(const expectedCall of [2,3]){
  let call=0;
  const r=await probeStagingAuthGetUser(env(),policy(),async()=>{
   call++;
   if(call===1)return response(200,{id:USER});
   if(call===expectedCall)return response(200,{id:USER});
   return response(401,{});
  });
  assert.notEqual(r.reason,'staging-auth-getuser-readonly-pass');
  assert.equal(r.hostedJwtReadOnlyEvidence,false);
  closed(r);
 }
});
test('network, response parser, hostile policy or identity properties fail closed without secrets',async()=>{
 const net=await probeStagingAuthGetUser(env(),policy(),async()=>{throw Error('sensitive-token-and-key');});
 assert.equal(net.reason,'staging-auth-request-unavailable');
 closed(net);
 const parser=await probeStagingAuthGetUser(env(),policy(),async()=>({status:200,async json(){throw Error('invalid hosted response');}}));
 assert.equal(parser.reason,'staging-auth-request-unavailable');
 closed(parser);
 let getterCalled=false;
 const poisoned=env();
 Object.defineProperty(poisoned,'MLOS_STAGING_REF',{enumerable:true,get(){getterCalled=true;return STAGING;}});
 let calls=0;
 const r=await probeStagingAuthGetUser(poisoned,policy(),async()=>{calls++;return response(200,{id:USER});});
 assert.equal(getterCalled,false);
 assert.equal(calls,0);
 assert.equal(r.reason,'staging-probe-not-configured');
 closed(r);
});
test('probe source exposes no write methods, sign-in, signup, refresh, login or hard-coded bearer',async()=>{
 const source=await readFile(new URL('../scripts/internal-source-review-staging-auth-getuser-probe.mjs',import.meta.url),'utf8');
 assert.match(source,/method:'GET'/);
 assert.match(source,/--read-only/);
 assert.match(source,/STAGING_AUTH_GETUSER_NO_WRITES/);
 assert.match(source,/\/auth\/v1\/user/);
 assert.doesNotMatch(source,/method:\s*'(?:POST|PATCH|DELETE|PUT)'/);
 assert.doesNotMatch(source,/\b(?:signUp|signInWithPassword|signOut|refreshSession|admin\.createUser|admin\.deleteUser)\s*\(/);
 assert.doesNotMatch(source,/\/rest\/v1\/rpc\//);
});
