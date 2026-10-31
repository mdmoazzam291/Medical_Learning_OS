import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceEvidencePrivateAuthorityPrototype,createSourceEvidencePrivateAckReconciler} from '../scripts/lib/source-evidence-private-authority-prototype.js';
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
const attempt='55555555-5555-4555-8555-555555555555';
const input=(accessToken=token)=>({accessToken,requestId:request,digest:'a'.repeat(64)});
test('network Auth verification precedes SQL, exact fixed statement binds authenticated identity',async()=>{
 const calls=[],queries=[];
 const proto=createSourceEvidencePrivateAuthorityPrototype({
  getUser:async t=>{calls.push(t);return {data:{user:{id:actor}},error:null};},
  query:async(sql,args)=>{queries.push({sql,args});return {rows:[{r:{
   status:sql.includes('.stage(')?'staged':'intent-recorded',...(sql.includes('.stage(')?{}:{attemptId:attempt})
  }}]};},expectedIssuer:issuer
 });
 assert.deepEqual(await proto.stage(input()),{status:'staged'});
 assert.deepEqual(await proto.reserveIntent(input()),{status:'intent-recorded',attemptId:attempt});
 assert.equal(calls.length,4);
 assert.equal(queries.length,2);
 assert.equal(queries[0].sql,'select evidence_private.stage($1,$2,$3,$4) as r');
 assert.equal(queries[1].sql,'select evidence_private.reserve_intent($1,$2,$3,$4) as r');
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
 assert.deepEqual(await proto.reserveIntent(input()),{status:'denied'});
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
  query:async()=>{queries++;return {rows:[{r:{status:'intent-recorded',attemptId:attempt}}]};}
 });
 assert.deepEqual(await proto.reserveIntent(input()),{status:'denied'});
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

test('repeated reservation never redispatches and cannot expose an attempt identifier',async()=>{
 let count=0;
 const proto=createSourceEvidencePrivateAuthorityPrototype({
  getUser:async()=>({data:{user:{id:actor}},error:null}),
  expectedIssuer:issuer,
  query:async()=>({rows:[{r:++count===1?{status:'intent-recorded',attemptId:attempt}:
   {status:'reconciliation-required'}}]})
 });
 assert.deepEqual(await proto.reserveIntent(input()),{status:'intent-recorded',attemptId:attempt});
 assert.deepEqual(await proto.reserveIntent(input()),{status:'reconciliation-required'});
 assert.equal(count,2);
});
test('trusted durable-ack reconciler rejects mismatches and never infers delivery',async()=>{
 let lookups=0,queries=0,mode='missing';
 const reconcile=createSourceEvidencePrivateAckReconciler({
  lookupDurableAck:async ({requestId,attemptId,digest})=>{
   lookups++;
   if(mode==='offline')throw Error('timeout');
   if(mode==='missing')return null;
   return {requestId,attemptId,digest,ackDigest:'b'.repeat(64),
    status:mode==='wrong'?'pending':'durable'};
  },
  query:async(sql,args)=>{
   queries++;
   assert.equal(sql,'select evidence_private.record_ack($1,$2,$3,$4) as r');
   assert.deepEqual(args,[request,attempt,'a'.repeat(64),'b'.repeat(64)]);
   return {rows:[{r:{status:'acknowledgement-recorded'}}]};
  }
 });
 const task={requestId:request,attemptId:attempt,digest:'a'.repeat(64)};
 assert.deepEqual(await reconcile.reconcile(task),{status:'reconciliation-required'});
 mode='offline';assert.deepEqual(await reconcile.reconcile(task),{status:'reconciliation-required'});
 mode='wrong';assert.deepEqual(await reconcile.reconcile(task),{status:'denied'});
 assert.equal(queries,0);
 mode='durable';assert.deepEqual(await reconcile.reconcile(task),{status:'acknowledgement-recorded'});
 assert.equal(queries,1);assert.equal(lookups,4);
 for(const invalid of [
  {...task,token}, {...task,ackDigest:'b'.repeat(64)},
  {...task,requestId:'bad'}, {...task,digest:'a'}
 ])assert.deepEqual(await reconcile.reconcile(invalid),{status:'invalid'});
 assert.equal(queries,1);
});
test('reconciler uncertain commit and conflicting ack are never reported as completed',async()=>{
 const task={requestId:request,attemptId:attempt,digest:'a'.repeat(64)};
 for(const [message,expected] of [
  ['socket gone','uncertain'],['private_conflict','conflict'],['private_denied','denied']
 ]){
  const reconcile=createSourceEvidencePrivateAckReconciler({
   lookupDurableAck:async()=>({...task,ackDigest:'b'.repeat(64),status:'durable'}),
   query:async()=>{throw Error(message);}
  });
  assert.deepEqual(await reconcile.reconcile(task),{status:expected});
 }
});

test('internal recover reads a committed attempt ID without returning it or initiating another dispatch',async()=>{
 const sql=[],proof=[];
 const reconciler=createSourceEvidencePrivateAckReconciler({
  lookupDurableAck:async x=>{
   proof.push(x);
   return {...x,ackDigest:'b'.repeat(64),status:'durable'};
  },
  query:async (statement,args)=>{
   sql.push(statement);
   if(statement.includes('inspect_intent(')){
    assert.deepEqual(args,[request,'a'.repeat(64)]);
    return {rows:[{r:{status:'intent-found',attemptId:attempt,state:'uncertain'}}]};
   }
   assert.equal(statement,'select evidence_private.record_ack($1,$2,$3,$4) as r');
   assert.deepEqual(args,[request,attempt,'a'.repeat(64),'b'.repeat(64)]);
   return {rows:[{r:{status:'acknowledgement-recorded'}}]};
  }
 });
 const result=await reconciler.recover({requestId:request,digest:'a'.repeat(64)});
 assert.deepEqual(result,{status:'acknowledgement-recorded'});
 assert.deepEqual(proof,[{requestId:request,attemptId:attempt,digest:'a'.repeat(64)}]);
 assert.equal(sql.length,2);
 assert.ok(!JSON.stringify(result).includes(attempt));
 assert.deepEqual(await reconciler.recover({requestId:request,digest:'bad'}),{status:'invalid'});
 assert.equal(sql.length,2);
});
test('unknown, malformed or unavailable intent lookup cannot manufacture an acknowledgement',async()=>{
 for(const [observed,expected] of [
  [{status:'no-intent'},'reconciliation-required'],
  [{status:'intent-found',attemptId:'wrong-id',state:'intent'},'uncertain'],
  [{status:'intent-found',attemptId:attempt,state:'delivered'},'uncertain'],
  [null,'uncertain']
 ]){
  let lookups=0,queries=0;
  const reconciler=createSourceEvidencePrivateAckReconciler({
   lookupDurableAck:async()=>{lookups++;throw Error('must not be called');},
   query:async()=>{queries++;return {rows:[{r:observed}]};}
  });
  assert.deepEqual(await reconciler.recover({requestId:request,digest:'a'.repeat(64)}),{status:expected});
  assert.equal(queries,1);assert.equal(lookups,0);
 }
 for(const error of ['private_denied','private_invalid','socket_lost']){
  let lookups=0;
  const reconciler=createSourceEvidencePrivateAckReconciler({
   lookupDurableAck:async()=>{lookups++;},
   query:async()=>{throw Error(error);}
  });
  assert.deepEqual(await reconciler.recover({requestId:request,digest:'a'.repeat(64)}),
   {status:error==='private_denied'?'denied':error==='private_invalid'?'invalid':'uncertain'});
  assert.equal(lookups,0);
 }
});

test('getter-backed reconciliation input fails before provider lookup or SQL',async()=>{
 let lookups=0,writes=0;
 const task={requestId:request,attemptId:attempt};
 Object.defineProperty(task,'digest',{enumerable:true,get(){return 'a'.repeat(64);}});
 const rec=createSourceEvidencePrivateAckReconciler({
  lookupDurableAck:async()=>{lookups++;return null;},
  query:async()=>{writes++;return null;}
 });
 assert.deepEqual(await rec.reconcile(task),{status:'invalid'});
 assert.equal(lookups,0);
 assert.equal(writes,0);
});

test('getter-backed provider acknowledgement cannot change its digest after validation',async()=>{
 let writes=0,reads=0;
 const task={requestId:request,attemptId:attempt,digest:'a'.repeat(64)};
 const receipt={...task,status:'durable'};
 Object.defineProperty(receipt,'ackDigest',{enumerable:true,get(){
  return ++reads===1?'b'.repeat(64):'c'.repeat(64);
 }});
 const rec=createSourceEvidencePrivateAckReconciler({
  lookupDurableAck:async()=>receipt,
  query:async()=>{writes++;return {rows:[{r:{status:'acknowledgement-recorded'}}]};}
 });
 assert.deepEqual(await rec.reconcile(task),{status:'denied'});
 assert.equal(reads,0);
 assert.equal(writes,0);
});

test('getter-backed stored intent lookup cannot trigger another acknowledgement',async()=>{
 let lookups=0,writes=0;
 const found={status:'intent-found',state:'uncertain'};
 Object.defineProperty(found,'attemptId',{enumerable:true,get(){return attempt;}});
 const rec=createSourceEvidencePrivateAckReconciler({
  lookupDurableAck:async()=>{lookups++;return null;},
  query:async sql=>{writes++;assert.ok(sql.includes('inspect_intent('));return {rows:[{r:found}]};}
 });
 assert.deepEqual(await rec.recover({requestId:request,digest:'a'.repeat(64)}),{status:'uncertain'});
 assert.equal(writes,1);
 assert.equal(lookups,0);
});

test('provider re-verification cannot swap a previously checked SQL attempt ID',async()=>{
 const original='55555555-5555-4555-8555-555555555555';
 const changed='66666666-6666-4666-8666-666666666666';
 const sqlReceipt={status:'intent-recorded',attemptId:original};
 let networkCalls=0;
 const proto=createSourceEvidencePrivateAuthorityPrototype({
  expectedIssuer:issuer,
  getUser:async()=>{
   networkCalls++;
   if(networkCalls===2)sqlReceipt.attemptId=changed;
   return {data:{user:{id:actor}},error:null};
  },
  query:async()=>({rows:[{r:sqlReceipt}]})
 });
 assert.deepEqual(await proto.reserveIntent(input()),{status:'intent-recorded',attemptId:original});
 assert.equal(networkCalls,2);
});

test('SQL staging/reservation receipts reject accessors and unexpected fields',async()=>{
 let authCalls=0;
 const malicious={status:'intent-recorded'};
 Object.defineProperty(malicious,'attemptId',{enumerable:true,get(){
  throw Error('never execute untrusted receipt accessors');
 }});
 for(const [operation,receipt] of [
  ['reserveIntent',malicious],
  ['reserveIntent',{status:'intent-recorded',attemptId:attempt,extra:true}],
  ['reserveIntent',{status:'reconciliation-required',attemptId:attempt}],
  ['stage',{status:'staged',unexpected:'data'}],
  ['stage',{status:'intent-recorded'}]
 ]){
  const proto=createSourceEvidencePrivateAuthorityPrototype({
   expectedIssuer:issuer,
   getUser:async()=>{authCalls++;return {data:{user:{id:actor}},error:null};},
   query:async()=>({rows:[{r:receipt}]})
  });
  assert.deepEqual(await proto[operation](input()),{status:'uncertain'});
 }
 assert.equal(authCalls,5);
});

test('SQL receipt getter-backed status cannot masquerade as staging success',async()=>{
 let statusReads=0;
 const receipt={};
 Object.defineProperty(receipt,'status',{enumerable:true,get(){
  statusReads++;return 'staged';
 }});
 const proto=createSourceEvidencePrivateAuthorityPrototype({
  expectedIssuer:issuer,
  getUser:async()=>({data:{user:{id:actor}},error:null}),
  query:async()=>({rows:[{r:receipt}]})
 });
 assert.deepEqual(await proto.stage(input()),{status:'uncertain'});
 assert.equal(statusReads,0);
});
