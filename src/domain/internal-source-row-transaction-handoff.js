// Non-deployable internal source-review handoff CONTRACT. Only the separately
// reviewed user-scoped DB adapter may implement commitAsUser. Not an API route.
// Neither a formatted receipt nor a successful HTTP/RPC response proves that
// the user/session/grants were checked inside the committing transaction.
import {
 validateSourceRowReviewRequest,matchesSourceRowReviewReceipt
} from './source-row-review.js';

const deny=reason=>Object.freeze({
 ready:false,reason,receiptShapeMatched:false,transactionVerified:false,
 decisionRecorded:false,sourceReviewOnly:true,
 clinicalApproved:false,rightsApproved:false,examScopeApproved:false,
 learnerRelease:false
});
const uuid=v=>typeof v==='string'&&
 /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
// Parses a preflight-only result; never treats caller-provided fields as proof of authorization.
export const parseInternalSourceReviewPreflight=v=>{
 try{
  if(!v||typeof v!=='object'||
     ![Object.prototype,null].includes(Object.getPrototypeOf(v)))return null;
  for(const key of ['eligible','reviewerId','sessionChecked',
   'reviewerAuthenticated','reviewerGrantVerified','decisionRecorded']){
   const d=Object.getOwnPropertyDescriptor(v,key);
   if(!d?.enumerable||!Object.hasOwn(d,'value'))return null;
  }
  // A true reviewerGrantVerified or decisionRecorded status would be an
  // unsupported authority escalation from the preflight-only layer.
  if(v.eligible!==true||!uuid(v.reviewerId)||
     v.sessionChecked!==true||v.reviewerAuthenticated!==true||
     v.reviewerGrantVerified!==false||v.decisionRecorded!==false)return null;
  return v.reviewerId;
 }catch{return null;}
};

/**
 * Caller must inject the existing verified-user/current-session preflight
 * and an independently reviewed user-token scoped database transaction.
 * The latter MUST derive auth.uid() from a provider-verified DB session,
 * recheck revocation/grants/source rights inside the write transaction, and
 * return only that transaction's protected immutable receipt.
 *
 * This contract DOES NOT prove any of those requirements. It only verifies
 * request/receipt shapes, forbids actor IDs in request data, and fails closed
 * before a mutation when preflight does not explicitly succeed.
 */
export function createInternalSourceRowTransactionHandoff({preflight,commitAsUser}){
 if(typeof preflight!=='function'||typeof commitAsUser!=='function')
  throw new TypeError('internal_review_handoff_dependencies_invalid');

 return async function handoff(token,request){
  let q;
  try{q=validateSourceRowReviewRequest(request);}
  catch{return deny('invalid-request');}
  if(typeof token!=='string'||token.length<16||token.length>8192||/\s/.test(token))
   return deny('invalid-token');
  let expectedReviewerId;
  try{expectedReviewerId=parseInternalSourceReviewPreflight(await preflight(token,Object.freeze(q)));}
  catch{return deny('preflight-unavailable');}
  if(!expectedReviewerId)return deny('review-not-eligible');

  // No user-input actorId, reviewerId, grantEventId, or "isAdmin" is
  // forwarded. The trusted database must resolve its own current identity.
  // Never retry a commit here: only a reviewed idempotent DB transaction
  // can decide whether an ambiguous network result was already committed.
  let receipt;
  try{receipt=await commitAsUser(token,Object.freeze(q));}
  catch{return deny('commit-unconfirmed');}
  if(!matchesSourceRowReviewReceipt(receipt,q,expectedReviewerId))
   return deny('receipt-mismatch');

  // Structured and exact binding != independently verified origin/commit.
  // No "recorded" result until a separately approved protected readback
  // proves that the actual authoritative DB event exists and is current.
  return Object.freeze({
   ready:true,reason:'receipt-shape-only',
   receiptShapeMatched:true,transactionVerified:false,
   decisionRecorded:false,sourceReviewOnly:true,
   clinicalApproved:false,rightsApproved:false,examScopeApproved:false,
   learnerRelease:false
  });
 };
}
