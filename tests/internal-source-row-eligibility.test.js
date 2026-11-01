import test from 'node:test';
import assert from 'node:assert/strict';
import {digestSourceRowPackage} from '../src/domain/source-row-evidence.js';
import {assessInternalSourceRowReviewEligibility as assess} from '../src/domain/internal-source-row-eligibility.js';

const owner='11111111-1111-4111-8111-111111111111';
const reviewer='22222222-2222-4222-8222-222222222222';
const other='33333333-3333-4333-8333-333333333333';
const hex=s=>s.repeat(64);
async function fixture(){
 const source={packageId:owner,packageVersion:1,cases:[{
  caseId:'case-a',caseVersion:1,sourceSha256:hex('a'),sourceEdition:'source-A',
  appearance:{pdfPage:4,rowOrdinal:2,rotation:0,
   bboxMilliPoints:[0,0,100,100],rawCellSha256:hex('b')},
  interpretation:{proposedIdentity:null,relation:'unresolved',rationaleSha256:hex('c')}
 }]};
 const m=await digestSourceRowPackage(source);
 const c=m.cases[0],q={
  requestId:other,targetType:'source-row-case',packageId:owner,
  packageVersion:1,packageDigest:m.packageDigest,caseId:c.caseId,
  caseVersion:c.caseVersion,caseDigest:c.caseDigest,
  appearanceEvidenceDigest:c.appearanceEvidenceDigest,
  sourceSha256:c.sourceSha256,disposition:'retain-unresolved',
  rationale:'The primary source does not yet resolve the exact claim.',
  attestationVersion:'source-row-review-v1'
 };
 const context={actorId:reviewer,reviewAllowed:true,evidenceAccess:{
  actorId:reviewer,authenticated:true,contentOwnerId:owner,
  packageAuthorId:owner,runtimeAllowed:true,
  currentPackage:{packageId:owner,packageVersion:1,packageDigest:m.packageDigest,status:'staged'},
  rights:{metadataAllowed:true,sourceRetentionAllowed:false,sourceDisplayAllowed:false},
  source:{expectedSha256:hex('a'),actualSha256:null,bytesVerified:false},
  grant:{targetType:'source-row-package',reviewerId:reviewer,packageId:owner,
   packageVersion:1,packageDigest:m.packageDigest,active:true,revoked:false,
   consentVerified:true,qualificationVerified:true,independenceVerified:true}
 },caseGrant:{
  grantEventId:other,targetType:'source-row-case',reviewerId:reviewer,
  packageId:owner,packageVersion:1,packageDigest:m.packageDigest,
  caseId:c.caseId,caseVersion:1,caseDigest:c.caseDigest,
  appearanceEvidenceDigest:c.appearanceEvidenceDigest,sourceSha256:c.sourceSha256,
  active:true,revoked:false,consentVerified:true,
  qualificationVerified:true,independenceVerified:true
 }};
 return {source,digest:m.packageDigest,q,context};
}
const positive=()=>['clinicalApproved','rightsApproved','examScopeApproved','learnerRelease'];
test('exact scoped independent reviewer is eligible but never granted a decision or publication',async()=>{
 const {source,digest,q,context}=await fixture();
 const result=await assess(source,digest,q,context);
 assert.deepEqual(result,{
  eligible:true,reason:'candidate-only',decisionRecorded:false,
  sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,
  examScopeApproved:false,learnerRelease:false
 });
 assert.equal(Object.isFrozen(result),true);
 for(const field of positive())assert.equal(result[field],false);
});
test('reviewer independence, account identity and grant must all be current',async()=>{
 const {source,digest,q,context}=await fixture();
 const mutations=[
  c=>{c.actorId=owner;c.evidenceAccess.actorId=owner;c.caseGrant.reviewerId=owner;
   c.evidenceAccess.grant.reviewerId=owner;},
  c=>{c.actorId=other;},
  c=>{c.reviewAllowed=false;},
  c=>{c.evidenceAccess.authenticated=false;},
  c=>{c.evidenceAccess.runtimeAllowed=false;},
  c=>{c.evidenceAccess.currentPackage.status='withdrawn';},
  c=>{c.evidenceAccess.currentPackage.status='draft';},
  c=>{c.evidenceAccess.grant.active=false;},
  c=>{c.evidenceAccess.grant.revoked=true;},
  c=>{c.evidenceAccess.grant.qualificationVerified=false;},
  c=>{c.evidenceAccess.grant.independenceVerified=false;},
  c=>{c.evidenceAccess.grant.consentVerified=false;},
  c=>{c.evidenceAccess.rights.metadataAllowed=false;},
  c=>{c.evidenceAccess.grant.packageDigest=hex('d');},
  c=>{c.caseGrant.active=false;},
  c=>{c.caseGrant.revoked=true;},
  c=>{c.caseGrant.consentVerified=false;},
  c=>{c.caseGrant.qualificationVerified=false;},
  c=>{c.caseGrant.independenceVerified=false;},
  c=>{c.caseGrant.reviewerId=other;},
  c=>{c.caseGrant.grantEventId='not-a-uuid';},
  c=>{c.caseGrant.caseDigest=hex('e');},
  c=>{c.caseGrant.appearanceEvidenceDigest=hex('e');},
  c=>{c.caseGrant.sourceSha256=hex('e');},
  c=>{c.caseGrant.targetType='syllabus-baseline';}
 ];
 for(let i=0;i<mutations.length;i++){
  const c=structuredClone(context);mutations[i](c);
  const result=await assess(source,digest,q,c);
  assert.equal(result.eligible,false,'mutation '+i);
  assert.equal(result.decisionRecorded,false);
 }
});
test('stale package/case, malformed request and invented server authority fail closed',async()=>{
 const {source,digest,q,context}=await fixture();
 for(const [key,val] of [['caseDigest',hex('f')],['packageDigest',hex('f')],
  ['caseVersion',2],['sourceSha256',hex('d')],['caseId','other']]){
  const r=await assess(source,digest,{...q,[key]:val},context);
  assert.equal(r.eligible,false,key);
 }
 for(const change of [
  {learnerRelease:true},{reviewerId:reviewer},{disposition:'approve-learner'}
 ])assert.equal((await assess(source,digest,{...q,...change},context)).eligible,false);
 const altered={...source,cases:[{...source.cases[0],caseVersion:2}]};
 assert.equal((await assess(altered,digest,q,context)).eligible,false);
 assert.equal((await assess(source,hex('0'),q,context)).eligible,false);
});
test('untrusted nested accessors and extra claims never execute or grant eligibility',async()=>{
 const {source,digest,q,context}=await fixture();
 let calls=0;
 const malicious=structuredClone(context);
 Object.defineProperty(malicious.caseGrant,'active',{
  enumerable:true,get(){calls++;return true;}
 });
 const denied=await assess(source,digest,q,malicious);
 assert.equal(denied.eligible,false);assert.equal(calls,0);
 const hidden=structuredClone(context);
 Object.defineProperty(hidden.evidenceAccess.grant,Symbol('admin'),{value:true});
 assert.equal((await assess(source,digest,q,hidden)).eligible,false);
 const extra=structuredClone(context);extra.bypassReview=true;
 assert.equal((await assess(source,digest,q,extra)).eligible,false);
});
test('all trusted context data are captured before asynchronous package digest',async()=>{
 const {source,digest,q,context}=await fixture();
 const pending=assess(source,digest,q,context);
 context.caseGrant.revoked=true;
 context.evidenceAccess.authenticated=false;
 context.reviewAllowed=false;
 assert.equal((await pending).eligible,true,
  'caller mutations after invocation cannot rewrite captured eligibility inputs');
});
