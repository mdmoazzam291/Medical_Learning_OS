// A defensive, read-only presentation contract for reviewed clinical relations.
// Only a privileged server may set the verification flags, from source/rights
// and human-review records. The browser cannot grant medical authority.
export const MEDICAL_RELATION_TYPES = Object.freeze([
  'causes','mechanism-of','risk-factor-for','differential-of',
  'complication-of','treated-by','diagnosed-by','contraindicated-in'
]);
const TYPES=new Set(MEDICAL_RELATION_TYPES);
const IDENTIFIER=/^[a-zA-Z0-9:_@.-]{1,160}$/;
const HEX=/^[a-f0-9]{64}$/i;
const validId=x=>typeof x==='string'&&IDENTIFIER.test(x);
const recentInteger=x=>Number.isInteger(x)&&x>=1&&x<=1000000;
/**
 * Accept only complete, rights-checked and medically reviewed exact versions.
 * The upstream DB/RPC is the authority; this additionally fails closed if
 * metadata is absent, a source has changed version, or an endpoint is missing.
 *
 * Retired/newer unapproved versions suppress older publications: an old
 * asserted relationship must not silently reappear on retirement/correction.
 * Caller must supply all version states, not just published versions.
 */
export function projectReviewedMedicalRelations({relations=[],concepts=[],sources=[]}={}) {
  const known=new Set((Array.isArray(concepts)?concepts:[]).map(c=>c?.conceptId).filter(validId));
  const sourceMap=new Map((Array.isArray(sources)?sources:[]).filter(s=>validId(s?.sourceId)&&typeof s.version==='string').map(s=>[s.sourceId,s]));
  const input=Array.isArray(relations)?relations:[];
  const latest=new Map();
  for(const r of input){
    if(!validId(r?.relationshipId)||!recentInteger(r?.version))continue;
    const current=latest.get(r.relationshipId);
    if(!current || current.version<r.version)latest.set(r.relationshipId,r);
    else if(current.version===r.version)latest.set(r.relationshipId,{version:r.version,status:'ambiguous'}); // duplicate fails closed
  }
  const approved=[];
  for(const r of latest.values()){
    if(!r||r.status!=='published'||r.medicalReviewVerified!==true||r.referenceReviewVerified!==true||r.rightsVerified!==true)continue;
    if(!validId(r.relationshipVersionId)||!validId(r.fromConceptId)||!validId(r.toConceptId)||r.fromConceptId===r.toConceptId)continue;
    if(!known.has(r.fromConceptId)||!known.has(r.toConceptId)||!TYPES.has(r.relationType))continue;
    if(!validId(r.sourceId)||typeof r.sourceVersion!=='string'||!r.sourceVersion||sourceMap.get(r.sourceId)?.version!==r.sourceVersion)continue;
    if(!validId(r.evidenceVersionId)||typeof r.claimText!=='string'||!r.claimText.trim()||r.claimText.length>1500)continue;
    if(typeof r.sourceFingerprintSha256!=='string'||!HEX.test(r.sourceFingerprintSha256))continue;
    if(typeof r.reviewedAt!=='string'||!Number.isFinite(Date.parse(r.reviewedAt)))continue;
    approved.push({relationshipId:r.relationshipId,relationshipVersionId:r.relationshipVersionId,version:r.version,
      fromConceptId:r.fromConceptId,toConceptId:r.toConceptId,relationType:r.relationType,
      claimText:r.claimText,sourceId:r.sourceId,sourceVersion:r.sourceVersion,
      evidenceVersionId:r.evidenceVersionId,reviewedAt:r.reviewedAt});
  }
  return approved.sort((a,b)=>a.relationshipId.localeCompare(b.relationshipId));
}
