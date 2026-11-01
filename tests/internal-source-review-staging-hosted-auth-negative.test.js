import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {checkStagingAuthNegative} from '../scripts/internal-source-review-staging-hosted-auth-negative.mjs';

const origin='https://vwtdwafjrraptrgeshzt.supabase.co';
function safety(out){
 assert.equal(Object.isFrozen(out),true);
 for(const k of ['hostedAuthenticatedJwtAccepted','realReviewerAuthorization',
  'sourceReviewWritesEnabled','sourceRightsApproved','productionReleaseApproved',
  'learnerPublicationApproved'])assert.equal(out[k],false,k);
}
test('two real GET requests only: anonymous and structurally forged JWT, no secrets',async()=>{
 let count=0;
 const fetcher=async(url,opts)=>{
  count++;
  assert.equal(url,origin+'/auth/v1/user');
  assert.equal(opts.method,'GET');
  assert.equal(opts.cache,'no-store');
  assert.equal(opts.redirect,'error');
  assert.equal(opts.headers.Accept,'application/json');
  assert.match(opts.headers.apikey,/^sb_publishable_/);
  if(count===1)assert.equal(opts.headers.Authorization,undefined);
  else {
   assert.match(opts.headers.Authorization,/^Bearer [^.]+\.[^.]+\.[A-Za-z0-9_-]+$/);
   const payload=JSON.parse(Buffer.from(opts.headers.Authorization.split('.')[1],'base64url').toString('utf8'));
   assert.equal(payload.iss,origin+'/auth/v1');
   assert.equal(payload.role,'authenticated');
   assert.ok(payload.exp>Math.floor(Date.now()/1000));
  }
  return {status:401};
 };
 const out=await checkStagingAuthNegative(fetcher);
 assert.equal(out.hostedAuthAnonymousDenied,true);
 assert.equal(out.hostedAuthForgedJwtDenied,true);
 assert.equal(count,2);
 safety(out);
});
test('incorrect hosted success, missing-key 400, rate-limit, 404, 5xx and errors fail closed',async()=>{
 for(const status of [200,201,204,400,404,429,500,502]){
  let count=0;
  const out=await checkStagingAuthNegative(async()=>{count++;return {status};});
  assert.equal(out.hostedAuthAnonymousDenied,false,'status '+status);
  assert.equal(out.hostedAuthForgedJwtDenied,false);
  assert.equal(count,1);
  safety(out);
 }
 for(const fail of [()=>{throw Error('private system error');},()=>({}),()=>null]){
  const out=await checkStagingAuthNegative(async()=>fail());
  assert.equal(out.hostedAuthAnonymousDenied,false);
  assert.equal(out.hostedAuthForgedJwtDenied,false);
  assert.ok(!JSON.stringify(out).includes('private system error'));
  safety(out);
 }
});
test('forged JWT unexpectedly accepted must NEVER count as security evidence',async()=>{
 let count=0;
 const out=await checkStagingAuthNegative(async()=>({status:++count===1?403:200}));
 assert.equal(out.hostedAuthAnonymousDenied,true);
 assert.equal(out.hostedAuthForgedJwtDenied,false);
 assert.equal(count,2);
 safety(out);
});
test('script has immutable staging target, public key only and no state-changing routes',async()=>{
 const source=await readFile(new URL('../scripts/internal-source-review-staging-hosted-auth-negative.mjs',import.meta.url),'utf8');
 assert.match(source,/https:\/\/vwtdwafjrraptrgeshzt\.supabase\.co/);
 assert.match(source,/sb_publishable_/);
 assert.match(source,/method:'GET'/);
 assert.match(source,/--read-only-hosted-negative/);
 assert.doesNotMatch(source,/sb_secret_/);
 assert.doesNotMatch(source,/\/rest\/v1\/rpc\//);
 assert.doesNotMatch(source,/\/auth\/v1\/admin\//);
 assert.doesNotMatch(source,/method:\s*['"](?:POST|PUT|DELETE|PATCH)['"]/i);
});
