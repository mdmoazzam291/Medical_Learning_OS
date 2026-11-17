// Registry @25: deterministic learning metadata for draft objectives (no wording change, IDs unchanged).
// - task: objectives tagged with the coarse 'mechanism' are re-tagged to the question-intelligence task
//   vocabulary from the wording's leading verb and keywords (first matching rule wins).
// - context.population / context.jurisdiction from the subjects of the linked NMC rows.
// - taskFacets: every question-intelligence task the wording names (primary task included).
// - assessability: whether the app can assess the objective (from depth and task).
// Writes the registry and an evidence file recording every change and the rule that made it.
import {readFileSync,writeFileSync} from 'node:fs';
const REG='data/nmc-learning-foundation-drafts.json',raw=readFileSync(REG,'utf8'),reg=JSON.parse(raw);
const cat=JSON.parse(readFileSync('data/nmc-reference-catalogue.json','utf8'));
const subjectOfRef=new Map(cat.references.map(r=>[r.referenceId,r.subjectId]));
const subjects=new Map();for(const b of reg.sourceBindings){if(!subjects.has(b.objectiveVersionId))subjects.set(b.objectiveVersionId,new Set());subjects.get(b.objectiveVersionId).add(subjectOfRef.get(b.referenceId));}
import {TASK_RULES,classifyTask,taskFacets,assessability,contextFor} from '../../src/domain/nmc-learning-metadata.js';
const changes=[],counts={facetCount:{},task:{},population:{},jurisdiction:{},assessability:{}};
const bump=(k,v)=>counts[k][v]=(counts[k][v]||0)+1;
for(const row of reg.objectives){
 const o=row.objective,subs=[...(subjects.get(o.objectiveVersionId)||[])],before={task:o.task,context:{...o.context}};
 if(o.task==='mechanism')o.task=classifyTask(row.wording);
 Object.assign(o.context,contextFor(subs));
 row.assessability=assessability(o);
 row.taskFacets=taskFacets(row.wording,o.task);
 bump('task',o.task);bump('population',o.context.population);bump('jurisdiction',o.context.jurisdiction);bump('assessability',row.assessability);bump('facetCount',row.taskFacets.length);
 if(before.task!==o.task||before.context.population!==o.context.population||before.context.jurisdiction!==o.context.jurisdiction)
  changes.push({objectiveVersionId:o.objectiveVersionId,taskBefore:before.task,task:o.task,population:o.context.population,jurisdiction:o.context.jurisdiction,assessability:row.assessability,taskFacets:row.taskFacets});
}
reg.draftVersion='mbbs-foundation:original-objectives@25';
if(process.argv[2]==='--write'){
 writeFileSync(REG,JSON.stringify(reg,null,/^\{\n  "/.test(raw)?2:1)+'\n');
 writeFileSync('docs/evidence/2026-11-17-nmc-learning-metadata-v1.json',JSON.stringify({schemaVersion:1,registryVersion:reg.draftVersion,
  method:'Deterministic rules in ops/nmc/apply-learning-metadata.js; wording unchanged; objective IDs unchanged; AI-authored rules, not faculty review.',
  rules:TASK_RULES.map(([t,r])=>({task:t,pattern:r.source})),counts,changes},null,1)+'\n');
}
console.log(JSON.stringify(counts));
