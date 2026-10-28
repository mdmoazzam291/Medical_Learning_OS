import test from 'node:test';import assert from 'node:assert/strict';
import {alignSyllabusReviewPacket} from '../src/domain/syllabus-review-preflight.js';
const curriculum={schemaVersion:1,registryVersion:'pg-preparation:foundation@1',
 pathways:[{pathwayId:'neet-pg',pathwayVersionId:'neet-pg:preparation@1',label:'NEET-PG',status:'active'}],
 objectives:[{objectiveId:'o1',objectiveVersionId:'o1@1',conceptId:'one',task:'diagnosis',depth:'core',
 context:{jurisdiction:'India',population:'adult',setting:'clinic'},prerequisites:[]}],
 mappings:[{mappingId:'m1',pathwayVersionId:'neet-pg:preparation@1',objectiveVersionId:'o1@1',
 status:'approved',evidence:{kind:'expert',sourceId:'s1',sourceVersion:'2026'},reviewedBy:'reviewer'}],
 artifacts:[]};
const packet=()=>({contractId:'admin-syllabus-review-preflight-v1',
 baselineId:'11111111-1111-4111-8111-111111111111',revision:1,digest:'a'.repeat(64),
 authoredCatalogVersion:4,currentCatalogVersion:4,registryVersion:curriculum.registryVersion,
 pathwayVersionId:'neet-pg:preparation@1',scopeDeclaration:'partial',sourceKind:'historical',
 sourceLocator:'Synthetic local source',sourceVersion:'synthetic@1',isLatest:true,
 members:[{conceptId:'one',label:'Synthetic one',exists:true},{conceptId:'two',label:'Synthetic two',exists:true}]});
test('only exact approved reviewed objective mappings count; no exam coverage or learner approval',()=>{
 const p=alignSyllabusReviewPacket(packet(),curriculum);
 assert.equal(p.status,'review-required');assert.equal(p.exactMappedConcepts,1);
 assert.deepEqual(p.objectiveMappingUnknown,['two']);assert.equal(p.rows[0].exactApprovedMappings[0].objectiveVersionId,'o1@1');
 assert.equal(p.coverageFraction,null);assert.equal(p.checklistApproved,false);assert.equal(p.readinessInferred,false);
});
test('empty, stale and changed registry fail closed without inferred zero mapping or completeness',()=>{
 for(const changes of [
  {currentCatalogVersion:5},{registryVersion:'changed@3'},{isLatest:false},
  {members:[]},{members:[{conceptId:'one',label:'Synthetic one',exists:false}]},
  {pathwayVersionId:'unknown@1'}
 ]){
  const p=alignSyllabusReviewPacket({...packet(),...changes},curriculum);
  assert.equal(p.preflightComparable,false);assert.equal(p.exactMappedConcepts,null);
  assert.equal(p.coverageFraction,null);assert.equal(p.checklistApproved,false);
 }
});
test('invalid and duplicate canonical members or private content fields cannot enter scope packet',()=>{
 assert.throws(()=>alignSyllabusReviewPacket({...packet(),members:[packet().members[0],packet().members[0]]},curriculum),/preflight_invalid/);
 assert.throws(()=>alignSyllabusReviewPacket({...packet(),members:[{conceptId:'one',label:'one',exists:true,answerKey:'private'}]},curriculum),/preflight_invalid/);
});
