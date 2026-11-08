import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditFamily,verifyFamilyAudit,familyAuditPath} from '../ops/nmc/report-family-decomposition.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const expected=auditFamily(read);
test('family audit covers all cohorts without accepting identities',()=>{
 assert.equal(expected.totals.parentNames,652);assert.equal(expected.totals.componentOccurrences,3002);
 assert.equal(expected.totals.sourceAppearances,663);assert.equal(expected.automaticMerging,false);
 for(const lead of expected.reuseLeads){
  assert.equal(lead.mappingAccepted,false);assert.equal(lead.objectiveEquivalence,'unverified');
  assert(lead.occurrences.length>1||lead.existingLabelTargets.length);
  for(const o of lead.occurrences)assert(o.sourceTasks.length&&o.sourceTasks.every(t=>t.editorialTaskSha256&&t.sourceBodySha256&&t.referenceId));
 }
});
test('saved audit reproduces exact evidence and pins every accessed source',()=>{
 assert.equal(verifyFamilyAudit(read).status,'PASS');
 assert(expected.sourceDigests.some(d=>d.path.endsWith('family-scope-decomposition-batch-22.json')));
 assert(expected.sourceDigests.some(d=>d.path.includes('-draft-tasks.json')));
});
for(const [label,mutate] of [
 ['omitted reuse lead',p=>p.reuseLeads.pop()],
 ['forged identity acceptance',p=>p.reuseLeads[0].mappingAccepted=true],
 ['forged objective equivalence',p=>p.reuseLeads[0].objectiveEquivalence='equivalent'],
 ['omitted component task support',p=>p.reuseLeads[0].occurrences[0].sourceTasks.pop()],
 ['invented target',p=>p.reuseLeads[0].existingLabelTargets.push({path:'fake',nameKey:'fake'})],
 ['changed source digest',p=>p.sourceDigests[0].sha256='0'.repeat(64)]
])test('family audit rejects '+label,()=>{
 const p=structuredClone(expected);mutate(p);
 assert.throws(()=>verifyFamilyAudit(x=>x===familyAuditPath?JSON.stringify(p):read(x)));
});
test('source-task drift fails before generating a plausible label report',()=>{
 const d=expected.sourceDigests.find(d=>d.path.includes('-draft-tasks.json'));
 const p=JSON.parse(read(d.path));
 for(const row of p.rows)row.draftLearningTask+=' altered';
 assert.throws(()=>auditFamily(x=>x===d.path?JSON.stringify(p):read(x)));
});
