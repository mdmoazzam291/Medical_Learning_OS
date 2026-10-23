import test from 'node:test';
import assert from 'node:assert/strict';
import { projectReviewedMedicalRelations } from '../src/domain/medical-relationships.js';
import { preparationLibrary } from '../src/domain/preparation-pathways.js';
import { conceptNeighborhood } from '../src/domain/content-workspace.js';
import { neighborhoodMarkup } from '../web/content-workspace-view.js';
import { curriculum, library, profile } from './fixtures/preparation-fixture.js';

function fixture() {
  const lib=library();
  lib.sources=['artifact-source','relation-source','outside-source'].map(sourceId=>({sourceId,title:sourceId,version:'1',fingerprintSha256:'a'.repeat(64)}));
  for(const row of [...lib.questions,...lib.notes])row.sourceIds=['artifact-source'];
  const relation=(id,toConceptId,sourceId)=>({relationshipId:id,relationshipVersionId:id+'@1',version:1,
    fromConceptId:'foundation',toConceptId,relationType:'mechanism-of',sourceId,sourceVersion:'1',
    sourceFingerprintSha256:'a'.repeat(64),evidenceVersionId:id+'-evidence@1',claimText:'Synthetic reviewed assertion',
    reviewedAt:'2026-10-23T00:00:00Z',status:'published',medicalReviewVerified:true,referenceReviewVerified:true,rightsVerified:true});
  lib.medicalRelationships=projectReviewedMedicalRelations({concepts:lib.concepts,sources:lib.sources,
    relations:[relation('inside','shared','relation-source'),relation('outside','other','outside-source')]});
  lib.preparation={curriculum:curriculum(),profile};
  return lib;
}

test('goal scope removes excluded medical endpoints and retains the exact source of a visible relationship',()=>{
  const lib=fixture(),scoped=preparationLibrary(lib,'goals');
  assert.deepEqual(scoped.medicalRelationships.map(r=>r.relationshipVersionId),['inside@1']);
  assert.deepEqual(scoped.sources.map(s=>s.sourceId),['artifact-source','relation-source']);
  assert.deepEqual(conceptNeighborhood(scoped,'foundation',{perspective:'medical'}).edges.map(e=>e.evidenceVersionId),['inside-evidence@1']);
  assert.equal(lib.medicalRelationships.length,2,'Scoping must not mutate published input');
});

test('foundation scope cannot carry a goal-only medical relationship or its source',()=>{
  const scoped=preparationLibrary(fixture(),'foundations');
  assert.deepEqual(scoped.concepts.map(c=>c.conceptId),['foundation']);
  assert.deepEqual(scoped.medicalRelationships,[]);
  assert.deepEqual(scoped.sources.map(s=>s.sourceId),['artifact-source']);
  assert.deepEqual(conceptNeighborhood(scoped,'foundation',{perspective:'medical'}).edges,[]);
});

test('invalid and unmapped preparation clear medical relationships along with the empty inventory',()=>{
  for(const state of ['invalid','unmapped']) {
    const lib=fixture();
    if(state==='invalid')lib.preparation.profile={...profile,pathwayIds:['future'],primaryPathwayId:'future'};
    else lib.preparation.curriculum.mappings=[];
    const scoped=preparationLibrary(lib,'goals');
    assert.deepEqual(scoped.concepts,[],state);
    assert.deepEqual(scoped.sources,[],state);
    assert.deepEqual(scoped.medicalRelationships,[],state);
  }
});

test('Explore all and unconfigured preferences preserve published medical context without granting coverage',()=>{
  for(const state of ['all','unconfigured']) {
    const lib=fixture();if(state==='unconfigured')lib.preparation.profile=null;
    const scoped=preparationLibrary(lib,state==='all'?'all':'goals');
    assert.deepEqual(scoped.medicalRelationships.map(r=>r.relationshipVersionId),['inside@1','outside@1']);
    assert.equal(scoped.sources.length,3);
    assert.equal(conceptNeighborhood(scoped,'foundation',{perspective:'medical'}).edges.length,2);
  }
});

test('the graph renderer applies scope when called with the original API library',()=>{
  for(const [scope,want] of [['foundations',0],['goals',1],['all',2]]) {
    const lib=fixture();
    const graph=conceptNeighborhood(lib,'foundation',{perspective:'medical',scope});
    assert.equal(graph.edges.length,want,scope);
    const html=neighborhoodMarkup(lib,'foundation',{perspective:'medical',scope});
    assert.equal((html.match(/Synthetic reviewed assertion/g)||[]).length,want,scope);
    assert.equal(lib.medicalRelationships.length,2,'Rendering cannot mutate the API inventory');
  }
});

test('raw graph entry points cannot render assertions for invalid or unmapped preferences',()=>{
  for(const state of ['invalid','unmapped']) {
    const lib=fixture();
    if(state==='invalid')lib.preparation.profile={...profile,pathwayIds:['future'],primaryPathwayId:'future'};
    else lib.preparation.curriculum.mappings=[];
    const graph=conceptNeighborhood(lib,'foundation',{perspective:'medical',scope:'goals'});
    assert.deepEqual(graph.nodes,[],state);
    assert.deepEqual(graph.edges,[],state);
    assert.doesNotMatch(neighborhoodMarkup(lib,'foundation',{perspective:'medical',scope:'goals'}),/Synthetic reviewed assertion|inside@1|outside@1/,state);
  }
});
