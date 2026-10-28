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
  m.label.length>240||!m.label.trim()||typeof m.exists!=='boolean'||Object.keys(m).sort().join('|')!=='conceptId|exists|label')||
  new Set(members.map(m=>m.conceptId)).size!==members.length)fail();
 const version=c.pathways.find(p=>p.pathwayVersionId===input.pathwayVersionId&&p.status==='active');
 const registryMatches=input.registryVersion===c.registryVersion;
 const catalogMatches=input.authoredCatalogVersion===input.currentCatalogVersion;
 const missingCanonical=members.filter(m=>!m.exists).map(m=>m.conceptId);
 const warnings=[
  ...(!input.isLatest?['historical-draft']:[]),
  ...(!catalogMatches?['catalog-changed-since-draft']:[]),
  ...(!registryMatches?['curriculum-registry-changed']:[]),
  ...(!version?['pathway-version-unavailable']:[]),
  ...(missingCanonical.length?['canonical-ids-unavailable']:[]),
  ...(!members.length?['proposed-membership-empty']:[]),
  'independent-source-and-scope-review-required',
  'objective-authoring-and-approval-separate',
  'no-official-syllabus-completeness-attested'];
 const safe=Boolean(input.isLatest&&catalogMatches&&registryMatches&&version&&
  members.length&&!missingCanonical.length);
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
 const rows=members.map(m=>({conceptId:m.conceptId,label:m.label,canonicalExists:m.exists,
  exactApprovedMappings:safe?exact.get(m.conceptId)||[]:[],objectiveState:
  !safe?'not-evaluated':exact.has(m.conceptId)?'registry-approved-mapping':'unmapped'}));
 return {contractId:'admin-syllabus-review-packet-v1',baselineId:input.baselineId,revision:input.revision,
  digest:input.digest,scopeDeclaration:input.scopeDeclaration,sourceKind:input.sourceKind,
  sourceLocator:input.sourceLocator,sourceVersion:input.sourceVersion,
  pathwayVersionId:input.pathwayVersionId,registryVersion:input.registryVersion,
  authoredCatalogVersion:input.authoredCatalogVersion,currentCatalogVersion:input.currentCatalogVersion,
  status:'review-required',checklistApproved:false,officialSyllabusCertified:false,readinessInferred:false,
  coverageFraction:null,completeSyllabusFraction:null,preflightComparable:safe,
  proposedConcepts:members.length,exactMappedConcepts:safe?rows.filter(x=>x.exactApprovedMappings.length).length:null,
  objectiveMappingUnknown:safe?rows.filter(x=>!x.exactApprovedMappings.length).map(x=>x.conceptId):members.map(x=>x.conceptId),
  blockers:[...new Set(warnings)],rows};
}
