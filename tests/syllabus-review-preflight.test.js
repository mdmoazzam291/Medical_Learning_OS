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
 members:[{conceptId:'one',label:'Synthetic one',kind:'canonical',identityDigest:null,bindingMatches:true},{conceptId:'two',label:'Synthetic two',kind:'canonical',identityDigest:null,bindingMatches:true}]});
test('only exact approved reviewed objective mappings count; no exam coverage or learner approval',()=>{
 const p=alignSyllabusReviewPacket(packet(),curriculum);
 assert.equal(p.status,'review-required');assert.equal(p.exactMappedConcepts,1);
 assert.deepEqual(p.objectiveMappingUnknown,['two']);assert.equal(p.rows[0].exactApprovedMappings[0].objectiveVersionId,'o1@1');
 assert.equal(p.coverageFraction,null);assert.equal(p.checklistApproved,false);assert.equal(p.readinessInferred,false);
});
test('empty, stale and changed registry fail closed without inferred zero mapping or completeness',()=>{
 for(const changes of [
  {currentCatalogVersion:5},{registryVersion:'changed@3'},{isLatest:false},
  {members:[]},{members:[{conceptId:'one',label:'Identity unavailable',kind:'missing',identityDigest:null,bindingMatches:false}]},
  {pathwayVersionId:'unknown@1'}
 ]){
  const p=alignSyllabusReviewPacket({...packet(),...changes},curriculum);
  assert.equal(p.preflightComparable,false);assert.equal(p.exactMappedConcepts,null);
  assert.equal(p.coverageFraction,null);assert.equal(p.checklistApproved,false);
 }
});
test('invalid and duplicate canonical members or private content fields cannot enter scope packet',()=>{
 assert.throws(()=>alignSyllabusReviewPacket({...packet(),members:[packet().members[0],packet().members[0]]},curriculum),/preflight_invalid/);
 assert.throws(()=>alignSyllabusReviewPacket({...packet(),members:[{conceptId:'one',label:'one',kind:'canonical',identityDigest:null,bindingMatches:true,answerKey:'private'}]},curriculum),/preflight_invalid/);
});

test('accepted-private identity is resolved for Admin review but never authorizes objective mapping or learner publication',()=>{
 const privateDigest='b'.repeat(64);
 const p=alignSyllabusReviewPacket({...packet(),members:[packet().members[0],{
  conceptId:'C-private',label:'Private clinical concept',kind:'accepted-private',
  identityDigest:privateDigest,bindingMatches:true
 }]},curriculum);
 assert.equal(p.identityResolved,true);assert.deepEqual(p.privateAcceptedConcepts,['C-private']);
 assert.equal(p.preflightComparable,false);assert.equal(p.exactMappedConcepts,null);
 assert.equal(p.rows[1].canonicalExists,false);assert.equal(p.rows[1].identityKind,'accepted-private');
 assert.equal(p.rows[1].objectiveState,'private-identity-not-published');
 assert.ok(p.blockers.includes('private-identities-not-learner-published'));
 assert.equal(p.checklistApproved,false);assert.equal(p.coverageFraction,null);
 const changed=alignSyllabusReviewPacket({...packet(),members:[{
  conceptId:'C-private',label:'Identity unavailable',kind:'accepted-private',
  identityDigest:privateDigest,bindingMatches:false
 }]},curriculum);
 assert.equal(changed.identityResolved,false);assert.equal(changed.preflightComparable,false);
 assert.ok(changed.blockers.includes('identity-binding-stale-or-missing'));
 assert.throws(()=>alignSyllabusReviewPacket({...packet(),members:[{
  conceptId:'C-private',label:'Private',kind:'accepted-private',identityDigest:null,bindingMatches:true
 }]},curriculum),/preflight_invalid/);
});
