// Offline/private MLOS-owned authority experiment; not connected to live API.
// No cached token acceptance and no claim of immediate Supabase revocation.
import {createSourceEvidenceVerifiedUser} from './source-evidence-private-boundary.js';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const hex=/^[a-f0-9]{64}$/;
const stageSql='select evidence_private.stage($1,$2,$3,$4) as r';
const intentSql='select evidence_private.reserve_intent($1,$2,$3,$4) as r';
const ackSql='select evidence_private.record_ack($1,$2,$3,$4) as r';
const lookupSql='select evidence_private.inspect_intent($1,$2) as r';
const result=status=>Object.freeze({status});
// Snapshot only own enumerable data properties before any async boundary.
 // Re-reading getters or provider-owned mutable objects would break the
 // exact request/acknowledgement correlation this prototype requires.
function snapshotFields(value,keys){
 try{
  if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype||
     Reflect.ownKeys(value).length!==keys.length)return null;
  const snapshot=Object.create(null);
  for(const key of keys){
   const descriptor=Object.getOwnPropertyDescriptor(value,key);
   if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))return null;
   snapshot[key]=descriptor.value;
  }
  return snapshot;
 }catch{return null;}
}
function capture(value){
 if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Object.prototype||
    Reflect.ownKeys(value).length!==3||
    !['accessToken','requestId','digest'].every(k=>Object.hasOwn(value,k)))return null;
 for(const k of ['accessToken','requestId','digest']){
  const d=Object.getOwnPropertyDescriptor(value,k);
  if(!d?.enumerable||!Object.hasOwn(d,'value'))return null;
 }
 if(typeof value.accessToken!=='string'||!value.accessToken||value.accessToken.length>16384||
    !uuid.test(value.requestId)||!hex.test(value.digest))return null;
 return {token:value.accessToken,request:value.requestId.toLowerCase(),digest:value.digest};
}
function claims(token,expectedIssuer,now){
 try{
  const parts=token.split('.');
  if(parts.length!==3||parts.some(p=>!p||!/^[a-zA-Z0-9_-]+$/.test(p)))return null;
  const parsed=JSON.parse(Buffer.from(parts[1],'base64url').toString('utf8'));
  if(!uuid.test(parsed.sub)||!uuid.test(parsed.session_id)||
     parsed.iss!==expectedIssuer||parsed.aud!=='authenticated'||
     !Number.isSafeInteger(parsed.exp)||parsed.exp<=Math.floor(now()/1000))return null;
  return {actor:parsed.sub.toLowerCase(),session:parsed.session_id.toLowerCase()};
 }catch{return null;}
}
export function createSourceEvidencePrivateAuthorityPrototype({getUser,query,expectedIssuer,now=Date.now}){
 if(typeof getUser!=='function'||typeof query!=='function'||typeof now!=='function'||
    typeof expectedIssuer!=='string'||!/^https?:\/\//.test(expectedIssuer))throw new TypeError('private_authority_prototype_config_invalid');
 const verifyUser=createSourceEvidenceVerifiedUser({getUser});
 async function identity(token){
  // A claim is only a locator AFTER a new network Auth getUser decision.
  const verified=await verifyUser(token);
  if(!verified)return null;
  const claim=claims(token,expectedIssuer,now);
  if(!claim||claim.actor!==verified.id)return null;
  return claim;
 }
 async function run(kind,input){
  const captured=capture(input);if(!captured)return result('invalid');
  const id=await identity(captured.token);if(!id)return result('denied');
  const sql=kind==='stage'?stageSql:intentSql;
  let r;
  try{
   r=(await query(sql,[id.actor,id.session,captured.request,captured.digest]))?.rows?.[0]?.r;
  }catch(error){
   if(error?.message==='private_denied')return result('denied');
   if(error?.message==='private_conflict')return result('conflict');
   if(error?.message==='private_invalid')return result('invalid');
   return result('uncertain');
  }
  // A database driver is a trust boundary too. Snapshot the complete returned
  // data shape before calling Auth again, rather than re-reading a getter or a
  // mutable driver result after an await. An unknown/malformed shape fails closed.
  const row=kind==='stage'?snapshotFields(r,['status']):
    snapshotFields(r,['status','attemptId'])??snapshotFields(r,['status']);
  if(kind==='reserve'&&row?.status==='reconciliation-required'&&
     !Object.hasOwn(row,'attemptId'))return result('reconciliation-required');
  const expected=kind==='stage'?'staged':'intent-recorded';
  if(!row||row.status!==expected)return result('uncertain');
  if(kind==='reserve'&&(typeof row.attemptId!=='string'||!uuid.test(row.attemptId)))
    return result('uncertain');
  // A new provider verification before returning prevents replay of a cached
  // provider success. It does NOT make provider state atomic with SQL commit.
  const again=await identity(captured.token);
  if(!again||again.actor!==id.actor||again.session!==id.session)return result('denied');
  return kind==='stage'?result('staged'):
    Object.freeze({status:'intent-recorded',attemptId:row.attemptId.toLowerCase()});
 }
 return Object.freeze({
  stage:input=>run('stage',input),
  reserveIntent:input=>run('reserve',input)
 });
}

/**
 * INTERNAL RECONCILIATION ONLY: a trusted outbound-delivery adapter must
 * query its independent durable receipt using the exact one-shot attempt ID.
 * This prototype never sends content or accepts a browser supplied ack.
 * The DB audit mark records the confirmer's assertion, not physical delivery.
 */
export function createSourceEvidencePrivateAckReconciler({lookupDurableAck,query}){
 if(typeof lookupDurableAck!=='function'||typeof query!=='function')
  throw new TypeError('private_ack_reconciler_config_invalid');
 const api={async reconcile(value){
  const captured=snapshotFields(value,['requestId','attemptId','digest']);
  if(!captured||typeof captured.requestId!=='string'||typeof captured.attemptId!=='string'||
     typeof captured.digest!=='string'||!uuid.test(captured.requestId)||
     !uuid.test(captured.attemptId)||!hex.test(captured.digest))return result('invalid');
  const request=captured.requestId.toLowerCase(),attempt=captured.attemptId.toLowerCase(),
   digest=captured.digest;
  let receipt;
  try{receipt=await lookupDurableAck(Object.freeze({requestId:request,attemptId:attempt,digest}));}
  catch{return result('reconciliation-required');}
  // A positive is possible ONLY after the trusted adapter returns an exact
  // durable correlation; no optimistic/time-based inferences or SDK success.
  if(receipt==null)return result('reconciliation-required');
  const proof=snapshotFields(receipt,['requestId','attemptId','digest','ackDigest','status']);
  if(!proof||proof.status!=='durable'||proof.requestId!==request||
     proof.attemptId!==attempt||proof.digest!==digest||
     typeof proof.ackDigest!=='string'||!hex.test(proof.ackDigest))return result('denied');
  try{
   const out=(await query(ackSql,[request,attempt,digest,proof.ackDigest]))?.rows?.[0]?.r;
   const committed=snapshotFields(out,['status']);
   return committed?.status==='acknowledgement-recorded'?
    result('acknowledgement-recorded'):result('uncertain');
  }catch(error){
   if(error?.message==='private_denied')return result('denied');
   if(error?.message==='private_conflict')return result('conflict');
   if(error?.message==='private_invalid')return result('invalid');
   return result('uncertain');
  }
 },
 async recover(value){
  // Recovery is internal to the trusted confirmer and returns no attempt ID.
  // It never creates or replays a dispatch. Lost commit responses cannot
  // force a new one-shot attempt.
  const captured=snapshotFields(value,['requestId','digest']);
  if(!captured||typeof captured.requestId!=='string'||
     typeof captured.digest!=='string'||!uuid.test(captured.requestId)||
     !hex.test(captured.digest))return result('invalid');
  const request=captured.requestId.toLowerCase(),digest=captured.digest;
  let found;
  try{found=(await query(lookupSql,[request,digest]))?.rows?.[0]?.r;}
  catch(error){
   if(error?.message==='private_denied')return result('denied');
   if(error?.message==='private_invalid')return result('invalid');
   return result('uncertain');
  }
  if(snapshotFields(found,['status'])?.status==='no-intent')return result('reconciliation-required');
  const intent=snapshotFields(found,['status','attemptId','state']);
  if(!intent||intent.status!=='intent-found'||typeof intent.attemptId!=='string'||
     !uuid.test(intent.attemptId)||
     !['intent','uncertain','acknowledged'].includes(intent.state))return result('uncertain');
  return api.reconcile({requestId:request,attemptId:intent.attemptId.toLowerCase(),digest});
 }
 };
 return Object.freeze(api);
}
