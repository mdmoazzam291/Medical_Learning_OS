// Test-only executable model. Memory is not durable storage or authenticated authority.
import {randomUUID} from 'node:crypto';
import {digestCanonical} from '../../src/domain/canonical-integrity.js';
import {prepareSourceEvidenceStagingRequest,matchesSourceEvidenceStagingReceipt} from '../../src/domain/source-evidence-staging.js';

export function createStagingModel({mutation}={}){
 let state={revisions:[],requests:[],events:[]},fault=null,denied=false,queue=Promise.resolve();
 async function makeReceipt(b){
  const r={contractId:'source-evidence-staging-receipt-v1',receiptId:randomUUID(),...b,recordedAt:new Date().toISOString(),sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,examScopeApproved:false,learnerRelease:false};
  return {...r,receiptDigest:(await digestCanonical(r)).digestHex};
 }
 async function execute(c,b){
  if(denied&&mutation!=='ignore-denial')return {status:'denied'};
  const f=fault;fault=null;
  const request=state.requests.find(x=>x.binding.actorId===b.actorId&&x.binding.requestId===b.requestId);
  if(request&&request.binding.requestFingerprint!==b.requestFingerprint)return {status:'conflict'};
  const revision=state.revisions.find(x=>x.binding.packageId===b.packageId&&x.binding.packageVersion===b.packageVersion);
  if(revision&&revision.binding.packageDigest!==b.packageDigest)return {status:'conflict'};
  if(f==='before-commit'){
   if(mutation==='partial-write')state.revisions.push({binding:b,candidate:c});
   return {status:'aborted'};
  }
  let stored=request;
  if(!stored){
   const next=structuredClone(state);stored={binding:b,receipt:await makeReceipt(b)};
   if(!revision)next.revisions.push({binding:b,candidate:c});
   next.requests.push(stored);next.events.push({type:'metadata-staged',requestId:b.requestId,actorId:b.actorId});
   state=next;
  }else if(mutation==='duplicate-retry'){
   stored={...stored,receipt:await makeReceipt(b)};state.requests.push(stored);
  }
  if(f==='after-commit'&&mutation!=='accept-uncertain')return {status:'uncertain'};
  if(f==='readback-unavailable')return {status:'uncertain'};
  // Read a distinct snapshot; injected corruption is in readback, not permanent storage.
  const read=structuredClone(state),rr=read.revisions.find(x=>x.binding.packageId===b.packageId&&x.binding.packageVersion===b.packageVersion);
  if(f==='readback-tampered')rr.candidate.cases[0].caseVersion++;
  if(mutation!=='accept-tampered'){
   try{
    const checked=await prepareSourceEvidenceStagingRequest(rr.candidate,b.actorId);
    if(checked.packageDigest!==b.packageDigest||!await matchesSourceEvidenceStagingReceipt(stored.receipt,b))return {status:'integrity-failure'};
   }catch{return {status:'integrity-failure'};}
  }
  return {status:'accepted',receipt:structuredClone(stored.receipt)};
 }
 return {
  async stageMetadata(candidate,actorId){
   const c=structuredClone(candidate),b=await prepareSourceEvidenceStagingRequest(c,actorId);
   const task=queue.then(()=>execute(c,b));queue=task.catch(()=>{});return task;
  },
  async inspect(){await queue;return structuredClone(state);},
  inject(point){fault=point;},deny(){denied=true;},async close(){await queue;}
 };
}
