// Internal Admin source-review preparation only. This is a deterministic,
// read-only projection of versioned metadata, not an authenticated reviewer
// queue, a review decision, an approval or an external delivery receipt.
import {captureSourceRowPackage,digestSourceRowPackage} from './source-row-evidence.js';
import {validateSourceRowReviewRequest} from './source-row-review.js';

const hex=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const invalid=()=>{throw new TypeError('internal_source_row_review_invalid');};

/**
 * Candidate inventory only. There is deliberately no pending/approved count:
 * review state comes from independently authorized immutable server records,
 * not the source's proposed interpretation or the mere existence of a case.
 */
export async function buildInternalSourceRowReviewCandidates(packageCandidate,expectedDigest,options){
 if(!hex(expectedDigest))invalid();
 let snapshot,manifest;
 try{
  // Both values are captured synchronously, before the first await. Callers
  // cannot swap metadata while asynchronous hashing is in progress.
  snapshot=captureSourceRowPackage(packageCandidate);
  manifest=await digestSourceRowPackage(snapshot,options);
 }catch{invalid();}
 if(manifest.packageDigest!==expectedDigest)invalid();
 const candidates=manifest.cases.map((item,index)=>{
  const claim=snapshot.cases[index];
  if(item.caseId!==claim.caseId||item.caseVersion!==claim.caseVersion)invalid();
  return Object.freeze({
   packageId:manifest.packageId,
   packageVersion:manifest.packageVersion,
   packageDigest:manifest.packageDigest,
   caseId:item.caseId,
   caseVersion:item.caseVersion,
   caseDigest:item.caseDigest,
   appearanceEvidenceDigest:item.appearanceEvidenceDigest,
   sourceSha256:item.sourceSha256,
   sourceEdition:claim.sourceEdition,
   pdfPage:claim.appearance.pdfPage,
   rowOrdinal:claim.appearance.rowOrdinal,
   proposedIdentity:claim.interpretation.proposedIdentity,
   relation:claim.interpretation.relation,
   reviewState:'unverified'
  });
 });
 return Object.freeze({
  contractId:'internal-source-row-candidates-v1',
  packageId:manifest.packageId,
  packageVersion:manifest.packageVersion,
  packageDigest:manifest.packageDigest,
  candidateCount:candidates.length,
  adjudicatedCount:null,
  sourceReviewOnly:true,
  clinicalApproved:false,rightsApproved:false,examScopeApproved:false,
  learnerRelease:false,
  candidates:Object.freeze(candidates)
 });
}

/**
 * Verify that an existing source-row-review request is bound to the exact
 * current package/case evidence. This is PRE-FLIGHT ONLY: an authenticated,
 * independent reviewer grant, rights, authoritative freshness/withdrawal
 * state and atomic durable SQL receipt are still required elsewhere.
 */
export async function preflightInternalSourceRowReviewRequest(packageCandidate,expectedDigest,request,options){
 let captured;
 try{captured=validateSourceRowReviewRequest(request);}catch{invalid();}
 const inventory=await buildInternalSourceRowReviewCandidates(packageCandidate,expectedDigest,options);
 const item=inventory.candidates.find(c=>c.caseId===captured.caseId);
 if(!item||captured.packageId!==item.packageId||
    captured.packageVersion!==item.packageVersion||
    captured.packageDigest!==item.packageDigest||
    captured.caseVersion!==item.caseVersion||
    captured.caseDigest!==item.caseDigest||
    captured.appearanceEvidenceDigest!==item.appearanceEvidenceDigest||
    captured.sourceSha256!==item.sourceSha256)invalid();
 return Object.freeze({
  contractId:'internal-source-row-preflight-v1',
  request:Object.freeze(captured),
  exactEvidenceBinding:true,
  reviewerAuthenticated:false,
  reviewerGrantVerified:false,
  decisionRecorded:false,
  sourceReviewOnly:true,
  clinicalApproved:false,rightsApproved:false,examScopeApproved:false,
  learnerRelease:false
 });
}
