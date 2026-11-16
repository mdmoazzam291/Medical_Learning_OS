import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateBatch,batchSummary,parseAcceptRequest,batchAcceptInput,newConcepts,ATTESTATION} from '../src/domain/nmc-concept-batch.js';
import {batchReviewMarkup} from '../web/nmc-concept-batch-review.js';
const raw=readFileSync(new URL('../docs/evidence/2026-11-16-nmc-physiology-concept-batch-v3.json',import.meta.url));
const batch=JSON.parse(raw);
const fn=readFileSync(new URL('../supabase/functions/nmc-admin-preview/index.ts',import.meta.url),'utf8');
const meta=JSON.parse(readFileSync(new URL('../data/nmc-competency-source-metadata.json',import.meta.url),'utf8')).rows;
test('Physiology batch covers every Physiology source row with unique keys and labels',()=>{
 validateBatch(batch);
 const py=new Set(meta.filter(r=>r.subjectId==='physiology').map(r=>r.referenceId));
 assert.deepEqual(new Set(batch.objectives.map(o=>o.referenceId)),py);
 assert.equal(batch.counts.newConcepts,181);assert.equal(batch.counts.reusedAcceptedIdentities,2);
 const labels=batch.concepts.flatMap(c=>[c.document.label,...c.document.aliases].map(x=>x.toLowerCase().trim()));
 assert.equal(new Set(labels).size,labels.length,'no label/alias collisions inside the batch');
 assert.ok(batch.concepts.every(c=>c.document.classification.subjects[0]==='physiology'));
 assert.ok(batch.objectives.every(o=>['knows','knows-how','shows-how','performs'].includes(o.depth)));
 assert.ok(batch.objectives.filter(o=>o.basis!=='official-replacement').every(o=>/^[a-f0-9]{64}$/.test(o.sourceBodySha256)));
 assert.equal(batch.learnerActivation,false);assert.equal(batch.clinicalApproval,false);
});
test('acceptance input sends only new concepts and the fixed attestation',()=>{
 const req=parseAcceptRequest({requestId:'5f0c8a0e-1b2c-4d3e-8f4a-0b1c2d3e4f50',batchId:batch.batchId,reviewNotes:'Owner reviewed the Physiology concept identities.',attested:true},batch.batchId);
 const input=batchAcceptInput(batch,'a'.repeat(64),req);
 assert.equal(input.items.length,newConcepts(batch).length);assert.equal(input.attestation,ATTESTATION);
 assert.ok(input.items.every(i=>Object.keys(i).sort().join()==='conceptKey,document'));
 for(const bad of [{},{requestId:'x',batchId:batch.batchId,reviewNotes:'x'.repeat(30),attested:true},{requestId:'5f0c8a0e-1b2c-4d3e-8f4a-0b1c2d3e4f50',batchId:'other',reviewNotes:'x'.repeat(30),attested:true},{requestId:'5f0c8a0e-1b2c-4d3e-8f4a-0b1c2d3e4f50',batchId:batch.batchId,reviewNotes:'short',attested:true},{requestId:'5f0c8a0e-1b2c-4d3e-8f4a-0b1c2d3e4f50',batchId:batch.batchId,reviewNotes:'x'.repeat(30),attested:false}])
  assert.throws(()=>parseAcceptRequest(bad,batch.batchId));
});
test('endpoint pins the exact batch checksum and calls only the batch RPC',()=>{
 const sha=fn.match(/BATCH_SHA256 = "([0-9a-f]{64})"/)[1];
 const pinned=fn.match(/BATCH_URL = "[^"]+\/[0-9a-f]{40}\/(docs\/evidence\/[^"]+\.json)"/)[1];
 assert.equal(createHash('sha256').update(readFileSync(new URL('../'+pinned,import.meta.url))).digest('hex'),sha);
 assert.match(fn,/concept_batch_accept_v1/);assert.doesNotMatch(fn,/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
});
test('review markup escapes content and shows the non-publication notice',()=>{
 const s=batchSummary(batch);
 const html=batchReviewMarkup(s);
 assert.match(html,/does not publish anything to learners/);assert.match(html,/Accept batch/);
 const evil=batchReviewMarkup({...s,concepts:[{...s.concepts[0],label:'<script>x</script>'}]});
 assert.doesNotMatch(evil,/<script>x/);
 assert.doesNotMatch(batchReviewMarkup(batchSummary(batch,{accepted_at:'2026-11-16',item_count:181})),/Accept batch/);
});

test('v2 names entities, types every concept and keeps aliases as true synonyms',()=>{
 assert.equal(batch.batchId,'nmc-physiology-concepts-v3-20261116');
 assert.equal(batch.supersedes.accepted,false);
 const labels=new Set(batch.concepts.map(c=>c.document.label));
 for(const subjectView of ['Liver physiology','Heart functional anatomy','Pain physiology','Physiology of pregnancy','Thyroid physiology','Neuromuscular junction disorders'])assert.ok(!labels.has(subjectView),subjectView);
 for(const entity of ['Liver','Heart','Pain','Pregnancy','Thyroid gland','Myasthenia gravis','Lambert-Eaton myasthenic syndrome','Bile','Coronary circulation'])assert.ok(labels.has(entity),entity);
 const aliases=new Set(batch.concepts.flatMap(c=>c.document.aliases.map(a=>a.toLowerCase())));
 for(const wrong of ['myasthenia gravis','insulin','cerebral circulation','spirometry','dialysis','action potential','coagulation','decompression sickness','memory'])assert.ok(!aliases.has(wrong),wrong+' must not be an alias');
 for(const c of batch.concepts){
  assert.ok(batch.conceptTypes.includes(c.conceptType),c.document.label);
  assert.equal(c.document.classification.domains[0],c.conceptType);
  assert.equal(c.document.classification.domains.includes('umbrella'),c.umbrella);
  assert.equal(c.scoringUnit,!c.umbrella);
  assert.ok(c.document.classification.organs.every(o=>/^[a-z0-9]+(-[a-z0-9]+)*$/.test(o)));
 }
 assert.equal(batch.counts.umbrellas,batch.concepts.filter(c=>c.umbrella).length);
});
test('review summary lists identity-changing concepts before unflagged ones',()=>{
 const s=batchSummary(batch);
 const firstPlain=s.concepts.findIndex(c=>!c.reviewFlags.length);
 assert.ok(firstPlain>0);assert.ok(s.concepts.slice(firstPlain).every(c=>!c.reviewFlags.length));
 assert.deepEqual(s.concepts[0].reviewFlags.includes('reuses-accepted-identity'),true);
 assert.equal(s.concepts.length,batch.concepts.length);
 assert.match(batchReviewMarkup(s),/identity-changing items first/);
});

test('v3 lists only subjects evidenced by linked source rows and keeps expected subjects as hints',()=>{
 for(const c of batch.concepts){
  assert.deepEqual(c.document.classification.subjects,['physiology']);
  assert.ok(Array.isArray(c.expectedSubjects)&&!c.expectedSubjects.includes('physiology'));
  assert.ok(c.linkedCodes.every(k=>/^PY\d/.test(k)));
 }
 assert.ok(batch.concepts.find(c=>c.document.label==='Anaemia').expectedSubjects.includes('pathology'));
 assert.ok(batchAcceptInput(batch,'x',{requestId:'r',reviewNotes:'n'}).items.every(i=>!('expectedSubjects' in i)&&!('expectedSubjects' in i.document)));
});

test('Biochemistry batch v1 covers every recognised Biochemistry row, reuses Physiology identities and lists evidenced subjects only',()=>{
 const bc=JSON.parse(readFileSync(new URL('../docs/evidence/2026-11-16-nmc-biochemistry-concept-batch-v1.json',import.meta.url)));
 const phys=JSON.parse(readFileSync(new URL('../docs/evidence/2026-11-16-nmc-physiology-objective-bindings-v1.json',import.meta.url)));
 const cat=JSON.parse(readFileSync(new URL('../data/nmc-reference-catalogue.json',import.meta.url)));
 validateBatch(bc);
 assert.equal(bc.subjectId,'biochemistry');assert.equal(bc.learnerActivation,false);assert.equal(bc.clinicalApproval,false);
 const rows=cat.references.filter(r=>r.subjectId==='biochemistry'&&r.identifierState==='standard').map(r=>r.referenceId);
 assert.deepEqual([...new Set(bc.objectives.map(o=>o.referenceId))].sort(),rows.sort());
 const physId=new Map(phys.concepts.map(c=>[c.label,c.conceptId]));
 for(const c of bc.concepts){
  assert.deepEqual(c.document.classification.subjects,['biochemistry']);
  if(c.existingConceptId)assert.equal(c.existingConceptId,physId.get(c.document.label));
 }
 const names=bc.concepts.filter(c=>!c.existingConceptId).flatMap(c=>[c.document.label,...c.document.aliases].map(x=>x.toLowerCase()));
 assert.equal(new Set(names).size,names.length);
 for(const c of phys.concepts)assert.ok(!names.includes(c.label.toLowerCase())||bc.concepts.some(x=>x.existingConceptId===c.conceptId),c.label);
});

test('Pathology batch v1 covers every recognised Pathology row and reuses accepted identities by exact ID',()=>{
 const pa=JSON.parse(readFileSync(new URL('../docs/evidence/2026-11-16-nmc-pathology-concept-batch-v1.json',import.meta.url)));
 const cat=JSON.parse(readFileSync(new URL('../data/nmc-reference-catalogue.json',import.meta.url)));
 const accepted=new Map();
 for(const f of ['physiology','biochemistry'])for(const c of JSON.parse(readFileSync(new URL(`../docs/evidence/2026-11-16-nmc-${f}-objective-bindings-v1.json`,import.meta.url))).concepts)if(!accepted.has(c.label))accepted.set(c.label,c.conceptId);
 validateBatch(pa);assert.equal(pa.subjectId,'pathology');assert.equal(pa.learnerActivation,false);
 const rows=cat.references.filter(r=>r.subjectId==='pathology'&&r.identifierState==='standard').map(r=>r.referenceId).sort();
 assert.deepEqual([...new Set(pa.objectives.map(o=>o.referenceId))].sort(),rows);
 for(const c of pa.concepts){assert.deepEqual(c.document.classification.subjects,['pathology']);if(c.existingConceptId)assert.equal(c.existingConceptId,accepted.get(c.document.label));}
 const names=pa.concepts.filter(c=>!c.existingConceptId).flatMap(c=>[c.document.label,...c.document.aliases].map(x=>x.toLowerCase()));
 assert.equal(new Set(names).size,names.length);
 assert.ok(!names.includes('blood components'));
});

test('every non-Physiology subject batch covers its recognised rows, reuses accepted IDs exactly and has unique new names',async()=>{
 const {readdirSync}=await import('node:fs');
 const dir=new URL('../docs/evidence/',import.meta.url);
 const cat=JSON.parse(readFileSync(new URL('../data/nmc-reference-catalogue.json',import.meta.url)));
 const accepted=new Set();
 for(const f of readdirSync(dir).filter(f=>/-objective-bindings-v\d+\.json$/.test(f)))for(const c of JSON.parse(readFileSync(new URL(f,dir))).concepts)accepted.add(c.conceptId);
 const files=readdirSync(dir).filter(f=>/^2026-11-\d\d-nmc-[a-z-]+-concept-batch-v\d+\.json$/.test(f)&&!f.includes('physiology'));
 assert.ok(files.length>=3);
 for(const f of files){
  const b=validateBatch(JSON.parse(readFileSync(new URL(f,dir))));
  assert.equal(b.learnerActivation,false,f);assert.equal(b.clinicalApproval,false,f);
  const subjects=b.subjectIds||[b.subjectId];
  const rows=cat.references.filter(r=>subjects.includes(r.subjectId)&&r.identifierState==='standard'&&!r.amendmentNotice&&!(b.heldCodes||[]).includes(r.observedCode)).map(r=>r.referenceId).sort();
  assert.deepEqual([...new Set(b.objectives.map(o=>o.referenceId))].sort(),rows,f);
  for(const c of b.concepts){const cs=c.document.classification.subjects;assert.ok(cs.length>=1&&cs.every(x=>subjects.includes(x)),f+' '+c.document.label);if(c.existingConceptId)assert.ok(accepted.has(c.existingConceptId),f+' '+c.document.label);}
  const names=b.concepts.filter(c=>!c.existingConceptId).flatMap(c=>[c.document.label,...c.document.aliases].map(x=>x.toLowerCase()));
  assert.equal(new Set(names).size,names.length,f);
 }
});
