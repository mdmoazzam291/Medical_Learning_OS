import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validatePreparationCurriculum} from '../../src/domain/preparation-pathways.js';
import catalogue from '../../data/nmc-reference-catalogue.json' with {type:'json'};
const root=new URL('../../',import.meta.url);
const p=JSON.parse(readFileSync(new URL('docs/evidence/2026-11-08-nmc-respiratory-artifact-bindings.json',root),'utf8'));
assert.equal(p.status,'draft-authoring-bindings');assert.equal(p.clinicalApproval,false);assert.equal(p.learnerActivation,false);
const c=validatePreparationCurriculum(p.curriculum);
assert.equal(c.objectives.length,3);assert.equal(c.artifacts.length,12);
assert.equal(p.components.length,3);assert.equal(p.artifactLocators.length,12);
assert.equal(new Set(p.components.map(x=>x.referenceId)).size,3);
assert.equal(new Set(p.artifactLocators.map(x=>x.artifactVersionId)).size,12);
for(const component of p.components){
 assert(catalogue.references.some(r=>r.referenceId===component.referenceId&&r.searchCode===component.code));
 assert(c.objectives.some(o=>o.objectiveVersionId===component.objectiveVersionId));
 assert.equal(component.scope,'partial-simulated-component');assert.equal(component.completeRequirementSetKnown,false);assert.equal(component.coverageFraction,null);
}
for(const a of c.artifacts){
 assert.equal(a.status,'draft');assert.equal(a.reviewedBy,null);
 const locator=p.artifactLocators.find(l=>l.artifactVersionId===a.artifactVersionId);assert(locator);
 assert(/^docs\/evidence\/[a-z0-9-]+\.md$/.test(locator.path));
 const body=readFileSync(new URL(locator.path,root));
 assert.equal(createHash('sha256').update(body).digest('hex'),locator.fileSha256);
 assert(a.artifactVersionId.endsWith('@sha256:'+locator.fileSha256));
 const text=body.toString('utf8');
 assert(text.includes(a.artifactKind==='case'?'| '+locator.section+' |':'## '+locator.section+'\n'));
 if(a.artifactKind==='case')assert(text.includes('## '+locator.rubricSection+'\n'));
}
for(const o of c.objectives){
 assert.equal(c.artifacts.filter(a=>a.objectiveVersionIds.includes(o.objectiveVersionId)&&a.role==='teaching').length,1);
 assert.equal(c.artifacts.filter(a=>a.objectiveVersionIds.includes(o.objectiveVersionId)&&a.role==='assessment').length,3);
}
console.log('Respiratory bindings verified: 3 objectives, 3 teaching notes, 9 simulated cases; all draft-only');
const requirements=JSON.parse(readFileSync(new URL('docs/evidence/2026-11-08-nmc-respiratory-components.json',root),'utf8'));
assert.equal(requirements.status,'draft-component-decomposition');
assert.equal(requirements.sourceEdition,catalogue.edition);assert.equal(requirements.sourceSha256,catalogue.sourceSha256);
assert.equal(requirements.clinicalApproval,false);assert.equal(requirements.learnerActivation,false);
assert.equal(requirements.rows.length,3);
const ids=new Set(),referenceIds=new Set();
for(const row of requirements.rows){
 assert(!referenceIds.has(row.referenceId));referenceIds.add(row.referenceId);
 assert(catalogue.references.some(r=>r.referenceId===row.referenceId&&r.searchCode===row.code&&r.pdfPage===row.pdfPage));
 assert.equal(row.completeRequirementSetKnown,false);assert.equal(row.coverageFraction,null);
 assert(/^[a-f0-9]{64}$/.test(row.sourceBodySha256));assert(row.components.length>0);
 for(const component of row.components){
  assert(!ids.has(component.componentId));ids.add(component.componentId);
  assert.equal(component.clinicalValidation,false);
  for(const field of ['wording','assessmentPrompt','expectedEvidence'])assert(typeof component[field]==='string'&&component[field].trim());
  assert(['pilot-candidate-partial','broader-test-scope-unbound','explicit-assessment-missing'].includes(component.evidenceStatus));
  assert.equal(component.bindingStatus,component.candidateObjectiveVersionIds.length?'candidate-only':'unbound');
  for(const id of component.candidateObjectiveVersionIds)assert(p.components.some(x=>x.referenceId===row.referenceId&&x.objectiveVersionId===id));
 }
}
assert.equal(ids.size,10);
console.log('Respiratory source components verified: 10 unique components, incomplete scope and candidate bindings explicit');
const extension=JSON.parse(readFileSync(new URL('docs/evidence/2026-11-08-nmc-respiratory-gap-artifact-bindings.json',root),'utf8'));
assert.equal(extension.status,'draft-component-material-bindings');assert.equal(extension.clinicalApproval,false);assert.equal(extension.learnerActivation,false);
assert.equal(extension.completeRequirementSetKnown,false);assert.equal(extension.coverageFraction,null);
assert.equal(extension.rows.length,3);assert.equal(new Set(extension.rows.map(r=>r.componentId)).size,3);
const gapCurriculum=validatePreparationCurriculum(extension.curriculum);
assert.equal(gapCurriculum.objectives.length,2);assert.equal(gapCurriculum.artifacts.length,8);
const extensionArtifactIds=new Set();
for(const row of extension.rows){
 assert(ids.has(row.componentId));
 if(row.canonicalObjectiveBinding===null){assert.equal(row.bindingStatus,'draft-material-only');assert.equal(row.componentId,'nmc-component:gm28.11:test-principles@1');}
 else {
  const binding=row.canonicalObjectiveBinding;
  assert.equal(row.bindingStatus,'draft-objective-and-material');assert.equal(binding.status,'draft');assert.equal(binding.identityState,'existing-proposal');assert.equal(binding.scope,'partial-COPD-simulation');
  assert.equal(binding.conceptId,'C-f2c27acd-d39a-4558-9f04-83aa591d72fd');
  assert(row.componentId.startsWith('nmc-component:gm28.18:'));
  assert(gapCurriculum.objectives.some(o=>o.objectiveVersionId===binding.objectiveVersionId&&o.conceptId===binding.conceptId));
  assert.equal(gapCurriculum.artifacts.filter(a=>a.objectiveVersionIds.includes(binding.objectiveVersionId)).length,4);
 }

 assert(/^docs\/evidence\/[a-z0-9-]+\.md$/.test(row.path));
 const body=readFileSync(new URL(row.path,root));assert.equal(createHash('sha256').update(body).digest('hex'),row.fileSha256);
 assert.equal(row.artifacts.length,4);assert.equal(row.artifacts.filter(a=>a.role==='teaching').length,1);assert.equal(row.artifacts.filter(a=>a.role==='assessment').length,3);
 for(const a of row.artifacts){
  assert(!extensionArtifactIds.has(a.artifactVersionId));extensionArtifactIds.add(a.artifactVersionId);
  assert(a.artifactVersionId.endsWith('@sha256:'+row.fileSha256));
  if(row.canonicalObjectiveBinding){
   const artifact=gapCurriculum.artifacts.find(x=>x.artifactVersionId===a.artifactVersionId);
   assert(artifact);assert.equal(artifact.status,'draft');assert.equal(artifact.reviewedBy,null);
   assert.deepEqual(artifact.objectiveVersionIds,[row.canonicalObjectiveBinding.objectiveVersionId]);
   assert.equal(artifact.role,a.role);assert.equal(artifact.artifactKind,a.kind);assert.equal(artifact.familyId,a.familyId);
  }
  assert.equal(a.kind,a.role==='teaching'?'note':'case');
  assert(body.toString('utf8').includes(a.kind==='note'?'## '+a.section+'\n':'| '+a.section+' |'));
  if(a.kind==='case'){assert(body.toString('utf8').includes('## '+a.rubricSection+'\n'));assert(typeof a.familyId==='string'&&a.familyId.length>0);}
 }
}
console.log('Gap material verified: 3 component teaching extensions, 9 cases, exact file hashes; 2 scoped draft objective bindings, PFT identity unresolved');
