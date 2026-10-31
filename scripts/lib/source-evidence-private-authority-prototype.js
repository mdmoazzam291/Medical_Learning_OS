// Offline/private MLOS-owned authority experiment; not connected to live API.
// No cached token acceptance and no claim of immediate Supabase revocation.
import {createSourceEvidenceVerifiedUser} from './source-evidence-private-boundary.js';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const hex=/^[a-f0-9]{64}$/;
const stageSql='select evidence_private.stage($1,$2,$3,$4) as r';
const deliverSql='select evidence_private.deliver($1,$2,$3,$4) as r';
const result=status=>Object.freeze({status});
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
  const sql=kind==='stage'?stageSql:deliverSql;
  let r;
  try{
   r=(await query(sql,[id.actor,id.session,captured.request,captured.digest]))?.rows?.[0]?.r;
  }catch(error){
   if(error?.message==='private_denied')return result('denied');
   if(error?.message==='private_conflict')return result('conflict');
   if(error?.message==='private_invalid')return result('invalid');
   return result('uncertain');
  }
  if(r?.status!==(kind==='stage'?'staged':'delivered'))return result('uncertain');
  // A new provider verification before returning prevents replay of a cached
  // provider success. It does NOT make provider state atomic with SQL commit.
  const again=await identity(captured.token);
  if(!again||again.actor!==id.actor||again.session!==id.session)return result('denied');
  return result(kind==='stage'?'staged':'marked-delivered');
 }
 return Object.freeze({
  stage:input=>run('stage',input),
  markDelivered:input=>run('deliver',input)
 });
}
