// Editorial evidence audit and exact-label leads; no semantic equivalence or identity acceptance.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
const base='docs/evidence/2026-11-08-nmc-',hash=s=>createHash('sha256').update(s).digest('hex');
const key=s=>s.normalize('NFC').trim().replace(/\s+/gu,' ').toLowerCase();
const paths=Array.from({length:4},(_,i)=>base+'mixed-scope-decomposition-batch-'+String(i+1).padStart(2,'0')+'.json');
export function audit(text){
 const cache=new Map(),read=p=>{if(!cache.has(p))cache.set(p,JSON.parse(text(p)));return cache.get(p);};
 const queuePath=base+'parent-follow-up-queue.json',queue=read(queuePath),mixed=queue.rows.filter(r=>r.scopeDisposition==='mixed-scope-pending');
 assert.equal(mixed.length,69);const rows=[],ids=new Set(),refs=new Set(),groups=new Map();
 for(let i=0;i<paths.length;i++){
  const p=read(paths[i]);assert.equal(p.status,'names-only-mixed-scope-decomposition-proposals');
  for(const f of ['clinicalApproval','learnerActivation','automaticMerging','canonicalIdentityAllocation','officialSourceRechecked'])assert.equal(p[f],false);
  assert.equal(p.sourceQueuePath,queuePath);assert.equal(p.sourceQueueSha256,hash(text(queuePath)),'queue digest drift');
  const pins=p.previousBatchDigests??[];assert.equal(pins.length,i);
  for(let j=0;j<i;j++){assert.equal(pins[j].path,paths[j]);assert.equal(pins[j].sha256,hash(text(paths[j])),'predecessor digest drift');}
  assert.equal(p.totals.parentNames,p.rows.length);assert.equal(p.totals.componentProposals,p.rows.reduce((n,r)=>n+r.components.length,0));assert.equal(p.totals.sourceTaskAppearances,p.rows.reduce((n,r)=>n+r.sourceTasks.length,0));
  for(const r of p.rows){
   const src=mixed[rows.length];assert(src,'extra mixed parent');assert.equal(r.parentNameKey,src.parentNameKey,'mixed cohort omitted, reordered or duplicated');assert.equal(r.parentName,src.name);assert.deepEqual(r.sourceTasks,src.sourceTasks,'source association drift');assert.equal(r.decompositionStatus,'editorial-proposal');assert.equal(r.scopeComplete,false);assert.equal(r.bindingComplete,false);
   const allowed=new Set(r.sourceTasks.map(t=>t.referenceId)),covered=new Set();assert(r.components.length);
   for(const t of r.sourceTasks){
    assert(!refs.has(t.referenceId),'duplicate source appearance');refs.add(t.referenceId);
    const matches=read(t.packetPath).rows.filter(s=>s.referenceId===t.referenceId);assert.equal(matches.length,1);const s=matches[0];
    assert.equal(hash(s.draftLearningTask),t.editorialTaskSha256,'task drift');
    for(const f of ['subjectId','code','page','sourceBodySha256','mode','rowBBox'])assert.deepEqual(s[f],t[f],'source evidence drift');
   }
   for(const c of r.components){
    assert(typeof c.proposalId==='string'&&c.proposalId.length&&!ids.has(c.proposalId),'duplicate proposal');ids.add(c.proposalId);assert(typeof c.name==='string'&&key(c.name));assert(['reusable-topic-candidate','contextual-task-facet'].includes(c.proposedRole));
    assert.equal(c.mappingAccepted,false);assert.equal(c.canonicalConceptId,null);assert.equal(c.canonicalObjectiveVersionId,null);assert.equal(c.semanticEquivalence,'unverified');assert(c.sourceReferenceIds.length&&new Set(c.sourceReferenceIds).size===c.sourceReferenceIds.length);
    for(const ref of c.sourceReferenceIds){assert(allowed.has(ref),'foreign source reference');covered.add(ref);}
    const k=key(c.name);if(!groups.has(k))groups.set(k,{label:c.name,occurrences:[]});groups.get(k).occurrences.push({proposalId:c.proposalId,parentNameKey:r.parentNameKey,proposedRole:c.proposedRole,sourceReferenceIds:c.sourceReferenceIds});
   }
   assert.deepEqual(covered,allowed,'unrepresented source task');rows.push(r);
  }
 }
 assert.equal(rows.length,mixed.length,'missing mixed parent');assert.equal(ids.size,660);assert.equal(refs.size,176);
 const indexPath=base+'foundation-names-only-index.json',rolePath=base+'name-role-proposals.json',homePath=base+'missing-home-proposals.json';
 const targets=new Map(),add=(label,path,nameKey)=>{const k=key(label);if(!targets.has(k))targets.set(k,[]);targets.get(k).push({path,nameKey});};
 for(const n of read(indexPath).names)add(n.name,indexPath,n.nameKey);
 for(const n of read(rolePath).entries)add(n.name??n.nameKey,rolePath,n.nameKey);
 for(const n of read(homePath).homes)add(n.name??n.nameKey,homePath,n.nameKey);
 const reuseLeads=[...groups.entries()].filter(([k,g])=>g.occurrences.length>1||targets.has(k)).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([nameKey,g])=>({nameKey,...g,existingLabelTargets:targets.get(nameKey)??[],semanticEquivalence:'unverified',mappingAccepted:false,canonicalConceptId:null}));
 const inputs=[queuePath,...paths,indexPath,rolePath,homePath];
 return {schemaVersion:1,status:'names-only-mixed-decomposition-audit',clinicalApproval:false,learnerActivation:false,automaticMerging:false,canonicalIdentityAllocation:false,totals:{parentNames:rows.length,sourceAppearances:refs.size,componentOccurrences:ids.size,distinctProposedLabels:groups.size,reuseLeadLabels:reuseLeads.length},sourceDigests:inputs.map(path=>({path,sha256:hash(text(path))})),reuseLeads};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=new URL('../../',import.meta.url),text=p=>readFileSync(new URL(p,root),'utf8');
 execFileSync(process.execPath,[fileURLToPath(new URL('ops/nmc/report-parent-follow-up.js',root)),'--verify'],{stdio:'pipe'});
 const result=audit(text),out=base+'mixed-decomposition-audit.json';
 if(process.argv.includes('--verify')){assert.deepEqual(JSON.parse(text(out)),result,'mixed audit differs from evidence');console.log(JSON.stringify({status:'PASS',...result.totals,canonicalAcceptance:false}));}
 else console.log(JSON.stringify(result,null,2));
}
