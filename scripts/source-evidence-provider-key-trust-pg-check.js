// Native PostgreSQL disposable signing-key trust test. NO hosted database,
// provider credentials, real receiver or production certificate/key ownership.
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash,generateKeyPairSync,sign,randomUUID} from 'node:crypto';
import {startDisposableNativePostgres} from './lib/disposable-native-postgres.js';
import {createSourceEvidencePrivateKeyTrustReader} from './lib/source-evidence-private-key-trust-reader.js';
import {createSourceEvidenceTrustGatedAckLookup} from './lib/source-evidence-private-trust-gated-ack.js';
import {createSourceEvidencePrivateAuthorityPrototype} from './lib/source-evidence-private-authority-prototype.js';
import {createSourceEvidencePrivateTrustLockedAckReconciler} from './lib/source-evidence-private-trust-locked-ack.js';
const {postgres}=await import(process.env.NATIVE_PG_MODULE_URL||'@embedded-postgres/linux-x64');
const {Client}=await import(process.env.PG_MODULE_URL||'pg');
const server=await startDisposableNativePostgres({postgres}),clients=[];
const actor='11111111-1111-4111-8111-111111111111';
const session='33333333-3333-4333-8333-333333333333';
const issuer='http://127.0.0.1:54321/auth/v1';
const providerId='receipt-provider.fixture',recipientId='source-review.queue';
const digest='a'.repeat(64),ackDigest='b'.repeat(64);
const fixedState='select evidence_private.key_state($1,$2,$3) as r';
const enroll='select evidence_private.key_enroll($1,$2,$3) as epoch';
const revoke='select evidence_private.key_revoke($1,$2) as epoch';
async function connect(user='postgres'){
 const c=new Client({...server.config,user,connectionTimeoutMillis:5000,statement_timeout:8000});
 c.on('error',()=>{});await c.connect();clients.push(c);return c;
}
const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const {publicKey:nextPublicKey,privateKey:nextPrivateKey}=generateKeyPairSync('ed25519');
const fingerprint=key=>createHash('sha256').update(key.export({type:'spki',format:'der'})).digest('hex');
const firstKey=fingerprint(publicKey),secondKey=fingerprint(nextPublicKey);
const token='e30.'+Buffer.from(JSON.stringify({
 sub:actor,session_id:session,iss:issuer,aud:'authenticated',
 exp:Math.floor(Date.now()/1000)+3600
})).toString('base64url')+'.fixture';
const providerAck=(target,key)=>{const value={
 protocol:'mlos.delivery.ack.v1',providerId,recipientId,...target,
 providerReceiptId:'offline-trust-001',status:'durable',occurredAt:'2026-11-01T00:00:00.000Z'
 };
 const bytes=Buffer.from('MLOS:source-evidence:durable-ack:v1\n'+JSON.stringify([
  value.protocol,value.providerId,value.recipientId,value.requestId,value.attemptId,
  value.digest,value.providerReceiptId,value.status,value.occurredAt
 ]),'utf8');
 return {...value,signature:sign(null,bytes,key).toString('base64url')};
};
const fail=async(p,pattern)=>assert.rejects(p,pattern);
try{
 const admin=await connect();
 const schema=await readFile(new URL('../ops/prototypes/source-evidence/private-authority.sql',import.meta.url),'utf8');
 const overlay=await readFile(new URL('../ops/prototypes/source-evidence/provider-key-trust.sql',import.meta.url),'utf8');
 await admin.query(schema);await admin.query(overlay);
 const version=(await admin.query("select current_setting('server_version_num')::int as n")).rows[0].n;
 if(process.env.EXPECTED_NATIVE_PG_VERSION){
  assert.equal(Math.floor(version/10000)+'.'+version%10000,process.env.EXPECTED_NATIVE_PG_VERSION);
 }
 const controller=await connect('evidence_private_key_controller');
 const reader=await connect('evidence_private_key_reader');
 const gateway=await connect('evidence_private_gateway');
 const confirmer=await connect('evidence_private_confirmer');
 const subjectController=await connect('evidence_private_controller');
 const inspector=await connect();
 for(const c of [controller,reader,gateway,confirmer,subjectController]){
  for(const table of ['provider_signing_trust','retired_signing_keys']){
   await fail(c.query('select * from evidence_private.'+table),/permission denied/);
   await fail(c.query('delete from evidence_private.'+table),/permission denied/);
  }
 }
 for(const c of [gateway,confirmer,subjectController,reader]){
  await fail(c.query(enroll,[providerId,recipientId,firstKey]),/permission denied/);
  await fail(c.query(revoke,[providerId,recipientId]),/permission denied/);
 }
 for(const c of [gateway,confirmer,subjectController,controller]){
  await fail(c.query(fixedState,[providerId,recipientId,firstKey]),/permission denied/);
 }
 const readTrust=createSourceEvidencePrivateKeyTrustReader({
  query:(sql,args)=>reader.query(sql,args)
 });
 const rawAck='select evidence_private.record_ack($1,$2,$3,$4) as r';
 const lockedAck='select evidence_private.key_record_ack($1,$2,$3,$4,$5,$6,$7,$8) as r';
 await fail(confirmer.query(rawAck,[randomUUID(),randomUUID(),digest,ackDigest]),
  /permission denied/);
 await fail(gateway.query(lockedAck,[randomUUID(),randomUUID(),digest,ackDigest,
  providerId,recipientId,firstKey,1]),/permission denied/);
 await fail(reader.query(lockedAck,[randomUUID(),randomUUID(),digest,ackDigest,
  providerId,recipientId,firstKey,1]),/permission denied/);
 const selector=Object.freeze({providerId,recipientId,keySha256:firstKey});
 assert.equal(await readTrust(selector),null);
 let fetches=0;
 const getLookup=(key,signer,fetchSignedReceipt)=>
  createSourceEvidenceTrustGatedAckLookup({
   providerId,recipientId,trustedPublicKey:key,getTrustState:readTrust,
   fetchSignedReceipt:fetchSignedReceipt??(async t=>{
    fetches++;return providerAck(t,signer);
   })
  });
 const target={requestId:randomUUID(),attemptId:randomUUID(),digest};
 assert.equal(await getLookup(publicKey,privateKey)(target),null);
 assert.equal(fetches,0);
 assert.equal((await controller.query(enroll,[providerId,recipientId,firstKey])).rows[0].epoch,'1');
 const known=await readTrust(selector);
 assert.deepEqual(known,{providerId,recipientId,keySha256:firstKey,epoch:1,enabled:true});
 assert.equal((await getLookup(publicKey,privateKey)(target))?.status,'durable');
 assert.equal(fetches,1);
 await fail(controller.query(enroll,[providerId,recipientId,firstKey]),/private_conflict/);
 await fail(controller.query(enroll,[providerId,recipientId,'not-a-hash']),/private_invalid/);
 // Stage a distinct private one-shot attempt through actual restricted SQL.
 await subjectController.query('select evidence_private.control($1,true,600)',[actor]);
 const proof=createSourceEvidencePrivateAuthorityPrototype({
  getUser:async()=>({data:{user:{id:actor}},error:null}),
  expectedIssuer:issuer,query:(sql,args)=>gateway.query(sql,args)
 });
 const original={requestId:randomUUID(),accessToken:token,digest};
 assert.deepEqual(await proof.stage(original),{status:'staged'});
 const intent=await proof.reserveIntent(original);
 assert.equal(intent.status,'intent-recorded');
 const ackTarget={requestId:original.requestId,attemptId:intent.attemptId,digest};
 // Simulate authority switching while the provider returns a valid *old-key*
 // receipt. The after-lookup trust check must reject without writing SQL.
 let started;
 const fetching=new Promise(resolve=>{started=resolve;});
 let release;
 const held=new Promise(resolve=>{release=resolve;});
 let writes=0;
 const reconciler=createSourceEvidencePrivateTrustLockedAckReconciler({
  fetchSignedReceipt:async t=>{started();await held;return providerAck(t,privateKey);},
  trustedPublicKey:publicKey,providerId,recipientId,getTrustState:readTrust,
  query:async(sql,args)=>{writes++;return confirmer.query(sql,args);}
 });
 const pending=reconciler.reconcile(ackTarget);
 await fetching;
 assert.equal((await controller.query(revoke,[providerId,recipientId])).rows[0].epoch,'2');
 release();
 assert.deepEqual(await pending,{status:'reconciliation-required'});
 assert.equal(writes,0);
 assert.equal((await inspector.query('select status from evidence_private.delivery_attempts where request_id=$1',
  [original.requestId])).rows[0].status,'intent');
 assert.equal((await getLookup(publicKey,privateKey)(ackTarget)),null);
 await fail(controller.query(enroll,[providerId,recipientId,firstKey]),/private_conflict/);
 assert.equal((await controller.query(enroll,[providerId,recipientId,secondKey])).rows[0].epoch,'3');
 assert.equal(await readTrust(selector),null);
 assert.equal((await getLookup(publicKey,privateKey)(ackTarget)),null);
 const newLookup=getLookup(nextPublicKey,nextPrivateKey);
 const accepted=createSourceEvidencePrivateTrustLockedAckReconciler({
  fetchSignedReceipt:async t=>providerAck(t,nextPrivateKey),
  trustedPublicKey:nextPublicKey,providerId,recipientId,getTrustState:readTrust,
  query:(sql,args)=>confirmer.query(sql,args)
 });
 assert.deepEqual(await accepted.reconcile(ackTarget),{status:'acknowledgement-recorded'});
 assert.deepEqual(await proof.reserveIntent(original),{status:'reconciliation-required'});
 await fail(controller.query(enroll,[providerId,recipientId,firstKey]),/private_conflict/);
 // A real connection-level writer transaction must block a separate trust
 // reader's FOR SHARE, then expose the revoked state once the writer commits.
 await controller.query('begin');
 assert.equal((await controller.query(revoke,[providerId,recipientId])).rows[0].epoch,'4');
 const readerPid=(await reader.query('select pg_backend_pid() p')).rows[0].p;
 const writerPid=(await controller.query('select pg_backend_pid() p')).rows[0].p;
 const blocked=readTrust(Object.freeze({providerId,recipientId,keySha256:secondKey}));
 let observed=false;
 for(let i=0;i<90;i++){
  const blockedBy=(await inspector.query('select pg_catalog.pg_blocking_pids($1) p',[readerPid])).rows[0].p;
  if(blockedBy.includes(writerPid)){observed=true;break;}
  await new Promise(resolve=>setTimeout(resolve,20));
 }
 await controller.query('commit');
 assert.equal(observed,true,'private_key_trust_row_barrier_not_observed');
 assert.deepEqual(await blocked,{providerId,recipientId,keySha256:secondKey,epoch:4,enabled:false});
 assert.equal(await newLookup(ackTarget),null);
 await fail(confirmer.query(rawAck,[original.requestId,intent.attemptId,digest,
  ackDigest]),/permission denied/);
 // Distinct new request and active key: revoke right after the THIRD trust
 // read (the one immediately preceding key_record_ack). The SQL guard must
 // reject and leave the one-shot attempt unresolved.
 const thirdKeyPair=generateKeyPairSync('ed25519');
 const thirdKey=fingerprint(thirdKeyPair.publicKey);
 assert.equal((await controller.query(enroll,[providerId,recipientId,thirdKey]))
  .rows[0].epoch,'5');
 const later={requestId:randomUUID(),accessToken:token,digest};
 assert.deepEqual(await proof.stage(later),{status:'staged'});
 const laterIntent=await proof.reserveIntent(later);
 const laterTarget={requestId:later.requestId,attemptId:laterIntent.attemptId,digest};
 let trustReads=0,guardedWrites=0;
 const snapshotThenRevoke=async selector=>{
  const authority=await readTrust(selector);
  if(++trustReads===3)
   await controller.query(revoke,[providerId,recipientId]);
  return authority;
 };
 const late=createSourceEvidencePrivateTrustLockedAckReconciler({
  fetchSignedReceipt:async t=>providerAck(t,thirdKeyPair.privateKey),
  trustedPublicKey:thirdKeyPair.publicKey,providerId,recipientId,
  getTrustState:snapshotThenRevoke,
  query:(sql,args)=>{guardedWrites++;return confirmer.query(sql,args);}
 });
 assert.deepEqual(await late.reconcile(laterTarget),{status:'denied'});
 assert.equal(trustReads,3);
 assert.equal(guardedWrites,1);
 assert.equal((await inspector.query(
  'select status from evidence_private.delivery_attempts where request_id=$1',
  [later.requestId])).rows[0].status,'intent');
 await fail(confirmer.query(lockedAck,[later.requestId,laterIntent.attemptId,
  digest,ackDigest,providerId,recipientId,thirdKey,5]),/private_denied/);
 // Conversely, when acknowledgement acquires FOR SHARE first, a revocation
 // MUST wait for that audit transaction to commit. Its approval is valid only
 // at that transaction's ordering point, not after the later revocation.
 const fourthPair=generateKeyPairSync('ed25519'),fourthKey=fingerprint(fourthPair.publicKey);
 assert.equal((await controller.query(enroll,[providerId,recipientId,fourthKey]))
  .rows[0].epoch,'7');
 const ordered={requestId:randomUUID(),accessToken:token,digest};
 assert.deepEqual(await proof.stage(ordered),{status:'staged'});
 const orderedAttempt=await proof.reserveIntent(ordered);
 assert.equal(orderedAttempt.status,'intent-recorded');
 await confirmer.query('begin');
 assert.equal((await confirmer.query(lockedAck,[ordered.requestId,orderedAttempt.attemptId,
  digest,ackDigest,providerId,recipientId,fourthKey,7])).rows[0].r.status,
  'acknowledgement-recorded');
 const confirmerPid=(await confirmer.query('select pg_backend_pid() p')).rows[0].p;
 const controllerPid=(await controller.query('select pg_backend_pid() p')).rows[0].p;
 const outcome=p=>p.then(value=>({value}),error=>({error}));
 const revokeWaiting=outcome(controller.query(revoke,[providerId,recipientId]));
 let writerBlocked=false;
 for(let i=0;i<90;i++){
  const blocking=(await inspector.query('select pg_catalog.pg_blocking_pids($1) p',
   [controllerPid])).rows[0].p;
  if(blocking.includes(confirmerPid)){writerBlocked=true;break;}
  await new Promise(resolve=>setTimeout(resolve,20));
 }
 assert.equal(writerBlocked,true,'private_key_ack_commit_barrier_not_observed');
 await confirmer.query('commit');
 const afterRevoke=await revokeWaiting;
 assert.equal(afterRevoke.error,undefined);
 assert.equal(afterRevoke.value.rows[0].epoch,'8');
 assert.equal((await inspector.query(
  'select status from evidence_private.delivery_attempts where request_id=$1',
  [ordered.requestId])).rows[0].status,'acknowledged');
 await fail(confirmer.query(lockedAck,[ordered.requestId,orderedAttempt.attemptId,
  digest,ackDigest,providerId,recipientId,fourthKey,7]),/private_denied/);

 // The key registry must survive the same real immediate-shutdown/WAL replay
 // used for delivery intent. A transaction that proposes new key authority
 // but never commits MUST NOT resurrect or install any signing key.
 for(const setting of ['fsync','synchronous_commit','full_page_writes'])
  assert.equal((await inspector.query('show '+setting)).rows[0][setting],'on');
 const fifthPair=generateKeyPairSync('ed25519'),fifthKey=fingerprint(fifthPair.publicKey);
 await controller.query('begin');
 assert.equal((await controller.query(enroll,[providerId,recipientId,fifthKey]))
  .rows[0].epoch,'9');
 const crash=await server.crashAndRestart();
 assert.equal(crash.mode,'immediate');
 assert.notEqual(crash.previousPid,crash.newPid);
 assert.match(crash.recoveryLog,/database system was interrupted|not properly shut down/);
 assert.match(crash.recoveryLog,/automatic recovery|redo starts/);
 await Promise.allSettled(clients.map(c=>c.end()));
 const afterAdmin=await connect();
 const afterController=await connect('evidence_private_key_controller');
 const afterReader=await connect('evidence_private_key_reader');
 const afterGateway=await connect('evidence_private_gateway');
 const afterConfirmer=await connect('evidence_private_confirmer');
 assert.equal((await afterAdmin.query('select pg_is_in_recovery() r')).rows[0].r,false);
 const afterTrust=createSourceEvidencePrivateKeyTrustReader({
  query:(sql,args)=>afterReader.query(sql,args)
 });
 assert.deepEqual(await afterTrust({providerId,recipientId,keySha256:fourthKey}),
  {providerId,recipientId,keySha256:fourthKey,epoch:8,enabled:false});
 assert.equal(await afterTrust({providerId,recipientId,keySha256:fifthKey}),null);
 for(const retired of [firstKey,secondKey,thirdKey]){
  assert.equal(await afterTrust({providerId,recipientId,keySha256:retired}),null);
  await fail(afterController.query(enroll,[providerId,recipientId,retired]),
   /private_conflict/);
 }
 assert.equal((await afterAdmin.query(
  'select count(*)::int n from evidence_private.retired_signing_keys where provider_id=$1 and recipient_id=$2',
  [providerId,recipientId])).rows[0].n,3);
 for(const [req,id,state,hash] of [
  [original.requestId,intent.attemptId,'acknowledged',true],
  [later.requestId,laterIntent.attemptId,'intent',false],
  [ordered.requestId,orderedAttempt.attemptId,'acknowledged',true]
 ]){
  const row=(await afterAdmin.query(
   'select attempt_id,status,ack_digest from evidence_private.delivery_attempts where request_id=$1',
   [req])).rows[0];
  assert.equal(row.attempt_id,id);
  assert.equal(row.status,state);
  assert.equal(row.ack_digest===null,!hash);
 }
 await fail(afterConfirmer.query(rawAck,[later.requestId,laterIntent.attemptId,
  digest,ackDigest]),/permission denied/);
 await fail(afterConfirmer.query(lockedAck,[later.requestId,laterIntent.attemptId,
  digest,ackDigest,providerId,recipientId,fourthKey,8]),/private_denied/);
 await fail(afterGateway.query('select * from evidence_private.provider_signing_trust'),
  /permission denied/);
 await fail(afterReader.query('select * from evidence_private.delivery_attempts'),
  /permission denied/);
 // A fresh, explicit controller decision may introduce an entirely NEW key;
 // neither the crashed, uncommitted proposal nor retired keys are trusted.
 assert.equal((await afterController.query(enroll,[providerId,recipientId,fifthKey]))
  .rows[0].epoch,'9');
 const afterProof=createSourceEvidencePrivateAuthorityPrototype({
  getUser:async()=>({data:{user:{id:actor}},error:null}),
  expectedIssuer:issuer,query:(sql,args)=>afterGateway.query(sql,args)
 });
 const recoveredRequest={requestId:randomUUID(),accessToken:token,digest};
 assert.deepEqual(await afterProof.stage(recoveredRequest),{status:'staged'});
 const freshAttempt=await afterProof.reserveIntent(recoveredRequest);
 assert.equal(freshAttempt.status,'intent-recorded');
 const afterAck=createSourceEvidencePrivateTrustLockedAckReconciler({
  fetchSignedReceipt:async target=>providerAck(target,fifthPair.privateKey),
  trustedPublicKey:fifthPair.publicKey,providerId,recipientId,
  getTrustState:afterTrust,query:(sql,args)=>afterConfirmer.query(sql,args)
 });
 assert.deepEqual(await afterAck.reconcile({
  requestId:recoveredRequest.requestId,attemptId:freshAttempt.attemptId,digest
 }),{status:'acknowledgement-recorded'});
 assert.deepEqual(await afterProof.reserveIntent(recoveredRequest),
  {status:'reconciliation-required'});
 console.log('Private key WAL recovery PASS: revoked epoch and retired fingerprints survive, uncommitted key rotation rolls back, acknowledged/intent attempts persist, restart retains ACLs and explicit new-key evidence flow.');
 console.log('Private key atomic ack PASS: revoked-before-commit rejected, ack-first row-lock blocks revocation until commit, raw audit bypass denied.');
 console.log('Private provider key trust PASS: restricted roles, retired-key guard, epoch rotation, midflight revoke, real SQL row-lock ordering, signed acknowledgement without redispatch.');
}finally{
 await Promise.allSettled(clients.map(c=>c.query('rollback')));
 await Promise.allSettled(clients.map(c=>c.end()));
 await server.stop();await assert.rejects(access(server.root));
 console.log('Private key trust disposable PostgreSQL cleanup PASS');
}
