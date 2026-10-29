// This is a read-only review packet, not an accepted syllabus or learner readiness model.
import {validatePreparationCurriculum} from './preparation-pathways.js';
const fail=()=>{throw new TypeError('syllabus_review_preflight_invalid');};
const id=x=>typeof x==='string'&&/^[a-zA-Z0-9:_.@-]{1,160}$/.test(x);
export function alignSyllabusReviewPacket(input,curriculum){
 const c=validatePreparationCurriculum(curriculum);
 if(!input||input.contractId!=='admin-syllabus-review-preflight-v1'||
   typeof input.baselineId!=='string'||!Number.isInteger(input.revision)||input.revision<1||
   typeof input.digest!=='string'||!/^[a-f0-9]{64}$/.test(input.digest)||
   !Number.isSafeInteger(input.authoredCatalogVersion)||!Number.isSafeInteger(input.currentCatalogVersion)||
   typeof input.registryVersion!=='string'||typeof input.pathwayVersionId!=='string'||
   !['partial','complete-proposed'].includes(input.scopeDeclaration)||
   !['official','expert','historical'].includes(input.sourceKind)||
   typeof input.sourceLocator!=='string'||typeof input.sourceVersion!=='string'||
   typeof input.isLatest!=='boolean'||!Array.isArray(input.members)||input.members.length>2000)fail();
 const members=input.members;
 if(members.some(m=>!m||!id(m.conceptId)||typeof m.label!=='string'||
  m.label.length>240||!m.label.trim()||
  !['canonical','accepted-private','missing'].includes(m.kind)||
  typeof m.bindingMatches!=='boolean'||Object.keys(m).sort().join('|')!==
   'bindingMatches|conceptId|identityDigest|kind|label'||
  (m.kind==='accepted-private'?!/^[a-f0-9]{64}$/.test(m.identityDigest):
   m.identityDigest!==null))||
  new Set(members.map(m=>m.conceptId)).size!==members.length)fail();
 const version=c.pathways.find(p=>p.pathwayVersionId===input.pathwayVersionId&&p.status==='active');
 const registryMatches=input.registryVersion===c.registryVersion;
 const catalogMatches=input.authoredCatalogVersion===input.currentCatalogVersion;
 const missingIdentity=members.filter(m=>m.kind==='missing').map(m=>m.conceptId);
 const privateAccepted=members.filter(m=>m.kind==='accepted-private').map(m=>m.conceptId);
 const staleBindings=members.filter(m=>!m.bindingMatches).map(m=>m.conceptId);
 const identityResolved=Boolean(members.length&&!missingIdentity.length&&!staleBindings.length);
 const warnings=[
  ...(!input.isLatest?['historical-draft']:[]),
  ...(!catalogMatches?['catalog-changed-since-draft']:[]),
  ...(!registryMatches?['curriculum-registry-changed']:[]),
  ...(!version?['pathway-version-unavailable']:[]),
  ...(missingIdentity.length?['proposed-concept-ids-unavailable']:[]),
  ...(staleBindings.length?['identity-binding-stale-or-missing']:[]),
  ...(privateAccepted.length?['private-identities-not-learner-published']:[]),
  ...(!members.length?['proposed-membership-empty']:[]),
  'independent-source-and-scope-review-required',
  'objective-authoring-and-approval-separate',
  'no-official-syllabus-completeness-attested'];
 // Approved objective mapping comparability requires *published* canonical IDs.
 // A verified private identity is valid for Admin draft membership, not yet
 // authoritative for learner curriculum alignment or a syllabus denominator.
 const safe=Boolean(input.isLatest&&catalogMatches&&registryMatches&&version&&
  identityResolved&&!privateAccepted.length);
 const objectivesById=new Map(c.objectives.map(x=>[x.objectiveVersionId,x]));
 const exact=new Map();
 if(safe){
  for(const m of c.mappings.filter(x=>x.pathwayVersionId===version.pathwayVersionId&&x.status==='approved'&&x.reviewedBy)){
   const o=objectivesById.get(m.objectiveVersionId);if(!o)fail();
   if(!exact.has(o.conceptId))exact.set(o.conceptId,[]);
   exact.get(o.conceptId).push({objectiveVersionId:o.objectiveVersionId,task:o.task,depth:o.depth,
    sourceKind:m.evidence.kind,sourceVersion:m.evidence.sourceVersion});
  }
 }
 const rows=members.map(m=>({conceptId:m.conceptId,label:m.label,
  canonicalExists:m.kind==='canonical',identityKind:m.kind,
  privateIdentityDigest:m.kind==='accepted-private'?m.identityDigest:null,
  identityBindingMatches:m.bindingMatches,
  exactApprovedMappings:safe?exact.get(m.conceptId)||[]:[],objectiveState:
  !m.bindingMatches?'identity-binding-unverified':
  m.kind==='accepted-private'?'private-identity-not-published':
  !safe?'not-evaluated':exact.has(m.conceptId)?'registry-approved-mapping':'unmapped'}));
 return {contractId:'admin-syllabus-review-packet-v1',baselineId:input.baselineId,revision:input.revision,
  digest:input.digest,scopeDeclaration:input.scopeDeclaration,sourceKind:input.sourceKind,
  sourceLocator:input.sourceLocator,sourceVersion:input.sourceVersion,
  pathwayVersionId:input.pathwayVersionId,registryVersion:input.registryVersion,
  authoredCatalogVersion:input.authoredCatalogVersion,currentCatalogVersion:input.currentCatalogVersion,
  status:'review-required',checklistApproved:false,officialSyllabusCertified:false,readinessInferred:false,
  coverageFraction:null,completeSyllabusFraction:null,preflightComparable:safe,
  identityResolved,privateAcceptedConcepts:privateAccepted,missingConcepts:missingIdentity,
  proposedConcepts:members.length,exactMappedConcepts:safe?rows.filter(x=>x.exactApprovedMappings.length).length:null,
  objectiveMappingUnknown:safe?rows.filter(x=>!x.exactApprovedMappings.length).map(x=>x.conceptId):members.map(x=>x.conceptId),
  blockers:[...new Set(warnings)],rows};
}
