import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateBatch,batchSummary,parseAcceptRequest,batchAcceptInput,newConcepts,ATTESTATION} from '../src/domain/nmc-concept-batch.js';
import {batchReviewMarkup} from '../web/nmc-concept-batch-review.js';
const raw=readFileSync(new URL('../docs/evidence/2026-11-16-nmc-physiology-concept-batch-v1.json',import.meta.url));
const batch=JSON.parse(raw);
const fn=readFileSync(new URL('../supabase/functions/nmc-admin-preview/index.ts',import.meta.url),'utf8');
const meta=JSON.parse(readFileSync(new URL('../data/nmc-competency-source-metadata.json',import.meta.url),'utf8')).rows;
test('Physiology batch covers every Physiology source row with unique keys and labels',()=>{
 validateBatch(batch);
 const py=new Set(meta.filter(r=>r.subjectId==='physiology').map(r=>r.referenceId));
 assert.deepEqual(new Set(batch.objectives.map(o=>o.referenceId)),py);
 assert.equal(batch.counts.newConcepts,178);assert.equal(batch.counts.reusedAcceptedIdentities,2);
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
 assert.equal(createHash('sha256').update(raw).digest('hex'),sha);
 assert.match(fn,/concept_batch_accept_v1/);assert.doesNotMatch(fn,/\.insert\(|\.update\(|\.delete\(|\.upsert\(/);
});
test('review markup escapes content and shows the non-publication notice',()=>{
 const s=batchSummary(batch);
 const html=batchReviewMarkup(s);
 assert.match(html,/does not publish anything to learners/);assert.match(html,/Accept batch/);
 const evil=batchReviewMarkup({...s,concepts:[{...s.concepts[0],label:'<script>x</script>'}]});
 assert.doesNotMatch(evil,/<script>x/);
 assert.doesNotMatch(batchReviewMarkup(batchSummary(batch,{accepted_at:'2026-11-16',item_count:178})),/Accept batch/);
});
