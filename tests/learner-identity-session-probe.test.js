import test from 'node:test';
import assert from 'node:assert/strict';
import {probeLearnerIdentitySessions as probe} from '../scripts/lib/learner-identity-session-probe.js';
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'],tokens=['synthetic-token-a','synthetic-token-b'],codes=['ML-0000-0000-0000-0000','ML-1111-1111-1111-1111'];
function harness({sameIdentity=false,wrongOwner=false,missingMarker=false,crossCode=false,badPrivate=false,failReadback=false}={}){
 const rows=[null,null],calls=[];let reads=0;
 const input={tokens,expectedIds:ids,async verifyIdentity(token){const i=tokens.indexOf(token);return {id:sameIdentity?ids[0]:wrongOwner?crypto.randomUUID():ids[i],email:'synthetic'+i+'@example.invalid',app_metadata:{mlos_staging_synthetic:!missingMarker}};},async request({token,path,method}){
  calls.push({token,path,method});const i=tokens.indexOf(token);
  let status=200,body;if(token===null){status=401;body={error:'unauthorized'};}else if(path.includes('?')){status=400;body={error:'query_not_supported'};}else{
   if(method==='POST')rows[i]=crossCode?codes[0]:codes[i];
   reads++;body={contractId:'learner-identity-self-v1',status:rows[i]?'assigned':'not_assigned',learnerCode:failReadback&&reads>2?'bad':rows[i]};
  }
  return {status,body,privateResponse:!badPrivate};
 }};return {input,calls};
}
test('two independently verified synthetic sessions converge on own immutable codes without exposing them',async()=>{
 const {input,calls}=harness();const r=await probe(input);assert.equal(r.status,'passed');assert.equal(r.signedInAssertionsPassed,true);assert.equal(r.cleanupVerified,false);assert.ok(calls.some(c=>c.path.includes('?')));const text=JSON.stringify(r);for(const secret of [...tokens,...ids,...codes])assert.ok(!text.includes(secret));
});
test('missing distinct ownership or server synthetic marker blocks all API mapping requests',async()=>{
 for(const options of [{sameIdentity:true},{wrongOwner:true},{missingMarker:true}]){const {input,calls}=harness(options);const r=await probe(input);assert.equal(r.status,'blocked');assert.equal(calls.length,0);}
});
test('wrong readback, code sharing and missing private response fail without leaking details',async()=>{
 for(const options of [{crossCode:true},{badPrivate:true},{failReadback:true}]){const {input}=harness(options);const r=await probe(input);assert.equal(r.status,'failed');assert.equal(r.signedInAssertionsPassed,false);assert.equal(r.cleanupVerified,false);}
});
test('verification or API failure sanitizes every credential and does not claim cleanup',async()=>{
 const {input}=harness();input.verifyIdentity=async()=>{throw Error(tokens[0]+' private secret');};const r=await probe(input);assert.equal(r.status,'blocked');assert.equal(r.cleanupVerified,false);assert.ok(!JSON.stringify(r).includes(tokens[0]));
});
test('verified synthetic user UUIDs never enter request URLs or reports',async()=>{
 const {input,calls}=harness();await probe(input);for(const c of calls)for(const id of ids)assert.ok(!c.path.includes(id),'IDs must not enter URL logs');
});
test('ambiguous POST does not retry and requires manual reconciliation',async()=>{
 const {input}=harness();let writes=0;const original=input.request;input.request=async x=>{if(x.method==='POST'){writes++;throw Error('synthetic timeout after possible commit');}return original(x);};const r=await probe(input);assert.equal(r.status,'failed');assert.equal(writes,1);assert.equal(r.requiresManualReconciliation,true);assert.equal(r.cleanupVerified,false);
});
test('input snapshots prevent another operation changing tokens while verification waits',async()=>{
 const {input}=harness();input.tokens=[...input.tokens];input.expectedIds=[...input.expectedIds];let release;const wait=new Promise(r=>release=r),original=input.verifyIdentity;input.verifyIdentity=async t=>{await wait;return original(t);};const pending=probe(input);input.tokens[0]='replacement';input.expectedIds[0]=crypto.randomUUID();release();assert.equal((await pending).status,'passed');
});
test('operator CLI blocks missing credentials and rejects credential flags without echoing them',async()=>{
 const {spawnSync}=await import('node:child_process');
 const script=new URL('../scripts/learner-identity-staging-acceptance.mjs',import.meta.url);
 const env={MLOS_STAGING_REF:'vwtdwafjrraptrgeshzt',MLOS_STAGING_URL:'https://vwtdwafjrraptrgeshzt.supabase.co',MLOS_STAGING_IDENTITY_CONFIRM:'STAGING_LEARNER_IDENTITY_ACCEPTANCE'};
 for(const args of [['--preflight'],['--run','private-synthetic-flag']]){
  const r=spawnSync(process.execPath,[script.pathname,...args],{env,encoding:'utf8'});assert.equal(r.status,2);const output=JSON.parse(r.stdout);assert.equal(output.status,'blocked');assert.equal(output.signedInAssertionsPassed,false);assert.equal(output.cleanupVerified,false);assert.ok(!r.stdout.includes('private-synthetic-flag'));
 }
});
