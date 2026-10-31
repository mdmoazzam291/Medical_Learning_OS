// Native PostgreSQL experiment only. No hosted DB connection or Auth rows.
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {startDisposableNativePostgres} from './lib/disposable-native-postgres.js';
import {createSourceEvidencePrivateAuthorityPrototype,createSourceEvidencePrivateAckReconciler} from './lib/source-evidence-private-authority-prototype.js';
const {postgres}=await import(process.env.NATIVE_PG_MODULE_URL||'@embedded-postgres/linux-x64');
const {Client}=await import(process.env.PG_MODULE_URL||'pg');
const server=await startDisposableNativePostgres({postgres}),clients=[];
const actor='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const session='33333333-3333-4333-8333-333333333333';
const digest='a'.repeat(64),changedDigest='b'.repeat(64);
const issuer='http://127.0.0.1:54321/auth/v1';
const stageSql='select evidence_private.stage($1,$2,$3,$4) as r';
const intentSql='select evidence_private.reserve_intent($1,$2,$3,$4) as r';
const ackSql='select evidence_private.record_ack($1,$2,$3,$4) as r';
const outcome=p=>p.then(value=>({value}),error=>({error}));
async function connect(user='postgres'){
 const c=new Client({...server.config,user,connectionTimeoutMillis:5000,statement_timeout:8000});
 await c.connect();clients.push(c);return c;
}
const jwt=(sub=actor,sid=session)=>'e30.'+Buffer.from(JSON.stringify({
 sub,session_id:sid,aud:'authenticated',iss:issuer,exp:Math.floor(Date.now()/1000)+3600
})).toString('base64url')+'.synthetic';
const token=jwt();
let provider='valid',calls=0;
const getUser=async candidate=>{
 calls++;
 if(provider==='offline')throw Error('network_unavailable');
 if(provider==='revoked')return {data:{user:null},error:{code:'bad_jwt'}};
 if(candidate!==token)return {data:{user:null},error:{code:'bad_jwt'}};
 return {data:{user:{id:actor}},error:null};
};
const input=(requestId=randomUUID(),accessToken=token,payloadDigest=digest)=>
 ({accessToken,requestId,digest:payloadDigest});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function blockedBy(inspector,waiter,blocker){
 const deadline=Date.now()+2300;
 while(Date.now()<deadline){
  const p=(await inspector.query('select pg_catalog.pg_blocking_pids($1) as p',[waiter])).rows[0].p;
  if(p.includes(blocker))return;
  await pause(20);
 }
 throw Error('private_authority_row_barrier_not_observed');
}
try{
 const admin=await connect();
 const schema=await readFile(new URL('../ops/prototypes/source-evidence/private-authority.sql',import.meta.url),'utf8');
 await admin.query(schema);
 const controller=await connect('evidence_private_controller');
 const gateway=await connect('evidence_private_gateway'),racer=await connect('evidence_private_gateway');
 const inspector=await connect(),writer=await connect('evidence_private_controller');
 const confirmer=await connect('evidence_private_confirmer');
 const n=Number((await admin.query("select current_setting('server_version_num')::int as n")).rows[0].n);
 if(process.env.EXPECTED_NATIVE_PG_VERSION){
  const actual=Math.floor(n/10000)+'.'+n%10000;
  assert.equal(actual,process.env.EXPECTED_NATIVE_PG_VERSION);
 }
 assert.equal((await inspector.query("select to_regclass('auth.sessions') is null as absent")).rows[0].absent,true);
 for(const role of [gateway,controller,confirmer]){
  for(const sql of ['select * from evidence_private.subjects','select * from evidence_private.receipts','select * from evidence_private.delivery_attempts',
   'set role evidence_private_owner','select evidence_private.require_active($1)']){
   await assert.rejects(role.query(sql,sql.includes('$1')?[actor]:[]),/permission denied|cannot set role/);
  }
 }
 await assert.rejects(gateway.query('select evidence_private.control($1,true,60)',[actor]),/permission denied/);
 await assert.rejects(controller.query(stageSql,[actor,session,randomUUID(),digest]),/permission denied/);
 await assert.rejects(gateway.query(ackSql,[randomUUID(),randomUUID(),digest,changedDigest]),/permission denied/);
 await assert.rejects(confirmer.query(intentSql,[actor,session,randomUUID(),digest]),/permission denied/);
 await assert.rejects(gateway.query('select evidence_private.inspect_intent($1,$2) as r',[randomUUID(),digest]),/permission denied/);
 await controller.query('select evidence_private.control($1,true,60)',[actor]);
 const probe=createSourceEvidencePrivateAuthorityPrototype({
  getUser,expectedIssuer:issuer,query:(sql,args)=>gateway.query(sql,args)
 });
 const first=input();
 assert.deepEqual(await probe.stage(first),{status:'staged'});
 assert.deepEqual(await probe.stage(first),{status:'staged'});
 assert.deepEqual(await probe.stage(input(first.requestId,token,changedDigest)),{status:'conflict'});
 const intent=await probe.reserveIntent(first);
 assert.equal(intent.status,'intent-recorded');assert.ok(/^[a-f0-9-]{36}$/.test(intent.attemptId));
 assert.deepEqual(await probe.reserveIntent(first),{status:'reconciliation-required'});
 let availableAck=false;
 const reconciler=createSourceEvidencePrivateAckReconciler({
  lookupDurableAck:async ({requestId,attemptId,digest:dg})=>availableAck?{
   requestId,attemptId,digest:dg,ackDigest:changedDigest,status:'durable'
  }:null,
  query:(sql,args)=>confirmer.query(sql,args)
 });
 const target={requestId:first.requestId,attemptId:intent.attemptId,digest};
 assert.deepEqual(await reconciler.reconcile(target),{status:'reconciliation-required'});
 availableAck=true;
 assert.deepEqual(await reconciler.reconcile(target),{status:'acknowledgement-recorded'});
 assert.deepEqual(await reconciler.reconcile(target),{status:'acknowledgement-recorded'});
 assert.deepEqual(await reconciler.reconcile({...target,attemptId:randomUUID()}),{status:'denied'});
 await assert.rejects(confirmer.query(ackSql,[first.requestId,intent.attemptId,digest,digest]),/private_conflict/);
 assert.equal((await inspector.query('select count(*)::int as n from evidence_private.receipts')).rows[0].n,1);
 assert.equal((await inspector.query('select status from evidence_private.delivery_attempts where request_id=$1',[first.requestId])).rows[0].status,'acknowledged');
 const forged=jwt(other,session);
 assert.deepEqual(await probe.stage(input(randomUUID(),forged)),{status:'denied'});
 const beforeOutage=(await inspector.query('select count(*)::int as n from evidence_private.receipts')).rows[0].n;
 const callBefore=calls;provider='offline';
 assert.deepEqual(await probe.stage(input()),{status:'denied'});
 assert.equal(calls,callBefore+1);
 assert.equal((await inspector.query('select count(*)::int as n from evidence_private.receipts')).rows[0].n,beforeOutage);
 provider='valid';
 const awaiting=input();assert.deepEqual(await probe.stage(awaiting),{status:'staged'});
 provider='offline';assert.deepEqual(await probe.reserveIntent(awaiting),{status:'denied'});
 provider='valid';
 assert.equal((await inspector.query('select count(*)::int n from evidence_private.delivery_attempts where request_id=$1',[awaiting.requestId])).rows[0].n,0);
 provider='revoked';assert.deepEqual(await probe.reserveIntent(awaiting),{status:'denied'});provider='valid';
 // Known private revocation wins even while synthetic Auth still recognizes JWT.
 await controller.query('select evidence_private.control($1,false,0)',[actor]);
 assert.deepEqual(await probe.reserveIntent(awaiting),{status:'denied'});
 assert.equal((await inspector.query('select not exists(select 1 from evidence_private.delivery_attempts where request_id=$1) as unmarked',[awaiting.requestId])).rows[0].unmarked,true);
 await controller.query('select evidence_private.control($1,true,60)',[actor]);
 assert.deepEqual(await probe.reserveIntent(awaiting),{status:'denied'});
 assert.deepEqual(await probe.stage(awaiting),{status:'conflict'});
 assert.deepEqual(await probe.stage(input()),{status:'staged'});
 console.log('Private authority PASS: provider outage/rejection fail closed, epoch rollback-denial, stale receipt replay forbidden, idempotence.');
 // Writer-first race: controller updates the private row before stage.
 await writer.query('begin');
 await writer.query('select evidence_private.control($1,false,0)',[actor]);
 const pending=input();
 const writerPid=(await writer.query('select pg_backend_pid() as p')).rows[0].p;
 const racerPid=(await racer.query('select pg_backend_pid() as p')).rows[0].p;
 const stagePromise=outcome(racer.query(stageSql,[actor,session,pending.requestId,digest]));
 await blockedBy(inspector,racerPid,writerPid);
 await writer.query('commit');
 assert.equal((await stagePromise).error?.message,'private_denied');
 await controller.query('select evidence_private.control($1,true,60)',[actor]);
 // Evidence-first race: stage holds SHARE lock until it commits, then revocation follows.
 const raced=input();
 await racer.query('begin');
 assert.equal((await racer.query(stageSql,[actor,session,raced.requestId,digest])).rows[0].r.status,'staged');
 const revokePromise=outcome(writer.query('select evidence_private.control($1,false,0)',[actor]));
 await blockedBy(inspector,writerPid,racerPid);
 await racer.query('commit');
 assert.equal((await revokePromise).error,undefined);
 assert.deepEqual(await probe.reserveIntent(raced),{status:'denied'});
 assert.equal((await inspector.query('select count(*)::int n from evidence_private.delivery_attempts where request_id=$1',[raced.requestId])).rows[0].n,0);
 console.log('Private authority PASS: writer-first and evidence-first row-lock ordering, denied delivery after revoke.');
 // Rollback of private revocation cannot erase committed staged receipt.
 await controller.query('select evidence_private.control($1,true,60)',[actor]);
 const rolled=input();assert.deepEqual(await probe.stage(rolled),{status:'staged'});
 await writer.query('begin');
 await writer.query('select evidence_private.control($1,false,0)',[actor]);
 await writer.query('rollback');
 const resumed=await probe.reserveIntent(rolled);assert.equal(resumed.status,'intent-recorded');
 await gateway.query('select evidence_private.mark_uncertain($1,$2)',[rolled.requestId,resumed.attemptId]);
 assert.equal((await inspector.query('select status from evidence_private.delivery_attempts where request_id=$1',[rolled.requestId])).rows[0].status,'uncertain');
 assert.deepEqual(await probe.reserveIntent(rolled),{status:'reconciliation-required'});
 availableAck=false;
 assert.deepEqual(await reconciler.reconcile({requestId:rolled.requestId,attemptId:resumed.attemptId,digest}),{status:'reconciliation-required'});
 availableAck=true;
 assert.deepEqual(await reconciler.reconcile({requestId:rolled.requestId,attemptId:resumed.attemptId,digest}),{status:'acknowledgement-recorded'});
 // Post-SQL provider denial: committed intent remains unresolved, never
 // silently retried or labelled acknowledged after the caller was denied.
 const ambiguous=input();
 assert.deepEqual(await probe.stage(ambiguous),{status:'staged'});
 let verificationCount=0;
 const lostAckProbe=createSourceEvidencePrivateAuthorityPrototype({
  expectedIssuer:issuer,
  getUser:async()=>++verificationCount===1?
    {data:{user:{id:actor}},error:null}:
    {data:{user:null},error:{code:'session_not_found'}},
  query:(sql,args)=>gateway.query(sql,args)
 });
 assert.deepEqual(await lostAckProbe.reserveIntent(ambiguous),{status:'denied'});
 assert.equal(verificationCount,2);
 assert.equal((await inspector.query('select status from evidence_private.delivery_attempts where request_id=$1',[ambiguous.requestId])).rows[0].status,'intent');
 assert.deepEqual(await probe.reserveIntent(ambiguous),{status:'reconciliation-required'});
 availableAck=false;
 assert.deepEqual(await reconciler.recover({requestId:ambiguous.requestId,digest}),{status:'reconciliation-required'});
 assert.equal((await inspector.query('select status from evidence_private.delivery_attempts where request_id=$1',[ambiguous.requestId])).rows[0].status,'intent');
 // Concurrent reservations: exactly one one-shot attempt, other caller
 // awaits the receipt row and receives only a reconciliation status.
 const concurrent=input();
 assert.deepEqual(await probe.stage(concurrent),{status:'staged'});
 const gatewayPid=(await gateway.query('select pg_backend_pid() as p')).rows[0].p;
 const racerPid2=(await racer.query('select pg_backend_pid() as p')).rows[0].p;
 await gateway.query('begin');
 const primary=(await gateway.query(intentSql,[actor,session,concurrent.requestId,digest])).rows[0].r;
 assert.equal(primary.status,'intent-recorded');
 const secondary=outcome(racer.query(intentSql,[actor,session,concurrent.requestId,digest]));
 await blockedBy(inspector,racerPid2,gatewayPid);
 await gateway.query('commit');
 assert.equal((await secondary).value?.rows[0]?.r?.status,'reconciliation-required');
 assert.equal((await inspector.query('select count(*)::int n from evidence_private.delivery_attempts where request_id=$1',[concurrent.requestId])).rows[0].n,1);
 console.log('Private authority delivery ledger PASS: postcommit provider denial preserves unresolved intent, concurrent requests create one attempt, retries never redispatch.');
 // Database acknowledgement commit succeeds but transport loses the
 // result: the caller sees uncertainty; a trusted re-query reconciles once.
 const lostResponse=input();assert.deepEqual(await probe.stage(lostResponse),{status:'staged'});
 const reserved=await probe.reserveIntent(lostResponse);assert.equal(reserved.status,'intent-recorded');
 const lostTarget={requestId:lostResponse.requestId,attemptId:reserved.attemptId,digest};
 const lostAck=createSourceEvidencePrivateAckReconciler({
  lookupDurableAck:async ({requestId,attemptId,digest:dg})=>({
   requestId,attemptId,digest:dg,ackDigest:changedDigest,status:'durable'
  }),
  query:async (sql,args)=>{await confirmer.query(sql,args);throw Error('commit_ack_lost');}
 });
 assert.deepEqual(await lostAck.reconcile(lostTarget),{status:'uncertain'});
 assert.equal((await inspector.query('select status from evidence_private.delivery_attempts where request_id=$1',[lostResponse.requestId])).rows[0].status,'acknowledged');
 assert.deepEqual(await reconciler.recover({requestId:lostResponse.requestId,digest}),{status:'acknowledgement-recorded'});
 assert.deepEqual(await reconciler.recover({requestId:lostResponse.requestId,digest:changedDigest}),{status:'denied'});
 assert.deepEqual(await probe.reserveIntent(lostResponse),{status:'reconciliation-required'});
 console.log('Private authority acknowledgement PASS: committed acknowledgement with lost response reconciles idempotently without dispatch retry.');
 // Expired MLOS lease denies even with a still positive network Auth verdict.
 await controller.query('select evidence_private.control($1,true,1)',[actor]);
 await pause(1250);
 assert.deepEqual(await probe.stage(input()),{status:'denied'});
 assert.equal((await inspector.query("select count(*)::int n from evidence_private.delivery_attempts where status='acknowledged'")).rows[0].n,3);
 console.log('Private authority PASS: rollback, bounded private lease expiry and intent/uncertain/ack records, no automatic redispatch.');
}catch(error){throw error;}
finally{
 await Promise.allSettled(clients.map(c=>c.query('rollback')));
 await Promise.allSettled(clients.map(c=>c.end()));
 await server.stop();await assert.rejects(access(server.root));
 console.log('Private authority disposable native PostgreSQL cleanup PASS');
}
