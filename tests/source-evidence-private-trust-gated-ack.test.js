import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {createSourceEvidenceTrustGatedAckLookup} from '../scripts/lib/source-evidence-private-trust-gated-ack.js';
import {createSourceEvidencePrivateAckReconciler} from '../scripts/lib/source-evidence-private-authority-prototype.js';

const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const providerId='receipt-provider.fixture',recipientId='source-review.queue';
const keySha256=createHash('sha256').update(publicKey.export({type:'spki',format:'der'})).digest('hex');
const task=Object.freeze({
 requestId:'44444444-4444-4444-8444-444444444444',
 attemptId:'55555555-5555-4555-8555-555555555555',digest:'a'.repeat(64)
});
const canonical=Object.freeze({
 protocol:'mlos.delivery.ack.v1',providerId,recipientId,...task,
 providerReceiptId:'signed-receipt-001',status:'durable',occurredAt:'2026-11-01T00:00:00.000Z'
});
const payload=p=>Buffer.from('MLOS:source-evidence:durable-ack:v1\n'+JSON.stringify([
 p.protocol,p.providerId,p.recipientId,p.requestId,p.attemptId,p.digest,
 p.providerReceiptId,p.status,p.occurredAt
]),'utf8');
const receipt={...canonical,signature:sign(null,payload(canonical),privateKey).toString('base64url')};
const state=(epoch=1,enabled=true)=>({providerId,recipientId,keySha256,epoch,enabled});
const make=(getTrustState,fetchSignedReceipt=async()=>receipt)=>createSourceEvidenceTrustGatedAckLookup({
 getTrustState,fetchSignedReceipt,trustedPublicKey:publicKey,providerId,recipientId
});

test('positive signed proof requires matching trust state before and after provider lookup',async()=>{
 let trustCalls=0,providerCalls=0,sqlWrites=0;
 const lookup=make(async selector=>{
  trustCalls++;
  assert.deepEqual(selector,{providerId,recipientId,keySha256});
  assert.equal(Object.isFrozen(selector),true);
  return state(8);
 },async exact=>{providerCalls++;assert.deepEqual(exact,task);return receipt;});
 const proof=await lookup(task);
 assert.equal(proof?.status,'durable');
 assert.match(proof.ackDigest,/^[a-f0-9]{64}$/);
 const reconciler=createSourceEvidencePrivateAckReconciler({
  lookupDurableAck:lookup,
  query:async()=>{sqlWrites++;return {rows:[{r:{status:'acknowledgement-recorded'}}]};}
 });
 assert.deepEqual(await reconciler.reconcile(task),{status:'acknowledgement-recorded'});
 assert.equal(trustCalls,4);assert.equal(providerCalls,2);assert.equal(sqlWrites,1);
});

test('revoked, missing or mismatched trust blocks provider lookup and SQL',async()=>{
 const bad=[
  state(2,false),{...state(),epoch:0},{...state(),epoch:1.1},
  {...state(),keySha256:'b'.repeat(64)},
  {...state(),providerId:'other-provider'},
  {...state(),recipientId:'other.queue'},
  {...state(),extra:'unrecognized'},
  null
 ];
 const accessor=state();
 Object.defineProperty(accessor,'enabled',{enumerable:true,get(){
  throw Error('must not execute trust state getter');
 }});
 bad.push(accessor);
 for(const candidate of bad){
  let sent=0,writes=0;
  const lookup=make(async()=>candidate,async()=>{sent++;return receipt;});
  const reconcile=createSourceEvidencePrivateAckReconciler({
   lookupDurableAck:lookup,
   query:async()=>{writes++;return {rows:[{r:{status:'acknowledgement-recorded'}}]};}
  });
  assert.deepEqual(await reconcile.reconcile(task),{status:'reconciliation-required'});
  assert.equal(sent,0);assert.equal(writes,0);
 }
 let sent=0;
 assert.equal(await make(async()=>{throw Error('trust backend offline');},
  async()=>{sent++;return receipt;})(task),null);
 assert.equal(sent,0);
});

test('key revocation, rotation and epoch change during receipt lookup suppress positive evidence',async()=>{
 for(const changed of [state(10,false),state(11,true),{...state(10),keySha256:'b'.repeat(64)},null]){
  let lookups=0,trustReads=0;
  const lookup=make(async()=>{
   trustReads++;return trustReads===1?state(10):changed;
  },async()=>{lookups++;return receipt;});
  assert.equal(await lookup(task),null);
  assert.equal(trustReads,2);assert.equal(lookups,1);
 }
});

test('request mutation during trust check cannot swap signed attempt and malformed input does not query trust',async()=>{
 const mutable={...task};
 let trustReads=0,lookups=0;
 const lookup=make(async()=>{
  trustReads++;
  mutable.attemptId='66666666-6666-4666-8666-666666666666';
  return state(12);
 },async req=>{
  lookups++;assert.deepEqual(req,task);assert.equal(Object.isFrozen(req),true);
  return receipt;
 });
 assert.equal((await lookup(mutable))?.status,'durable');
 assert.equal(trustReads,2);assert.equal(lookups,1);
 assert.equal(await lookup({...task,extra:true}),null);
 const bad={requestId:task.requestId,attemptId:task.attemptId};
 Object.defineProperty(bad,'digest',{enumerable:true,get(){throw Error('accessor');}});
 assert.equal(await lookup(bad),null);
 assert.equal(trustReads,2);assert.equal(lookups,1);
});

test('trust gate rejects invalid key configuration and cannot authorize private signing key',async()=>{
 assert.throws(()=>createSourceEvidenceTrustGatedAckLookup({
  fetchSignedReceipt:async()=>receipt,trustedPublicKey:publicKey,
  providerId,recipientId
 }),/private_receipt_trust_configuration_invalid/);
 assert.throws(()=>createSourceEvidenceTrustGatedAckLookup({
  getTrustState:async()=>state(),fetchSignedReceipt:async()=>receipt,
  trustedPublicKey:privateKey,providerId,recipientId
 }),/private_signed_ack_configuration_invalid|private_receipt_trust_configuration_invalid/);
});
