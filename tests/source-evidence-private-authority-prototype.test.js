import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceEvidencePrivateAuthorityPrototype} from '../scripts/lib/source-evidence-private-authority-prototype.js';
const actor='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const sid='33333333-3333-4333-8333-333333333333';
const request='44444444-4444-4444-8444-444444444444';
const issuer='http://127.0.0.1:54321/auth/v1';
const tokenFor=(sub=actor,session_id=sid,extras={})=>
 'e30.'+Buffer.from(JSON.stringify({
 sub,session_id,iss:issuer,aud:'authenticated',
 exp:Math.floor(Date.now()/1000)+3600,...extras
 })).toString('base64url')+'.fixture';
const token=tokenFor();
const input=(accessToken=token)=>({accessToken,requestId:request,digest:'a'.repeat(64)});
test('network Auth verification precedes SQL, exact fixed statement binds authenticated identity',async()=>{
 const calls=[],queries=[];
 const proto=createSourceEvidencePrivateAuthorityPrototype({
  getUser:async t=>{calls.push(t);return {data:{user:{id:actor}},error:null};},
  query:async(sql,args)=>{queries.push({sql,args});return {rows:[{r:{
   status:sql.includes('.stage(')?'staged':'delivered'
  }}]};},expectedIssuer:issuer
 });
 assert.deepEqual(await proto.stage(input()),{status:'staged'});
 assert.deepEqual(await proto.markDelivered(input()),{status:'marked-delivered'});
 assert.equal(calls.length,4);
 assert.equal(queries.length,2);
 assert.equal(queries[0].sql,'select evidence_private.stage($1,$2,$3,$4) as r');
 assert.equal(queries[1].sql,'select evidence_private.deliver($1,$2,$3,$4) as r');
 for(const q of queries)assert.deepEqual(q.args,[actor,sid,request,'a'.repeat(64)]);
 assert.ok(queries.every(q=>!q.args.includes(token)));
});
test('invalid forged token, expired claim, wrong session, outages, uncertain SQL fail closed',async()=>{
 let queries=0;
 let mode='verified';
 const proto=createSourceEvidencePrivateAuthorityPrototype({
  getUser:async()=>{
   if(mode==='offline')throw Error('network offline');
   if(mode==='denied')return {data:{user:null},error:{code:'bad_jwt'}};
   return {data:{user:{id:actor}},error:null};
  },
  query:async()=>{queries++;if(mode==='database_down')throw Error('connection gone');
   return {rows:[{r:{status:'staged'}}]};},expectedIssuer:issuer
 });
 for(const bad of [
  {...input(),actor}, {...input(),sessionId:sid},
  {...input(),digest:'b'}, {...input(),requestId:'not-uuid'},
  {accessToken:token,requestId:request,digest:'a'.repeat(64),verified:true},
  input(tokenFor(other)),input(tokenFor(actor,sid,{exp:1})),
  input(tokenFor(actor,sid,{iss:'https://evil.example/auth/v1'})),
  input(tokenFor(actor,sid,{aud:'anon'})),
  input('bad-jwt')
 ])assert.ok(['invalid','denied'].includes((await proto.stage(bad)).status));
 assert.equal(queries,0);
 mode='offline';
 assert.deepEqual(await proto.stage(input()),{status:'denied'});
 mode='denied';
 assert.deepEqual(await proto.markDelivered(input()),{status:'denied'});
 assert.equal(queries,0);
 mode='database_down';
 assert.deepEqual(await proto.stage(input()),{status:'uncertain'});
 assert.equal(queries,1);
});
test('postcommit provider failure suppresses positive result despite a recorded SQL receipt',async()=>{
 let verifyCount=0,queries=0;
 const proto=createSourceEvidencePrivateAuthorityPrototype({
  expectedIssuer:issuer,
  getUser:async()=>++verifyCount===1?{data:{user:{id:actor}},error:null}:
   {data:{user:null},error:{code:'session_not_found'}},
  query:async()=>{queries++;return {rows:[{r:{status:'delivered'}}]};}
 });
 assert.deepEqual(await proto.markDelivered(input()),{status:'denied'});
 assert.equal(queries,1);
 assert.equal(verifyCount,2);
});
test('internal SQL denial and conflict statuses remain bounded, never expose messages',async()=>{
 for(const [error,status] of [
  ['private_denied','denied'],['private_conflict','conflict'],
  ['private_invalid','invalid'],['SQL connection broken','uncertain']
 ]){
  const proto=createSourceEvidencePrivateAuthorityPrototype({
   expectedIssuer:issuer,
   getUser:async()=>({data:{user:{id:actor}},error:null}),
   query:async()=>{throw Error(error);}
  });
  assert.deepEqual(await proto.stage(input()),{status});
 }
});
