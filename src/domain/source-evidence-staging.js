import {canonicalize,digestCanonical} from './canonical-integrity.js';
import {digestSourceRowPackage} from './source-row-evidence.js';

const fail=()=>{throw new TypeError('source_evidence_staging_invalid');};
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const bindingKeys=['requestId','actorId','packageId','packageVersion','packageDigest','requestFingerprint'];
function exact(v,keys){
 if(!v||typeof v!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail();
 const own=Reflect.ownKeys(v);if(own.length!==keys.length||own.some(k=>typeof k!=='string'||!keys.includes(k)))fail();
 for(const k of own){const d=Object.getOwnPropertyDescriptor(v,k);if(!d.enumerable||!Object.hasOwn(d,'value'))fail();}
}
function ordinaryTree(v,seen=new Set()){
 if(!v||typeof v!=='object')return;
 if(seen.has(v))fail();seen.add(v);
 if(Array.isArray(v)){
  if(Object.getPrototypeOf(v)!==Array.prototype||Reflect.ownKeys(v).length!==v.length+1)fail();
  for(let i=0;i<v.length;i++){
   const d=Object.getOwnPropertyDescriptor(v,String(i));
   if(!d?.enumerable||!Object.hasOwn(d,'value'))fail();ordinaryTree(d.value,seen);
  }
 }else{
  if(![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail();
  for(const k of Reflect.ownKeys(v)){
   const d=Object.getOwnPropertyDescriptor(v,k);
   if(typeof k!=='string'||!d.enumerable||!Object.hasOwn(d,'value'))fail();ordinaryTree(d.value,seen);
  }
 }
 seen.delete(v);
}
function binding(v){
 exact(v,bindingKeys);
 if(!uuid(v.requestId)||!uuid(v.actorId)||!uuid(v.packageId)||!Number.isSafeInteger(v.packageVersion)||v.packageVersion<1||v.packageVersion>1000000||!hex(v.packageDigest)||!hex(v.requestFingerprint))fail();
 return JSON.parse(canonicalize(v));
}
// Offline binding only: actorId is data, never proof of authenticated authority.
export async function prepareSourceEvidenceStagingRequest(candidate,actorId,options){
 exact(candidate,['requestId','packageId','packageVersion','expectedPackageDigest','cases']);
 if(!uuid(candidate.requestId)||!uuid(actorId)||!hex(candidate.expectedPackageDigest))fail();
 ordinaryTree(candidate);
 const serialized=canonicalize(candidate);
 if(new TextEncoder().encode(serialized).byteLength>16*1024*1024)fail();
 const c=JSON.parse(serialized);
 const p=await digestSourceRowPackage({packageId:c.packageId,packageVersion:c.packageVersion,cases:c.cases},options);
 if(p.packageDigest!==c.expectedPackageDigest)fail();
 c.cases.sort((a,b)=>a.caseId<b.caseId?-1:a.caseId>b.caseId?1:0);
 const claimsDigest=(await digestCanonical(c.cases,options)).digestHex;
 const requestFingerprint=(await digestCanonical({contractId:'source-evidence-stage-request-v1',actorId,requestId:c.requestId,packageId:c.packageId,packageVersion:c.packageVersion,expectedPackageDigest:c.expectedPackageDigest,claimsDigest},options)).digestHex;
 return Object.freeze({requestId:c.requestId,actorId,packageId:c.packageId,packageVersion:c.packageVersion,packageDigest:p.packageDigest,requestFingerprint});
}
// Checks shape, bindings and checksum; does not establish receipt origin or durability.
export async function matchesSourceEvidenceStagingReceipt(receipt,expectedBinding,options){
 try{
  const b=binding(expectedBinding);
  exact(receipt,['contractId','receiptId',...bindingKeys,'recordedAt','sourceReviewOnly','clinicalApproved','rightsApproved','examScopeApproved','learnerRelease','receiptDigest']);
  ordinaryTree(receipt);
  const r=JSON.parse(canonicalize(receipt));
  if(r.contractId!=='source-evidence-staging-receipt-v1'||!uuid(r.receiptId)||!hex(r.receiptDigest)||
   typeof r.recordedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(r.recordedAt)||!Number.isFinite(Date.parse(r.recordedAt))||new Date(r.recordedAt).toISOString()!==r.recordedAt||
   r.sourceReviewOnly!==true||['clinicalApproved','rightsApproved','examScopeApproved','learnerRelease'].some(k=>r[k]!==false)||bindingKeys.some(k=>r[k]!==b[k]))return false;
  const {receiptDigest,...payload}=r;
  return (await digestCanonical(payload,options)).digestHex===receiptDigest;
 }catch{return false;}
}
