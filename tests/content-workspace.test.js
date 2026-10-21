import test from 'node:test';
import assert from 'node:assert/strict';
const d = await import('../src/domain/content-workspace.js').catch(() => ({}));
const f = { subjects: ['medicine'], systems: ['test-system'], organs: [], domains: [], tasks: ['diagnosis'] };
const concept = id => ({ conceptId: id, label: 'Concept '+id, aliases: id==='a'?['Alias Alpha']:[], classification: f });
const question = (id, links) => ({ questionId:id,questionVersionId:id+'@2',stem:'Synthetic prompt '+id,options:[],conceptLinks:links,classification:f,home:{kind:'pyq',exams:['test-exam'],platforms:[]},origins:[],observed:{state:'unattempted',attempts:0,wrong:0} });
export const fixture = () => ({ concepts:['a','b','c'].map(concept),questions:[question('q1',[{conceptId:'a',role:'primary'},{conceptId:'b',role:'prerequisite'}]),question('q2',[{conceptId:'c',role:'primary'},{conceptId:'a',role:'distractor'}])],notes:[{noteVersionId:'n@3',conceptId:'a',title:'Exact note',bodyMarkdown:'Synthetic only'}],links:[],sources:[] });
test('context switches preserve selection and only destination-compatible options',()=>{
 assert.equal(typeof d.transitionContext,'function');
 const x=d.transitionContext('?view=media&concept=a&subject=medicine&category=histology&collection=pyq&exam=test-exam&token=secret&count=5',{view:'notes'});
 assert.match(x,/concept=a/);assert.match(x,/subject=medicine/);assert.match(x,/count=5/);assert.doesNotMatch(x,/category=|token=|collection=|exam=/);
 assert.match(d.transitionContext('?concept=a&collection=pyq',{view:'questions'}),/collection=pyq/);
});
test('explorer finds aliases without losing canonical identity and bounds large results',()=>{
 assert.equal(typeof d.exploreConcepts,'function');
 assert.deepEqual(d.exploreConcepts(fixture(),{search:'alias alpha'}).items.map(c=>c.conceptId),['a']);
 const big=fixture();big.concepts=Array.from({length:5000},(_,i)=>concept('c'+i));
 const result=d.exploreConcepts(big,{limit:60});assert.equal(result.total,5000);assert.equal(result.items.length,60);
});
test('dossier assembles actual artifacts and never substitutes unavailable concept IDs',()=>{
 assert.equal(typeof d.conceptDossier,'function');
 const x=d.conceptDossier(fixture(),'a');assert.equal(x.concept.conceptId,'a');assert.equal(x.questions.length,2);assert.equal(x.notes[0].noteVersionId,'n@3');assert.equal(x.counts.pyq,2);
 assert.equal(d.conceptDossier(fixture(),'absent').concept,null);
 assert.equal(d.conceptDossier(fixture(),'a',{collection:'platform'}).questions.length,0);
});
test('graph perspectives distinguish educational co-links from unasserted medical relationships',()=>{
 assert.equal(typeof d.conceptNeighborhood,'function');
 const x=d.conceptNeighborhood(fixture(),'a',{perspective:'learning'});assert.equal(x.edges.length,1);assert.equal(x.edges[0].evidenceVersionId,'q1@2');assert.equal(x.edges[0].kind,'prerequisite-evidence');assert.equal(x.nodes.some(n=>n.id==='concept:b'),true);
 assert.equal(d.conceptNeighborhood(fixture(),'a',{perspective:'medical'}).edges.length,0);
 const exam=d.conceptNeighborhood(fixture(),'a',{perspective:'exam'});assert.equal(exam.nodes.filter(n=>n.kind==='question').length,2);assert.ok(exam.edges.every(x=>x.evidenceVersionId));
});
test('large graph is bounded with no dangling edges and an explicit truncated count',()=>{
 const big=fixture();big.questions=Array.from({length:1000},(_,i)=>question('q'+i,[{conceptId:'a',role:'primary'}]));
 const x=d.conceptNeighborhood(big,'a',{perspective:'exam',limit:20});assert.equal(x.nodes.length,20);assert.equal(x.hidden,982);const ids=new Set(x.nodes.map(n=>n.id));assert.ok(x.edges.every(e=>ids.has(e.from)&&ids.has(e.to)));
});
test('collection selection preserves canonical concept but switching collection clears contradictory source filters',()=>{
 assert.doesNotMatch(d.transitionContext('?concept=a&view=questions&platform=marrow&exam=test-exam',{view:'questions',collection:'pyq'}),/platform=marrow/);
 assert.doesNotMatch(d.transitionContext('?concept=a&view=questions&exam=test-exam',{view:'questions',collection:'platform'}),/exam=test-exam/);
});
test('learning dependency evidence is bounded even when thousands of questions share the same two nodes',()=>{
 const big=fixture();big.questions=Array.from({length:1000},(_,i)=>question('q'+i,[{conceptId:'a',role:'primary'},{conceptId:'b',role:'prerequisite'}]));
 const x=d.conceptNeighborhood(big,'a',{perspective:'learning',limit:20});assert.ok(x.edges.length<=40);assert.equal(x.hiddenEdges,960);
});
