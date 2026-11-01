// OFFLINE source-review signout handoff CONTRACT. Not a live Auth logout,
// review API, credential store, database transaction or authorization primitive.
//
// A token issued by the provider may remain usable until expiry after signout.
// First request MLOS-owned revocation, then ALWAYS attempt normal provider
// signout, even when app revocation is uncertain (do not strand the user).
// Never report review access closed from either acknowledgement alone.
const uuid=value=>typeof value==='string'&&
 /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
const tokenOK=value=>typeof value==='string'&&
 value.length>=16&&value.length<=8192&&!/\s/.test(value);
const ownData=(obj,key)=>{
 try{
  if(!obj||typeof obj!=='object'||Array.isArray(obj)||
   ![Object.prototype,null].includes(Object.getPrototypeOf(obj)))return undefined;
  const d=Object.getOwnPropertyDescriptor(obj,key);
  return d?.enumerable&&Object.hasOwn(d,'value')?d.value:undefined;
 }catch{return undefined;}
};
const outcome=(reason,owned=false,provider=false)=>Object.freeze({
 ready:false,reason,
 ownedRevocationAcknowledged:owned,providerSignoutAcknowledged:provider,
 bothStepsAcknowledged:owned&&provider,
 reviewAccessVerifiedDenied:false,providerSessionEndedVerified:false,
 providerOnlySignoutHandled:false,transactionVerified:false,
 sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,
 examScopeApproved:false,learnerRelease:false,
 needsReconciliation:!(owned&&provider),automaticRetryAllowed:false
});

/**
 * All dependencies must be restricted to trusted server-side adapters:
 *   verifyIdentity(token) validates the user and session with the provider;
 *   revokeOwnedSessionAsUser(token) derives actor+session INSIDE the isolated
 *     application's reviewed SQL transaction (no caller-supplied UUIDs);
 *   providerSignOutLocal(token) requests provider logout of that session.
 *
 * Acknowledgements are not independent verification of durable revocation.
 * Provider-initiated signout elsewhere bypasses this whole handoff.
 */
export function createInternalSourceReviewSignoutHandoff({
 verifyIdentity,revokeOwnedSessionAsUser,providerSignOutLocal
}){
 if(typeof verifyIdentity!=='function'||
  typeof revokeOwnedSessionAsUser!=='function'||
  typeof providerSignOutLocal!=='function')
  throw new TypeError('internal_review_signout_dependencies_invalid');
 return async function signout(token){
  if(!tokenOK(token))return outcome('invalid-token');
  let verified;
  try{verified=await verifyIdentity(token);}
  catch{return outcome('identity-unavailable');}
  const actor=ownData(verified,'userId');
  const sid=ownData(verified,'sessionId');
  if(ownData(verified,'verified')!==true||!uuid(actor)||!uuid(sid))
   return outcome('identity-unverified');

  // No actor/session identifiers are passed as user-controllable parameters.
  // A retry is deliberately absent: a network error may follow DB commit.
  let owned=false,provider=false;
  try{
   const result=await revokeOwnedSessionAsUser(token);
   owned=ownData(result,'revoked')===true&&
    ownData(result,'userId')===actor&&ownData(result,'sessionId')===sid;
  }catch{/* ambiguous app revocation; still attempt provider signout */}
  try{
   const result=await providerSignOutLocal(token);
   provider=ownData(result,'error')===null&&ownData(result,'scope')==='local';
  }catch{/* provider may also have completed before response was lost */}
  if(owned&&provider)return outcome('dual-acknowledgement-unverified',true,true);
  if(!owned&&!provider)return outcome('both-unconfirmed');
  if(!owned)return outcome('owned-revocation-unconfirmed',false,provider);
  return outcome('provider-signout-unconfirmed',true,false);
 };
}
