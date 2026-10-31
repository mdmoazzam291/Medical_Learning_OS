// Native PostgreSQL disposable signing-key trust test. NO hosted database,
// provider credentials, real receiver or production certificate/key ownership.
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash,generateKeyPairSync,sign,randomUUID} from 'node:crypto';
import {startDisposableNativePostgres} from './lib/disposable-native-postgres.js';
import {createSourceEvidencePrivateKeyTrustReader} from './lib/source-evidence-private-key-trust-reader.js';
import {createSourceEvidenceTrustGatedAckLookup} from './lib/source-evidence-private-trust-gated-ack.js';
import {createSourceEvidencePrivateAckReconciler,createSourceEvidencePrivateAuthorityPrototype} from './lib/source-evidence-private-authority-prototype.js';
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
 const gated=getLookup(publicKey,privateKey,async t=>{
  started();await held;return providerAck(t,privateKey);
 });
 const reconciler=createSourceEvidencePrivateAckReconciler({
  lookupDurableAck:gated,
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
 const accepted=createSourceEvidencePrivateAckReconciler({
  lookupDurableAck:newLookup,query:(sql,args)=>confirmer.query(sql,args)
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
 console.log('Private provider key trust PASS: restricted roles, retired-key guard, epoch rotation, midflight revoke, real SQL row-lock ordering, signed acknowledgement without redispatch.');
}finally{
 await Promise.allSettled(clients.map(c=>c.query('rollback')));
 await Promise.allSettled(clients.map(c=>c.end()));
 await server.stop();await assert.rejects(access(server.root));
 console.log('Private key trust disposable PostgreSQL cleanup PASS');
}
