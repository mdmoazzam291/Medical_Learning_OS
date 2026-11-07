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
