// Offline structural verification; live registry evidence remains a dated read-only snapshot.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
const p=read('docs/evidence/2026-11-08-nmc-registry-reuse-proposals.json');
const roles=read('docs/evidence/2026-11-08-nmc-name-role-proposals.json');
const pilot=read('docs/evidence/2026-11-08-nmc-respiratory-artifact-bindings.json');
assert.equal(p.status,'names-only-registry-reuse-proposals');assert.equal(p.registryReadOnly,true);
for(const k of ['clinicalApproval','learnerActivation','automaticMerging','productionWrites','registryAcceptanceWrites','foundationComplete'])assert.equal(p[k],false);
const norm=s=>s.normalize('NFC').trim().toLowerCase();
const matches=s=>p.registrySnapshot.some(r=>[r.label,...r.aliases].some(n=>norm(n)===norm(s)));
assert.deepEqual(p.exactMatchAccounting,{classifiedNames:roles.entries.length,exactNameOrAliasMatches:roles.entries.filter(e=>matches(e.name)).length,exactProposedHomeMatches:roles.entries.filter(e=>matches(e.proposedHomeLabel)).length,semanticAbsenceProven:false});
const seen=new Set();let partial=0,unbound=0;
for(const e of p.entries){
 assert(!seen.has(e.componentProposalId));seen.add(e.componentProposalId);
 const role=roles.entries.find(r=>r.nameKey===e.nameKey);assert(role);assert.equal(e.name,role.name);
 assert(role.occurrences.some(o=>o.componentProposalId===e.componentProposalId&&JSON.stringify(o.sourceReferenceIds)===JSON.stringify(e.sourceReferenceIds)));
 for(const k of ['identityAccepted','mappingAccepted','clinicalValidation','completeScope'])assert.equal(e[k],false);
 for(const k of ['canonicalConceptId','canonicalObjectiveVersionId','coverageFraction'])assert.equal(e[k],null);
 assert(e.remainingScopeNames.length>0);
 if(e.relation==='unbound'){
  unbound++;for(const k of ['candidateConceptId','candidateObjectiveVersionId','candidateDraftDigest','candidateDraftRevision','candidateObjectiveSourceReferenceId','candidateObjectiveSourceCode','scopeSubsetName'])assert.equal(e[k],null);
 }else{
  assert.equal(e.relation,'proposed-partial-scope-objective-reuse');partial++;
  assert(p.registrySnapshot.some(r=>r.registry==='draft'&&r.conceptId===e.candidateConceptId));
  assert(!p.registrySnapshot.some(r=>r.registry==='catalog'&&r.conceptId===e.candidateConceptId));
  assert.equal(e.candidateDraftRevision,2);assert(/^[a-f0-9]{64}$/.test(e.candidateDraftDigest));
  const o=pilot.curriculum.objectives.find(o=>o.objectiveVersionId===e.candidateObjectiveVersionId);assert(o);assert.equal(o.conceptId,e.candidateConceptId);
  const source=pilot.components.find(c=>c.objectiveVersionId===o.objectiveVersionId);assert.equal(source.referenceId,e.candidateObjectiveSourceReferenceId);assert.equal(source.code,e.candidateObjectiveSourceCode);
 }
}
assert.deepEqual(p.proposalCounts,{partialScopeReuse:partial,unbound});
assert.equal(partial,2);assert.equal(unbound,1);
console.log('PASS: two partial-scope reuse proposals and one unbound name; no acceptance or publication');
