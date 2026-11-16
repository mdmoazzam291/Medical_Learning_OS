import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verify} from '../ops/nmc/verify-mixed-reuse.js';
const path='docs/evidence/2026-11-08-nmc-mixed-reuse-scope-proposals.json';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function run(mutate){const p=JSON.parse(read(path));if(mutate)mutate(p);return verify(x=>x===path?JSON.stringify(p):read(x));}
test('reuse verifier retains source scopes and separates meanings without acceptance',()=>{const s=run();assert.equal(s.leadLabels,60);assert.equal(s.componentOccurrences,66);assert.equal(s.distinctOccurrenceReferences,45);assert.equal(s.distinctTargetReferences,65);assert.equal(s.canonicalAcceptance,false);});
for(const [label,mutate] of [
 ['omitted lead',p=>p.rows.pop()],
 ['changed target association',p=>p.rows[0].existingTargets[0].supportingSourceTasks=[]],
 ['forged source mode',p=>p.rows[0].occurrenceSourceTasks[0].mode='knowledge-forged'],
 ['forged acceptance',p=>p.rows[0].mappingAccepted=true],
 ['merged sterilization meanings',p=>p.rows.find(r=>r.nameKey==='sterilization').reuseDisposition='shared-topic-name-candidate'],
 ['self-reference counted as independent reuse',p=>p.rows.find(r=>r.nameKey==='pathology terminology').reuseDisposition='shared-topic-name-candidate'],
 ['forged source audit digest',p=>p.sourceAuditSha256='0'.repeat(64)]
])test('reuse verifier rejects '+label,()=>assert.throws(()=>run(mutate)));
