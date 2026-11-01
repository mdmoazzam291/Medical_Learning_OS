// REVIEW-ONLY server orchestration contract. Not a deployed endpoint or
// authentication implementation. Wire ONLY from the existing review-api's
// verified identity-provider getUser(token), checkRuntimeAccess and a trusted
// server-only evidence/grant loader; never pass a browser-supplied principal.
import {validateSourceRowReviewRequest} from './source-row-review.js';
import {assessInternalSourceRowReviewEligibility} from './internal-source-row-eligibility.js';

const uuid=v=>typeof v==='string'&&
 /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const denied=reason=>Object.freeze({
 eligible:false,reason,sessionChecked:false,reviewerAuthenticated:false,
 reviewerGrantVerified:false,decisionRecorded:false,sourceReviewOnly:true,
 clinicalApproved:false,rightsApproved:false,examScopeApproved:false,
 learnerRelease:false
});
const ownData=(value,key)=>{
 if(!value||typeof value!=='object'||
    ![Object.prototype,null].includes(Object.getPrototypeOf(value)))return undefined;
 const descriptor=Object.getOwnPropertyDescriptor(value,key);
 return descriptor&&Object.hasOwn(descriptor,'value')?descriptor.value:undefined;
};
const accepted=(reviewerId)=>Object.freeze({
 eligible:true,reason:'server-preflight-only',reviewerId,
 sessionChecked:true,reviewerAuthenticated:true,
 reviewerGrantVerified:false,decisionRecorded:false,sourceReviewOnly:true,
 clinicalApproved:false,rightsApproved:false,examScopeApproved:false,
 learnerRelease:false
});

/**
 * All three injected services MUST be constructed in trusted server code:
 * - auth.getUser(token) validates a token with the existing identity provider;
 * - checkRuntimeAccess(token, verifiedId) rechecks the current live session;
 * - loadCurrentEvidence(verifiedId, capturedRequest) reads privileged current
 *   package, source rights, grant and author records (never user-supplied).
 *
 * Eligibility is a provisional UX/preflight result; the eventual database
 * write MUST independently recheck authorization and bind actor identity.
 */
export function createInternalSourceRowServerPreflight({
 auth,checkRuntimeAccess,loadCurrentEvidence
}){
 if(typeof auth?.getUser!=='function'||
    typeof checkRuntimeAccess!=='function'||
    typeof loadCurrentEvidence!=='function')
  throw new TypeError('internal_review_server_dependencies_invalid');
 return async function preflight(token,request){
  let captured;
  try{captured=validateSourceRowReviewRequest(request);}
  catch{return denied('invalid-request');}
  if(typeof token!=='string'||token.length<16||token.length>8192||
     /\s/.test(token))return denied('invalid-token');

  let actorId;
  try{
   // The authenticated identity is NEVER extracted locally from a JWT claim
   // or supplied as a request field. getUser must be the real server client.
   const response=await auth.getUser(token);
   if(response?.error||!uuid(response?.data?.user?.id))
    return denied('unauthenticated');
   actorId=response.data.user.id.toLowerCase();
  }catch{return denied('authentication-unavailable');}

  try{
   const runtime=await checkRuntimeAccess(token,actorId);
   if(runtime?.allowed!==true||runtime?.reason==='account_suspended')
    return denied('session-not-current');
  }catch{return denied('session-unavailable');}

  let evidence;
  try{
   // Read privileged records only AFTER both Auth and runtime checks.
   // No per-user cache or caller-injected grant flags are allowed.
   evidence=await loadCurrentEvidence(actorId,Object.freeze(captured));
   if(!evidence||typeof evidence!=='object'||
      ![Object.prototype,null].includes(Object.getPrototypeOf(evidence))||
      Reflect.ownKeys(evidence).length!==3||
      !Object.hasOwn(evidence,'packageCandidate')||
      !Object.hasOwn(evidence,'expectedDigest')||
      !Object.hasOwn(evidence,'context'))return denied('current-evidence-unavailable');
   for(const key of ['packageCandidate','expectedDigest','context']){
    const d=Object.getOwnPropertyDescriptor(evidence,key);
    if(!d?.enumerable||!Object.hasOwn(d,'value'))
     return denied('current-evidence-unavailable');
   }
  }catch{return denied('current-evidence-unavailable');}
  try{
   const context=evidence.context;
   // Do not silently replace a mismatched actor in the loaded records:
   // fail closed if the supposedly authoritative service disagrees.
   if(ownData(context,'actorId')!==actorId||
      ownData(ownData(context,'evidenceAccess'),'actorId')!==actorId)
    return denied('principal-binding-mismatch');
   const outcome=await assessInternalSourceRowReviewEligibility(
    evidence.packageCandidate,evidence.expectedDigest,captured,context
   );
   if(!outcome.eligible)return denied('review-not-eligible');
   return accepted(actorId);
  }catch{return denied('review-not-eligible');}
 };
}
