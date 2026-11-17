import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import pack from '../data/nmc-learning-foundation-drafts.json' with {type:'json'};
import catalogue from '../data/nmc-reference-catalogue.json' with {type:'json'};
import overlay from '../data/nmc-reference-overlay.json' with {type:'json'};
import registry from '../data/preparation-curriculum.js';
import {validateFoundationDrafts,foundationDraftPage,canonicalIdentityDigest} from '../src/domain/nmc-learning-foundation.js';
async function fixture(){
 const p=structuredClone(pack);
 const concepts=[...new Set(p.objectives.map(row=>row.objective.conceptId))].map((conceptId,i)=>({conceptId,label:'Synthetic identity '+i,aliases:[],subjectTags:['medicine']}));
 const digests=new Map();
 for(const concept of concepts)digests.set(concept.conceptId,await canonicalIdentityDigest(concept));
 for(const row of p.objectives)row.canonicalIdentitySha256=digests.get(row.objective.conceptId);
 return {p,catalog:{version:p.authoredCatalogVersion,concepts}};
}
test('original objectives reuse the established objective shape, stable canonical identities and scoped source proposals',()=>{
 const p=validateFoundationDrafts(pack,catalogue,overlay);assert.equal(p.objectives.length,2865);assert.equal(p.sourceBindings.length,2866);
 assert.equal(new Set(p.sourceBindings.map(r=>r.objectiveVersionId)).size,2865);
 assert.equal(new Set(p.objectives.map(r=>r.objective.conceptId)).size,1544);
 assert.equal(registry.objectives.length,0);assert.equal(registry.mappings.length,0);
});
test('Admin projection tracks all source appearances, pending originals and explicit canonical identities',async()=>{
 const {p,catalog}=await fixture();const result=await foundationDraftPage(p,catalogue,catalog,{},overlay);
 assert.equal(result.totals.sourceReferences,2634);assert.equal(result.totals.objectiveDrafts,2865);assert.equal(result.totals.sourceLinkedReferences,2633);
 assert.equal(result.acceptedMappings,0);assert.equal(result.learnerActivation,false);assert.equal(result.coverageFraction,null);
 assert.equal(result.objectives.find(r=>r.sourceReferences.length===2).identityState,'current');
 assert.equal(result.totals.unboundObjectiveDrafts,0);
 assert.equal(result.objectives.filter(row=>row.objective.conceptId===p.objectives[0].objective.conceptId).length,1);
 assert.ok(result.objectives.every(row=>row.identityState==='current'));
 assert.equal(result.requirements.length,50);assert.equal(result.nextOffset,50);
 assert.equal((await foundationDraftPage(p,catalogue,catalog,{subject:'anatomy'},overlay)).filteredReferences,413);
});
test('stale, changed and missing canonical identities never silently remap',async()=>{
 const {p,catalog}=await fixture();catalog.concepts[0].label='Changed';catalog.version++;
 const r=await foundationDraftPage(p,catalogue,catalog,{},overlay);
 assert.equal(r.catalogVersionMatches,false);assert.equal(r.objectives[0].identityState,'changed');const removed=catalog.concepts.pop();
 const after=await foundationDraftPage(p,catalogue,catalog,{},overlay);
 assert.equal(after.objectives.find(row=>row.objective.conceptId===removed.conceptId).identityState,'missing');
 assert.equal(r.identityBindingsCurrent,false);assert.equal(r.acceptedMappings,0);
});
test('forged approval, duplicate IDs, unknown source refs and amended rows reject',()=>{
 const mutations=[p=>p.clinicalApproval=true,p=>p.objectives.push(structuredClone(p.objectives[0])),
 p=>p.sourceBindings[0].referenceId='nmc-2024-ref:'+'a'.repeat(64),p=>p.sourceBindings[0].sourcePage++,p=>p.objectives[0].status='approved',
 p=>p.sourceBindings[0].objectiveVersionId='unknown@1',p=>p.sourceBindings[0].rowBBox=[0,0,0,0]];
 for(const mutate of mutations){const p=structuredClone(pack);mutate(p);assert.throws(()=>validateFoundationDrafts(p,catalogue,overlay));}
});
test('pagination and source filters reject malformed inputs',async()=>{
 const {p,catalog}=await fixture();for(const f of [{offset:-1},{offset:'x'},{subject:'invented'},{search:'x'.repeat(201)},{approved:true}])await assert.rejects(foundationDraftPage(p,catalogue,catalog,f,overlay));
});

test('control characters and nonprimitive offsets fail closed',async()=>{
 const {p,catalog}=await fixture();for(const f of [{search:'bad\nquery'},{offset:[]},{offset:{toString:()=> '0'}}])await assert.rejects(foundationDraftPage(p,catalogue,catalog,f,overlay));
});
test('Physiology batch v3 objectives sit in the registry on receipt-bound concept IDs with printed NMC depth',async()=>{
 const bind=JSON.parse(readFileSync(new URL('../docs/evidence/2026-11-16-nmc-physiology-objective-bindings-v1.json',import.meta.url)));
 const byOv=new Map(pack.objectives.map(r=>[r.objective.objectiveVersionId,r]));
 const inReg=bind.objectives.filter(o=>byOv.has(o.objectiveVersionId));
 assert.equal(inReg.length,187); // 185 + PY9.1 official-replacement pair (registry @23)
 for(const o of inReg){const r=byOv.get(o.objectiveVersionId);assert.equal(r.objective.conceptId,o.conceptId);assert.ok(['knows','knows-how','shows-how','performs'].includes(r.objective.depth));}
 assert.equal(pack.draftVersion,'mbbs-foundation:original-objectives@24');
});
test('source-exception bindings rest on an overlay resolution and deleted rows never bind',()=>{
 const pack=JSON.parse(readFileSync(new URL('../data/nmc-learning-foundation-drafts.json',import.meta.url)));
 const cat=JSON.parse(readFileSync(new URL('../data/nmc-reference-catalogue.json',import.meta.url)));
 const overlay=new Map(JSON.parse(readFileSync(new URL('../data/nmc-reference-overlay.json',import.meta.url))).rows.map(r=>[r.referenceId,r.kind]));
 const refs=new Map(cat.references.map(r=>[r.referenceId,r]));
 for(const b of pack.sourceBindings){
  const r=refs.get(b.referenceId),kind=overlay.get(b.referenceId);
  assert.notEqual(kind,'official-deletion');
  if(b.basis==='source-exception-resolved')assert.ok(['search-alias','topic-group'].includes(kind)&&(r.identifierState!=='standard'||r.topicId===null),b.referenceId);
  else if(b.basis==='official-replacement')assert.ok(kind==='official-replacement'&&r.amendmentNotice,b.referenceId);
  else assert.ok(r.identifierState==='standard'&&!r.amendmentNotice&&r.topicId!==null,b.referenceId);
 }
});

test('validator rejects exception bindings without the matching overlay resolution',()=>{
 const refs=new Map(catalogue.references.map(r=>[r.referenceId,r]));
 const idx=pack.sourceBindings.findIndex(b=>b.basis==='source-exception-resolved');
 const rep=pack.sourceBindings.findIndex(b=>b.basis==='official-replacement');
 const ref=pack.sourceBindings[idx].referenceId;
 assert.throws(()=>validateFoundationDrafts(pack,catalogue),/foundation_draft_invalid/,'overlay is required');
 const withoutRow={...overlay,rows:overlay.rows.filter(r=>r.referenceId!==ref)};
 assert.throws(()=>validateFoundationDrafts(pack,catalogue,withoutRow),/foundation_draft_invalid/,'missing overlay row');
 const wrongKind={...overlay,rows:overlay.rows.map(r=>r.referenceId===ref?{...r,kind:'official-deletion'}:r)};
 assert.throws(()=>validateFoundationDrafts(pack,catalogue,wrongKind),/foundation_draft_invalid/,'wrong overlay kind');
 const forged=structuredClone(pack);forged.sourceBindings[rep].basis='source-exception-resolved';
 assert.throws(()=>validateFoundationDrafts(forged,catalogue,overlay),/foundation_draft_invalid/,'replacement row cannot use the alias basis');
 const ps92=catalogue.references.find(r=>r.searchCode==='PS9.2');
 const deleted=structuredClone(pack);deleted.sourceBindings.push({...pack.sourceBindings[rep],referenceId:ps92.referenceId,sourcePage:ps92.pdfPage});
 assert.throws(()=>validateFoundationDrafts(deleted,catalogue,overlay),/foundation_draft_invalid/,'deleted row never binds');
 const standard=structuredClone(pack);const s=standard.sourceBindings.findIndex(b=>refs.get(b.referenceId).identifierState==='standard'&&refs.get(b.referenceId).topicId&&!refs.get(b.referenceId).amendmentNotice);
 standard.sourceBindings[s].basis='source-exception-resolved';
 assert.throws(()=>validateFoundationDrafts(standard,catalogue,overlay),/foundation_draft_invalid/,'standard row cannot claim an exception basis');
});
