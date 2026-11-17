// Add a bound concept batch's objectives to data/nmc-learning-foundation-drafts.json.
// Usage: node ops/nmc/add-batch-objectives-to-registry.js <batch.json> <bindings.json> <draftVersion>
// Skips (and reports) objectives the registry cannot hold: source-exception rows without an overlay
// resolution or deleted rows, unsupported bases, missing row boxes, or a source row already bound to
// the same concept. Depth keeps the printed NMC level (knows/knows-how/shows-how/performs).
// Identity digests use the accepted document (label, aliases, evidenced subjects).
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {canonicalIdentityDigest,validateFoundationDrafts} from '../../src/domain/nmc-learning-foundation.js';
import {classifyTask,taskFacets,assessability,contextFor} from '../../src/domain/nmc-learning-metadata.js';
const [batchPath,bindPath,draftVersion]=process.argv.slice(2);
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const PACK='data/nmc-learning-foundation-drafts.json';
const pack=read(PACK),batch=read(batchPath),bind=read(bindPath),catalogue=read('data/nmc-reference-catalogue.json');
if(bind.batchId!==batch.batchId)throw new Error('binding/batch mismatch');
const refs=new Map(catalogue.references.map(r=>[r.referenceId,r]));
const bbox=new Map();
const walk=x=>{if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object'){if(typeof x.referenceId==='string'&&Array.isArray(x.rowBBox)&&x.rowBBox.length===4&&!bbox.has(x.referenceId))bbox.set(x.referenceId,x.rowBBox);Object.values(x).forEach(walk);}};
for(const d of ['docs/evidence','data'])for(const f of readdirSync(d).filter(f=>f.endsWith('.json')).sort()){try{walk(read(d+'/'+f));}catch{}}
// Source exceptions (overlay-resolved codes/headings, official replacements) carry their own basis.
const overlay=new Map(read('data/nmc-reference-overlay.json').rows.map(x=>[x.referenceId,x.kind]));
const meta=new Map(read('data/nmc-competency-source-metadata.json').rows.map(x=>[x.referenceId,x]));
const basisFor=(r,o)=>r.amendmentNotice?(overlay.get(r.referenceId)==='official-replacement'&&o.basis==='official-replacement'?'official-replacement':null):
 r.identifierState!=='standard'||r.topicId===null?(['search-alias','topic-group'].includes(overlay.get(r.referenceId))?'source-exception-resolved':null):
 ['literal-name-in-source-row','scoped-task-in-source-row'].includes(o.basis)?o.basis:null;
const sourceSha=o=>o.sourceBodySha256||(refs.get(o.referenceId)?.amendmentNotice?meta.get(o.referenceId)?.descriptionSha256:null);
const conceptId=new Map(bind.concepts.map(c=>[c.conceptKey,c.conceptId]));
const docByKey=new Map(batch.concepts.map(c=>[c.conceptKey,c.document]));
const existingDigest=new Map(pack.objectives.map(r=>[r.objective.conceptId,r.canonicalIdentitySha256]));
const ovToConcept=new Map(pack.objectives.map(r=>[r.objective.objectiveVersionId,r.objective.conceptId]));
const boundRefConcept=new Set(pack.sourceBindings.map(b=>b.referenceId+'|'+ovToConcept.get(b.objectiveVersionId)));
const have=new Set(pack.objectives.map(r=>r.objective.objectiveVersionId));
const skipped=[];let added=0;
for(const o of batch.objectives){
 const cid=conceptId.get(o.conceptKey),r=refs.get(o.referenceId),why=
  have.has(o.objectiveVersionId)?'already-in-registry':
  !r?'source-row-missing':
  !basisFor(r,o)?'basis-'+o.basis:
  (!bbox.has(o.referenceId)&&!r.amendmentNotice)||!/^[a-f0-9]{64}$/.test(sourceSha(o)||'')?'row-box-or-hash-missing':
  o.sourcePage!==r.pdfPage?'page-mismatch':
  boundRefConcept.has(o.referenceId+'|'+cid)?'row-already-bound-to-concept':null;
 if(why){skipped.push({code:o.code,objectiveVersionId:o.objectiveVersionId,reason:why});continue;}
 const d=docByKey.get(o.conceptKey);
 const digest=existingDigest.get(cid)||await canonicalIdentityDigest({conceptId:cid,label:d.label,aliases:d.aliases,subjectTags:d.classification.subjects});
 pack.objectives.push({objective:{objectiveId:o.objectiveVersionId.replace(/@\d+$/,''),objectiveVersionId:o.objectiveVersionId,conceptId:cid,task:o.task,depth:o.depth,
  context:{jurisdiction:'not-specified',population:'not-specified',setting:'medical-education'},prerequisites:[]},
  wording:o.wording,authorship:'ai_generated_original',status:'draft',canonicalIdentitySha256:digest});
 // Registries from @25 carry learning metadata on every row (see src/domain/nmc-learning-metadata.js).
 if(pack.objectives.some(r=>'assessability' in r)){const row=pack.objectives.at(-1),ob=row.objective;
  if(ob.task==='mechanism')ob.task=classifyTask(row.wording);
  const sid=catalogue.references.find(r=>r.referenceId===o.referenceId)?.subjectId;Object.assign(ob.context,contextFor(sid?[sid]:[]));
  row.assessability=assessability(ob);row.taskFacets=taskFacets(row.wording,ob.task);}
 pack.sourceBindings.push({referenceId:o.referenceId,objectiveVersionId:o.objectiveVersionId,status:'proposed',basis:basisFor(r,o),sourcePage:o.sourcePage,
  rowBBox:bbox.get(o.referenceId)??null,sourceBodySha256:sourceSha(o),namedConcept:d.label});
 have.add(o.objectiveVersionId);added++;
}
pack.draftVersion=draftVersion;
// From @26, prerequisites and review state are computed over the whole registry: rerun the @26 script.
if(pack.objectives.some(r=>'reviewState' in r))throw new Error('registry_@26_rerun_ops/nmc/apply-prerequisites-and-review.js_after_adding');
validateFoundationDrafts(pack,catalogue,read('data/nmc-reference-overlay.json'));
writeFileSync(PACK,JSON.stringify(pack,null,1)+'\n');
console.log(JSON.stringify({added,skipped,objectives:pack.objectives.length,bindings:pack.sourceBindings.length}));
