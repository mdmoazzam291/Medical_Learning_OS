import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildQueue} from '../ops/nmc/report-parent-follow-up.js';
const batches=Array.from({length:11},(_,i)=>JSON.parse(readFileSync(new URL(`../docs/evidence/2026-11-08-nmc-parent-scope-assessments-batch-${String(i+1).padStart(2,'0')}.json`,import.meta.url))));
test('queue retains every source context and routes unresolved groups before binding',()=>{
 const q=buildQueue(batches);assert.equal(q.rows.length,1950);assert.equal(q.totals.sourceTaskAppearances,2094);
 assert.equal(q.rows.filter(r=>r.nextAction==='decompose-mixed-scope').length,69);
 assert.equal(q.rows.filter(r=>r.nextAction==='decompose-family-context').length,652);
 assert(q.rows.every(r=>r.scopeComplete===false&&r.mappingAccepted===false&&r.canonicalConceptId===null));
 assert.deepEqual(q.rows.flatMap(r=>r.sourceTasks).sort((a,b)=>a.referenceId.localeCompare(b.referenceId)),batches.flatMap(b=>b.rows.flatMap(r=>r.sourceTasks)).sort((a,b)=>a.referenceId.localeCompare(b.referenceId)));
});
for(const [label,mutate] of [
 ['overlapping names',b=>b[1].rows.push(b[0].rows[0])],
 ['overlapping references',b=>b[1].rows[0].sourceTasks.push(b[0].rows[0].sourceTasks[0])],
 ['forged acceptance',b=>b[0].rows[0].mappingAccepted=true],
 ['unknown disposition',b=>b[0].rows[0].scopeDisposition='accepted']
])test('queue rejects '+label,()=>{const b=structuredClone(batches);mutate(b);assert.throws(()=>buildQueue(b));});
