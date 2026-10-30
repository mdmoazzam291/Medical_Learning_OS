// Test-only disposable SQL driver. Never accepts a hosted database or URL.
import {readFile} from 'node:fs/promises';
import {canonicalize,digestCanonical} from '../../src/domain/canonical-integrity.js';
import {captureSourceRowPackage,digestSourceRowPackage} from '../../src/domain/source-row-evidence.js';
import {prepareSourceEvidenceStagingRequest,matchesSourceEvidenceStagingReceipt} from '../../src/domain/source-evidence-staging.js';
const owner='11111111-1111-4111-8111-111111111111';
function capture(candidate){
 const keys=['requestId','packageId','packageVersion','expectedPackageDigest','cases'];
 if(!candidate||![Object.prototype,null].includes(Object.getPrototypeOf(candidate))||Reflect.ownKeys(candidate).length!==keys.length)throw new TypeError('invalid');
 const c={};for(const k of keys){const d=Object.getOwnPropertyDescriptor(candidate,k);if(!d?.enumerable||!Object.hasOwn(d,'value'))throw new TypeError('invalid');c[k]=d.value;}
 const p=captureSourceRowPackage({packageId:c.packageId,packageVersion:c.packageVersion,cases:c.cases});
 return {...p,requestId:c.requestId,expectedPackageDigest:c.expectedPackageDigest};
}
export async function createSourceEvidenceSqlDriver({PGlite}){
 const db=new PGlite();let queue=Promise.resolve(),fault=null,closed=false,closing=null;
 const schedule=fn=>{const task=queue.then(fn);queue=task.catch(()=>{});return task;};
 try{
  await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
  for(const file of ['schema.sql','digests.sql'])await db.exec(await readFile(new URL(`../../ops/prototypes/source-evidence/${file}`,import.meta.url),'utf8'));
  await db.query('select evidence_probe.set_authority($1,true)',[owner]);
  await db.query('select evidence_probe.set_source_policy($1,$2,true)',['a'.repeat(64),'synthetic-2026']);
  await db.exec('set role service_role');
 }catch(error){await db.close();throw error;}
 return {
  async stageMetadata(candidate,actorId){
   if(closed)throw new Error('driver closed');
   let c;
   try{c=capture(candidate);}catch{return {status:'invalid'};}
   return schedule(async()=>{
    let b,p,manifestText;
    try{
     b=await prepareSourceEvidenceStagingRequest(c,actorId);
     p={packageId:c.packageId,packageVersion:c.packageVersion,cases:c.cases};
     const {packageDigest,...manifest}=await digestSourceRowPackage(p);
     manifestText=canonicalize({contractId:'source-row-package-evidence-v1',...manifest});
    }catch{return {status:'invalid'};}
    const injected=fault;fault=null;
    const payload={contractId:'source-evidence-staging-receipt-v1',receiptId:crypto.randomUUID(),...b,recordedAt:new Date().toISOString(),sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,examScopeApproved:false,learnerRelease:false};
    const receipt={...payload,receiptDigest:(await digestCanonical(payload)).digestHex};
    try{
     const committed=(await db.query('select evidence_probe.stage($1,$2,$3,$4,$5,$6,$7) result',[actorId,canonicalize(p),manifestText,b,canonicalize(payload),canonicalize(receipt),injected==='before-commit'?'after-cases':null])).rows[0].result;
     if(committed.status!=='committed')return {status:'uncertain'};
    }catch(error){
     if(error.message==='evidence_conflict')return {status:'conflict'};
     if(error.message==='evidence_denied')return {status:'denied'};
     if(error.message==='injected_failure'&&injected==='before-commit')return {status:'aborted'};
     if(error.message==='evidence_invalid')return {status:'integrity-failure'};
     return {status:'uncertain'};
    }
    // Deliberate delivery faults after actual SQL commit; no accepted receipt escapes.
    if(['after-commit','readback-unavailable'].includes(injected))return {status:'uncertain'};
    let stored;
    try{
     stored=(await db.query('select evidence_probe.readback($1,$2,$3,$4,$5) result',[actorId,b.packageId,b.packageVersion,b.packageDigest,b.requestId])).rows[0].result;
    }catch(error){return {status:error.message==='evidence_denied'?'denied':error.message==='evidence_invalid'?'integrity-failure':'uncertain'};}
    try{
     if(injected==='readback-tampered'){
      const corrupt=JSON.parse(stored.candidate);corrupt.cases[0].caseVersion++;stored.candidate=canonicalize(corrupt);
     }
     const saved=captureSourceRowPackage(JSON.parse(stored.candidate)),manifest=await digestSourceRowPackage(saved);
     const savedReceipt=JSON.parse(stored.receipt);
     if(manifest.packageId!==b.packageId||manifest.packageVersion!==b.packageVersion||manifest.packageDigest!==b.packageDigest||stored.manifest!==manifestText||!await matchesSourceEvidenceStagingReceipt(savedReceipt,b))return {status:'integrity-failure'};
     return {status:'accepted',receipt:savedReceipt};
    }catch{return {status:'integrity-failure'};}
   });
  },
  inspect(){return schedule(async()=>{
   const requests=(await db.query('select actor::text,request_id::text,fingerprint,package_id::text,version,digest,receipt from evidence_probe.requests order by actor,request_id')).rows;
   const revisions=(await db.query('select package_id::text,version,digest,owner::text,candidate from evidence_probe.revisions order by package_id,version')).rows;
   const events=(await db.query('select id::text,actor::text,request_id::text from evidence_probe.events order by id')).rows;
   const requestRecords=requests.map(r=>({binding:{actorId:r.actor,requestId:r.request_id,packageId:r.package_id,packageVersion:r.version,packageDigest:r.digest,requestFingerprint:r.fingerprint},receipt:JSON.parse(r.receipt)}));
   return {requests:requestRecords,revisions:revisions.map(r=>{
    const p=JSON.parse(r.candidate),request=requestRecords.find(q=>q.binding.packageId===r.package_id&&q.binding.packageVersion===r.version);
    if(!request)throw new Error('stored revision lacks request');
    return {binding:{...request.binding,packageId:r.package_id,packageVersion:r.version,packageDigest:r.digest},candidate:{...p,requestId:request.binding.requestId,expectedPackageDigest:r.digest}};
   }),events};
  });},
  inject(point){
   if(!['before-commit','after-commit','readback-unavailable','readback-tampered'].includes(point))throw new TypeError('unknown fault');fault=point;
  },
  deny(){return schedule(async()=>{
   await db.exec('reset role');
   try{await db.query('select evidence_probe.set_authority($1,false)',[owner]);}finally{await db.exec('set role service_role');}
  });},
  close(){if(!closing){closed=true;closing=queue.then(()=>db.close());}return closing;}
 };
}
