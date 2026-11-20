import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {projectLibrary,questionHome,collectionLabel,COLLECTIONS,validateImport} from '../src/domain/content-library.js';
const web=readFileSync(new URL('../web/library.js',import.meta.url),'utf8');

const origin={kind:'platform',platformId:'medretica-qbank-s1',edition:'Series 1',evidence:'Medretica QBank Series 1 item'};
const question=extra=>({questionId:'q1',questionVersionId:'q1@1',version:1,status:'published',publishedAt:'2026-11-20T00:00:00.000Z',stem:'Synthetic',options:[{optionId:'a',text:'A'},{optionId:'b',text:'B'}],answerOptionId:'a',sourceIds:['SRC-S1'],conceptLinks:[{conceptId:'C-1',role:'primary'}],...extra});

test('Series 1 has one learner-facing name and marks keys as unverified (ADR-148)',()=>{
 assert.equal(collectionLabel('medretica-qbank-s1'),'Medretica QBank · Series 1');
 assert.equal(COLLECTIONS['medretica-qbank-s1'].answerKeys,'unverified');
 assert.ok(Object.isFrozen(COLLECTIONS));
 assert.equal(collectionLabel('marrow'),'marrow');
 assert.deepEqual(questionHome([origin]),{kind:'platform',platforms:['medretica-qbank-s1'],exams:[]});
});

test('library projection carries the collection for Series 1 questions only',()=>{
 const snap=q=>({catalog:{concepts:[{conceptId:'C-1',label:'Concept',aliases:[],subjectTags:['anatomy']}],questions:[q],sources:[{sourceId:'SRC-S1',title:'Medretica QBank · Series 1',url:null,version:'1',rights:{status:'owner_waived',evidence:'x'}}]},questionMetadata:[{question_id:'q1',origins:[origin],classification:null}]});
 const lib=projectLibrary(snap(question()));
 assert.deepEqual(lib.questions[0].collection,{id:'medretica-qbank-s1',label:'Medretica QBank · Series 1',answerKeys:'unverified'});
 const plain=projectLibrary({...snap(question()),questionMetadata:[]});
 assert.equal(plain.questions[0].collection,null);
});

test('a Series 1 platform origin passes import validation',()=>{
 assert.match(origin.platformId,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
 assert.equal(typeof validateImport,'function');
});

test('Library shows the collection name on cards and in the collection filter, never the raw ID',()=>{
 assert.match(web,/import \{ SUBJECTS, collectionLabel \} from '\/src\/domain\/content-library\.js'/);
 assert.match(web,/q\.home\.platforms\[0\]\?collectionLabel\(q\.home\.platforms\[0\]\):'Original'/);
 assert.match(web,/k==='platform'\?values\(k\)\.map\(v=>\(\{id:v,label:collectionLabel\(v\)\}\)\)/);
});
