import test from 'node:test';import assert from 'node:assert/strict';
import {validateScopeReviewerGrant,validateScopeReviewDecision,verifyScopeReviewReceipt} from '../src/domain/syllabus-independent-review.js';
const uid='11111111-1111-4111-8111-111111111111';
const grant=()=>({requestId:uid,baselineId:uid,reviewerUserId:uid,action:'grant',reason:'Independent reviewer assignment for synthetic scope'});
const decision=()=>({requestId:uid,baselineId:uid,revision:1,digest:'a'.repeat(64),decision:'scope-reviewed',
 evidenceLocator:'Synthetic source dossier location',evidenceSha256:'b'.repeat(64),
 note:'Reviewed canonical concept scope against the declared source.',attestationVersion:'independent-syllabus-scope-review-v1'});
test('scoped reviewer grants reject forged roles, fields, and incorrect reason',()=>{
 assert.deepEqual(validateScopeReviewerGrant(grant()),grant());
 for(const x of [{...grant(),isAdmin:true},{...grant(),action:'publish'}, {...grant(),reason:'short'}])
 assert.throws(()=>validateScopeReviewerGrant(x),/syllabus_scope_review_invalid/);
});
test('source decision is separate from syllabus certification, learner release, medical review',()=>{
 assert.deepEqual(validateScopeReviewDecision(decision()),decision());
 for(const x of [{...decision(),decision:'publish'}, {...decision(),officialSyllabusCertified:true},
 {...decision(),evidenceSha256:'bad'}, {...decision(),note:'weak'}, {...decision(),revision:0}])
 assert.throws(()=>validateScopeReviewDecision(x),/syllabus_scope_review_invalid/);
 const receipt={contractId:'syllabus-scope-review-receipt-v1',baselineId:uid,revision:1,
 draftDigest:'a'.repeat(64),decision:'scope-reviewed',reviewerId:uid,
 receiptDigest:'c'.repeat(64),decisionId:uid,scopeReviewOnly:true,officialSyllabusCertified:false,
 curriculumActivated:false,learnerRelease:false};
 assert.equal(verifyScopeReviewReceipt(receipt,decision(),uid),true);
 assert.equal(verifyScopeReviewReceipt({...receipt,learnerRelease:true},decision(),uid),false);
});
