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
// Conflicting canonical identities must not be resolved by array order.
function uniqueIndex(rows, key) {
  const result = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = row?.[key];
    if (!validId(id)) continue;
    result.set(id, result.has(id) ? null : row);
  }
  return result;
}
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
  const conceptMap=uniqueIndex(concepts,'conceptId');
  const sourceMap=uniqueIndex(sources,'sourceId');
  const input=Array.isArray(relations)?relations:[];
  const latest=new Map();
  const invalidIdentities=new Set();
  const versionOwners=new Map();
  const conflictingVersionIds=new Set();
  for(const r of input){
    if(!validId(r?.relationshipId))continue;
    if(validId(r.relationshipVersionId)) {
      const owner=versionOwners.get(r.relationshipVersionId);
      if(owner && (owner.relationshipId!==r.relationshipId || owner.version!==r.version))conflictingVersionIds.add(r.relationshipVersionId);
      versionOwners.set(r.relationshipVersionId,{relationshipId:r.relationshipId,version:r.version});
    }
    if(!recentInteger(r?.version)){invalidIdentities.add(r.relationshipId);continue;}
    const current=latest.get(r.relationshipId);
    if(!current || current.version<r.version)latest.set(r.relationshipId,r);
    else if(current.version===r.version)latest.set(r.relationshipId,{version:r.version,status:'ambiguous'}); // duplicate fails closed
  }
  const approved=[];
  for(const r of latest.values()){
    if(invalidIdentities.has(r.relationshipId)||conflictingVersionIds.has(r.relationshipVersionId))continue;
    if(!r||r.status!=='published'||r.medicalReviewVerified!==true||r.referenceReviewVerified!==true||r.rightsVerified!==true)continue;
    if(!validId(r.relationshipVersionId)||!validId(r.fromConceptId)||!validId(r.toConceptId)||r.fromConceptId===r.toConceptId)continue;
    if(!conceptMap.get(r.fromConceptId)||!conceptMap.get(r.toConceptId)||!TYPES.has(r.relationType))continue;
    if(!validId(r.sourceId)||typeof r.sourceVersion!=='string'||!r.sourceVersion||sourceMap.get(r.sourceId)?.version!==r.sourceVersion)continue;
    if(!validId(r.evidenceVersionId)||typeof r.claimText!=='string'||!r.claimText.trim()||r.claimText.length>1500)continue;
    if(typeof r.sourceFingerprintSha256!=='string'||!HEX.test(r.sourceFingerprintSha256))continue;
    const currentFingerprint=sourceMap.get(r.sourceId)?.fingerprintSha256;
    if(typeof currentFingerprint!=='string'||!HEX.test(currentFingerprint)||currentFingerprint.toLowerCase()!==r.sourceFingerprintSha256.toLowerCase())continue;
    if(typeof r.reviewedAt!=='string'||!Number.isFinite(Date.parse(r.reviewedAt)))continue;
    approved.push({relationshipId:r.relationshipId,relationshipVersionId:r.relationshipVersionId,version:r.version,
      fromConceptId:r.fromConceptId,toConceptId:r.toConceptId,relationType:r.relationType,
      claimText:r.claimText,sourceId:r.sourceId,sourceVersion:r.sourceVersion,
      evidenceVersionId:r.evidenceVersionId,reviewedAt:r.reviewedAt});
  }
  return approved.sort((a,b)=>a.relationshipId.localeCompare(b.relationshipId));
}
