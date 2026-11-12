import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyFamily} from '../ops/nmc/verify-family-decomposition.js';
const path='docs/evidence/2026-11-08-nmc-family-scope-decomposition-batch-01.json',read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function run(mutate){const p=JSON.parse(read(path));if(mutate)mutate(p);return verifyFamily(x=>x===path?JSON.stringify(p):read(x));}
test('family verification preserves partial enumeration and source contexts',()=>{const p=run();assert.equal(p.parentNames,30);assert.equal(p.sourceTaskAppearances,31);assert.equal(p.componentProposals,138);assert.equal(p.familyParentsWithoutDecompositionProposal,622);assert.equal(p.canonicalAcceptance,false);});
for(const [label,mutate] of [
 ['omitted parent with adjusted totals',p=>{p.rows.pop();p.totals.parentNames--;}],
 ['foreign task binding',p=>p.rows[0].components[0].sourceReferenceIds=['foreign']],
 ['forged canonical allocation',p=>p.rows[0].components[0].canonicalConceptId='accepted'],
 ['forged full scope',p=>p.rows[0].scopeComplete=true],
 ['forged exact-label lead',p=>p.rows[0].components[0].existingExactLabelCandidates=[{path:'fake',nameKey:'fake'}]],
 ['changed queue digest',p=>p.sourceQueueSha256='0'.repeat(64)],
 ['duplicate proposal IDs',p=>p.rows[0].components[1].proposalId=p.rows[0].components[0].proposalId],
 ['forged source mode',p=>p.rows[0].sourceTasks[0].mode='forged']
])test('family verification rejects '+label,()=>assert.throws(()=>run(mutate)));
