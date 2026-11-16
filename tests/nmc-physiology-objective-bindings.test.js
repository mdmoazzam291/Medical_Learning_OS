import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=p=>readFileSync(new URL(p,import.meta.url));
const rawBatch=read('../docs/evidence/2026-11-16-nmc-physiology-concept-batch-v3.json');
const batch=JSON.parse(rawBatch),bind=JSON.parse(read('../docs/evidence/2026-11-16-nmc-physiology-objective-bindings-v1.json'));
test('Physiology objective bindings cover every batch objective with receipt-verified concept IDs',()=>{
 assert.equal(bind.batchId,batch.batchId);
 assert.equal(bind.batchSha256,createHash('sha256').update(rawBatch).digest('hex'));
 assert.equal(bind.learnerActivation,false);assert.equal(bind.clinicalApproval,false);
 const byKey=new Map(bind.concepts.map(c=>[c.conceptKey,c]));
 assert.equal(byKey.size,batch.concepts.length);
 assert.equal(new Set(bind.concepts.map(c=>c.conceptId)).size,batch.concepts.length);
 const fresh=batch.concepts.filter(c=>!c.existingConceptId);
 for(const c of batch.concepts){
  const b=byKey.get(c.conceptKey);assert.equal(b.label,c.document.label);
  if(c.existingConceptId)assert.equal(b.conceptId,c.existingConceptId);
  else assert.match(b.conceptId,/^C-[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/);
 }
 const pairs=fresh.map(c=>c.conceptKey+'|'+byKey.get(c.conceptKey).conceptId).join('\n');
 assert.equal(createHash('sha256').update(pairs).digest('hex'),bind.acceptance.receiptPairsSha256);
 assert.equal(bind.acceptance.itemCount,fresh.length);
 assert.deepEqual(bind.objectives.map(o=>o.objectiveVersionId),batch.objectives.map(o=>o.objectiveVersionId));
 for(const o of bind.objectives)assert.equal(o.conceptId,byKey.get(o.conceptKey).conceptId);
});
