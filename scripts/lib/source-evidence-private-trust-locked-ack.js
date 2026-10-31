// OFFLINE COMPOSITION: cryptographically verified, trust-gated signed receipt
// -> private single-transaction signer-authorized SQL audit. NO production API.
import {createSourceEvidencePrivateAckReconciler} from './source-evidence-private-authority-prototype.js';
import {createSourceEvidenceTrustGatedAckLookup,sourceEvidenceKeyFingerprint}
 from './source-evidence-private-trust-gated-ack.js';

const hex=/^[a-f0-9]{64}$/;
const identifier=/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$/;
const rawAck='select evidence_private.record_ack($1,$2,$3,$4) as r';
const guardedAck='select evidence_private.key_record_ack($1,$2,$3,$4,$5,$6,$7,$8) as r';
const inspect='select evidence_private.inspect_intent($1,$2) as r';
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
/** Network signing proof and restricted key reader are both mandatory.
 * Caller must provide a dedicated confirmer-only SQL connection. A raw
 * four-argument audit function is unreachable to that role in the overlay.
 */
export function createSourceEvidencePrivateTrustLockedAckReconciler({
 fetchSignedReceipt,trustedPublicKey,providerId,recipientId,getTrustState,query
}){
 if(typeof query!=='function'||typeof getTrustState!=='function'||
    typeof providerId!=='string'||!identifier.test(providerId)||
    typeof recipientId!=='string'||!identifier.test(recipientId))
  throw new TypeError('private_trust_locked_ack_configuration_invalid');
 const keySha256=sourceEvidenceKeyFingerprint(trustedPublicKey);
 if(!keySha256)throw new TypeError('private_trust_locked_ack_configuration_invalid');
 const lookupDurableAck=createSourceEvidenceTrustGatedAckLookup({
  fetchSignedReceipt,trustedPublicKey,providerId,recipientId,getTrustState
 });
 const selector=Object.freeze({providerId,recipientId,keySha256});
 async function constrainedQuery(sql,args){
  if(sql===inspect&&Array.isArray(args)&&args.length===2)
   return query(inspect,args);
  if(sql!==rawAck||!Array.isArray(args)||args.length!==4||
     !args.every(a=>typeof a==='string')||
     !hex.test(args[2])||!hex.test(args[3]))
   throw Error('private_invalid');
  // A fresh state read does not itself grant authority. SQL's key_record_ack
  // locks the current signer row and enforces exact key+epoch atomically with
  // the audit write, defeating revoke-after-verification-before-commit races.
  let trusted;
  try{trusted=await getTrustState(selector);}catch{throw Error('private_denied');}
  const state=snapshot(trusted,['providerId','recipientId','keySha256','epoch','enabled']);
  if(!state||state.providerId!==providerId||state.recipientId!==recipientId||
     state.keySha256!==keySha256||state.enabled!==true||
     !Number.isSafeInteger(state.epoch)||state.epoch<1)
   throw Error('private_denied');
  return query(guardedAck,[...args,providerId,recipientId,keySha256,state.epoch]);
 }
 return createSourceEvidencePrivateAckReconciler({
  lookupDurableAck,query:constrainedQuery
 });
}
