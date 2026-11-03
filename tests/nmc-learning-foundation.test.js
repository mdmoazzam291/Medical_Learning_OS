import test from 'node:test';
import assert from 'node:assert/strict';
import pack from '../data/nmc-learning-foundation-drafts.json' with {type:'json'};
import catalogue from '../data/nmc-reference-catalogue.json' with {type:'json'};
import registry from '../data/preparation-curriculum.js';
import {validateFoundationDrafts,foundationDraftPage,canonicalIdentityDigest} from '../src/domain/nmc-learning-foundation.js';
async function fixture(){const p=structuredClone(pack);const concepts=p.objectives.map((r,i)=>({conceptId:r.objective.conceptId,label:'Synthetic identity '+i,aliases:[],subjectTags:['medicine']}));for(const [i,c] of concepts.entries())p.objectives[i].canonicalIdentitySha256=await canonicalIdentityDigest(c);return {p,catalog:{version:p.authoredCatalogVersion,concepts}};}
test('original objectives reuse the established objective shape, one canonical identity and two source proposals',()=>{
 const p=validateFoundationDrafts(pack,catalogue);assert.equal(p.objectives.length,10);assert.equal(p.sourceBindings.length,2);
 assert.equal(new Set(p.sourceBindings.map(r=>r.objectiveVersionId)).size,1);
 assert.equal(new Set(p.objectives.map(r=>r.objective.conceptId)).size,10);
 assert.equal(registry.objectives.length,0);assert.equal(registry.mappings.length,0);
});
test('Admin projection tracks all source appearances, pending originals and explicit canonical identities',async()=>{
 const {p,catalog}=await fixture();const result=await foundationDraftPage(p,catalogue,catalog,{});
 assert.equal(result.totals.sourceReferences,2634);assert.equal(result.totals.objectiveDrafts,10);assert.equal(result.totals.sourceLinkedReferences,2);
 assert.equal(result.acceptedMappings,0);assert.equal(result.learnerActivation,false);assert.equal(result.coverageFraction,null);
 assert.equal(result.objectives.find(r=>r.sourceReferences.length===2).identityState,'current');
 assert.equal(result.requirements.length,50);assert.equal(result.nextOffset,50);
 assert.equal((await foundationDraftPage(p,catalogue,catalog,{subject:'anatomy'})).filteredReferences,413);
});
test('stale, changed and missing canonical identities never silently remap',async()=>{
 const {p,catalog}=await fixture();catalog.concepts[0].label='Changed';catalog.concepts.pop();catalog.version++;
 const r=await foundationDraftPage(p,catalogue,catalog,{});
 assert.equal(r.catalogVersionMatches,false);assert.equal(r.objectives[0].identityState,'changed');assert.equal(r.objectives.at(-1).identityState,'missing');
 assert.equal(r.identityBindingsCurrent,false);assert.equal(r.acceptedMappings,0);
});
test('forged approval, duplicate IDs, unknown source refs and amended rows reject',()=>{
 const mutations=[p=>p.clinicalApproval=true,p=>p.objectives[1].objective.objectiveVersionId=p.objectives[0].objective.objectiveVersionId,
 p=>p.sourceBindings[0].referenceId='nmc-2024-ref:'+'a'.repeat(64),p=>p.sourceBindings[0].sourcePage++,p=>p.objectives[0].status='approved',
 p=>p.sourceBindings[0].objectiveVersionId='unknown@1',p=>p.sourceBindings[0].rowBBox=[0,0,0,0]];
 for(const mutate of mutations){const p=structuredClone(pack);mutate(p);assert.throws(()=>validateFoundationDrafts(p,catalogue));}
});
test('pagination and source filters reject malformed inputs',async()=>{
 const {p,catalog}=await fixture();for(const f of [{offset:-1},{offset:'x'},{subject:'invented'},{search:'x'.repeat(201)},{approved:true}])await assert.rejects(foundationDraftPage(p,catalogue,catalog,f));
});

test('control characters and nonprimitive offsets fail closed',async()=>{
 const {p,catalog}=await fixture();for(const f of [{search:'bad\nquery'},{offset:[]},{offset:{toString:()=> '0'}}])await assert.rejects(foundationDraftPage(p,catalogue,catalog,f));
});
