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

test('Biochemistry objective bindings use receipt-verified IDs and reuse Physiology identities',()=>{
 const raw=read('../docs/evidence/2026-11-16-nmc-biochemistry-concept-batch-v1.json'),bc=JSON.parse(raw);
 const b=JSON.parse(read('../docs/evidence/2026-11-16-nmc-biochemistry-objective-bindings-v1.json'));
 assert.equal(b.batchSha256,createHash('sha256').update(raw).digest('hex'));
 const byKey=new Map(b.concepts.map(c=>[c.conceptKey,c]));
 const fresh=bc.concepts.filter(c=>!c.existingConceptId);
 assert.equal(createHash('sha256').update(fresh.map(c=>c.conceptKey+'|'+byKey.get(c.conceptKey).conceptId).join('\n')).digest('hex'),b.acceptance.receiptPairsSha256);
 const physIds=new Set(bind.concepts.map(c=>c.conceptId));
 for(const c of bc.concepts.filter(c=>c.existingConceptId))assert.ok(physIds.has(byKey.get(c.conceptKey).conceptId),c.document.label);
 assert.equal(b.objectives.length,120);
 const pack=JSON.parse(read('../data/nmc-learning-foundation-drafts.json'));
 const reg=new Map(pack.objectives.map(r=>[r.objective.objectiveVersionId,r.objective.conceptId]));
 for(const o of b.objectives)assert.equal(reg.get(o.objectiveVersionId),o.conceptId);
});
