import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const D=read('docs/evidence/2026-11-16-nmc-owner-decisions.json');
const L=read('docs/evidence/2026-11-16-nmc-exception-ledger.json');
const meta=new Map(read('data/nmc-competency-source-metadata.json').rows.map(r=>[r.referenceId,r]));
test('one decision per ledger record, under recorded owner authority',()=>{
 assert.equal(D.decisions.length,L.records.length);
 assert.deepEqual(new Set(D.decisions.map(d=>d.ledgerId)),new Set(L.records.map(e=>e.ledgerId)));
 assert.equal(D.authority.humanFacultyReview,false);assert.equal(D.authority.clinicalApproval,false);
 assert.equal(D.learnerActivation,false);
 assert.ok(D.authority.notCovered.some(s=>/merge/.test(s)));
});
test('ledger history is not rewritten',()=>{
 assert.ok(L.records.every(e=>e.acceptedByOwner===false));
});
test('accepted objective revisions have unique IDs and level-consistent or documented modes',()=>{
 const revs=D.decisions.filter(d=>d.objectiveRevisionId);
 assert.equal(revs.length,170);assert.equal(new Set(revs.map(d=>d.objectiveRevisionId)).size,170);
 for(const d of revs){
  const l=meta.get(d.referenceId).level; const practical=/SH|\bP\b/.test(l);
  if((d.acceptedValue.mode!=='knowledge')!==practical) assert.ok(d.modeException,d.printedCode);
  assert.ok(!/(^|\. )(Retain|Preserve|Include)\b|\bthe source\b/.test(d.acceptedValue.draftTask),d.printedCode);
 }
});
test('aliases, labels and spinal links keep their boundaries',()=>{
 for(const d of D.decisions.filter(d=>d.category==='misprinted-code-alias')) assert.ok(d.acceptedValue.searchAlias&&d.acceptedValue.officialPrintedCode);
 for(const d of D.decisions.filter(d=>d.category==='surgery-topic-label')) assert.equal(d.acceptedValue.officialHeading,null);
 for(const d of D.decisions.filter(d=>d.category==='spinal-cord-identity-link')) assert.ok(/Admin-console/.test(d.productionStep));
 for(const d of D.decisions.filter(d=>d.category==='printed-total-discrepancy')) assert.equal(d.acceptedValue.rowsUnchanged,true);
});
