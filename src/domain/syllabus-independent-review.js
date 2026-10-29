const bad=()=>{throw new TypeError('syllabus_scope_review_invalid');};
const keys=(v,fields)=>{if(!v||typeof v!=='object'||Array.isArray(v)||
 Object.keys(v).sort().join('|')!==fields.slice().sort().join('|'))bad();};
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const hex=v=>typeof v==='string'&&/^[0-9a-f]{64}$/.test(v);
const note=(v,min)=>typeof v==='string'&&v.trim().length>=min&&v.length<=2000;
export function validateScopeReviewerGrant(v){
 keys(v,['requestId','baselineId','reviewerUserId','action','reason']);
 if(!uuid(v.requestId)||!uuid(v.baselineId)||!uuid(v.reviewerUserId)||
 !['grant','revoke'].includes(v.action)||!note(v.reason,15))bad();
 return structuredClone(v);
}
export function validateScopeReviewDecision(v){
 keys(v,['requestId','baselineId','revision','digest','decision','evidenceLocator','evidenceSha256','note','attestationVersion']);
 if(!uuid(v.requestId)||!uuid(v.baselineId)||!Number.isInteger(v.revision)||v.revision<1||v.revision>10000||
 !hex(v.digest)||!hex(v.evidenceSha256)||!note(v.evidenceLocator,8)||!note(v.note,24)||
 !['scope-reviewed','changes-required'].includes(v.decision)||
 v.attestationVersion!=='independent-syllabus-scope-review-v1')bad();
 return structuredClone(v);
}
export function verifyScopeReviewReceipt(receipt,request,reviewerId){
 return receipt?.contractId==='syllabus-scope-review-receipt-v1'&&
 receipt.baselineId===request.baselineId&&receipt.revision===request.revision&&
 receipt.draftDigest===request.digest&&receipt.reviewerId===reviewerId&&
 receipt.decision===request.decision&&hex(receipt.receiptDigest)&&uuid(receipt.decisionId)&&
 receipt.scopeReviewOnly===true&&receipt.officialSyllabusCertified===false&&
 receipt.curriculumActivated===false&&receipt.learnerRelease===false;
}
