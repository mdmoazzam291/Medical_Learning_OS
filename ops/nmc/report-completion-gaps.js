// Repository evidence only. Source tasks and proposed mappings are not learner coverage.
import {readFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import catalogue from '../../data/nmc-reference-catalogue.json' with {type:'json'};
import pack from '../../data/nmc-learning-foundation-drafts.json' with {type:'json'};

// Reuse the complete source-accounting validation before generating the work queue.
const accounting=JSON.parse(execFileSync(process.execPath,[fileURLToPath(new URL('./report-foundation-coverage.js',import.meta.url))],{encoding:'utf8'}));
const directory=new URL('../../docs/evidence/',import.meta.url), tasks=new Map();
for(const name of readdirSync(directory).filter(name=>name.endsWith('-draft-tasks.json'))){
 const packet=JSON.parse(readFileSync(new URL(name,directory),'utf8'));
 for(const row of packet.rows)tasks.set(row.referenceId,{task:row.draftLearningTask,mode:row.mode,packet:'docs/evidence/'+name});
}
const exceptionName='2026-11-07-nmc-source-exception-task-packet.json';
const exceptions=JSON.parse(readFileSync(new URL(exceptionName,directory),'utf8'));
for(const row of exceptions.rows)tasks.set(row.referenceId,{task:row.draftLearningTask,mode:row.mode,packet:'docs/evidence/'+exceptionName});
const objectives=new Map(pack.objectives.map(row=>[row.objective.objectiveVersionId,row]));
execFileSync(process.execPath,[fileURLToPath(new URL('./verify-respiratory-bindings.js',import.meta.url))],{encoding:'utf8'});
const pilot=JSON.parse(readFileSync(new URL('2026-11-08-nmc-respiratory-artifact-bindings.json',directory),'utf8'));
const requirements=JSON.parse(readFileSync(new URL('2026-11-08-nmc-respiratory-components.json',directory),'utf8'));
const extension=JSON.parse(readFileSync(new URL('2026-11-08-nmc-respiratory-gap-artifact-bindings.json',directory),'utf8'));
const rows=catalogue.references.map(ref=>{
 const component=pilot.components.find(c=>c.referenceId===ref.referenceId);
 const pilotObjective=component?pilot.curriculum.objectives.find(o=>o.objectiveVersionId===component.objectiveVersionId):null;
 const draftArtifacts=pilotObjective?pilot.curriculum.artifacts.filter(a=>a.objectiveVersionIds.includes(pilotObjective.objectiveVersionId)):[];
 const bindings=pack.sourceBindings.filter(b=>b.referenceId===ref.referenceId);
 const proposedObjectives=bindings.map(b=>{const row=objectives.get(b.objectiveVersionId);return {objectiveVersionId:b.objectiveVersionId,conceptId:row.objective.conceptId,wording:row.wording,status:row.status};});
 if(pilotObjective)proposedObjectives.push({objectiveVersionId:pilotObjective.objectiveVersionId,conceptId:pilotObjective.conceptId,wording:component.wording,status:'draft',identityState:component.identityState});
 for(const row of extension.rows){
  const binding=row.canonicalObjectiveBinding;
  if(!binding||!requirements.rows.find(r=>r.referenceId===ref.referenceId)?.components.some(c=>c.componentId===row.componentId))continue;
  proposedObjectives.push(binding);
  draftArtifacts.push(...extension.curriculum.artifacts.filter(a=>a.objectiveVersionIds.includes(binding.objectiveVersionId)));
 }

 const deleted=ref.searchCode===exceptions.deletedReference.code&&Boolean(ref.amendmentNotice);
 const replacement=exceptions.officialReplacementTasks.find(r=>r.code===ref.searchCode&&ref.amendmentNotice);
 const task=tasks.get(ref.referenceId);
 return {referenceId:ref.referenceId,code:ref.observedCode,subjectId:ref.subjectId,pdfPage:ref.pdfPage,
  disposition:deleted?'historical-deletion':replacement?'official-replacement':task?'task-drafted':proposedObjectives.length?'objective-proposed':'missing-draft',
  task:task||null,replacementTasks:replacement?.draftLearningTasks||[],proposedObjectives,
  // Only exact draft bindings are listed. Published artifact availability is unknown.
  draftComponentMaterialBindings:extension.rows.filter(r=>requirements.rows.find(source=>source.referenceId===ref.referenceId)?.components.some(c=>c.componentId===r.componentId)),
  componentRequirements:requirements.rows.find(r=>r.referenceId===ref.referenceId)||null,teachingArtifactVersionIds:null,assessmentArtifactVersionIds:null,
  draftTeachingArtifactVersionIds:draftArtifacts.filter(a=>a.role==='teaching').map(a=>a.artifactVersionId),
  draftAssessmentArtifactVersionIds:draftArtifacts.filter(a=>a.role==='assessment').map(a=>a.artifactVersionId),
  coverageFraction:null,
  nextAction:deleted?'retain-historical-reference':proposedObjectives.length?'define-components-and-bind-artifact-versions':'resolve-canonical-scope-and-objectives'};
});
const subjects={};
for(const row of rows){const counts=subjects[row.subjectId]??={appearances:0,historical:0,needsCanonicalMapping:0,needsComponentAndArtifactBindings:0};counts.appearances++;if(row.disposition==='historical-deletion')counts.historical++;else if(row.proposedObjectives.length)counts.needsComponentAndArtifactBindings++;else counts.needsCanonicalMapping++;}
console.log(JSON.stringify({schemaVersion:1,sourceEdition:catalogue.edition,sourceSha256:catalogue.sourceSha256,draftVersion:pack.draftVersion,
 evidenceScope:'repository-drafts-only',productionStateVerified:false,adminApprovalRequired:false,
 sourceAccountingComplete:accounting.allSourceAppearancesAccountedFor,foundationComplete:false,
 totals:{appearances:rows.length,withProposedObjectives:rows.filter(r=>r.proposedObjectives.length).length,withDraftArtifactBindings:rows.filter(r=>r.draftTeachingArtifactVersionIds.length&&r.draftAssessmentArtifactVersionIds.length).length,historicalDeletions:rows.filter(r=>r.disposition==='historical-deletion').length},subjects,rows},null,2));
