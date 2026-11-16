import test from 'node:test';
import assert from 'node:assert/strict';
import {projectFoundationBasics} from '../src/domain/nmc-basics-projection.js';
const objective=(key,conceptId,prerequisites=[])=>({objectiveId:`lo:${key}`,objectiveVersionId:`lo:${key}@1`,conceptId,task:'interpretation',depth:'applied',context:{jurisdiction:'unspecified',population:'unspecified',setting:'education'},prerequisites});
const curriculum=()=>({schemaVersion:1,registryVersion:'fixture@1',pathways:[],mappings:[],artifacts:[],objectives:[objective('target-a','C-a',['lo:shared@1']),objective('target-b','C-b',['lo:shared@1','lo:other@1']),objective('shared','C-shared'),objective('other','C-shared')]});
test('Basics orders dependencies and shares canonical concepts across targets',()=>{
 const c=curriculum(),before=structuredClone(c);
 const p=projectFoundationBasics(c,['lo:target-a@1','lo:target-b@1']);
 assert.deepEqual(p.objectiveVersionIds,['lo:shared@1','lo:target-a@1','lo:other@1','lo:target-b@1']);
 assert.deepEqual(p.basicsObjectiveVersionIds,['lo:shared@1','lo:other@1']);
 assert.equal(p.concepts.filter(x=>x.conceptId==='C-shared').length,1);
 assert.deepEqual(p.concepts.find(x=>x.conceptId==='C-shared').objectiveVersionIds,['lo:shared@1','lo:other@1']);
 assert.deepEqual(p.concepts.find(x=>x.conceptId==='C-shared').requiredByTargetObjectiveVersionIds,['lo:target-a@1','lo:target-b@1']);
 assert.equal(p.coverageFraction,null); assert.equal(p.readinessInferred,false);
 assert.deepEqual(c,before);
 p.concepts[0].objectiveVersionIds.push('mutated');assert.deepEqual(c,before);
});
test('a target that is also a prerequisite remains a target',()=>{
 const p=projectFoundationBasics(curriculum(),['lo:shared@1','lo:target-a@1']);
 assert.deepEqual(p.basicsObjectiveVersionIds,[]);
 assert.deepEqual(p.targetObjectiveVersionIds,['lo:shared@1','lo:target-a@1']);
});
test('empty targets produce empty projection',()=>assert.deepEqual(projectFoundationBasics(curriculum(),[]).concepts,[]));
test('rejects unknown, duplicate and malformed targets',()=>{
 for(const ids of [['unknown'],['lo:shared@1','lo:shared@1'],null,'lo:shared@1',[null]])assert.throws(()=>projectFoundationBasics(curriculum(),ids));
});
test('rejects missing prerequisite and cyclic graph',()=>{
 const missing=curriculum();missing.objectives[0].prerequisites=['lo:missing@1'];
 assert.throws(()=>projectFoundationBasics(missing,['lo:target-a@1']));
 const cyclic=curriculum();cyclic.objectives[2].prerequisites=['lo:target-a@1'];
 assert.throws(()=>projectFoundationBasics(cyclic,['lo:target-a@1']),/cycle/);
});
