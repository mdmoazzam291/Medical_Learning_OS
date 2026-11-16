// Editorial triage of existing parent labels; no canonical identity or competence claims.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../../',import.meta.url),text=p=>readFileSync(new URL(p,root),'utf8'),read=p=>JSON.parse(text(p));
const hash=s=>createHash('sha256').update(s).digest('hex');
const batch=process.argv.find(a=>a.startsWith('--batch='))?.slice(8)??'01';
assert(/^[0-9]{2}$/.test(batch)&&Number(batch)>0,'invalid parent scope batch');
const base='docs/evidence/2026-11-08-nmc-';
const indexPath=base+'foundation-names-only-index.json',triagePath=base+'unassessed-parent-reuse-triage.json';
const decisionsPath=base+'parent-scope-decisions-batch-'+batch+'.json',outputPath=base+'parent-scope-assessments-batch-'+batch+'.json';
const index=read(indexPath),triage=read(triagePath),decisions=read(decisionsPath),indexHash=hash(text(indexPath));
assert.equal(decisions.schemaVersion,1);assert.equal(decisions.status,'names-only-parent-scope-decisions');
const flags=['clinicalApproval','learnerActivation','automaticMerging','productionRegistryChecked','canonicalIdentityAllocation','officialSourceRechecked'];
for(const key of flags)assert.equal(decisions[key],false);
assert.equal(decisions.sourceIndexSha256,indexHash,'source index drift');
assert(Number.isInteger(decisions.selectionLimit)&&decisions.selectionLimit>0&&decisions.selectionLimit<=500);
const byName=new Map(index.names.map(n=>[n.nameKey,n]));assert.equal(byName.size,index.names.length);
const selected=new Set();
for(let i=1;i<=12;i++)for(const row of read(base+'compound-name-components-batch-'+String(i).padStart(2,'0')+'.json').rows){
 assert(byName.has(row.parentNameKey));assert(!selected.has(row.parentNameKey),'duplicate selected parent');selected.add(row.parentNameKey);
}
const reused=new Set();
for(const row of triage.matches){assert(byName.has(row.parentNameKey));assert(!selected.has(row.parentNameKey));assert(!reused.has(row.parentNameKey));reused.add(row.parentNameKey);}
const previous=new Set(),previousBatchDigests=[];
for(let i=1;i<Number(batch);i++){
 const path=base+'parent-scope-assessments-batch-'+String(i).padStart(2,'0')+'.json',p=read(path);
 assert.equal(p.status,'names-only-parent-scope-assessments');assert.equal(p.sourceIndexSha256,indexHash,'previous batch index drift');
 for(const key of flags)assert.equal(p[key],false);
 for(const row of p.rows){assert(byName.has(row.parentNameKey));assert(!selected.has(row.parentNameKey)&&!reused.has(row.parentNameKey)&&!previous.has(row.parentNameKey),'previous cohort overlap');previous.add(row.parentNameKey);}
 previousBatchDigests.push({path,sha256:hash(text(path))});
}
const unassessed=index.names.filter(n=>!selected.has(n.nameKey)&&!reused.has(n.nameKey)&&!previous.has(n.nameKey));
const cohort=unassessed.slice(0,decisions.selectionLimit);
assert.equal(cohort.length,decisions.selectionLimit,'batch exceeds untouched cohort');
assert.deepEqual(decisions.rows.map(r=>r.parentNameKey),cohort.map(n=>n.nameKey),'batch cohort omitted, reordered or duplicated');
const allowed=['standalone-topic-candidate','scoped-task-facet','family-context','mixed-scope-pending'];
const cache=new Map();
const evidence=a=>{
 if(!cache.has(a.packet))cache.set(a.packet,read(a.packet));
 const matches=cache.get(a.packet).rows.filter(t=>t.referenceId===a.referenceId);assert.equal(matches.length,1,'missing or ambiguous source task');
 const t=matches[0];assert.equal(t.subjectId,a.subjectId);assert.equal(t.code,a.code);assert.equal(t.page,a.pdfPage);
 assert(/^[a-f0-9]{64}$/.test(t.sourceBodySha256));assert(['knowledge','performance-and-knowledge'].includes(t.mode));
 return {referenceId:t.referenceId,packetPath:a.packet,subjectId:t.subjectId,code:t.code,page:t.page,rowBBox:t.rowBBox,sourceBodySha256:t.sourceBodySha256,editorialTaskSha256:hash(t.draftLearningTask),mode:t.mode};
};
const rows=decisions.rows.map((r,i)=>{
 assert(allowed.includes(r.scopeDisposition),'invalid scope disposition');const n=cohort[i];
 const tasks=n.appearances.map(evidence).sort((a,b)=>a.referenceId.localeCompare(b.referenceId));
 assert(tasks.length&&new Set(tasks.map(t=>t.referenceId)).size===tasks.length,'duplicate parent source appearance');
 return {parentNameKey:n.nameKey,name:n.name,scopeDisposition:r.scopeDisposition,basis:'existing-editorial-name-and-source-task-scope',canonicalConceptId:null,canonicalObjectiveVersionId:null,semanticEquivalence:'unverified',mappingAccepted:false,scopeComplete:false,sourceTasks:tasks};
});
const dispositionCounts=Object.fromEntries(allowed.map(k=>[k,rows.filter(r=>r.scopeDisposition===k).length]));
const result={schemaVersion:1,status:'names-only-parent-scope-assessments',batch,sourceDecisionsPath:decisionsPath,sourceDecisionsSha256:hash(text(decisionsPath)),sourceIndexPath:indexPath,sourceIndexSha256:indexHash,sourceTriagePath:triagePath,sourceTriageSha256:hash(text(triagePath)),previousBatchDigests,...Object.fromEntries(flags.map(k=>[k,false])),coverageFraction:null,totals:{parentNames:rows.length,sourceTaskAppearances:rows.reduce((n,r)=>n+r.sourceTasks.length,0),selectedCompoundParents:selected.size,exactLabelReuseParents:reused.size,previouslyTriagedParents:previous.size,untouchedParentNames:unassessed.length-rows.length},dispositionCounts,rows};
if(process.argv.includes('--verify')){
 assert.deepEqual(read(outputPath),result,'parent scope projection differs from evidence');
 console.log(JSON.stringify({status:'PASS',batch,...result.totals,dispositionCounts,canonicalAcceptance:false}));
}else console.log(JSON.stringify(result,null,2));
