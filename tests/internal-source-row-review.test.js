import test from 'node:test';
import assert from 'node:assert/strict';
import {digestSourceRowPackage} from '../src/domain/source-row-evidence.js';
import {
 buildInternalSourceRowReviewCandidates as inventory,
 preflightInternalSourceRowReviewRequest as preflight
} from '../src/domain/internal-source-row-review.js';

const id='11111111-1111-4111-8111-111111111111';
const hex=c=>c.repeat(64);
const claim=(caseId,sourceSha256,sourceEdition,page)=>({
 caseId,caseVersion:1,sourceSha256,sourceEdition,
 appearance:{pdfPage:page,rowOrdinal:4,rotation:0,
  bboxMilliPoints:[0,0,100,100],rawCellSha256:hex('b')},
 interpretation:{proposedIdentity:null,relation:'unresolved',rationaleSha256:hex('c')}
});
const packageCandidate=()=>({
 packageId:id,packageVersion:1,
 cases:[
  claim('case-b',hex('d'),'source-B',2),
  claim('case-a',hex('a'),'source-A',1)
 ]
});
async function fixture(){
 const source=packageCandidate();
 const digest=(await digestSourceRowPackage(source)).packageDigest;
 const q=await inventory(source,digest);
 const item=q.candidates[1];
 const request={
  requestId:'22222222-2222-4222-8222-222222222222',
  targetType:'source-row-case',
  packageId:item.packageId,packageVersion:item.packageVersion,
  packageDigest:item.packageDigest,caseId:item.caseId,
  caseVersion:item.caseVersion,caseDigest:item.caseDigest,
  sourceSha256:item.sourceSha256,
  appearanceEvidenceDigest:item.appearanceEvidenceDigest,
  disposition:'retain-unresolved',
  rationale:'The source row identity remains unresolved and needs independent source inspection.',
  attestationVersion:'source-row-review-v1'
 };
 return {source,digest,q,request};
}
test('internal candidate inventory is deterministic, source-bound and never counts approval',async()=>{
 const {source,digest,q}=await fixture();
 assert.equal(q.contractId,'internal-source-row-candidates-v1');
 assert.equal(q.candidateCount,2);
 assert.equal(q.adjudicatedCount,null);
 assert.deepEqual(q.candidates.map(x=>x.caseId),['case-a','case-b']);
 assert.deepEqual(q.candidates.map(x=>x.sourceEdition),['source-A','source-B']);
 assert.deepEqual(q.candidates.map(x=>x.pdfPage),[1,2]);
 assert.ok(q.candidates.every(c=>c.reviewState==='unverified'&&Object.isFrozen(c)));
 for(const flag of ['clinicalApproved','rightsApproved','examScopeApproved','learnerRelease'])
  assert.equal(q[flag],false,flag);
 assert.equal(q.sourceReviewOnly,true);
 assert.equal(Object.isFrozen(q),true);
 assert.equal(Object.isFrozen(q.candidates),true);
 assert.equal(Object.hasOwn(q,'approvedCount'),false);
 assert.equal(Object.hasOwn(q,'outbound'),false);
 assert.deepEqual(await inventory({...source,cases:source.cases.toReversed()},digest),q);
});
test('exact case preflight never authenticates, records or approves the proposed reviewer action',async()=>{
 const {source,digest,request}=await fixture();
 const result=await preflight(source,digest,request);
 assert.equal(result.exactEvidenceBinding,true);
 assert.equal(result.reviewerAuthenticated,false);
 assert.equal(result.reviewerGrantVerified,false);
 assert.equal(result.decisionRecorded,false);
 assert.equal(result.learnerRelease,false);
 assert.equal(result.rightsApproved,false);
 assert.equal(result.sourceReviewOnly,true);
 assert.deepEqual(result.request,request);
 assert.equal(Object.isFrozen(result.request),true);
 assert.equal(Object.isFrozen(result),true);
});
test('stale or foreign source, package, version and case bindings fail closed',async()=>{
 const {source,digest,request}=await fixture();
 for(const [key,value] of [
  ['packageId','33333333-3333-4333-8333-333333333333'],
  ['packageVersion',2],['packageDigest',hex('f')],
  ['caseId','case-a'],['caseVersion',2],
  ['caseDigest',hex('f')],['sourceSha256',hex('f')],
  ['appearanceEvidenceDigest',hex('f')]
 ]){
  await assert.rejects(preflight(source,digest,{...request,[key]:value}),
   /internal_source_row_review_invalid/,key);
 }
 for(const value of [
  {...source,packageVersion:2},
  {...source,cases:source.cases.map(c=>({...c,caseVersion:2}))},
  {...source,cases:[...source.cases,source.cases[0]]}
 ])await assert.rejects(inventory(value,digest),/internal_source_row_review_invalid/);
 await assert.rejects(inventory(source,hex('f')),/internal_source_row_review_invalid/);
});
test('rejects illicit request fields, invalid rationale, unreviewed dispositions and exotic descriptors',async()=>{
 const {source,digest,request}=await fixture();
 for(const value of [
  {...request,learnerRelease:true},
  {...request,disposition:'approve-for-learners'},
  {...request,rationale:'\u200b'.repeat(50)},
  {...request,grantEventId:'33333333-3333-4333-8333-333333333333'}
 ])await assert.rejects(preflight(source,digest,value),/internal_source_row_review_invalid/);
 let called=false;
 const unsafe=Object.defineProperty({...request},'rationale',{
  enumerable:true,get(){called=true;throw Error('unexpected getter');}
 });
 await assert.rejects(preflight(source,digest,unsafe),/internal_source_row_review_invalid/);
 assert.equal(called,false);
 const hidden=structuredClone(source);
 Object.defineProperty(hidden.cases[0],'private',{value:true});
 await assert.rejects(inventory(hidden,digest),/internal_source_row_review_invalid/);
});
test('both package and review request are captured before any asynchronous digest',async()=>{
 const {source,digest,request}=await fixture();
 const untouched=structuredClone(source);
 const untouchedRequest=structuredClone(request);
 const pending=preflight(source,digest,request);
 source.cases[0].sourceSha256=hex('e');
 request.rationale='tampered after invocation';
 const result=await pending;
 assert.deepEqual(result.request,untouchedRequest);
 assert.equal(result.exactEvidenceBinding,true);
 assert.equal((await inventory(untouched,digest)).candidateCount,2);
});
