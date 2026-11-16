import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const meta=read('data/nmc-competency-source-metadata.json');
const catalogue=read('data/nmc-reference-catalogue.json');
const manifest=read('docs/evidence/2026-11-16-nmc-official-source-manifest.json');
const recon=read('docs/evidence/2026-11-16-nmc-competency-reconciliation.json');
test('source manifest pins the official bundle and all four documents',()=>{
 assert.equal(manifest.file.sha256,catalogue.sourceSha256);
 assert.equal(manifest.file.pages,467);
 assert.equal(manifest.documents.length,4);
 assert(manifest.documents.every(d=>d.found));
 assert.deepEqual(manifest.documents.map(d=>d.pdfPages[0]),[1,75,242,371]);
});
test('every catalogue reference has exactly one source metadata row',()=>{
 const ids=meta.rows.map(r=>r.referenceId);
 assert.equal(ids.length,2634);
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual([...ids].sort(),catalogue.references.map(r=>r.referenceId).sort());
 const cat=new Map(catalogue.references.map(r=>[r.referenceId,r]));
 for(const r of meta.rows){const c=cat.get(r.referenceId);assert.equal(r.searchCode,c.searchCode);assert.equal(r.subjectId,c.subjectId);assert.equal(r.pdfPages[0],c.pdfPage);}
});
test('public metadata carries no official description or method text',()=>{
 for(const r of meta.rows){
  for(const k of ['description','descriptionNormalized','teachingLearningMethod','assessmentMethod']) assert.equal(k in r,false);
  assert.match(r.descriptionSha256,/^[0-9a-f]{64}$/);
 }
 assert.equal(meta.canonicalAccepted,false);assert.equal(meta.learnerActivation,false);
});
test('evidence status and uncertainty are explicit for every row',()=>{
 const allowed=new Set(['row-hash-verified','row-hash-verified-partial-body','text-layer-extracted-hash-not-reproduced','text-layer-extracted']);
 assert(meta.rows.every(r=>allowed.has(r.evidenceStatus)&&Array.isArray(r.uncertainty)));
 assert(meta.rows.filter(r=>r.evidenceStatus.startsWith('row-hash-verified')).length>=2600);
 assert.equal(meta.rows.filter(r=>r.identifierState!=='standard').length,7);
 assert(meta.rows.filter(r=>r.identifierState!=='standard').every(r=>r.uncertainty.includes('identifier-unresolved')));
});
test('reconciliation reports no missing or extra references and keeps source conflicts separate',()=>{
 assert.equal(recon.catalogue.matched,2634);
 assert.deepEqual(recon.catalogue.missingFromExtraction,[]);assert.deepEqual(recon.catalogue.extraInExtraction,[]);
 assert.equal(recon.namesOnlyIndex.notIndexed,27);assert.deepEqual(recon.namesOnlyIndex.otherNotIndexed,[]);
 assert.deepEqual(recon.recordedLevelConflicts,[]);
 assert.deepEqual(recon.repeatedIdentifiers.map(x=>x.searchCode).sort(),['GM14.1','GM14.2','GM9.8']);
 const peds=recon.printedTotals.find(x=>x.subjectId==='pediatrics');
 assert.equal(peds.printedCompetencies,406);assert.equal(peds.tableRows,253);assert.equal(peds.rowsMatchPrinted,false);
 const totals=new Map(recon.printedTotals.map(x=>[x.subjectId,x.tableRows]));
 for(const [s,n] of totals) assert.equal(meta.rows.filter(r=>r.subjectId===s).length,n);
});
