import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverTopicConcepts,loadTopicConcepts} from '../src/domain/nmc-concept-discovery.js';
const group={labels:['Anaemia'],allSubjects:['medicine']};
const concept=(conceptId,label,aliases=[],subjects=['medicine'])=>({conceptId,label,aliases,classification:{subjects}});
const library={concepts:[concept('c1','Anemia'),concept('c2','Iron deficiency anaemia'),concept('c3','Another name',['anaemia']),concept('c4','Anemia')],questions:[{questionId:'q1',conceptLinks:[{conceptId:'c1'},{conceptId:'c1'}]},{questionId:'q1',conceptLinks:[{conceptId:'c1'}]}],notes:[{noteVersionId:'n1',conceptId:'c1'},{noteVersionId:'n1',conceptId:'c1'}]};
test('exact title/alias discovery preserves canonical IDs, ambiguity and unique content counts',()=>{
 const found=discoverTopicConcepts(group,library);
 assert.deepEqual(found.map(c=>c.conceptId),['c1','c4','c3']);
 assert.equal(found[0].questionCount,1);assert.equal(found[0].noteCount,1);
 assert.equal(found.find(c=>c.conceptId==='c3').match,'alias');
 assert.ok(found.every(c=>!('observed' in c)&&!('bodyMarkdown' in c)&&!('stem' in c)));
 assert.ok(found[0].urls.concept.includes('concept=c1'));
});
test('generic headings need subject overlap; specific shared topics can cross subjects',()=>{
 const l={concepts:[concept('c1','Introduction',[],['surgery']),concept('c2','Introduction',[],['medicine'])],questions:[],notes:[]};
 assert.deepEqual(discoverTopicConcepts({labels:['Introduction'],allSubjects:['medicine']},l).map(c=>c.conceptId),['c2']);
 assert.equal(discoverTopicConcepts(group,{...l,concepts:[concept('c3','Anemia',[],['pediatrics'])]}).length,1);
});
test('duplicate identities reject instead of silently merging canonical records',()=>{
 assert.throws(()=>discoverTopicConcepts(group,{...library,concepts:[library.concepts[0],library.concepts[0]]}));
});
test('guest performs no library request, errors remain errors, account change discards result',async()=>{
 let calls=0;const request=async()=>{calls++;return library;};
 await assert.rejects(loadTopicConcepts(group,{request,identity:async()=>null}),{code:'authentication_required'});assert.equal(calls,0);
 let identities=['one','two'];await assert.rejects(loadTopicConcepts(group,{request,identity:async()=>identities.shift()}),{code:'identity_changed'});
 await assert.rejects(loadTopicConcepts(group,{request:async()=>{throw Error('outage');},identity:async()=>'one'}),/outage/);
 const result=await loadTopicConcepts(group,{request,identity:async()=>'one'});assert.equal(result.matches.length,3);assert.equal(result.conceptCount,4);assert.equal(result.subjects[0].conceptCount,4);
});

test('unmatched broad headings offer existing subject and full explorer navigation without clinical mapping',async()=>{
 const result=await loadTopicConcepts({labels:['Nervous system'],allSubjects:['anatomy']},{request:async()=>({concepts:[concept('existing','Brown-Sequard syndrome',[],['anatomy','medicine'])],questions:[],notes:[]}),identity:async()=>'one'});
 assert.deepEqual(result.matches,[]);assert.equal(result.conceptCount,1);
 assert.deepEqual(result.subjects,[{subjectId:'anatomy',conceptCount:1,url:'/web/library.html?view=overview&subject=anatomy'}]);
});
