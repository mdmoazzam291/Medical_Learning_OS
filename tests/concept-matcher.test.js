import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildConceptIndex,matchQuestion,normalize,SUBJECT_MAP} from '../src/domain/concept-matcher.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

const concepts=[
 {conceptId:'C-plexus',label:'Brachial plexus',aliases:[],subjects:['anatomy']},
 {conceptId:'C-plexus-inj',label:'Brachial plexus injuries',aliases:["Erb's palsy"],subjects:['anatomy','orthopaedics']},
 {conceptId:'C-ulcer',label:'Antiulcer drugs',aliases:['Drugs for acid peptic disease'],subjects:['pharmacology','medicine']},
 {conceptId:'C-ppi',label:'Proton pump inhibitors',aliases:['PPI'],subjects:['pharmacology']},
 {conceptId:'C-generic',label:'Anatomy',aliases:['Drugs'],subjects:['anatomy','pharmacology']},
 {conceptId:'C-heart',label:'Heart failure',aliases:[],subjects:['medicine']}
];
const index=buildConceptIndex(concepts);

test('normalisation and generic names',()=>{
 assert.equal(normalize("Erb’s Palsy (C5–C6)"),' erbs palsy c5 c6 ');
 assert.ok(!index.some(e=>e.conceptId==='C-generic'),'generic single words never identify a concept');
 assert.ok(!index.some(e=>e.name===' ppi '),'very short single tokens are skipped');
 assert.equal(Object.keys(SUBJECT_MAP).length,19);
 assert.ok(!('Dental' in SUBJECT_MAP)&&!('Unknown' in SUBJECT_MAP));
});

test('the most specific concept in the question subject wins',()=>{
 const r=matchQuestion({subjectLabel:'Anatomy',stem:'A newborn after shoulder dystocia has an arm in waiter tip position. Which brachial plexus injuries pattern is this?',answer:"Erb's palsy",explanation:'Upper trunk of the brachial plexus.',topic:null},index);
 assert.equal(r.status,'matched');assert.equal(r.conceptId,'C-plexus-inj');assert.ok(r.confidence>0.5&&r.confidence<=1);
 assert.equal(r.candidates[0].conceptId,'C-plexus-inj');
});

test('concepts outside the question subject are never chosen',()=>{
 const r=matchQuestion({subjectLabel:'Physiology',stem:'Heart failure reduces cardiac output by which mechanism?',answer:'x',explanation:'',topic:null},index);
 assert.equal(r.status,'needs-review');assert.equal(r.reason,'no-candidate');assert.equal(r.conceptId,null);
});

test('weak or close matches go to review instead of a guess',()=>{
 const weak=matchQuestion({subjectLabel:'Pharmacology',stem:'Which is true?',answer:'x',explanation:'Proton pump inhibitors act on parietal cells.',topic:null},index);
 assert.equal(weak.status,'needs-review');assert.equal(weak.reason,'weak-match');
 // Two unrelated concepts named equally in the stem: ambiguous, so review.
 const close=matchQuestion({subjectLabel:'Medicine',stem:'A patient with heart failure is also taking antiulcer drugs; what is the next step?',answer:'x',explanation:'',topic:null},index);
 assert.equal(close.status,'needs-review');assert.equal(close.reason,'close-runner-up');assert.equal(close.candidates.length,2);
 // A narrower class named alongside its broader class: the narrower one wins.
 const narrower=matchQuestion({subjectLabel:'Pharmacology',stem:'Antiulcer drugs: which of these proton pump inhibitors is a prodrug?',answer:'x',explanation:'',topic:null},index);
 assert.equal(narrower.status,'matched');assert.equal(narrower.conceptId,'C-ppi');
});

test('unmapped subjects are excluded, not matched',()=>{
 const r=matchQuestion({subjectLabel:'Dental',stem:'Brachial plexus',answer:'',explanation:'',topic:null},index);
 assert.equal(r.status,'excluded');assert.equal(r.subjectId,null);
});

test('mapping job is manual, main-only, confirmed, prints counts only, keeps reviewed rows',()=>{
 const wf=read('.github/workflows/map-dataset-concepts.yml'),script=read('scripts/map-dataset-concepts.js'),sql=read('supabase/migrations/20261120160000_dataset_concept_matches.sql');
 assert.match(wf,/workflow_dispatch:/);assert.doesNotMatch(wf,/\n  push:|\n  schedule:|pull_request/);
 assert.match(wf,/test "\$\{\{ inputs\.confirm \}\}" = "map"/);assert.match(wf,/refs\/heads\/main/);
 assert.doesNotMatch(wf,/\b(cat|head|tail|less)\b[^\n]*(questions|results|concepts)\.jsonl/);
 assert.match(wf,/where dataset_question_concept_matches\.review_decision is null/);
 assert.equal((script.match(/console\.log\(/g)||[]).length,1);assert.ok(script.includes('console.log(JSON.stringify({ batchId, matcher: MATCHER_VERSION, indexedNames: index.length, questionCount: out.length, ...counts }));'));
 assert.match(sql,/revoke all on table public\.dataset_question_concept_matches from public, anon, authenticated/);
 assert.match(sql,/check \(\(status = 'matched'\) = \(concept_id is not null\)\)/);
});
