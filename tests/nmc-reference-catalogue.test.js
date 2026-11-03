import test from 'node:test';
import assert from 'node:assert/strict';
import catalogue from '../data/nmc-reference-catalogue.json' with {type:'json'};
import {validateReferenceCatalogue,topicKey,selectCatalogue} from '../src/domain/nmc-reference-catalogue.js';

test('catalogue preserves every defining reference, repeated IDs and malformed source cells',()=>{
 const c=validateReferenceCatalogue(catalogue);
 assert.equal(c.references.length,2634);
 assert.equal(new Set(c.references.map(r=>r.referenceId)).size,2634);
 assert.equal(c.references.filter(r=>r.searchCode==='GM9.8').length,2);
 assert.equal(c.references.filter(r=>r.identifierState==='unresolved').length,7);
 assert.equal(c.completeCompetencyCoverage,false);
 assert.equal(c.clinicalContentIncluded,false);
});
test('topic sharing uses spelling/format only, and generic headings remain scoped',()=>{
 assert.equal(topicKey('Anaemia','medicine'),topicKey('anemia','pediatrics'));
 assert.notEqual(topicKey('Introduction','medicine'),topicKey('Introduction','surgery'));
 assert.notEqual(topicKey('Anaemia','medicine'),topicKey('Iron deficiency anaemia','medicine'));
});
test('filter counts preserve appearances, code searches find groups, and page bounds clamp',()=>{
 const all=selectCatalogue(catalogue,{});
 assert.equal(all.referenceCount,2634);
 assert.ok(all.groupCount<catalogue.topics.length);
 const result=selectCatalogue(catalogue,{search:'GM9.8',page:999});
 assert.equal(result.referenceCount,2);
 assert.equal(result.page,1);
 assert.equal(selectCatalogue(catalogue,{subject:'anatomy'}).referenceCount,413);
 assert.equal(selectCatalogue(catalogue,{search:'no-such-reference'}).groupCount,0);
 assert.deepEqual(selectCatalogue(catalogue,{search:'anemia'}),selectCatalogue(catalogue,{search:'anaemia'}));
 assert.equal(catalogue.references.filter(r=>r.topicId===null).length,11);
 assert.ok(selectCatalogue(catalogue,{search:'bone tumors'}).referenceCount>0);
 assert.ok(selectCatalogue(catalogue,{search:'cerebral palsy'}).referenceCount>0);
 assert.ok(selectCatalogue(catalogue,{search:'epidemiology of'}).referenceCount>0);
 assert.ok(catalogue.references.filter(r=>/^SU(24|27)\./.test(r.searchCode)).every(r=>r.topicId===null));
});
test('invalid pointers, misleading approvals and duplicate source identities reject',()=>{
 for(const mutate of [c=>c.references[0].topicId='missing',c=>c.completeCompetencyCoverage=true,
  c=>c.references[1].referenceId=c.references[0].referenceId,c=>c.references[0].pdfPage=0,
  c=>c.references[0].description='unapproved clinical prose',c=>c.sourceUrl='https://attacker.example/']){
  const c=structuredClone(catalogue);mutate(c);assert.throws(()=>validateReferenceCatalogue(c));
 }
});
