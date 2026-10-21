import test from 'node:test';
import assert from 'node:assert/strict';
import {groupReviewedNoteSections,DOSSIER_SECTIONS} from '../src/domain/concept-dossier-sections.js';
const note=(overrides={})=>({noteVersionId:'n@3',conceptId:'c',title:'Exact reviewed note',sourceIds:['s@2'],bodyMarkdown:'## Clinical presentation\nExact symptoms.\n## Diagnosis\nExact investigation.',...overrides});
test('uses explicit note headings and preserves exact note/source versions',()=>{
 const g=groupReviewedNoteSections([note()],[{sourceId:'s@2',title:'Approved source',version:'2026',url:'https://example.org'}]);
 assert.deepEqual(g.map(x=>x.id),['presentation','diagnosis']);
 assert.equal(g[0].items[0].body,'Exact symptoms.');
 assert.equal(g[0].items[0].noteVersionId,'n@3');
 assert.deepEqual(g[0].items[0].sourceRecords,[{sourceId:'s@2',title:'Approved source',version:'2026'}]);
});
test('unrecognized headings and unheaded text are never assigned clinical meaning',()=>{
 const g=groupReviewedNoteSections([note({bodyMarkdown:'Original preface.\n## Miscellaneous topic\nOriginal section.'})],[]);
 assert.deepEqual(g.map(x=>x.id),['other']);
 assert.deepEqual(g[0].items.map(x=>x.title),['Unheaded reviewed content','Miscellaneous topic']);
 assert.equal(g[0].items[0].body,'Original preface.');
});
test('missing sources stay missing; no synthetic assertions or explanations',()=>{
 const g=groupReviewedNoteSections([note({sourceIds:['absent'],bodyMarkdown:'## Treatment\nExact text.'})],[]);
 assert.deepEqual(g[0].items[0].missingSourceIds,['absent']);
 assert.deepEqual(g[0].items[0].sourceRecords,[]);
 assert.equal(g[0].items[0].body,'Exact text.');
 assert.deepEqual(groupReviewedNoteSections([],[]),[]);
});
test('different published note versions remain separate even when section headings match',()=>{
 const g=groupReviewedNoteSections([note(),note({noteVersionId:'n@4',bodyMarkdown:'### Diagnosis\nSecond source text.'})],[]);
 assert.deepEqual(g.find(x=>x.id==='diagnosis').items.map(x=>x.noteVersionId),['n@3','n@4']);
});
test('headings are explicit; CRLF and decorated headings are supported',()=>{
 const g=groupReviewedNoteSections([note({bodyMarkdown:'### **Pathophysiology:**\r\nExact mechanism\r\n### Management\r\nExact action'})],[]);
 assert.deepEqual(g.map(x=>x.id),['foundations','management']);
 assert.equal(g[0].items[0].body,'Exact mechanism');
 assert.equal(DOSSIER_SECTIONS.length,7);
});
