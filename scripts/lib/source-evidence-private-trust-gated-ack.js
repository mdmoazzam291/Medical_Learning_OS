// OFFLINE TRUST-LIFECYCLE EXPERIMENT — NOT LIVE PROVIDER KEY OWNERSHIP.
// This composes the detached Ed25519 verifier with independently supplied,
// uncached provider/recipient/key authorization decisions. No web/auth calls,
// secret store or provider integration is supplied by this module.
import {KeyObject,createHash,createPublicKey} from 'node:crypto';
import {createSourceEvidenceSignedAckLookup} from './source-evidence-private-signed-ack.js';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const hex=/^[a-f0-9]{64}$/;
const fields=['providerId','recipientId','keySha256','epoch','enabled'];
function snapshot(value,keys){
 try{
  if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype||
     Reflect.ownKeys(value).length!==keys.length)return null;
  const out=Object.create(null);
  for(const key of keys){
   const d=Object.getOwnPropertyDescriptor(value,key);
   if(!d?.enumerable||!Object.hasOwn(d,'value'))return null;
   out[key]=d.value;
  }
  return out;
 }catch{return null;}
}
export function sourceEvidenceKeyFingerprint(trustedPublicKey){
 try{
  let key;
  if(trustedPublicKey instanceof KeyObject){
   if(trustedPublicKey.type!=='public')return null;
   key=trustedPublicKey;
  }else if(typeof trustedPublicKey==='string'&&
    /^-----BEGIN PUBLIC KEY-----\r?\n/.test(trustedPublicKey)){
   key=createPublicKey(trustedPublicKey);
  }else return null;
  if(key.type!=='public'||key.asymmetricKeyType!=='ed25519')return null;
  return createHash('sha256').update(key.export({type:'spki',format:'der'})).digest('hex');
 }catch{return null;}
}
/**
 * A positive requires the same exact provider/recipient/public-key fingerprint
 * and monotonically versioned authority epoch before AND after the external
 * signed-receipt lookup. Revocation, rotation, outage or epoch change -> null.
 * Key ownership, no-cache semantics, writer synchronization and freshness are
 * responsibilities of the PRIVATE authoritative getTrustState implementation.
 */
export function createSourceEvidenceTrustGatedAckLookup({
 fetchSignedReceipt,trustedPublicKey,providerId,recipientId,getTrustState
}){
 if(typeof getTrustState!=='function')
  throw new TypeError('private_receipt_trust_configuration_invalid');
 const lookup=createSourceEvidenceSignedAckLookup({
  fetchSignedReceipt,trustedPublicKey,providerId,recipientId
 });
 const keySha256=sourceEvidenceKeyFingerprint(trustedPublicKey);
 if(!keySha256)throw new TypeError('private_receipt_trust_configuration_invalid');
 const selector=Object.freeze({providerId,recipientId,keySha256});
 async function currentEpoch(){
  let state;
  try{state=await getTrustState(selector);}catch{return null;}
  const v=snapshot(state,fields);
  if(!v||v.providerId!==providerId||v.recipientId!==recipientId||
     v.keySha256!==keySha256||v.enabled!==true||
     !Number.isSafeInteger(v.epoch)||v.epoch<1)return null;
  return v.epoch;
 }
 return async function lookupDurableAck(input){
  const request=snapshot(input,['requestId','attemptId','digest']);
  if(!request||typeof request.requestId!=='string'||!uuid.test(request.requestId)||
     typeof request.attemptId!=='string'||!uuid.test(request.attemptId)||
     typeof request.digest!=='string'||!hex.test(request.digest))return null;
  const before=await currentEpoch();
  if(before===null)return null;
  let proof;
  try{proof=await lookup(Object.freeze({
   requestId:request.requestId,attemptId:request.attemptId,digest:request.digest
  }));}catch{return null;}
  if(!proof)return null;
  const after=await currentEpoch();
  if(after===null||after!==before)return null;
  return proof;
 };
}
