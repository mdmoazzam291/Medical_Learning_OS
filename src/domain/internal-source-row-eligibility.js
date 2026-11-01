// Offline boundary assessment ONLY. The caller must supply fresh trusted
// records from a separately authenticated service; these booleans and objects
// are NOT proof of identity, grant provenance, source rights or SQL commit.
import {evaluateSourceEvidenceAccess} from './source-evidence-access.js';
import {validateSourceRowReviewRequest} from './source-row-review.js';
import {preflightInternalSourceRowReviewRequest} from './internal-source-row-review.js';

const keys=Object.freeze({
 context:['actorId','reviewAllowed','evidenceAccess','caseGrant'],
 access:['actorId','authenticated','contentOwnerId','packageAuthorId','runtimeAllowed','currentPackage','rights','source','grant'],
 package:['packageId','packageVersion','packageDigest','status'],
 rights:['metadataAllowed','sourceRetentionAllowed','sourceDisplayAllowed'],
 source:['expectedSha256','actualSha256','bytesVerified'],
 packageGrant:['targetType','reviewerId','packageId','packageVersion','packageDigest','active','revoked','consentVerified','qualificationVerified','independenceVerified'],
 caseGrant:['grantEventId','targetType','reviewerId','packageId','packageVersion','packageDigest','caseId','caseVersion','caseDigest','appearanceEvidenceDigest','sourceSha256','active','revoked','consentVerified','qualificationVerified','independenceVerified']
});
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const deny=reason=>Object.freeze({eligible:false,reason,decisionRecorded:false,
 sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,
 examScopeApproved:false,learnerRelease:false});
function copy(value,fields){
 try{
  if(!value||typeof value!=='object'||
     ![Object.prototype,null].includes(Object.getPrototypeOf(value))||
     Reflect.ownKeys(value).length!==fields.length)return null;
  const out={};
  for(const key of fields){
   const d=Object.getOwnPropertyDescriptor(value,key);
   if(!d?.enumerable||!Object.hasOwn(d,'value'))return null;
   out[key]=d.value;
  }
  return out;
 }catch{return null;}
}
function captureContext(value){
 const ctx=copy(value,keys.context);
 if(!ctx)return null;
 const access=copy(ctx.evidenceAccess,keys.access);
 if(!access)return null;
 const pkg=copy(access.currentPackage,keys.package);
 const rights=copy(access.rights,keys.rights);
 const source=copy(access.source,keys.source);
 const grant=access.grant===null?null:copy(access.grant,keys.packageGrant);
 const caseGrant=copy(ctx.caseGrant,keys.caseGrant);
 if(!pkg||!rights||!source||!grant||!caseGrant)return null;
 ctx.evidenceAccess={...access,currentPackage:pkg,rights,source,grant};
 ctx.caseGrant=caseGrant;
 return ctx;
}
function sameCase(q,g){
 return g.packageId===q.packageId&&g.packageVersion===q.packageVersion&&
 g.packageDigest===q.packageDigest&&g.caseId===q.caseId&&
 g.caseVersion===q.caseVersion&&g.caseDigest===q.caseDigest&&
 g.appearanceEvidenceDigest===q.appearanceEvidenceDigest&&
 g.sourceSha256===q.sourceSha256;
}
/**
 * Returns only policy eligibility (never commit authority). A real API must
 * reacquire independent grant/rights/identity data and enforce all of this
 * atomically with its immutable event write. Caller-supplied 'true' is NOT
 * verification, and this code is not connected to a public API or database.
 */
export async function assessInternalSourceRowReviewEligibility(packageCandidate,expectedDigest,request,context){
 let q;
 try{q=validateSourceRowReviewRequest(request);}catch{return deny('invalid-request');}
 const ctx=captureContext(context);
 if(!ctx)return deny('invalid-context');
 const pending=preflightInternalSourceRowReviewRequest(packageCandidate,expectedDigest,q);
 try{await pending;}catch{return deny('stale-or-invalid-evidence');}
 const a=ctx.evidenceAccess,g=ctx.caseGrant;
 if(!uuid(ctx.actorId)||ctx.actorId!==a.actorId||
    ctx.actorId===a.packageAuthorId||ctx.actorId===a.contentOwnerId)
  return deny('reviewer-not-independent');
 if(ctx.reviewAllowed!==true||g.targetType!=='source-row-case'||
    !uuid(g.grantEventId)||g.reviewerId!==ctx.actorId||
    !sameCase(q,g)||!['active','revoked','consentVerified',
     'qualificationVerified','independenceVerified'].every(k=>typeof g[k]==='boolean')||
    !g.active||g.revoked||!g.consentVerified||!g.qualificationVerified||
    !g.independenceVerified)return deny('case-grant-denied');
 if(a.currentPackage.status!=='staged')return deny('not-staged');
 const permitted=evaluateSourceEvidenceAccess({
  action:'read-metadata',packageId:q.packageId,
  packageVersion:q.packageVersion,packageDigest:q.packageDigest
 },a);
 if(!permitted.allowed)return deny('package-access-denied');
 return Object.freeze({eligible:true,reason:'candidate-only',
  decisionRecorded:false,sourceReviewOnly:true,
  clinicalApproved:false,rightsApproved:false,
  examScopeApproved:false,learnerRelease:false});
}
