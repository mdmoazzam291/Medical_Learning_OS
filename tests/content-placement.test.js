import test from 'node:test';
import assert from 'node:assert/strict';
const d=await import('../src/domain/content-placement.js').catch(()=>({}));
const facets={subjects:['medicine'],systems:['test-system'],organs:[],domains:[],tasks:['diagnosis']};
const manifest=()=>({concepts:[{conceptId:'c',label:'Synthetic',classification:facets,aliases:[]}],sources:[{sourceId:'s',title:'Synthetic source',version:'1',url:null,evidence:'Private evidence'}],questions:[{questionId:'q',stem:'Prompt',options:[{optionId:'a',text:'Alpha'}],answerOptionId:'a',explanation:'SECRET KEY',sourceIds:['s'],classification:facets,conceptLinks:[{conceptId:'c',role:'primary'}],origins:[{kind:'pyq',examId:'test-exam',year:2025,session:'test',evidence:'Declaration'}]}],notes:[],noteQuestionLinks:[]});
test('placement maps exclusive PYQ home and reports actual missing notes without claiming review passed',()=>{
 assert.equal(typeof d.contentPlacement,'function');const r=d.contentPlacement(manifest());
 assert.equal(r.items[0].home,'pyq');assert.equal(r.items[0].checks.find(x=>x.id==='questions').status,'eligible');assert.equal(r.items[0].checks.find(x=>x.id==='notes').status,'missing');assert.equal(r.publicationApproved,false);
});
test('external concepts and sources are unresolved rather than silently missing or approved',()=>{
 const m=manifest();m.concepts=[];m.sources=[];const item=d.contentPlacement(m).items[0];
 assert.equal(item.checks.find(x=>x.id==='concept').status,'unresolved');assert.equal(item.checks.find(x=>x.id==='sources').status,'unresolved');
});
test('draft preview strips keys, explanations and private provenance at every nested boundary',()=>{
 assert.equal(typeof d.draftLibrary,'function');const m=manifest();m.questions[0].intelligence={primaryTask:'diagnosis',presentation:['clinical-vignette'],derivatives:[{answerOptionId:'a',explanation:'SECRET KEY'}]};const r=d.draftLibrary(m);
 assert.equal(r.questions.length,1);assert.equal(r.questions[0].questionVersionId,'draft:q');assert.equal(r.questions[0].home.kind,'pyq');assert.equal(r.notes.length,0);
 assert.doesNotMatch(JSON.stringify(r),/answerOptionId|SECRET KEY|Private evidence|derivatives|publishedAt/);
 assert.equal(r.draftOnly,true);
});

test('PYQ placement does not imply exam preparation suitability before reviewed objective mapping',()=>{
  const report=d.contentPlacement(manifest());
  const mapping=report.items[0].checks.find(x=>x.id==='preparation');
  assert.equal(mapping?.status,'unresolved');
  assert.match(mapping.detail,/exact published version/);
});
