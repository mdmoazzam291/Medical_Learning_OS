import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSourceRowReviewRequest, matchesSourceRowReviewReceipt } from '../src/domain/source-row-review.js';

const uid = '11111111-1111-4111-8111-111111111111';
const reviewer = '22222222-2222-4222-8222-222222222222';
const request = () => ({ requestId:uid,targetType:'source-row-case',packageId:uid,packageVersion:1,
  packageDigest:'a'.repeat(64),caseId:'bc-prefix-omitted',caseVersion:1,caseDigest:'b'.repeat(64),
  sourceSha256:'c'.repeat(64),appearanceEvidenceDigest:'d'.repeat(64),
  disposition:'retain-unresolved',rationale:'The exact source identity remains unresolved after inspecting the cited row.',
  attestationVersion:'source-row-review-v1' });
const receipt = q => ({...q,contractId:'source-row-review-receipt-v1',decisionId:uid,reviewerId:reviewer,
  grantEventId:uid,receiptDigest:'e'.repeat(64),recordedAt:'2026-10-30T12:00:00.000Z',sourceReviewOnly:true,
  clinicalApproved:false,rightsApproved:false,examScopeApproved:false,learnerRelease:false });

test('valid request is copied and all four limited dispositions are accepted', () => {
  for (const disposition of ['accept-proposed-interpretation','reject-proposed-interpretation','request-primary-clarification','retain-unresolved']) {
    const q={...request(),disposition}; const copy=validateSourceRowReviewRequest(q);
    assert.deepEqual(copy,q); assert.notEqual(copy,q);
  }
});
test('rejects every missing field and extra client authority or approval field', () => {
  for (const key of Object.keys(request())) { const q=request(); delete q[key]; assert.throws(()=>validateSourceRowReviewRequest(q),/source_row_review_invalid/); }
  for (const key of ['reviewerId','grantEventId','recordedAt','clinicalApproved','rightsApproved','learnerRelease','scopeReviewed'])
    assert.throws(()=>validateSourceRowReviewRequest({...request(),[key]:true}),/source_row_review_invalid/);
});
test('rejects malformed identities, versions, hashes, oversized notes and baseline decisions', () => {
  const changes={requestId:['bad',null],packageId:['x'],packageVersion:[0,-1,1.5,'1',1000001],caseVersion:[0,Infinity],
    caseId:['','../secret','A', 'a'.repeat(129)],targetType:['baseline'],disposition:['scope-reviewed','approved'],
    attestationVersion:['independent-syllabus-scope-review-v1'],rationale:['  ','a'.repeat(4001)],
    packageDigest:['A'.repeat(64),'a'.repeat(63)],caseDigest:[false],sourceSha256:[null],appearanceEvidenceDigest:['x']};
  for (const [key,values] of Object.entries(changes)) for (const value of values)
    assert.throws(()=>validateSourceRowReviewRequest({...request(),[key]:value}),/source_row_review_invalid/,key);
});
test('rejects inherited records and accessor properties without evaluating them', () => {
  let invoked=false;const q=request();Object.defineProperty(q,'rationale',{enumerable:true,get(){invoked=true;return 'pretend';}});
  assert.throws(()=>validateSourceRowReviewRequest(q),/source_row_review_invalid/);assert.equal(invoked,false);
  assert.throws(()=>validateSourceRowReviewRequest(Object.assign(Object.create({actor:uid}),request())),/source_row_review_invalid/);
});
test('receipt binds every request field and the expected reviewer', () => {
  const q=request(),r=receipt(q); assert.equal(matchesSourceRowReviewReceipt(r,q,reviewer),true);
  for (const key of Object.keys(q)) {
    const changed={...r,[key]:typeof q[key]==='number'?2:q[key]+'x'};
    assert.equal(matchesSourceRowReviewReceipt(changed,q,reviewer),false,key);
  }
  assert.equal(matchesSourceRowReviewReceipt(r,q,uid),false);
});
test('receipt requires exact shape, valid server metadata and false approval boundaries', () => {
  const q=request();
  for (const [key,value] of Object.entries({contractId:'baseline',decisionId:'bad',grantEventId:null,
    receiptDigest:'x',recordedAt:'2026-02-30T12:00:00.000Z',sourceReviewOnly:false,
    clinicalApproved:true,rightsApproved:true,examScopeApproved:true,learnerRelease:true}))
    assert.equal(matchesSourceRowReviewReceipt({...receipt(q),[key]:value},q,reviewer),false,key);
  assert.equal(matchesSourceRowReviewReceipt({...receipt(q),extra:true},q,reviewer),false);
  assert.equal(matchesSourceRowReviewReceipt(null,q,reviewer),false);
  assert.equal(matchesSourceRowReviewReceipt(receipt(q),{},reviewer),false);
});
test('receipt rejects missing fields, accessors and hidden or symbol authority', () => {
  const q=request();
  for (const key of Object.keys(receipt(q))) {
    const r=receipt(q);delete r[key];assert.equal(matchesSourceRowReviewReceipt(r,q,reviewer),false,key);
  }
  let invoked=false; const r=receipt(q);
  Object.defineProperty(r,'reviewerId',{enumerable:true,get(){invoked=true;return reviewer;}});
  assert.equal(matchesSourceRowReviewReceipt(r,q,reviewer),false);assert.equal(invoked,false);
  for (const key of ['hidden',Symbol('authority')]) {
    const r=receipt(q);Object.defineProperty(r,key,{value:true});
    assert.equal(matchesSourceRowReviewReceipt(r,q,reviewer),false);
  }
});
test('valid limits are accepted and malformed reviewer or timestamp is rejected', () => {
  for (const [version,length] of [[1,24],[1000000,4000]]) {
    const q={...request(),packageVersion:version,caseVersion:version,rationale:'a'.repeat(length)};
    assert.deepEqual(validateSourceRowReviewRequest(q),q);
    assert.equal(matchesSourceRowReviewReceipt(receipt(q),q,reviewer),true);
  }
  assert.equal(matchesSourceRowReviewReceipt(receipt(request()),request(),'bad'),false);
  assert.equal(matchesSourceRowReviewReceipt({...receipt(request()),recordedAt:null},request(),reviewer),false);
});
