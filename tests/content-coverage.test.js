import test from 'node:test';
import assert from 'node:assert/strict';
import { coveragePage, parseCoverageFilters } from '../src/domain/content-coverage.js';
const cls=(subjects=['medicine'],systems=['nervous'])=>({subjects,systems,organs:[],domains:[],tasks:[]});
const concept=(id,c=cls())=>({conceptId:id,label:'Synthetic '+id,aliases:[],classification:c});
const q=(id,conceptId,status='published',version=1,extra={})=>({questionId:id,questionVersionId:id+'@'+version,version,status,conceptLinks:[{conceptId,role:'primary'}],origins:[],classification:cls(),...extra});
export function fixture(){return {snapshotId:'11111111-1111-4111-8111-111111111111',asOf:'2026-10-29T00:00:00.000Z',expiresAt:'2026-10-29T00:05:00.000Z',catalogVersion:446,registryVersion:'pg-preparation:foundation@1',concepts:[concept('a'),concept('b'),concept('empty',cls([],[]))],questions:[],notes:[],candidates:[]};}
const page=(s,f={})=>coveragePage(s,parseCoverageFilters(new URLSearchParams(f)));
test('an empty concept and all 19 subjects remain visible without a syllabus denominator',()=>{
 const s=fixture(),p=page(s);assert.equal(p.rows.length,3);assert.equal(p.rows[2].counts.questions,0);assert.equal(p.summary.questions,0);assert.equal(p.facets.subjects.length,19);assert.equal(p.baseline.status,'incomplete');assert.equal(p.baseline.coverageFraction,null);assert.equal(p.summary.approvedQuestions,null);
});
test('published and pending primary links belong to independent version columns',()=>{
 const s=fixture();s.questions=[q('one','a'),q('one','b','draft',2)];const p=page(s);const a=p.rows.find(r=>r.conceptId==='a'),b=p.rows.find(r=>r.conceptId==='b');
 assert.equal(a.counts.publishedQuestions,1);assert.equal(a.counts.pendingQuestions,0);assert.equal(b.counts.publishedQuestions,0);assert.equal(b.counts.pendingQuestions,1);assert.equal(p.summary.questions,1);assert.equal(p.summary.pendingQuestions,1);
 assert.equal(page(s,{state:'stored-published'}).rows.find(r=>r.conceptId==='b').counts.questions,0);
});
test('question filters retain zero-match concepts and gaps apply after counting',()=>{
 const s=fixture();s.questions=[q('one','a','published',1,{origins:[{kind:'pyq',examId:'neet-pg',year:2025,session:'main',evidence:'Synthetic recalled claim'}]})];
 assert.equal(page(s,{home:'pyq',year:'2026'}).rows.length,3);assert.equal(page(s,{home:'pyq',year:'2026'}).summary.questions,0);
 assert.deepEqual(page(s,{gap:'no-assessment'}).rows.map(r=>r.conceptId),['b','empty']);
});
test('repeat years and secondary links never inflate canonical assessment totals',()=>{
 const s=fixture();s.questions=[q('one','a','published',1,{conceptLinks:[{conceptId:'a',role:'primary'},{conceptId:'b',role:'secondary'}],origins:[{kind:'pyq',examId:'neet-pg',year:2025,session:'main'},{kind:'pyq',examId:'neet-pg',year:2025,session:'main'},{kind:'pyq',examId:'neet-pg',year:2026,session:'main'}]})];
 const p=page(s);assert.equal(p.summary.questions,1);assert.equal(p.summary.pyqClaims,2);assert.equal(p.rows[1].counts.questions,0);assert.equal(p.rows[1].counts.otherQuestions,1);assert.equal(p.summary.verifiedPyqOccurrences,null);
});
test('metadata and candidates are distinguished from canonical approved counts and private fields are omitted',()=>{
 const s=fixture();s.questions=[q('one','a','verified',1,{stem:'PRIVATE STEM',answerOptionId:'SECRET KEY',explanation:'PRIVATE EXPLANATION'})];s.notes=[{id:'note@1',conceptId:'a',status:'published',bodyMarkdown:'PRIVATE BODY'}];s.candidates=[{importId:'batch',questionId:'one',conceptIds:['a']},{importId:'batch2',questionId:'unresolved',conceptIds:['missing']}];const p=page(s);
 assert.equal(p.rows[0].counts.verifiedQuestions,1);assert.equal(p.rows[0].counts.stagedQuestions,1);assert.equal(p.summary.candidateQuestions,2);assert.equal(p.rows[0].counts.noteVersions,1);
 assert.doesNotMatch(JSON.stringify(p),/PRIVATE|SECRET|answerOptionId|bodyMarkdown/);
});
test('pagination returns totals over the entire selected concept scope, not just a page',()=>{
 const s=fixture();s.questions=[q('one','a'),q('two','b')];const a=page(s,{limit:'1'}),b=page(s,{limit:'1',cursor:a.nextCursor});assert.equal(a.summary.questions,2);assert.equal(b.summary.questions,2);assert.equal(a.rows[0].conceptId,'a');assert.equal(b.rows[0].conceptId,'b');assert.equal(page(s,{search:'not present'}).summary.questions,0);
});
test('invalid filters and ambiguous snapshots fail rather than returning false zero counts',()=>{
 for(const f of [{actor:'forged'},{limit:'101'},{limit:'0'},{cursor:'-1'},{state:'approved'},{year:'abc'},{subject:'invented'}])assert.throws(()=>parseCoverageFilters(new URLSearchParams(f)),/coverage_filter_invalid/);
 assert.throws(()=>parseCoverageFilters(new URLSearchParams('subject=medicine&subject=surgery')),/coverage_filter_invalid/);
 const s=fixture();s.questions=[q('one','a'),q('one','b')];assert.throws(()=>page(s),/coverage_snapshot_invalid/);
});
test('rejected note history does not block unrelated inventory or satisfy teaching availability',()=>{
 const s=fixture();s.notes=[{id:'rejected@1',conceptId:'a',status:'rejected'},{id:'published@1',conceptId:'b',status:'published'}];const p=page(s);assert.equal(p.rows.find(r=>r.conceptId==='a').counts.noteVersions,0);assert.equal(p.rows.find(r=>r.conceptId==='b').counts.noteVersions,1);assert.equal(p.summary.noteVersions,1);
});
test('PYQ appearance counts obey the active exam and year without inflating unique questions',()=>{
 const s=fixture();s.questions=[q('one','a','published',1,{origins:[{kind:'pyq',examId:'neet-pg',year:2025,session:'main'},{kind:'pyq',examId:'neet-pg',year:2025,session:'main'},{kind:'pyq',examId:'neet-pg',year:2026,session:'main'},{kind:'pyq',examId:'ini-cet',year:2026,session:'main'}]})];
 for(const [filters,want] of [[{exam:'neet-pg',year:'2025'},1],[{exam:'neet-pg'},2],[{year:'2026'},2]]){const p=page(s,filters);assert.equal(p.rows[0].counts.pyqClaims,want);assert.equal(p.summary.pyqClaims,want);assert.equal(p.summary.questions,1);}
});
test('an explicit note-question link is related coverage rather than direct assessment',()=>{
 const s=fixture();s.questions=[q('one','b')];s.notes=[{id:'note@1',conceptId:'a',status:'published'}];s.links=[{noteVersionId:'note@1',questionId:'one',relation:'explains'}];const p=page(s),a=p.rows.find(r=>r.conceptId==='a');assert.equal(a.counts.questions,0);assert.equal(a.counts.otherQuestions,1);assert.ok(!a.gaps.includes('no-questions'));assert.equal(p.summary.questions,1);
});
