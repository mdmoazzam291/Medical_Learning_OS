// OFFLINE source-only event/receipt projection. Not an authentication,
// database readback, authorization, signature, or publication primitive.
// The caller must independently prove the event came from a committed,
// immutable and currently authorized database read.
import {canonicalize,digestCanonical} from './canonical-integrity.js';
import {validateSourceRowReviewRequest,matchesSourceRowReviewReceipt} from './source-row-review.js';

const FIELDS=Object.freeze([
 'contractId','decisionId','reviewerId','grantEventId','request','recordedAt',
 'sourceReviewOnly','clinicalApproved','rightsApproved','examScopeApproved','learnerRelease'
]);
const invalid=()=>{throw new TypeError('internal_source_review_event_invalid');};
function exactDataRecord(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||
  ![Object.prototype,null].includes(Object.getPrototypeOf(value)))invalid();
 const keys=Reflect.ownKeys(value);
 if(keys.length!==FIELDS.length||keys.some(key=>typeof key!=='string'||!FIELDS.includes(key)))invalid();
 for(const key of FIELDS){
  const d=Object.getOwnPropertyDescriptor(value,key);
  if(!d?.enumerable||!Object.hasOwn(d,'value'))invalid();
 }
}
// No async boundary between validating/cloning the caller input and computing
// the digest: a later caller-side mutation cannot change the event being hashed.
function snapshot(event,request,expectedReviewerId){
 exactDataRecord(event);
 let q,actualRequest;
 try{
  q=validateSourceRowReviewRequest(request);
  actualRequest=validateSourceRowReviewRequest(event.request);
 }catch{invalid();}
 if(Object.keys(q).some(key=>q[key]!==actualRequest[key]))invalid();
 const data=Object.fromEntries(FIELDS.map(key=>[key,key==='request'?actualRequest:event[key]]));
 const candidate={
  ...q,contractId:'source-row-review-receipt-v1',
  decisionId:data.decisionId,reviewerId:data.reviewerId,
  grantEventId:data.grantEventId,receiptDigest:'0'.repeat(64),
  recordedAt:data.recordedAt,sourceReviewOnly:data.sourceReviewOnly,
  clinicalApproved:data.clinicalApproved,rightsApproved:data.rightsApproved,
  examScopeApproved:data.examScopeApproved,learnerRelease:data.learnerRelease
 };
 if(data.contractId!=='internal-source-row-decision-event-v1'||
  !matchesSourceRowReviewReceipt(candidate,q,expectedReviewerId))invalid();
 return {data,q,candidate};
}

/**
 * Projects a validated, expected SQL event JSON shape into the canonical
 * receipt. receiptDigest is JCS/SHA-256 of the *event payload*, NOT a DB-
 * stored digest, proof of persistence, signature or verified human review.
 */
export async function projectInternalSourceRowReceipt(event,request,expectedReviewerId){
 const {data,candidate}=snapshot(event,request,expectedReviewerId);
 const envelope=await digestCanonical(data);
 const receipt=Object.freeze({...candidate,receiptDigest:envelope.digestHex});
 return receipt;
}

/**
 * Compares a write response and separate readback *by value*.
 * Only use after an independently authenticated, current-grant protected
 * readback. This function cannot verify the readback's origin itself.
 */
export async function compareInternalSourceRowReviewEvents(writeEvent,readbackEvent,request,expectedReviewerId){
 const [written,read]=await Promise.all([
  projectInternalSourceRowReceipt(writeEvent,request,expectedReviewerId),
  projectInternalSourceRowReceipt(readbackEvent,request,expectedReviewerId)
 ]);
 if(canonicalize(written)!==canonicalize(read))invalid();
 return Object.freeze({
  eventParity:true,receipt:written,
  transactionVerified:false,persistenceVerified:false,authorityVerified:false,
  decisionRecorded:false,sourceReviewOnly:true,
  clinicalApproved:false,rightsApproved:false,examScopeApproved:false,learnerRelease:false
 });
}
