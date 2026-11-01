// Offline, non-deployable source-review recovery CONTRACT.
// A lost write response is ambiguous: it may have committed. Read only,
// using the SAME original requestId. Never auto-retry a review decision.
// Injected preflight/readback do not become trusted merely by matching shapes.
import {validateSourceRowReviewRequest} from './source-row-review.js';
import {parseInternalSourceReviewPreflight} from './internal-source-row-transaction-handoff.js';
import {projectInternalSourceRowReceipt} from './internal-source-row-receipt-parity.js';

const result=(reason,extras={})=>Object.freeze({
 ready:false,reason,readbackShapeMatched:false,
 safeToResubmit:false,writeAttempted:false,
 transactionVerified:false,persistenceVerified:false,authorityVerified:false,
 decisionRecorded:false,sourceReviewOnly:true,
 clinicalApproved:false,rightsApproved:false,examScopeApproved:false,
 learnerRelease:false,...extras
});

/**
 * A server-only recovery seam for an *ambiguous* previously submitted decision.
 * preflight(token, exactOriginalRequest) must independently check current
 * identity/session and scoped eligibility; readAsUser(token, requestId) must
 * eventually use a separately reviewed, user-JWT-bound, current-grant protected
 * database readback. This module makes neither dependency authoritative.
 *
 * Important: a revoked grant or unavailable readback does NOT mean the prior
 * write did not commit. There is no write/retry callback, no "safe to retry"
 * state, and no way to turn a JSON shape into an approved decision.
 */
export function createInternalSourceRowReadbackRecovery({preflight,readAsUser}){
 if(typeof preflight!=='function'||typeof readAsUser!=='function')
  throw new TypeError('internal_review_recovery_dependencies_invalid');

 return async function recover(token,originalRequest){
  let q;
  try{q=Object.freeze(validateSourceRowReviewRequest(originalRequest));}
  catch{return result('invalid-original-request');}
  if(typeof token!=='string'||token.length<16||token.length>8192||/\s/.test(token))
   return result('invalid-token');

  let expectedReviewerId;
  try{
   expectedReviewerId=parseInternalSourceReviewPreflight(await preflight(token,q));
  }catch{return result('preflight-unavailable');}
  if(!expectedReviewerId)return result('review-not-eligible');

  // Exactly one authenticated READ for this explicit recovery invocation.
  // A 404, revoked grant, network interruption, or denial is inconclusive;
  // the write may still have committed before the response was lost.
  let persistedEvent;
  try{persistedEvent=await readAsUser(token,q.requestId);}
  catch{return result('readback-unavailable-or-denied');}
  if(persistedEvent===null||persistedEvent===undefined)
   return result('readback-absent-or-inaccessible');

  let receipt;
  try{
   receipt=await projectInternalSourceRowReceipt(persistedEvent,q,expectedReviewerId);
  }catch{return result('readback-mismatch');}
  // This is a candidate receipt, not a trusted, DB-stored or signed receipt.
  // Even two identical forged JSON objects cannot authenticate themselves.
  return result('readback-event-shape-matched-unverified',{
   readbackShapeMatched:true,candidateReceipt:receipt
  });
 };
}
