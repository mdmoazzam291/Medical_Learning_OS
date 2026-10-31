// OFFLINE EXPERIMENTAL connector: verifies detached Ed25519 signatures on a
// provider's durable-ack assertions. NO REAL PROVIDER/TRANSPORT IS CONNECTED.
// A signature proves the configured key signed the assertion, NOT that the key
// belongs to a provider or that content reached the intended human recipient.
import {createHash,createPublicKey,verify as verifySignature} from 'node:crypto';

const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const hex=/^[a-f0-9]{64}$/;
const identifier=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;
const protocol='mlos.delivery.ack.v1';
const fields=['protocol','providerId','recipientId','requestId','attemptId','digest',
 'providerReceiptId','status','occurredAt','signature'];

function snapshot(value,keys){
 try{
  if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype||
     Reflect.ownKeys(value).length!==keys.length)return null;
  const result=Object.create(null);
  for(const key of keys){
   const descriptor=Object.getOwnPropertyDescriptor(value,key);
   if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))return null;
   result[key]=descriptor.value;
  }
  return result;
 }catch{return null;}
}
function signatureBytes(encoded){
 if(typeof encoded!=='string'||!/^[-_A-Za-z0-9]{86}$/.test(encoded))return null;
 const bytes=Buffer.from(encoded,'base64url');
 return bytes.length===64&&bytes.toString('base64url')===encoded?bytes:null;
}
function payloadBytes(receipt){
 return Buffer.from('MLOS:source-evidence:durable-ack:v1\n'+JSON.stringify([
  receipt.protocol,receipt.providerId,receipt.recipientId,receipt.requestId,
  receipt.attemptId,receipt.digest,receipt.providerReceiptId,
  receipt.status,receipt.occurredAt
 ]),'utf8');
}
function validUtc(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value))
  return false;
 const time=Date.parse(value);
 return Number.isFinite(time)&&new Date(time).toISOString()===value;
}
/**
 * Internal-only trusted adapter. Its fetch function must perform authenticated,
 * private, read-only durable-receipt lookup at the real provider; never accept a
 * browser-supplied signed receipt or provider key. No retry/dispatch occurs.
 * The configured public key MUST be securely pinned out-of-band.
 */
export function createSourceEvidenceSignedAckLookup({
 fetchSignedReceipt,trustedPublicKey,providerId,recipientId
}){
 if(typeof fetchSignedReceipt!=='function'||typeof providerId!=='string'||
    typeof recipientId!=='string'||!identifier.test(providerId)||
    !identifier.test(recipientId))
  throw new TypeError('private_signed_ack_configuration_invalid');
 let key;
 try{key=createPublicKey(trustedPublicKey);}
 catch{throw new TypeError('private_signed_ack_configuration_invalid');}
 if(key.asymmetricKeyType!=='ed25519')
  throw new TypeError('private_signed_ack_configuration_invalid');

 return async function lookupDurableAck(value){
  const requested=snapshot(value,['requestId','attemptId','digest']);
  if(!requested||typeof requested.requestId!=='string'||!uuid.test(requested.requestId)||
     typeof requested.attemptId!=='string'||!uuid.test(requested.attemptId)||
     typeof requested.digest!=='string'||!hex.test(requested.digest))return null;

  let providerResult;
  try{
   providerResult=await fetchSignedReceipt(Object.freeze({
    requestId:requested.requestId,attemptId:requested.attemptId,digest:requested.digest
   }));
  }catch{return null;}
  const receipt=snapshot(providerResult,fields);
  if(!receipt||receipt.protocol!==protocol||receipt.providerId!==providerId||
     receipt.recipientId!==recipientId||receipt.requestId!==requested.requestId||
     receipt.attemptId!==requested.attemptId||receipt.digest!==requested.digest||
     receipt.status!=='durable'||typeof receipt.providerReceiptId!=='string'||
     !identifier.test(receipt.providerReceiptId)||!validUtc(receipt.occurredAt))return null;
  const signature=signatureBytes(receipt.signature);
  if(!signature)return null;
  const bytes=payloadBytes(receipt);
  try{if(!verifySignature(null,bytes,key,signature))return null;}
  catch{return null;}

  // The SQL stores only a stable, content-addressed hash of the externally
  // signed assertion; it never receives the signature or provider payload.
  const ackDigest=createHash('sha256').update('MLOS:source-evidence:ack-proof:v1\n')
   .update(bytes).update(signature).digest('hex');
  return Object.freeze({
   requestId:requested.requestId,attemptId:requested.attemptId,digest:requested.digest,
   ackDigest,status:'durable'
  });
 };
}
