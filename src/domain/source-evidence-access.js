// Policy evaluation only. All context must come from trusted server records;
// this function does not authenticate users, verify rights or enforce storage.
const result=(allowed,reason)=>Object.freeze({allowed,reason,sourceReviewOnly:true,learnerRelease:false});
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const version=v=>Number.isSafeInteger(v)&&v>=1&&v<=1000000;
function exact(v,fields){
  if(!v||typeof v!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(v)))throw new TypeError('invalid');
  const keys=Reflect.ownKeys(v);
  if(keys.length!==fields.length||keys.some(k=>typeof k!=='string'||!fields.includes(k)))throw new TypeError('invalid');
  for(const k of keys){const d=Object.getOwnPropertyDescriptor(v,k);if(!d.enumerable||!Object.hasOwn(d,'value'))throw new TypeError('invalid');}
}
const booleans=(v,keys)=>keys.every(k=>typeof v[k]==='boolean');
const binding=v=>uuid(v.packageId)&&version(v.packageVersion)&&hex(v.packageDigest);
const same=(a,b)=>a.packageId===b.packageId&&a.packageVersion===b.packageVersion&&a.packageDigest===b.packageDigest;
export function evaluateSourceEvidenceAccess(request,context){
  try{
    exact(request,['action','packageId','packageVersion','packageDigest']);
    exact(context,['actorId','authenticated','contentOwnerId','packageAuthorId','runtimeAllowed','currentPackage','rights','source','grant']);
    if(!binding(request)||!['stage-metadata','read-metadata','read-source-bytes'].includes(request.action)||
      ![context.actorId,context.contentOwnerId,context.packageAuthorId].every(uuid)||
      !booleans(context,['authenticated','runtimeAllowed']))return result(false,'invalid-context');
    const p=context.currentPackage,r=context.rights,s=context.source,g=context.grant;
    exact(p,['packageId','packageVersion','packageDigest','status']);
    exact(r,['metadataAllowed','sourceRetentionAllowed','sourceDisplayAllowed']);
    exact(s,['expectedSha256','actualSha256','bytesVerified']);
    if(!binding(p)||!['draft','staged','withdrawn'].includes(p.status)||
      !booleans(r,['metadataAllowed','sourceRetentionAllowed','sourceDisplayAllowed'])||
      !hex(s.expectedSha256)||!(s.actualSha256===null||hex(s.actualSha256))||!booleans(s,['bytesVerified']))return result(false,'invalid-context');
    if(g!==null){
      exact(g,['targetType','reviewerId','packageId','packageVersion','packageDigest','active','revoked','consentVerified','qualificationVerified','independenceVerified']);
      if(!binding(g)||!uuid(g.reviewerId)||typeof g.targetType!=='string'||
        !booleans(g,['active','revoked','consentVerified','qualificationVerified','independenceVerified']))return result(false,'invalid-context');
    }
    if(!context.authenticated||!context.runtimeAllowed)return result(false,'account-or-runtime-denied');
    if(!same(request,p))return result(false,'stale-package');
    if(p.status==='withdrawn')return result(false,'package-withdrawn');
    if(!r.metadataAllowed)return result(false,'metadata-rights-denied');
    const owner=context.actorId===context.contentOwnerId;
    if(request.action==='stage-metadata')return result(owner&&p.status==='draft',owner&&p.status==='draft'?'metadata-staging-eligible':'staging-denied');
    if(!owner&&(!g||g.targetType!=='source-row-package'||!same(g,p)||g.reviewerId!==context.actorId||
      !g.active||g.revoked||!g.consentVerified||!g.qualificationVerified||!g.independenceVerified||
      context.actorId===context.packageAuthorId||p.status!=='staged'))return result(false,'reviewer-scope-denied');
    if(request.action==='read-source-bytes'){
      if(p.status!=='staged'||!r.sourceRetentionAllowed||!r.sourceDisplayAllowed)return result(false,'source-rights-or-stage-denied');
      if(!s.bytesVerified||s.actualSha256!==s.expectedSha256)return result(false,'source-unverified');
    }
    return result(true,'scoped-read-eligible');
  }catch{return result(false,'invalid-context');}
}
