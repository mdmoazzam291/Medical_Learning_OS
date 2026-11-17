// Registry @26: same-concept prerequisite sequencing and automated review state (wording and IDs unchanged).
// - objective.prerequisites: objectives of the same canonical concept at the nearest lower (tier, phase) level
//   (see sameConceptPrerequisites). Cross-concept prerequisites are not authored here.
// - reviewState/reviewFindings: deterministic wording checks; 'auto-checked' is not faculty or clinical review.
// Usage: node ops/nmc/apply-prerequisites-and-review.js --write <registry version number> <evidence path>
// Writes the registry and an evidence file listing every edge with its basis and every finding.
import {readFileSync,writeFileSync} from 'node:fs';
import {TASK_TIER,curriculumPhase,sameConceptPrerequisites,reviewFindings} from '../../src/domain/nmc-learning-metadata.js';
const REG='data/nmc-learning-foundation-drafts.json',raw=readFileSync(REG,'utf8'),reg=JSON.parse(raw);
const cat=JSON.parse(readFileSync('data/nmc-reference-catalogue.json','utf8'));
const subjectOfRef=new Map(cat.references.map(r=>[r.referenceId,r.subjectId]));
const subjects=new Map();
for(const b of reg.sourceBindings){if(!subjects.has(b.objectiveVersionId))subjects.set(b.objectiveVersionId,new Set());subjects.get(b.objectiveVersionId).add(subjectOfRef.get(b.referenceId));}
const rows=reg.objectives.map(r=>{const o=r.objective,s=[...(subjects.get(o.objectiveVersionId)||[])];
 return {id:o.objectiveVersionId,conceptId:o.conceptId,task:o.task,phase:s.length?curriculumPhase(s):3,wording:r.wording,bound:s.length>0};});
const info=new Map(rows.map(r=>[r.id,r]));
const prereqs=sameConceptPrerequisites(rows),findings=reviewFindings(rows);
const edges=[],flagged=[],counts={edges:0,withPrerequisites:0,reviewState:{},findings:{}};
for(const row of reg.objectives){
 const id=row.objective.objectiveVersionId,p=prereqs.get(id),f=findings.get(id);
 row.objective.prerequisites=p;
 row.reviewState=f.length?'needs-attention':'auto-checked';
 row.reviewFindings=f;
 counts.edges+=p.length;if(p.length)counts.withPrerequisites++;
 counts.reviewState[row.reviewState]=(counts.reviewState[row.reviewState]||0)+1;
 for(const x of f)counts.findings[x]=(counts.findings[x]||0)+1;
 for(const q of p)edges.push({objectiveVersionId:id,prerequisiteVersionId:q,conceptId:row.objective.conceptId,
  basis:'same-concept-tier-phase',from:{task:info.get(q).task,phase:info.get(q).phase},to:{task:info.get(id).task,phase:info.get(id).phase}});
 if(f.length)flagged.push({objectiveVersionId:id,findings:f,wording:row.wording});
}
reg.draftVersion='mbbs-foundation:original-objectives@'+(process.argv[3]||'26');
if(process.argv[2]==='--write'){
 writeFileSync(REG,JSON.stringify(reg,null,/^\{\n  "/.test(raw)?2:1)+'\n');
 writeFileSync(process.argv[4]||'docs/evidence/2026-11-17-nmc-prerequisites-and-review-v1.json',JSON.stringify({schemaVersion:1,registryVersion:reg.draftVersion,
  method:'Deterministic rules in ops/nmc/apply-prerequisites-and-review.js and src/domain/nmc-learning-metadata.js. Wording and objective IDs unchanged. AI-authored rules; not faculty or clinical review. Cross-concept prerequisites are not authored.',
  taskTier:TASK_TIER,phases:{1:'anatomy, physiology, biochemistry',2:'pathology, pharmacology, microbiology, forensic-medicine, community-medicine',3:'clinical subjects'},
  counts,edges,flagged},null,1)+'\n');
}
console.log(JSON.stringify(counts));
