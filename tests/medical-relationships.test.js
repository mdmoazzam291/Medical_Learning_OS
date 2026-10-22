import test from 'node:test';
import assert from 'node:assert/strict';
import {projectReviewedMedicalRelations,MEDICAL_RELATION_TYPES} from '../src/domain/medical-relationships.js';
import {projectLibrary} from '../src/domain/content-library.js';
import {conceptNeighborhood} from '../src/domain/content-workspace.js';
import {neighborhoodMarkup} from '../web/content-workspace-view.js';

const concepts=[{conceptId:'c1',label:'Synthetic entity A',subjectTags:[]},{conceptId:'c2',label:'Synthetic entity B',subjectTags:[]}];
const sources=[{sourceId:'s1',title:'Synthetic rights-cleared source',url:null,version:'2'}];
const clinical=()=>({relationshipId:'r1',relationshipVersionId:'r1@2',version:2,status:'published',
  fromConceptId:'c1',toConceptId:'c2',relationType:'mechanism-of',
  claimText:'<SYNTHETIC RELATION ASSERTION ONLY>',sourceId:'s1',sourceVersion:'2',
  sourceFingerprintSha256:'a'.repeat(64),evidenceVersionId:'evidence@2',reviewedAt:'2026-10-22T09:00:00Z',
  medicalReviewVerified:true,referenceReviewVerified:true,rightsVerified:true});
const read=relations=>projectReviewedMedicalRelations({relations,concepts,sources});

test('published, independently reviewed relation retains canonical IDs and exact evidence',()=>{
 const p=read([clinical()]);assert.equal(p.length,1);
 assert.deepEqual(p[0],{relationshipId:'r1',relationshipVersionId:'r1@2',version:2,
 fromConceptId:'c1',toConceptId:'c2',relationType:'mechanism-of',
 claimText:'<SYNTHETIC RELATION ASSERTION ONLY>',sourceId:'s1',sourceVersion:'2',
 evidenceVersionId:'evidence@2',reviewedAt:'2026-10-22T09:00:00Z'});
 assert.ok(MEDICAL_RELATION_TYPES.includes('differential-of'));
});
test('draft, inactive, unreviewed or rights-unresolved material cannot enter learner projection',()=>{
 for(const mutation of [
 {status:'draft'},{status:'in_review'},{status:'retired'},
 {medicalReviewVerified:false},{referenceReviewVerified:false},{rightsVerified:false},
 {medicalReviewVerified:undefined},{sourceId:'unknown'},{sourceVersion:'stale'},
 {sourceFingerprintSha256:'malformed'},{fromConceptId:'unknown'},
 {toConceptId:'unknown'},{toConceptId:'c1'},{relationType:'causation-inferred'},
 {evidenceVersionId:''},{claimText:''},{claimText:'X'.repeat(1501)}
 ])assert.deepEqual(read([{...clinical(),...mutation}]),[],JSON.stringify(mutation));
});
test('a retired or still-unreviewed newer version suppresses the old publication',()=>{
 for(const status of ['retired','in_review','draft']){
   const next={...clinical(),version:3,relationshipVersionId:'r1@3',status};
   assert.deepEqual(read([clinical(),next]),[],status);
 }
});
test('ambiguous same-version duplication fails closed',()=>{
 assert.deepEqual(read([clinical(),{...clinical(),claimText:'Conflicting exact claim'}]),[]);
});
test('empty or untyped input never asserts an edge',()=>{
 assert.deepEqual(read([]),[]);
 assert.deepEqual(projectReviewedMedicalRelations({relations:null,concepts,sources}),[]);
});
test('accepted relationship makes otherwise unlinked concepts discoverable, without generating notes/questions',()=>{
 const result=projectLibrary({catalog:{concepts,questions:[],sources},notes:[],medicalRelationships:[clinical()]});
 assert.deepEqual(result.concepts.map(c=>c.conceptId),['c1','c2']);
 assert.deepEqual(result.sources.map(s=>s.sourceId),['s1']);
 assert.equal(result.questions.length,0);assert.equal(result.notes.length,0);
 assert.equal(result.medicalRelationships.length,1);
 assert.equal(result.masteryInference,false);
 const graph=conceptNeighborhood(result,'c1',{perspective:'medical'});
 assert.equal(graph.nodes.length,2);assert.equal(graph.edges.length,1);
 assert.equal(graph.edges[0].from,'concept:c1');assert.equal(graph.edges[0].to,'concept:c2');
 assert.equal(graph.edges[0].evidenceVersionId,'evidence@2');
 assert.equal(conceptNeighborhood(result,'c1',{perspective:'learning'}).edges.length,0);
 const markup=neighborhoodMarkup(result,'c1',{perspective:'medical'});
 assert.match(markup,/Reviewed relation/);
 assert.match(markup,/source s1/);
 assert.match(markup,/&lt;SYNTHETIC RELATION ASSERTION ONLY&gt;/);
 assert.doesNotMatch(markup,/<SYNTHETIC RELATION ASSERTION ONLY>/);
 assert.doesNotMatch(markup,/No published medical relationships are available/);
});
test('unapproved relationship cannot create concept visibility or source leakage',()=>{
 const result=projectLibrary({catalog:{concepts,questions:[],sources},medicalRelationships:[{...clinical(),rightsVerified:false}]});
 assert.deepEqual(result.medicalRelationships,[]);
 assert.deepEqual(result.concepts,[]);
 assert.deepEqual(result.sources,[]);
});
test('medical graph stays empty even when educational associations exist',()=>{
 const library={concepts:concepts.map(c=>({...c,classification:{subjects:[],systems:[],organs:[],domains:[],tasks:[]}})),sources,questions:[
  {questionId:'q1',questionVersionId:'q1@1',conceptLinks:[{conceptId:'c1',role:'primary'},{conceptId:'c2',role:'prerequisite'}],classification:{subjects:[],systems:[],organs:[],domains:[],tasks:[]},home:{kind:'original',exams:[],platforms:[]},observed:{attempts:0,wrong:0},stem:'Synthetic?'}
 ],notes:[],medicalRelationships:[]};
 assert.equal(conceptNeighborhood(library,'c1',{perspective:'learning'}).edges.length,1);
 assert.equal(conceptNeighborhood(library,'c1',{perspective:'medical'}).edges.length,0);
});
