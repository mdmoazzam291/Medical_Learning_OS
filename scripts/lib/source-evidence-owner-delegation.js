// Offline prototype only. Trusted callbacks must verify tokens and use the narrow DB role.
import {canonicalize,digestCanonical} from '../../src/domain/canonical-integrity.js';
import {captureSourceRowPackage,digestSourceRowPackage} from '../../src/domain/source-row-evidence.js';
import {prepareSourceEvidenceStagingRequest,matchesSourceEvidenceStagingReceipt} from '../../src/domain/source-evidence-staging.js';
const maxBytes=16*1024*1024,uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const status=s=>Object.freeze({status:s});
function exact(v,keys){
 if(!v||typeof v!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(v)))throw Error('invalid');
 const own=Reflect.ownKeys(v);if(own.length!==keys.length||own.some(k=>!keys.includes(k)))throw Error('invalid');
 for(const k of own){const d=Object.getOwnPropertyDescriptor(v,k);if(!d.enumerable||!Object.hasOwn(d,'value'))throw Error('invalid');}
}
function bounded(s){if(typeof s!=='string'||new TextEncoder().encode(s).byteLength>maxBytes)throw Error('invalid');return s;}
function captureCandidate(c){
 exact(c,['requestId','packageId','packageVersion','expectedPackageDigest','cases']);
 if(!uuid(c.requestId)||typeof c.expectedPackageDigest!=='string'||!/^[a-f0-9]{64}$/.test(c.expectedPackageDigest))throw Error('invalid');
 const p=captureSourceRowPackage({packageId:c.packageId,packageVersion:c.packageVersion,cases:c.cases});
 return JSON.parse(bounded(canonicalize({...p,requestId:c.requestId,expectedPackageDigest:c.expectedPackageDigest})));
}
function captureTarget(t){
 exact(t,['packageId','packageVersion','packageDigest','requestId']);
 if(!uuid(t.packageId)||!uuid(t.requestId)||!Number.isSafeInteger(t.packageVersion)||t.packageVersion<1||t.packageVersion>1000000||typeof t.packageDigest!=='string'||!/^[a-f0-9]{64}$/.test(t.packageDigest))throw Error('invalid');
 return {...t};
}
function captureInput(input,key){
 exact(input,['accessToken',key]);
 if(typeof input.accessToken!=='string'||input.accessToken.length>16384||!input.accessToken)throw Error('invalid');
 return {token:input.accessToken,value:key==='candidate'?captureCandidate(input[key]):captureTarget(input[key])};
}
function dbFailure(error){
 if(['evidence_denied','evidence_platform_denied'].includes(error?.message))return status('denied');
 if(error?.message==='evidence_conflict')return status('conflict');
 if(error?.message==='evidence_invalid')return status('integrity-failure');
 return status('uncertain');
}
export function createSourceEvidenceOwnerDelegation({verifyUser,query}){
 if(typeof verifyUser!=='function'||typeof query!=='function')throw new TypeError('source_evidence_delegation_configuration_invalid');
 async function identity(token){
  try{
   // Authentication always precedes claim decoding. No context/verified flag is accepted.
   const user=await verifyUser(token);if(!uuid(user?.id))return null;const actor=user.id.toLowerCase();
   const parts=token.split('.');if(parts.length!==3||parts.some(p=>!p||!/^[A-Za-z0-9_-]+$/.test(p)))return null;
   const b64=parts[1].replace(/-/g,'+').replace(/_/g,'/'),bytes=Uint8Array.from(atob(b64.padEnd(Math.ceil(b64.length/4)*4,'=')),c=>c.charCodeAt(0));
   const claim=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
   if(!uuid(claim?.sub)||claim.sub.toLowerCase()!==actor||typeof claim.session_id!=='string'||!(/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(claim.session_id)))return null;
   return {actor,session:claim.session_id.toLowerCase()};
  }catch{return null;}
 }
 async function readVerified(id,t,expected){
  let stored;
  try{stored=(await query('select evidence_probe.readback_session($1,$2,$3,$4,$5,$6) r',[id.actor,id.session,t.packageId,t.packageVersion,t.packageDigest,t.requestId])).rows?.[0]?.r;}
  catch(error){return dbFailure(error);}
  try{
   exact(stored,['candidate','manifest','receipt']);
   const raw=bounded(stored.candidate),p=captureSourceRowPackage(JSON.parse(raw));if(canonicalize(p)!==raw)throw Error('invalid');
   const m=await digestSourceRowPackage(p),{packageDigest,...manifest}=m;
   if(m.packageId!==t.packageId||m.packageVersion!==t.packageVersion||packageDigest!==t.packageDigest||bounded(stored.manifest)!==canonicalize({contractId:'source-row-package-evidence-v1',...manifest}))throw Error('invalid');
   const b=await prepareSourceEvidenceStagingRequest({...p,requestId:t.requestId,expectedPackageDigest:t.packageDigest},id.actor);
   if(expected&&canonicalize(b)!==canonicalize(expected))throw Error('invalid');
   const receipt=JSON.parse(bounded(stored.receipt));
   if(canonicalize(receipt)!==stored.receipt||!await matchesSourceEvidenceStagingReceipt(receipt,b))throw Error('invalid');
   return Object.freeze({status:'available',receipt:Object.freeze(receipt)});
  }catch{return status('integrity-failure');}
 }
 return Object.freeze({
  async stage(input){
   let c,token;try{const captured=captureInput(input,'candidate');c=captured.value;token=captured.token;}catch{return status('invalid');}
   const id=await identity(token);if(!id)return status('denied');
   let b,p,manifestText,payload,receipt;
   try{
    b=await prepareSourceEvidenceStagingRequest(c,id.actor);p={packageId:c.packageId,packageVersion:c.packageVersion,cases:c.cases};
    const {packageDigest,...manifest}=await digestSourceRowPackage(p);manifestText=canonicalize({contractId:'source-row-package-evidence-v1',...manifest});
    payload={contractId:'source-evidence-staging-receipt-v1',receiptId:crypto.randomUUID(),...b,recordedAt:new Date().toISOString(),sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,examScopeApproved:false,learnerRelease:false};
    receipt={...payload,receiptDigest:(await digestCanonical(payload)).digestHex};
   }catch{return status('invalid');}
   try{
    const committed=(await query('select evidence_probe.stage_session($1,$2,$3,$4,$5,$6,$7) r',[id.actor,id.session,canonicalize(p),manifestText,b,canonicalize(payload),canonicalize(receipt)])).rows?.[0]?.r;
    if(committed?.status!=='committed')return status('uncertain');
   }catch(error){return dbFailure(error);}
   const current=await identity(token);if(!current||current.actor!==id.actor||current.session!==id.session)return status('denied');
   const result=await readVerified(current,b,b);
   return result.status==='available'?Object.freeze({status:'accepted',receipt:result.receipt}):result;
  },
  async readback(input){
   let t,token;try{const captured=captureInput(input,'target');t=captured.value;token=captured.token;}catch{return status('invalid');}
   const id=await identity(token);if(!id)return status('denied');return readVerified(id,t);
  }
 });
}
