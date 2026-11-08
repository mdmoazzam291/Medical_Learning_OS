import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {audit} from '../ops/nmc/report-mixed-decomposition.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const base='docs/evidence/2026-11-08-nmc-';
const paths=Array.from({length:4},(_,i)=>base+'mixed-scope-decomposition-batch-'+String(i+1).padStart(2,'0')+'.json');
function run(mutate){const edits=new Map();if(mutate)mutate((p,fn)=>{const d=JSON.parse(read(p));fn(d);edits.set(p,JSON.stringify(d));});return audit(p=>edits.get(p)??read(p));}
test('audit accounts for all mixed sources and reports label leads without merging',()=>{const r=run();assert.equal(r.totals.parentNames,69);assert.equal(r.totals.componentOccurrences,660);assert.equal(r.totals.sourceAppearances,176);assert(r.reuseLeads.length>0);assert(r.reuseLeads.every(x=>x.semanticEquivalence==='unverified'&&x.mappingAccepted===false));assert(r.reuseLeads.some(x=>x.label==='Malaria'));});
for(const [name,fn] of [
 ['omitted parent',d=>d.rows.pop()],
 ['duplicated parent',d=>d.rows.push(d.rows[0])],
 ['foreign source association',d=>d.rows[0].components[0].sourceReferenceIds=['foreign']],
 ['forged acceptance',d=>d.rows[0].components[0].mappingAccepted=true],
 ['forged queue digest',d=>d.sourceQueueSha256='0'.repeat(64)],
 ['forged predecessor digest',d=>d.previousBatchDigests[0].sha256='0'.repeat(64)]
])test('audit rejects '+name,()=>assert.throws(()=>run(edit=>edit(paths[3],fn))));
test('audit rejects changed underlying task evidence',()=>assert.throws(()=>run(edit=>{const d=JSON.parse(read(paths[3]));edit(d.rows[0].sourceTasks[0].packetPath,p=>{p.rows.find(t=>t.referenceId===d.rows[0].sourceTasks[0].referenceId).draftLearningTask+=' changed';});})));
