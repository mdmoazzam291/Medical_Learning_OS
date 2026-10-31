import assert from 'node:assert/strict';
import {digestSourceRowPackage} from '../../src/domain/source-row-evidence.js';
import {prepareSourceEvidenceStagingRequest,matchesSourceEvidenceStagingReceipt} from '../../src/domain/source-evidence-staging.js';
export const owner='11111111-1111-4111-8111-111111111111';
const alternate='22222222-2222-4222-8222-222222222222';
export const stagingScenarios=['retry','request-conflict','revision-conflict','atomic-failure','lost-response','readback-unavailable','readback-tampered','concurrent-retry','concurrent-conflict','authority-recheck'];
async function candidate(){
 const c={requestId:owner,packageId:owner,packageVersion:1,cases:[{caseId:'synthetic-case',caseVersion:1,sourceSha256:'a'.repeat(64),sourceEdition:'synthetic-2026',appearance:{pdfPage:1,rowOrdinal:1,rotation:0,bboxMilliPoints:[0,0,1,1],rawCellSha256:'b'.repeat(64)},interpretation:{proposedIdentity:null,relation:'unresolved',rationaleSha256:'c'.repeat(64)}}]};
 c.expectedPackageDigest=(await digestSourceRowPackage({packageId:c.packageId,packageVersion:c.packageVersion,cases:c.cases})).packageDigest;return c;
}
async function changed(c){const d=structuredClone(c);d.cases[0].caseVersion++;d.expectedPackageDigest=(await digestSourceRowPackage({packageId:d.packageId,packageVersion:d.packageVersion,cases:d.cases})).packageDigest;return d;}
async function accepted(result,c){
 assert.equal(result.status,'accepted');assert.equal(await matchesSourceEvidenceStagingReceipt(result.receipt,await prepareSourceEvidenceStagingRequest(c,owner)),true);
}
async function verifyStored(s){
 for(const revision of s.revisions){
  const c=revision.candidate;let p;
  await assert.doesNotReject(async()=>{p=await digestSourceRowPackage({packageId:c.packageId,packageVersion:c.packageVersion,cases:c.cases});});
  assert.equal(p.packageId,revision.binding.packageId);assert.equal(p.packageVersion,revision.binding.packageVersion);assert.equal(p.packageDigest,revision.binding.packageDigest);assert.equal(p.packageDigest,c.expectedPackageDigest);
 }
 for(const request of s.requests){
  const b=request.binding,r=s.revisions.find(x=>x.binding.packageId===b.packageId&&x.binding.packageVersion===b.packageVersion);
  assert.ok(r,'request references stored revision');let computed;
  await assert.doesNotReject(async()=>{computed=await prepareSourceEvidenceStagingRequest({...r.candidate,requestId:b.requestId},b.actorId);});
  assert.deepEqual(computed,b);assert.equal(await matchesSourceEvidenceStagingReceipt(request.receipt,b),true);
 }
}
function counts(s,n){assert.equal(s.revisions.length,n);assert.equal(s.requests.length,n);assert.equal(s.events.length,n);}
export async function runStagingScenario(name,createDriver){
 assert.ok(stagingScenarios.includes(name),'known scenario');
 const d=await createDriver();
 try{
 const c=await candidate();
 if(name==='retry'){
  const a=await d.stageMetadata(c,owner);await accepted(a,c);const before=await d.inspect();
  const b=await d.stageMetadata(structuredClone(c),owner);await accepted(b,c);assert.deepEqual(b,a);assert.deepEqual(await d.inspect(),before);counts(before,1);
 }else if(name==='request-conflict'||name==='revision-conflict'){
  await accepted(await d.stageMetadata(c,owner),c);const before=await d.inspect(),v=await changed(c);
  if(name==='revision-conflict')v.requestId=alternate;
  assert.equal((await d.stageMetadata(v,owner)).status,'conflict');assert.deepEqual(await d.inspect(),before);
 }else if(name==='atomic-failure'){
  d.inject('before-commit');assert.equal((await d.stageMetadata(c,owner)).status,'aborted');counts(await d.inspect(),0);
  await accepted(await d.stageMetadata(c,owner),c);counts(await d.inspect(),1);
 }else if(['lost-response','readback-unavailable','readback-tampered'].includes(name)){
  d.inject(name==='lost-response'?'after-commit':name);
  const a=await d.stageMetadata(c,owner);assert.equal(a.status,name==='readback-tampered'?'integrity-failure':'uncertain');assert.equal(Object.hasOwn(a,'receipt'),false);
  const s=await d.inspect();counts(s,1);
  const b=await d.stageMetadata(c,owner);await accepted(b,c);assert.deepEqual(b.receipt,s.requests[0].receipt);assert.deepEqual(await d.inspect(),s);
 }else if(name==='concurrent-retry'){
  const r=await Promise.all(Array.from({length:4},()=>d.stageMetadata(structuredClone(c),owner)));
  for(const x of r){await accepted(x,c);assert.deepEqual(x,r[0]);}counts(await d.inspect(),1);
 }else if(name==='concurrent-conflict'){
  const v=await changed(c),r=await Promise.all([d.stageMetadata(c,owner),d.stageMetadata(v,owner)]);
  assert.deepEqual(r.map(x=>x.status).sort(),['accepted','conflict']);const winner=r[0].status==='accepted'?c:v;await accepted(r.find(x=>x.status==='accepted'),winner);counts(await d.inspect(),1);
 }else{
  await accepted(await d.stageMetadata(c,owner),c);const before=await d.inspect();d.deny();
  const r=await d.stageMetadata(c,owner);assert.equal(r.status,'denied');assert.equal(Object.hasOwn(r,'receipt'),false);assert.deepEqual(await d.inspect(),before);
 }
 await verifyStored(await d.inspect());
 }finally{await d.close();}
}
