// Exact-label leads only: shared wording never accepts identity or objective equivalence.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {verifyFamily} from './verify-family-decomposition.js';

const base='docs/evidence/2026-11-08-nmc-';
export const familyAuditPath=base+'family-decomposition-audit.json';
const key=s=>s.normalize('NFC').trim().replace(/\s+/gu,' ').toLowerCase();
const hash=s=>createHash('sha256').update(s).digest('hex');
export function auditFamily(text){
 const cache=new Map();
 const raw=path=>{if(!cache.has(path))cache.set(path,text(path));return cache.get(path);};
 const read=path=>JSON.parse(raw(path));
 const verification=verifyFamily(raw,'22');
 assert.equal(verification.familyParentsWithoutDecompositionProposal,0);
 const groups=new Map();
 const paths=Array.from({length:22},(_,i)=>base+'family-scope-decomposition-batch-'+String(i+1).padStart(2,'0')+'.json');
 for(const path of paths)for(const r of read(path).rows)for(const c of r.components){
  const nameKey=key(c.name);
  if(!groups.has(nameKey))groups.set(nameKey,{label:c.name,occurrences:[]});
  // Preserve only this component's supporting tasks, not all tasks under the parent.
  const sourceTasks=c.sourceReferenceIds.map(ref=>r.sourceTasks.find(t=>t.referenceId===ref));
  groups.get(nameKey).occurrences.push({batchPath:path,proposalId:c.proposalId,parentNameKey:r.parentNameKey,proposedRole:c.proposedRole,sourceTasks});
 }
 const inventories=['foundation-names-only-index.json','name-role-proposals.json','missing-home-proposals.json'].map(p=>base+p);
 const targets=new Map();
 for(const path of inventories){
  const d=read(path);
  for(const n of d.names??d.entries??d.homes){
   const k=key(n.name??n.nameKey);
   if(!targets.has(k))targets.set(k,[]);
   // The pinned inventory and locator retain target provenance without inventing equivalence.
   targets.get(k).push({path,nameKey:n.nameKey});
  }
 }
 const reuseLeads=[...groups.entries()].filter(([k,g])=>g.occurrences.length>1||targets.has(k)).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([nameKey,g])=>{
  const parents=new Set(g.occurrences.map(o=>o.parentNameKey));
  const counts=new Map();for(const o of g.occurrences)counts.set(o.parentNameKey,(counts.get(o.parentNameKey)??0)+1);
  return {nameKey,...g,withinParentRepeat:[...counts.values()].some(n=>n>1),crossParentRepeat:parents.size>1,existingLabelTargets:targets.get(nameKey)??[],semanticEquivalence:'unverified',objectiveEquivalence:'unverified',mappingAccepted:false,canonicalConceptId:null};
 });
 return {schemaVersion:1,status:'names-only-family-decomposition-audit',clinicalApproval:false,learnerActivation:false,automaticMerging:false,canonicalIdentityAllocation:false,
  normalization:'NFC, trimmed and collapsed whitespace, lowercase; punctuation preserved',
  totals:{parentNames:verification.parentNames,sourceAppearances:verification.sourceTaskAppearances,componentOccurrences:verification.componentProposals,distinctProposedLabels:groups.size,reuseLeadLabels:reuseLeads.length,withinParentRepeatedLabels:reuseLeads.filter(r=>r.withinParentRepeat).length,crossParentRepeatedLabels:reuseLeads.filter(r=>r.crossParentRepeat).length,existingInventoryMatchLabels:reuseLeads.filter(r=>r.existingLabelTargets.length).length},
  sourceDigests:[...cache.keys()].sort().map(path=>({path,sha256:hash(raw(path))})),reuseLeads};
}
export function verifyFamilyAudit(text){
 const expected=auditFamily(text);
 assert.deepEqual(JSON.parse(text(familyAuditPath)),expected,'family audit differs from source evidence');
 return {status:'PASS',...expected.totals,canonicalAcceptance:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=new URL('../../',import.meta.url),text=p=>readFileSync(new URL(p,root),'utf8');
 console.log(JSON.stringify(process.argv.includes('--verify')?verifyFamilyAudit(text):auditFamily(text),null,2));
}
