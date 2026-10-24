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

test('invalid profiles hide scoped medical context, but unmapped goals retain reviewed published context',()=>{
  const invalid=fixture();
  invalid.preparation.profile={...profile,pathwayIds:['future'],primaryPathwayId:'future'};
  const blocked=preparationLibrary(invalid,'goals');
  assert.deepEqual(blocked.concepts,[]);
  assert.deepEqual(blocked.sources,[]);
  assert.deepEqual(blocked.medicalRelationships,[]);

  const unmapped=fixture();
  unmapped.preparation.curriculum.mappings=[];
  const general=preparationLibrary(unmapped,'goals');
  assert.equal(general.preparation.fallbackReason,'unmapped-goal-requirements');
  assert.deepEqual(general.concepts,unmapped.concepts);
  assert.deepEqual(general.sources,unmapped.sources);
  assert.deepEqual(general.medicalRelationships,unmapped.medicalRelationships);
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

test('raw graph entry points reject invalid profiles but retain reviewed unmapped medical context',()=>{
  const invalid=fixture();
  invalid.preparation.profile={...profile,pathwayIds:['future'],primaryPathwayId:'future'};
  const hidden=conceptNeighborhood(invalid,'foundation',{perspective:'medical',scope:'goals'});
  assert.deepEqual(hidden.nodes,[]);
  assert.deepEqual(hidden.edges,[]);
  assert.doesNotMatch(neighborhoodMarkup(invalid,'foundation',{perspective:'medical',scope:'goals'}),/Synthetic reviewed assertion|inside@1|outside@1/);

  const unmapped=fixture();
  unmapped.preparation.curriculum.mappings=[];
  const graph=conceptNeighborhood(unmapped,'foundation',{perspective:'medical',scope:'goals'});
  assert.equal(graph.edges.length,2);
  assert.equal((neighborhoodMarkup(unmapped,'foundation',{perspective:'medical',scope:'goals'}).match(/Synthetic reviewed assertion/g)||[]).length,2);
});
