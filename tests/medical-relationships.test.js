import test from 'node:test';
import assert from 'node:assert/strict';
import {projectReviewedMedicalRelations,MEDICAL_RELATION_TYPES} from '../src/domain/medical-relationships.js';
import {projectLibrary} from '../src/domain/content-library.js';
import {conceptNeighborhood} from '../src/domain/content-workspace.js';
import {neighborhoodMarkup} from '../web/content-workspace-view.js';
import {createLibraryHandler} from '../supabase/functions/content-library-api/_shared/handler.js';

const concepts=[{conceptId:'c1',label:'Synthetic entity A',subjectTags:[]},{conceptId:'c2',label:'Synthetic entity B',subjectTags:[]}];
const sources=[{sourceId:'s1',title:'Synthetic rights-cleared source',url:null,version:'2',fingerprintSha256:'a'.repeat(64)}];
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

test('medical evidence must match the current exact source fingerprint, even if version labels match',()=>{
 for(const fingerprintSha256 of [undefined,'b'.repeat(64),'invalid']) {
  assert.deepEqual(projectReviewedMedicalRelations({relations:[clinical()],concepts,
   sources:[{...sources[0],fingerprintSha256}]}),[]);
 }
});
test('ambiguous source and endpoint identities fail closed independent of input order',()=>{
 for(const rows of [[sources[0],{...sources[0],version:'3'}],[{...sources[0],version:'3'},sources[0]]]) {
  assert.deepEqual(projectReviewedMedicalRelations({relations:[clinical()],concepts,sources:rows}),[]);
 }
 assert.deepEqual(projectReviewedMedicalRelations({relations:[clinical()],concepts:[...concepts,{...concepts[0],label:'Conflicting entity'}],sources}),[]);
});
test('invalid version states cannot resurrect an earlier publication',()=>{
 for(const version of [1000001,'3',null,-1]) {
  assert.deepEqual(read([clinical(),{relationshipId:'r1',version,status:'retired'}]),[]);
 }
});
test('an exact relationship version ID cannot identify two different relationships',()=>{
 assert.deepEqual(read([clinical(),{...clinical(),relationshipId:'r2'}]),[]);
 assert.deepEqual(read([clinical(),{...clinical(),relationshipId:'r2',version:null}]),[]);
});
test('an immutable relationship version ID cannot be reused for a later version of the same relationship',()=>{
 const original=clinical(),changed={...clinical(),version:3,claimText:'Changed synthetic assertion'};
  for(const rows of [[original,changed],[changed,original]])assert.deepEqual(read(rows),[]);
});
test('medical direction arrow ends outside the destination circle in either neighborhood direction',()=>{
 const library=projectLibrary({catalog:{concepts,questions:[],sources},medicalRelationships:[clinical()]});
 for(const conceptId of ['c1','c2']) {
  const markup=neighborhoodMarkup(library,conceptId,{perspective:'medical'});
  const line=/<line class="graph-edge" x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/.exec(markup);
  const target=conceptId==='c2'?[440,160]:[150,60];
  const distance=Math.hypot(Number(line[3])-target[0],Number(line[4])-target[1]);
  assert.ok(distance>=(conceptId==='c2'?30:20), 'The target circle must not cover the arrowhead');
 }
});

test('authenticated library read projects server evidence only and fails closed on source change or RPC outage',async()=>{
 let currentSources=sources,readFailure=false,calls=0;
 const snapshot=()=>({catalog:{concepts,questions:[],sources:currentSources},medicalRelationships:[{...clinical(),privateReviewerNotes:'PRIVATE_RECEIPT'}]});
 const handler=createLibraryHandler({admin:{rpc:async(name,args)=>{
  calls++;assert.equal(name,'content_library_snapshot_v1');assert.equal(args.p_learner,'fixture-user');
  return readFailure?{error:{message:'private database failure'}}:{data:snapshot()};
 }},getUser:async token=>token==='synthetic'?{id:'fixture-user'}:null,runtimeAccess:async()=>({allowed:true}),allowedOrigins:[]});
 const request=(search='')=>new Request('https://example.invalid/content-library-api/library'+search,{headers:{authorization:'Bearer synthetic'}});
 let response=await handler(request());assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');
 let body=await response.json();assert.equal(body.medicalRelationships.length,1);assert.doesNotMatch(JSON.stringify(body),/PRIVATE_RECEIPT|medicalReviewVerified|rightsVerified/);
 // Browser-supplied verification flags/selection cannot replace the service snapshot.
 assert.equal((await handler(request('?rightsVerified=true'))).status,400);assert.equal(calls,1);
 currentSources=[{...sources[0],fingerprintSha256:'b'.repeat(64)}];
 response=await handler(request());body=await response.json();assert.deepEqual(body.medicalRelationships,[]);assert.deepEqual(body.concepts,[]);assert.deepEqual(body.sources,[]);
 readFailure=true;response=await handler(request());assert.equal(response.status,500);assert.deepEqual(await response.json(),{error:'library_read_unavailable'});
});
