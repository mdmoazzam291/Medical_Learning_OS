// Checks source accounting and recorded editorial constraints, not medical equivalence.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {audit} from './report-mixed-decomposition.js';
const base='docs/evidence/2026-11-08-nmc-',packetPath=base+'mixed-reuse-scope-proposals.json',auditPath=base+'mixed-decomposition-audit.json';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function verify(text){
 const cache=new Map(),read=p=>{if(!cache.has(p))cache.set(p,JSON.parse(text(p)));return cache.get(p);};
 const p=read(packetPath),a=read(auditPath);assert.deepEqual(a,audit(text),'underlying audit drift');
 assert.equal(p.schemaVersion,1);assert.equal(p.status,'names-only-mixed-reuse-scope-proposals');assert.equal(p.sourceAuditPath,auditPath);assert.equal(p.sourceAuditSha256,hash(text(auditPath)));
 for(const f of ['clinicalApproval','learnerActivation','automaticMerging','canonicalIdentityAllocation','officialSourceRechecked','productionRegistryChecked'])assert.equal(p[f],false);
 assert.deepEqual(p.rows.map(r=>r.nameKey),a.reuseLeads.map(l=>l.nameKey),'lead cohort changed');
 const occurrenceRefs=new Set(),targetRefs=new Set(),counts={};let occurrences=0;
 const source=t=>{
  const matches=read(t.packetPath).rows.filter(s=>s.referenceId===t.referenceId);assert.equal(matches.length,1);const s=matches[0];assert.equal(t.editorialTaskSha256,hash(s.draftLearningTask));
  for(const f of ['subjectId','code','page','rowBBox','sourceBodySha256','mode'])assert.deepEqual(t[f],s[f],'source task drift');
 };
 for(let i=0;i<p.rows.length;i++){
  const r=p.rows[i],l=a.reuseLeads[i];assert.equal(r.label,l.label);assert.deepEqual(r.occurrences,l.occurrences);occurrences+=r.occurrences.length;
  assert.equal(r.canonicalConceptId,null);assert.equal(r.canonicalObjectiveVersionId,null);assert.equal(r.semanticEquivalence,'unverified');
  for(const f of ['mappingAccepted','scopeComplete','objectiveEquivalence','independentCompetenceEstablished'])assert.equal(r[f],false);
  const self=['laboratory technique observation','pathology terminology'].includes(r.nameKey),facet=['haemostasis','lipid test interpretation','renal test interpretation','respiratory distress assessment'].includes(r.nameKey);
  // Preserve explicitly inspected meaning/role constraints; these rules do not infer clinical truth.
  const expected=r.nameKey==='sterilization'?'keep-separate-different-meaning':self?'self-parent-context-only':facet?'retain-facet-with-home-candidate':'shared-topic-name-candidate';assert.equal(r.reuseDisposition,expected,'editorial separation constraint changed');
  assert.equal(r.proposedDisplayName,r.nameKey==='sterilization'?'Contraceptive sterilization':r.label);assert(typeof r.basis==='string'&&r.basis.length);
  counts[expected]=(counts[expected]??0)+1;
  const refs=new Set(r.occurrences.flatMap(o=>o.sourceReferenceIds)),seen=new Set();
  for(const t of r.occurrenceSourceTasks){assert(!seen.has(t.referenceId));seen.add(t.referenceId);occurrenceRefs.add(t.referenceId);source(t);}assert.deepEqual(seen,refs);
  assert.deepEqual(r.existingTargets.map(t=>({path:t.path,nameKey:t.nameKey})),l.existingLabelTargets);const support=new Set();
  for(const target of r.existingTargets){
   const d=read(target.path);let expectedRefs;
   if(d.names){const n=d.names.find(n=>n.nameKey===target.nameKey);assert(n);expectedRefs=new Set(n.appearances.map(a=>a.referenceId));}
   else if(d.entries){const n=d.entries.find(n=>n.nameKey===target.nameKey);assert(n);expectedRefs=new Set(n.occurrences.flatMap(o=>o.sourceReferenceIds));}
   else{const n=d.homes.find(n=>n.nameKey===target.nameKey);assert(n);expectedRefs=new Set(n.facetBindings.flatMap(o=>o.sourceReferenceIds));}
   const actual=new Set();for(const t of target.supportingSourceTasks){assert(!actual.has(t.referenceId));actual.add(t.referenceId);support.add(t.referenceId);targetRefs.add(t.referenceId);source(t);}assert.deepEqual(actual,expectedRefs,'target support drift');
  }
  assert.deepEqual(r.overlappingSourceReferenceIds,[...refs].filter(ref=>support.has(ref)).sort());if(self)assert([...refs].every(ref=>support.has(ref)));
 }
 const totals={leadLabels:p.rows.length,componentOccurrences:occurrences,distinctOccurrenceReferences:occurrenceRefs.size,distinctTargetReferences:targetRefs.size};assert.deepEqual(p.totals,totals);assert.deepEqual(p.dispositionCounts,counts);
 return {status:'PASS',...totals,dispositionCounts:counts,canonicalAcceptance:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=new URL('../../',import.meta.url);execFileSync(process.execPath,[fileURLToPath(new URL('ops/nmc/report-mixed-decomposition.js',root)),'--verify'],{stdio:'pipe'});
 console.log(JSON.stringify(verify(p=>readFileSync(new URL(p,root),'utf8'))));
}
