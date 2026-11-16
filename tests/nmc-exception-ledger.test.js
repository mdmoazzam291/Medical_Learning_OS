import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const L=read('docs/evidence/2026-11-16-nmc-exception-ledger.json');
const cat=new Set(read('data/nmc-reference-catalogue.json').references.map(r=>r.referenceId));
const count=(c,d)=>L.records.filter(e=>e.category===c&&(!d||e.disposition===d)).length;
test('ledger has stable unique IDs and full field set',()=>{
 assert.equal(L.records.length,204);
 assert.equal(new Set(L.records.map(e=>e.ledgerId)).size,204);
 for(const e of L.records){
  for(const k of ['ledgerId','category','originalValue','sourceEvidence','disposition','reason','reviewer','reviewDate','remainingAction']) assert.ok(k in e,k);
  assert.match(e.ledgerId,/^nmc-exc:[0-9a-f]{16}$/);
  assert.ok(['verified','proposed','held','rejected','superseded'].includes(e.disposition));
  if(e.referenceId) assert.ok(cat.has(e.referenceId));
 }
});
test('nothing is accepted, published or canonicalised',()=>{
 assert.ok(L.records.every(e=>e.acceptedByOwner===false&&e.canonicalChanged===false&&e.published===false));
 assert.ok(L.records.every(e=>/no human/.test(e.reviewer)));
});
test('holds are preserved and categories counted',()=>{
 assert.equal(count('session-review-hold','held'),9);
 assert.equal(count('source-exception-mode-hold','held'),7);
 assert.equal(count('earlier-correction-proposal'),154);
 assert.equal(count('earlier-correction-proposal','held'),5);
 assert.equal(count('spinal-cord-identity-link','proposed'),15);
 assert.equal(count('misprinted-code-alias','proposed'),7);
 assert.equal(count('surgery-topic-label','proposed'),2);
});
test('aliases never become official IDs and labels never become competencies',()=>{
 for(const e of L.records.filter(e=>e.category==='misprinted-code-alias')){assert.ok(e.proposedValue.searchAlias);assert.ok(!('officialCode' in e.proposedValue));}
 for(const e of L.records.filter(e=>e.category==='surgery-topic-label')){assert.equal(e.referenceId,null);assert.equal(e.originalValue.printedHeading,null);}
});
test('paediatrics discrepancy creates no rows',()=>{
 const p=L.records.find(e=>e.category==='printed-total-discrepancy'&&e.printedCode==='PEDIATRICS');
 assert.equal(p.disposition,'verified');assert.equal(p.proposedValue.tableRows,253);
 assert.equal(read('data/nmc-competency-source-metadata.json').rows.filter(r=>r.subjectId==='pediatrics').length,253);
});
test('public ledger stores no official wording field',()=>{
 assert.ok(L.records.every(e=>!('officialWording' in e)));
});
test('printed-count audit records source inconsistencies without changing rows',()=>{
 const a=read('docs/evidence/2026-11-16-nmc-printed-count-audit.json');
 const meta=read('data/nmc-competency-source-metadata.json').rows;
 for(const [s,v] of Object.entries(a.subjects)) assert.equal(meta.filter(r=>r.subjectId===s).length,v.tableRows,s);
 assert.equal(L.records.filter(e=>e.category==='printed-total-discrepancy').length,7);
 assert.ok(L.records.filter(e=>e.category==='printed-total-discrepancy').every(e=>e.disposition==='verified'));
});
test('held proposal reworks keep holds in place',()=>{
 const r=read('docs/evidence/2026-11-16-nmc-held-proposal-reworks.json');
 assert.equal(r.records.length,5);assert.equal(r.holdsRemain,true);
 for(const x of r.records){const e=L.records.find(e=>e.ledgerId===x.ledgerId);assert.equal(e.disposition,'held');assert.equal(e.reworkProposal.draftTask,x.reworkedDraftTask);}
});
