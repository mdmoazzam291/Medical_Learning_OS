// Metadata-only staging-target guard for ADR-134 internal source review.
// No SDK, credentials, network, database calls, migrations, or authorization.
// Input metadata is untrusted until independently obtained from the provider;
// even a correct metadata match does NOT permit a write or deployment.
const POLICY_KEYS=Object.freeze([
 'schemaVersion','purpose','productionProjectRef','productionProjectName',
 'excludedLegacyProjectRefs','approvedStagingProjectRef',
 'requiredStagingProjectName','requiresExplicitOwnerApproval'
]);
const REF=/^[a-z0-9]{20}$/;
const ref=value=>typeof value==='string'&&REF.test(value);
const verdict=(reason,isolated=false)=>Object.freeze({
 reason,metadataOnly:true,
 isolatedStagingMetadataMatched:isolated,
 trustedProviderInventoryVerified:false,
 stagingIdentityVerified:false,
 stagingAuthAcceptanceApproved:false,
 stagingDbWriteApproved:false,
 managedMigrationApproved:false,
 productionSourceReviewApproved:false,
 reviewerGrantAuthorityVerified:false,
 learnerRelease:false
});
const record=(value,required,exact=true)=>{
 if(!value||typeof value!=='object'||Array.isArray(value)||
  ![Object.prototype,null].includes(Object.getPrototypeOf(value)))
  throw new TypeError('staging_inventory_invalid');
 const keys=Reflect.ownKeys(value);
 if(keys.some(k=>typeof k!=='string')||
  (exact&&keys.length!==required.length)||
  (exact&&keys.some(k=>!required.includes(k))))throw new TypeError('staging_inventory_invalid');
 const out=Object.create(null);
 for(const key of required){
  const descriptor=Object.getOwnPropertyDescriptor(value,key);
  if(!descriptor?.enumerable||!Object.hasOwn(descriptor,'value'))
   throw new TypeError('staging_inventory_invalid');
  out[key]=descriptor.value;
 }
 return out;
};
function readPolicy(value){
 const p=record(value,POLICY_KEYS);
 if(p.schemaVersion!==1||
  p.purpose!=='internal-source-row-review-auth-acceptance'||
  !ref(p.productionProjectRef)||
  p.productionProjectName!=='medical_learning_os'||
  p.requiredStagingProjectName!=='medical_learning_os_staging'||
  p.requiresExplicitOwnerApproval!==true||
  (p.approvedStagingProjectRef!==null&&!ref(p.approvedStagingProjectRef))||
  !Array.isArray(p.excludedLegacyProjectRefs)||
  p.excludedLegacyProjectRefs.length<1||p.excludedLegacyProjectRefs.length>10||
  p.excludedLegacyProjectRefs.some(value=>!ref(value))||
  new Set(p.excludedLegacyProjectRefs).size!==p.excludedLegacyProjectRefs.length||
  p.excludedLegacyProjectRefs.includes(p.productionProjectRef))
  throw new TypeError('staging_policy_invalid');
 if(p.approvedStagingProjectRef!==null&&
  (p.approvedStagingProjectRef===p.productionProjectRef||
   p.excludedLegacyProjectRefs.includes(p.approvedStagingProjectRef)))
  throw new TypeError('staging_policy_invalid');
 return p;
}
const PROJECT_FIELDS=['id','ref','name','organization_id','status'];
function projectMetadata(source){
 const p=record(source,PROJECT_FIELDS,false);
 if(!ref(p.id)||p.id!==p.ref||
  typeof p.name!=='string'||p.name.length<1||p.name.length>128||
  !ref(p.organization_id)||
  typeof p.status!=='string'||!['ACTIVE_HEALTHY','INACTIVE','PAUSED','COMING_UP','UNKNOWN'].includes(p.status))
  throw new TypeError('staging_inventory_invalid');
 return p;
}

/** Evaluates a read-only project-list snapshot against a reviewed pinning
 * policy. An operator must separately authenticate metadata provenance,
 * create a truly isolated target, and obtain approval for *any* hosted test.
 */
export function assessInternalReviewStagingTarget(policy,inventory){
 try{
  const p=readPolicy(policy);
  const snapshot=record(inventory,['projects'],false);
  if(!Array.isArray(snapshot.projects)||snapshot.projects.length<1||
   snapshot.projects.length>50)throw new TypeError('staging_inventory_invalid');
  const projects=snapshot.projects.map(projectMetadata);
  const ids=projects.map(x=>x.ref);
  if(new Set(ids).size!==ids.length)throw new TypeError('staging_inventory_invalid');
  const production=projects.find(x=>x.ref===p.productionProjectRef);
  if(!production||production.name!==p.productionProjectName||
   production.status!=='ACTIVE_HEALTHY')
   return verdict('production-identity-unverified');
  if(p.approvedStagingProjectRef===null)
   return verdict('no-owner-approved-staging-target');
  const candidate=projects.find(x=>x.ref===p.approvedStagingProjectRef);
  if(!candidate)return verdict('approved-staging-target-not-found');
  if(candidate.name!==p.requiredStagingProjectName||
   candidate.status!=='ACTIVE_HEALTHY'||
   candidate.organization_id!==production.organization_id)
   return verdict('staging-metadata-mismatch');
  return verdict('isolated-staging-metadata-candidate-only',true);
 }catch{return verdict('invalid-or-untrusted-metadata');}
}
