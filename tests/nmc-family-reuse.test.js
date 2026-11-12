import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verify} from '../ops/nmc/verify-family-reuse.js';
const path='docs/evidence/2026-11-08-nmc-family-reuse-scope-proposals.json';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function run(mutate){const p=JSON.parse(read(path));if(mutate)mutate(p);return verify(x=>x===path?JSON.stringify(p):read(x));}
test('family reuse preserves all 78 leads and context constraints',()=>{
 const result=run();assert.equal(result.leadLabels,78);assert.equal(result.componentOccurrences,97);
 assert.equal(result.distinctOccurrenceReferences,61);assert.equal(result.distinctTargetReferences,66);
 assert.equal(result.dispositionCounts['retain-context-specific-scope'],1);
 assert.equal(result.dispositionCounts['self-parent-context-only'],5);assert.equal(result.canonicalAcceptance,false);
});
for(const [name,mutate] of [
 ['forensic and growth anthropometry collapse',p=>p.rows.find(r=>r.nameKey==='anthropometry').reuseDisposition='shared-topic-name-candidate'],
 ['self-parent support counted as independent',p=>p.rows.find(r=>r.nameKey==='stroke mechanisms').reuseDisposition='shared-topic-name-candidate'],
 ['omitted lead with adjusted total',p=>{p.rows.pop();p.totals.leadLabels--;}],
 ['accepted objective equivalence',p=>p.rows[0].objectiveEquivalence=true],
 ['lost target task',p=>p.rows[0].existingTargets[0].supportingSourceTasks.pop()],
 ['altered target task text',p=>p.rows[0].existingTargets[0].supportingSourceTasks[0].draftLearningTask+=' changed'],
 ['changed occurrence evidence',p=>p.rows[0].occurrenceSourceTasks[0].editorialTaskSha256='0'.repeat(64)],
 ['independent competence claim',p=>p.rows[0].independentCompetenceEstablished=true]
])test('family reuse rejects '+name,()=>assert.throws(()=>run(mutate)));
