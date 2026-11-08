import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const scope=read('docs/evidence/2026-11-08-nmc-endocarditis-cross-subject-components.json');
const path='docs/evidence/2026-11-08-nmc-endocarditis-evidence-integration-bundle.json';
const b=read(path);
assert.equal(b.status,'draft-component-learning-bundle');
for(const key of ['clinicalApproval','learnerActivation'])assert.equal(b[key],false);
for(const key of ['canonicalConceptId','canonicalObjectiveVersionId','coverageFraction'])assert.equal(b[key],null);
const row=scope.rows.find(r=>r.referenceId===b.referenceId);assert(row);
const component=row.components.find(c=>c.componentId===b.componentId);assert(component);
assert.equal(component.draftLearningBundlePath,path);
assert.equal(b.cases.length,2);
const artifacts=[b.teaching,...b.cases,b.rubric],ids=artifacts.map(a=>a.artifactVersionId);
assert.equal(new Set(ids).size,ids.length);
assert.deepEqual(component.draftMaterialVersionIds,ids);
assert(typeof b.teaching.body==='string'&&b.teaching.body.length>40);
for(const c of b.cases){
 assert.equal(c.fictional,true);assert(typeof c.familyId==='string'&&c.familyId.length>0);
 for(const key of ['inputs','prompt'])assert(typeof c[key]==='string'&&c[key].length>20);
 assert(Array.isArray(c.draftKey)&&c.draftKey.length>0&&c.draftKey.every(k=>typeof k==='string'&&k.length>10));
}
assert.equal(b.rubric.validated,false);assert.equal(b.rubric.passThreshold,null);
assert.equal(b.rubric.dimensions.length,4);assert.equal(new Set(b.rubric.dimensions).size,4);
assert(b.source.url.startsWith('https://'));assert(b.source.locators.length>0);
console.log('Verified endocarditis bundle: exact component and four artifact IDs; draft-only evidence');
