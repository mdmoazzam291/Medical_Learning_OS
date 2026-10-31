import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync,sign} from 'node:crypto';
import {createSourceEvidenceSignedAckLookup} from '../scripts/lib/source-evidence-private-signed-ack.js';
import {createSourceEvidencePrivateAckReconciler} from '../scripts/lib/source-evidence-private-authority-prototype.js';

const {publicKey,privateKey}=generateKeyPairSync('ed25519');
const {publicKey:untrustedKey,privateKey:untrustedSigner}=generateKeyPairSync('ed25519');
const requestId='44444444-4444-4444-8444-444444444444';
const attemptId='55555555-5555-4555-8555-555555555555';
const digest='a'.repeat(64);
const task={requestId,attemptId,digest};
const providerId='trusted-provider.fixture';
const recipientId='source-review.queue';
const base={
 protocol:'mlos.delivery.ack.v1',providerId,recipientId,requestId,attemptId,digest,
 providerReceiptId:'fixture-ack-001',status:'durable',occurredAt:'2026-11-01T00:00:00.000Z'
};
const signedBytes=value=>Buffer.from('MLOS:source-evidence:durable-ack:v1\n'+JSON.stringify([
 value.protocol,value.providerId,value.recipientId,value.requestId,value.attemptId,
 value.digest,value.providerReceiptId,value.status,value.occurredAt
]),'utf8');
const signed=(fields={},key=privateKey)=>{
 const value={...base,...fields};
 return {...value,signature:sign(null,signedBytes(value),key).toString('base64url')};
};
const makeLookup=(fetchSignedReceipt,trustedPublicKey=publicKey,opts={})=>
 createSourceEvidenceSignedAckLookup({
  fetchSignedReceipt,trustedPublicKey,providerId,recipientId,...opts
 });

test('pinned Ed25519 receipt binds all durable fields before SQL acknowledgement',async()=>{
 let reads=0,sqlWrites=0;
 const receipt=signed();
 const lookup=makeLookup(async exact=>{
  reads++;assert.deepEqual(exact,task);assert.equal(Object.isFrozen(exact),true);
  return receipt;
 });
 const proof=await lookup(task);
 assert.equal(proof?.status,'durable');
 assert.deepEqual({requestId:proof.requestId,attemptId:proof.attemptId,digest:proof.digest},task);
 assert.match(proof.ackDigest,/^[a-f0-9]{64}$/);
 const expectedHash=createHash('sha256').update('MLOS:source-evidence:ack-proof:v1\n')
  .update(signedBytes(receipt)).update(Buffer.from(receipt.signature,'base64url')).digest('hex');
 assert.equal(proof.ackDigest,expectedHash);
 const reconcile=createSourceEvidencePrivateAckReconciler({
  lookupDurableAck:lookup,
  query:async(sql,args)=>{
   sqlWrites++;assert.ok(sql.includes('record_ack('));
   assert.deepEqual(args,[requestId,attemptId,digest,expectedHash]);
   return {rows:[{r:{status:'acknowledgement-recorded'}}]};
  }
 });
 assert.deepEqual(await reconcile.reconcile(task),{status:'acknowledgement-recorded'});
 assert.equal(reads,2);
 assert.equal(sqlWrites,1);
});

test('provider/recipient, request binding, claimed status, timestamp and detached signature cannot be substituted',async()=>{
 const valid=signed();
 const signedWrongRecipient=signed({recipientId:'different.queue'});
 const signedWrongProvider=signed({providerId:'different-provider'});
 const corruptedSignature={...valid,signature:valid.signature.slice(0,-2)+'AA'};
 const bad=[
  {...valid,requestId:'66666666-6666-4666-8666-666666666666'},
  {...valid,attemptId:'66666666-6666-4666-8666-666666666666'},
  {...valid,digest:'b'.repeat(64)},
  {...valid,providerReceiptId:'another-receipt'},
  {...valid,status:'queued'},
  {...valid,occurredAt:'2026-11-01T00:00:01.000Z'},
  {...valid,protocol:'wrong-v2'},
  signedWrongRecipient,signedWrongProvider,
  corruptedSignature,{...valid,unexpected:true},
  signed({},untrustedSigner)
 ];
 for(const candidate of bad){
  let writes=0;
  const reconciler=createSourceEvidencePrivateAckReconciler({
   lookupDurableAck:makeLookup(async()=>candidate),
   query:async()=>{writes++;return {rows:[{r:{status:'acknowledgement-recorded'}}]};}
  });
  assert.deepEqual(await reconciler.reconcile(task),{status:'reconciliation-required'});
  assert.equal(writes,0);
 }
});

test('malformed signed receipts, accessor fields, and provider unavailability remain unresolved',async()=>{
 const valid=signed();
 let reads=0;
 const accessor={...valid};
 Object.defineProperty(accessor,'signature',{enumerable:true,get(){
  reads++;throw Error('must never read untrusted getter');
 }});
 let fetches=0;
 for(const fetcher of [
  async()=>accessor,
  async()=>({...valid,signature:valid.signature+'='}),
  async()=>({...valid,occurredAt:'2026-02-30T00:00:00.000Z'}),
  async()=>null,
  async()=>{throw Error('provider network failure');}
 ]){
  const lookup=makeLookup(async x=>{fetches++;return fetcher(x);});
  assert.equal(await lookup(task),null);
 }
 assert.equal(fetches,5);assert.equal(reads,0);
 const lookup=makeLookup(async()=>{throw Error('should not be called');});
 assert.equal(await lookup({...task,unknown:'browser-data'}),null);
});

test('public-key pinning rejects incorrect or unsupported key configuration',async()=>{
 const valid=signed();
 const lookup=makeLookup(async()=>valid,untrustedKey);
 assert.equal(await lookup(task),null);
 // Both accepted public representations must work. Private trust anchors do not.
 const pem=publicKey.export({type:'spki',format:'pem'});
 assert.equal((await makeLookup(async()=>valid,pem)(task))?.status,'durable');
 assert.throws(()=>makeLookup(async()=>valid,privateKey),
  /private_signed_ack_configuration_invalid/);
 assert.throws(()=>makeLookup(async()=>valid,privateKey.export({type:'pkcs8',format:'pem'})),
  /private_signed_ack_configuration_invalid/);
 const {publicKey:rsaKey}=generateKeyPairSync('rsa',{modulusLength:2048});
 assert.throws(()=>makeLookup(async()=>valid,rsaKey),/private_signed_ack_configuration_invalid/);
 assert.throws(()=>makeLookup(async()=>valid,'not a key'),/private_signed_ack_configuration_invalid/);
 assert.throws(()=>makeLookup(async()=>valid,publicKey,{recipientId:''}),
  /private_signed_ack_configuration_invalid/);
});
