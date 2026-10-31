import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {createSourceEvidencePrivateTrustLockedAckReconciler}
 from '../scripts/lib/source-evidence-private-trust-locked-ack.js';

const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const providerId='fixture.provider',recipientId='review.queue';
const keySha256=createHash('sha256')
 .update(publicKey.export({type:'spki',format:'der'})).digest('hex');
const task={requestId:'44444444-4444-4444-8444-444444444444',
 attemptId:'55555555-5555-4555-8555-555555555555',digest:'a'.repeat(64)};
const receipt={protocol:'mlos.delivery.ack.v1',providerId,recipientId,...task,
 providerReceiptId:'synthetic-ack-001',status:'durable',occurredAt:'2026-11-01T00:00:00.000Z'};
const signedBytes=Buffer.from('MLOS:source-evidence:durable-ack:v1\n'+JSON.stringify([
 receipt.protocol,receipt.providerId,receipt.recipientId,receipt.requestId,
 receipt.attemptId,receipt.digest,receipt.providerReceiptId,receipt.status,
 receipt.occurredAt
]),'utf8');
const signedReceipt={...receipt,signature:sign(null,signedBytes,privateKey).toString('base64url')};
const state=(epoch=1,enabled=true)=>({providerId,recipientId,keySha256,epoch,enabled});
const make=(overrides={})=>createSourceEvidencePrivateTrustLockedAckReconciler({
 fetchSignedReceipt:async()=>signedReceipt,trustedPublicKey:publicKey,
 providerId,recipientId,getTrustState:async()=>state(),
 query:async()=>({rows:[{r:{status:'acknowledgement-recorded'}}]}),
 ...overrides
});

test('signer-authorized audit uses only transaction-guarded SQL with pinned key and epoch',async()=>{
 const calls=[],trustReads=[];
 const reconciler=make({
  getTrustState:async selector=>{
   trustReads.push(selector);return state(7);
  },
  query:async(sql,args)=>{
   calls.push({sql,args});
   return {rows:[{r:{status:'acknowledgement-recorded'}}]};
  }
 });
 assert.deepEqual(await reconciler.reconcile(task),{status:'acknowledgement-recorded'});
 assert.equal(trustReads.length,3);
 assert.ok(trustReads.every(x=>x.keySha256===keySha256&&Object.isFrozen(x)));
 assert.deepEqual(calls,[{
  sql:'select evidence_private.key_record_ack($1,$2,$3,$4,$5,$6,$7,$8) as r',
  args:[task.requestId,task.attemptId,task.digest,calls[0].args[3],
   providerId,recipientId,keySha256,7]
 }]);
 assert.match(calls[0].args[3],/^[a-f0-9]{64}$/);
});

test('revocation after final JavaScript trust read is denied by database transaction',async()=>{
 let read=0,writes=0,sqlTrustEpoch=5,sqlEnabled=true;
 const reconciler=make({
  getTrustState:async()=>{
   read++;
   if(read===3){sqlTrustEpoch=6;sqlEnabled=false;}
   return state(5,true);
  },
  query:async(sql,args)=>{
   writes++;
   assert.ok(sql.includes('.key_record_ack('));
   assert.equal(args[7],5);
   if(sqlTrustEpoch!==args[7]||!sqlEnabled)throw Error('private_denied');
   return {rows:[{r:{status:'acknowledgement-recorded'}}]};
  }
 });
 assert.deepEqual(await reconciler.reconcile(task),{status:'denied'});
 assert.equal(read,3);assert.equal(writes,1);
});

test('trust read denial, malformed SQL result and unsigned receipts never report success',async()=>{
 let writes=0;
 const unavailable=make({
  getTrustState:async()=>{throw Error('private key reader unavailable');},
  query:async()=>{writes++;throw Error('must not audit');}
 });
 assert.deepEqual(await unavailable.reconcile(task),{status:'reconciliation-required'});
 assert.equal(writes,0);
 const stale=make({
  getTrustState:async()=>state(1,false),
  query:async()=>{writes++;throw Error('must not audit');}
 });
 assert.deepEqual(await stale.reconcile(task),{status:'reconciliation-required'});
 assert.equal(writes,0);
 const malformed=make({query:async(sql,args)=>{
  assert.ok(sql.includes('.key_record_ack('));writes++;
  return {rows:[{r:{status:'acknowledgement-recorded',extra:true}}]};
 }});
 assert.deepEqual(await malformed.reconcile(task),{status:'uncertain'});
 assert.equal(writes,1);
 const wrong=make({
  fetchSignedReceipt:async()=>({...signedReceipt,signature:'A'.repeat(86)}),
  query:async()=>{writes++;throw Error('must not audit');}
 });
 assert.deepEqual(await wrong.reconcile(task),{status:'reconciliation-required'});
 assert.equal(writes,1);
});

test('recovery inspects original attempt and does not reserve or dispatch',async()=>{
 const sqls=[];
 const rec=make({query:async(sql,args)=>{
  sqls.push(sql);
  if(sql.includes('.inspect_intent('))return {rows:[{r:{
   status:'intent-found',attemptId:task.attemptId,state:'uncertain'
  }}]};
  assert.ok(sql.includes('.key_record_ack('));
  return {rows:[{r:{status:'acknowledgement-recorded'}}]};
 }});
 assert.deepEqual(await rec.recover({requestId:task.requestId,digest:task.digest}),
  {status:'acknowledgement-recorded'});
 assert.equal(sqls.length,2);
 assert.ok(sqls.every(sql=>sql.includes('.inspect_intent(')||sql.includes('.key_record_ack(')));
});
