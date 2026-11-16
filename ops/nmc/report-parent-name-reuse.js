// Exact editorial labels propose name reuse, never equivalent objectives or competence.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url),text=path=>readFileSync(new URL(path,root),'utf8'),read=path=>JSON.parse(text(path));
const digest=value=>createHash('sha256').update(value).digest('hex');
const triagePath='docs/evidence/2026-11-08-nmc-unassessed-parent-reuse-triage.json';
const indexPath='docs/evidence/2026-11-08-nmc-foundation-names-only-index.json';
const triage=read(triagePath),index=read(indexPath),roles=read('docs/evidence/2026-11-08-nmc-name-role-proposals.json'),homes=read('docs/evidence/2026-11-08-nmc-missing-home-proposals.json');
assert.equal(triage.status,'names-only-unassessed-parent-reuse-triage');
const flags=['clinicalApproval','learnerActivation','automaticMerging','productionRegistryChecked','canonicalIdentityAllocation','officialSourceRechecked'];
for(const key of flags)assert.equal(triage[key],false);
assert.equal(digest(text(indexPath)),triage.sourceIndexSha256,'source index drift');
const byName=new Map(index.names.map(n=>[n.nameKey,n])),byRole=new Map(roles.entries.map(e=>[e.nameKey,e])),byHome=new Map(homes.homes.map(h=>[h.nameKey,h]));
assert.equal(byName.size,index.names.length);assert.equal(byRole.size,roles.entries.length);assert.equal(byHome.size,homes.homes.length);
const appearances=new Map();
for(const name of index.names)for(const a of name.appearances){
 if(appearances.has(a.referenceId))assert.deepEqual(appearances.get(a.referenceId),a,'source appearance conflict');
 appearances.set(a.referenceId,a);
}
const taskCache=new Map();
const task=a=>{
 if(taskCache.has(a.referenceId))return taskCache.get(a.referenceId);
 const matches=read(a.packet).rows.filter(t=>t.referenceId===a.referenceId);assert.equal(matches.length,1,'missing or ambiguous source task');
 const t=matches[0];assert.equal(t.subjectId,a.subjectId);assert.equal(t.code,a.code);assert.equal(t.page,a.pdfPage);
 assert(['knowledge','performance-and-knowledge'].includes(t.mode));assert(/^[a-f0-9]{64}$/.test(t.sourceBodySha256));
 const result={referenceId:t.referenceId,packetPath:a.packet,subjectId:t.subjectId,code:t.code,page:t.page,rowBBox:t.rowBBox,sourceBodySha256:t.sourceBodySha256,editorialTaskSha256:digest(t.draftLearningTask),mode:t.mode};
 taskCache.set(a.referenceId,result);return result;
};
const distinct=values=>[...new Set(values)].sort();
const metadata=refs=>distinct(refs).map(ref=>{const a=appearances.get(ref);assert(a,'unknown source reference');return task(a);});
const rows=[],seen=new Set();
for(const match of triage.matches){
 assert(!seen.has(match.parentNameKey),'duplicate parent reuse lead');seen.add(match.parentNameKey);
 const parent=byName.get(match.parentNameKey);assert(parent,'unknown parent name');
 assert.deepEqual(match.sourceAppearances,parent.appearances,'parent appearance drift');
 assert.equal(match.targetNameKey,match.parentNameKey,'reuse is exact-label only');
 let targetRefs,target;
 if(match.targetKind==='existing-component-name-candidate'){
  const role=byRole.get(match.targetNameKey);assert.equal(role?.classificationRole,'reusable-name-candidate');
  assert.deepEqual(match.targetComponentProposalIds,role.occurrences.map(o=>o.componentProposalId),'target component drift');
  targetRefs=role.occurrences.flatMap(o=>o.sourceReferenceIds);target={targetComponentProposalIds:match.targetComponentProposalIds};
 }else{
  assert.equal(match.targetKind,'existing-authoring-home-proposal');
  const home=byHome.get(match.targetNameKey);assert(home);assert.equal(match.targetHomeProposalId,home.homeProposalId,'target home drift');
  targetRefs=home.facetBindings.flatMap(f=>f.sourceReferenceIds);target={targetHomeProposalId:match.targetHomeProposalId};
 }
 const sourceTasks=metadata(parent.appearances.map(a=>a.referenceId)),targetSourceTasks=metadata(targetRefs);
 assert(sourceTasks.length&&targetSourceTasks.length);
 const sourceSubjectIds=distinct(sourceTasks.map(t=>t.subjectId)),targetSubjectIds=distinct(targetSourceTasks.map(t=>t.subjectId));
 const sourceAssessmentModes=distinct(sourceTasks.map(t=>t.mode)),targetAssessmentModes=distinct(targetSourceTasks.map(t=>t.mode));
 const sourceTaskDigests=distinct(sourceTasks.map(t=>t.editorialTaskSha256)),targetTaskDigests=distinct(targetSourceTasks.map(t=>t.editorialTaskSha256));
 rows.push({parentNameKey:match.parentNameKey,targetKind:match.targetKind,targetNameKey:match.targetNameKey,...target,reuseLevel:'editorial-name-only',semanticEquivalence:'unverified',canonicalConceptId:null,canonicalObjectiveVersionId:null,mappingAccepted:false,taskEquivalenceAccepted:false,scopeComplete:false,sourceTasks,targetSourceTasks,boundarySignals:{sourceSubjectIds,targetSubjectIds,sourceAssessmentModes,targetAssessmentModes,subjectSetsDiffer:JSON.stringify(sourceSubjectIds)!==JSON.stringify(targetSubjectIds),assessmentModeSetsDiffer:JSON.stringify(sourceAssessmentModes)!==JSON.stringify(targetAssessmentModes),taskDigestSetsDiffer:JSON.stringify(sourceTaskDigests)!==JSON.stringify(targetTaskDigests)}});
}
rows.sort((a,b)=>a.parentNameKey.localeCompare(b.parentNameKey));
const result={schemaVersion:1,status:'names-only-parent-name-reuse-proposals',sourceTriagePath:triagePath,sourceTriageSha256:digest(text(triagePath)),sourceIndexPath:indexPath,sourceIndexSha256:triage.sourceIndexSha256,...Object.fromEntries(flags.map(k=>[k,false])),coverageFraction:null,totals:{parentNames:rows.length,sourceTaskAppearances:rows.reduce((n,r)=>n+r.sourceTasks.length,0),distinctSourceReferences:distinct(rows.flatMap(r=>r.sourceTasks.map(t=>t.referenceId))).length,distinctTargetReferences:distinct(rows.flatMap(r=>r.targetSourceTasks.map(t=>t.referenceId))).length,assessmentModeSetDifferences:rows.filter(r=>r.boundarySignals.assessmentModeSetsDiffer).length,subjectSetDifferences:rows.filter(r=>r.boundarySignals.subjectSetsDiffer).length,taskDigestSetDifferences:rows.filter(r=>r.boundarySignals.taskDigestSetsDiffer).length},rows};
if(process.argv.includes('--verify')){
 assert.deepEqual(read('docs/evidence/2026-11-08-nmc-parent-name-reuse-proposals.json'),result,'parent reuse projection differs from evidence');
 console.log(JSON.stringify({status:'PASS',...result.totals,canonicalAcceptance:false,taskEquivalence:false}));
}else console.log(JSON.stringify(result,null,2));
