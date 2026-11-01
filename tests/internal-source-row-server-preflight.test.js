import test from 'node:test';
import assert from 'node:assert/strict';
import {digestSourceRowPackage} from '../src/domain/source-row-evidence.js';
import {createInternalSourceRowServerPreflight} from '../src/domain/internal-source-row-server-preflight.js';

const owner='11111111-1111-4111-8111-111111111111';
const reviewer='22222222-2222-4222-8222-222222222222';
const unrelated='33333333-3333-4333-8333-333333333333';
const token='mock-auth-token-from-verified-provider';
const hex=c=>c.repeat(64);
async function fixture(){
 const packageCandidate={packageId:owner,packageVersion:1,cases:[{
  caseId:'case-a',caseVersion:1,sourceSha256:hex('a'),sourceEdition:'source-A',
  appearance:{pdfPage:4,rowOrdinal:2,rotation:0,
   bboxMilliPoints:[0,0,100,100],rawCellSha256:hex('b')},
  interpretation:{proposedIdentity:null,relation:'unresolved',rationaleSha256:hex('c')}
 }]};
 const manifest=await digestSourceRowPackage(packageCandidate),caseEntry=manifest.cases[0];
 const request={
  requestId:unrelated,targetType:'source-row-case',packageId:owner,
  packageVersion:1,packageDigest:manifest.packageDigest,
  caseId:caseEntry.caseId,caseVersion:1,caseDigest:caseEntry.caseDigest,
  sourceSha256:caseEntry.sourceSha256,
  appearanceEvidenceDigest:caseEntry.appearanceEvidenceDigest,
  disposition:'retain-unresolved',
  rationale:'The exact source row identification needs additional independent review.',
  attestationVersion:'source-row-review-v1'
 };
 const context={actorId:reviewer,reviewAllowed:true,evidenceAccess:{
  actorId:reviewer,authenticated:true,contentOwnerId:owner,
  packageAuthorId:owner,runtimeAllowed:true,
  currentPackage:{packageId:owner,packageVersion:1,packageDigest:manifest.packageDigest,status:'staged'},
  rights:{metadataAllowed:true,sourceRetentionAllowed:false,sourceDisplayAllowed:false},
  source:{expectedSha256:hex('a'),actualSha256:null,bytesVerified:false},
  grant:{targetType:'source-row-package',reviewerId:reviewer,packageId:owner,
   packageVersion:1,packageDigest:manifest.packageDigest,active:true,revoked:false,
   consentVerified:true,qualificationVerified:true,independenceVerified:true}
 },caseGrant:{
  grantEventId:unrelated,targetType:'source-row-case',reviewerId:reviewer,
  packageId:owner,packageVersion:1,packageDigest:manifest.packageDigest,
  caseId:'case-a',caseVersion:1,caseDigest:caseEntry.caseDigest,
  appearanceEvidenceDigest:caseEntry.appearanceEvidenceDigest,
  sourceSha256:caseEntry.sourceSha256,active:true,revoked:false,
  consentVerified:true,qualificationVerified:true,independenceVerified:true
 }};
 return {request,records:{packageCandidate,expectedDigest:manifest.packageDigest,context}};
}
function harness(records,{authenticate=async()=>({data:{user:{id:reviewer}},error:null}),
 checkRuntime=async()=>({allowed:true}),load=async()=>structuredClone(records)}={}){
 const steps=[];
 const verify=createInternalSourceRowServerPreflight({
  auth:{async getUser(value){steps.push('getUser');return authenticate(value);}},
  async checkRuntimeAccess(value,id){steps.push('runtime');return checkRuntime(value,id);},
  async loadCurrentEvidence(id,q){steps.push('load');return load(id,q);}
 });
 return {steps,verify};
}
test('verified session and exact independent reviewer grants allow preflight without deciding',async()=>{
 const {request,records}=await fixture();
 const h=harness(records);
 const response=await h.verify(token,request);
 assert.deepEqual(h.steps,['getUser','runtime','load']);
 assert.equal(response.eligible,true);
 assert.equal(response.reviewerId,reviewer);
 assert.equal(response.sessionChecked,true);
 assert.equal(response.reviewerAuthenticated,true);
 assert.equal(response.reviewerGrantVerified,false);
 assert.equal(response.decisionRecorded,false);
 for(const flag of ['clinicalApproved','rightsApproved','examScopeApproved','learnerRelease'])
  assert.equal(response[flag],false);
 assert.equal(Object.isFrozen(response),true);
 assert.equal(JSON.stringify(response).includes(token),false);
});
test('deny before privileged evidence read when auth, session or token is invalid',async()=>{
 const {request,records}=await fixture();
 const failures=[
  {authenticate:async()=>({data:{user:null},error:{message:'not verified'}}),order:['getUser']},
  {authenticate:async()=>{throw Error('provider unavailable');},order:['getUser']},
  {authenticate:async()=>({data:{user:{id:'not-a-uuid'}},error:null}),order:['getUser']},
  {checkRuntime:async()=>({allowed:false,reason:'session_revoked'}),order:['getUser','runtime']},
  {checkRuntime:async()=>({allowed:true,reason:'account_suspended'}),order:['getUser','runtime']},
  {checkRuntime:async()=>{throw Error('database unavailable');},order:['getUser','runtime']}
 ];
 for(const x of failures){
  const h=harness(records,x),answer=await h.verify(token,request);
  assert.equal(answer.eligible,false);
  assert.equal(answer.decisionRecorded,false);
  assert.deepEqual(h.steps,x.order);
 }
 const h=harness(records);
 assert.equal((await h.verify('bad',request)).eligible,false);
 assert.deepEqual(h.steps,[]);
});
test('invalid request never triggers authentication, runtime or privileged evidence reads',async()=>{
 const {request,records}=await fixture(),h=harness(records);
 for(const modified of [{...request,reviewerId:reviewer},
  {...request,rationale:'\u200b'.repeat(100)},
  {...request,learnerRelease:true}]){
  const answer=await h.verify(token,modified);
  assert.equal(answer.eligible,false);
 }
 assert.deepEqual(h.steps,[]);
});
test('reject authenticated principal mismatch even if loaded grants look valid',async()=>{
 const {request,records}=await fixture();
 const h=harness(records,{authenticate:async()=>({data:{user:{id:unrelated}},error:null})});
 const answer=await h.verify(token,request);
 assert.equal(answer.eligible,false);
 assert.deepEqual(h.steps,['getUser','runtime','load']);
});
test('reject revoked grants, withdrawn source, stale digests and unavailable evidence',async()=>{
 const {request,records}=await fixture();
 const mutators=[
  c=>{c.context.caseGrant.revoked=true;},
  c=>{c.context.evidenceAccess.grant.active=false;},
  c=>{c.context.evidenceAccess.rights.metadataAllowed=false;},
  c=>{c.context.evidenceAccess.currentPackage.status='withdrawn';},
  c=>{c.expectedDigest=hex('f');},
  c=>{c.context.evidenceAccess.source.expectedSha256=hex('f');}
 ];
 for(const change of mutators){
  const altered=structuredClone(records);change(altered);
  const h=harness(altered),response=await h.verify(token,request);
  assert.equal(response.eligible,false);
  assert.equal(response.decisionRecorded,false);
  assert.equal(response.learnerRelease,false);
 }
 for(const bad of [null,{}, {...records,attested:true}]){
  const h=harness(records,{load:async()=>bad});
  assert.equal((await h.verify(token,request)).eligible,false);
 }
});
test('request is captured before asynchronous authentication and cannot be substituted',async()=>{
 const {request,records}=await fixture();
 let release;
 const gate=new Promise(done=>{release=done;});
 const h=harness(records,{authenticate:async()=>{
  await gate;
  return {data:{user:{id:reviewer}},error:null};
 }});
 const attempt=h.verify(token,request);
 request.caseDigest=hex('d');
 request.disposition='accept-proposed-interpretation';
 release();
 assert.equal((await attempt).eligible,true);
});
test('privileged loader receives only verified identity and exact validated request',async()=>{
 const {request,records}=await fixture();
 const h=harness(records,{load:async(id,q)=>{
  assert.equal(id,reviewer);assert.equal(q.requestId,request.requestId);
  assert.equal(Object.isFrozen(q),true);
  assert.equal('reviewerId' in q,false);
  return structuredClone(records);
 }});
 assert.equal((await h.verify(token,request)).eligible,true);
});
test('injection of dependencies or exotic current evidence is rejected without authority',async()=>{
 assert.throws(()=>createInternalSourceRowServerPreflight({auth:{},checkRuntimeAccess:()=>true}),
  /internal_review_server_dependencies_invalid/);
 const {request,records}=await fixture();
 const evil=Object.defineProperty({...records},'context',{
  enumerable:true,get(){throw Error('unexpected loader accessor');}
 });
 const h=harness(records,{load:async()=>evil});
 assert.equal((await h.verify(token,request)).eligible,false);
});
