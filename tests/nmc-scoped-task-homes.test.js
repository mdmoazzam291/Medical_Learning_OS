import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyScopedHomes} from '../ops/nmc/verify-scoped-task-homes.js';
const path='docs/evidence/2026-11-08-nmc-scoped-task-home-proposals-batch-01.json',read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function run(mutate){const p=JSON.parse(read(path));if(mutate)mutate(p);return verifyScopedHomes(x=>x===path?JSON.stringify(p):read(x));}
test('scoped homes preserve the first cohort and pending evidence',()=>assert.deepEqual(run(),{status:'PASS',facets:30,sourceAppearances:30,distinctProposedHomes:22,facetsWithoutInitialHomeProposal:629,canonicalAcceptance:false}));
for(const [label,mutate] of [
 ['omitted facet with adjusted totals',p=>{p.rows.pop();p.totals.facets--;}],
 ['self-parent home',p=>{p.rows[0].proposedHomeName=p.rows[0].facetName;p.rows[0].proposedHomeNameKey=p.rows[0].facetNameKey;}],
 ['forged existing-name lead',p=>p.rows[0].existingExactLabelCandidates=[{path:'fake',nameKey:'fake'}]],
 ['accepted canonical mapping',p=>p.rows[0].mappingAccepted=true],
 ['independent performance claim',p=>p.rows.find(r=>r.facetNameKey==='acls participation').independentCompetenceEstablished=true],
 ['changed assessment mode',p=>p.rows[0].sourceTasks[0].mode='independent'],
 ['changed queue digest',p=>p.sourceQueueSha256='0'.repeat(64)],
 ['duplicate proposal ID',p=>p.rows[1].proposalId=p.rows[0].proposalId]
])test('scoped homes reject '+label,()=>assert.throws(()=>run(mutate)));
