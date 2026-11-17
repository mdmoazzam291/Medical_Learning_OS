// Registry @28: correct the task label of clinical-phase objectives that the @25 classifier gave the
// fallback 'mechanism' label (no mechanism wording). Rule (owner, 2026-11-18): if the bound NMC
// competency text itself asks for mechanism, physiology, pathogenesis or a biological basis, the label
// stays 'mechanism'; otherwise it gets the task the objective actually asks for. Decisions are AI-authored
// against the official NMC 2024 text and listed in ops/nmc/fallback-task-relabels.json (codes and verdicts
// only; the official wording is not stored here). Wording, IDs, concepts and source bindings are unchanged.
// Usage: node ops/nmc/relabel-fallback-tasks.js --write  (then rerun apply-prerequisites-and-review.js)
import {readFileSync,writeFileSync} from 'node:fs';
import {taskFacets,assessability,TASK_TIER} from '../../src/domain/nmc-learning-metadata.js';
const REG='data/nmc-learning-foundation-drafts.json',raw=readFileSync(REG,'utf8'),reg=JSON.parse(raw);
const DECISIONS=JSON.parse(readFileSync('ops/nmc/fallback-task-relabels.json','utf8'));
if(process.argv[2]==='--write'){
 const changes=[];let seen=0;
 for(const row of reg.objectives){const d=DECISIONS[row.objective.objectiveVersionId];if(!d)continue;seen++;
  if(row.objective.task!=='mechanism')throw new Error('unexpected task '+row.objective.objectiveVersionId);
  if(TASK_TIER[d.task]===undefined)throw new Error('task_tier_unknown '+d.task);
  if(d.task==='mechanism')continue;
  changes.push({objectiveVersionId:row.objective.objectiveVersionId,nmcCodes:d.nmcCodes,before:'mechanism',after:d.task});
  row.objective.task=d.task;row.taskFacets=taskFacets(row.wording,d.task);row.assessability=assessability(row.objective);}
 if(seen!==Object.keys(DECISIONS).length)throw new Error('decision not matched');
 writeFileSync(REG,JSON.stringify(reg,null,/^\{\n  "/.test(raw)?2:1)+'\n');
 writeFileSync('docs/evidence/2026-11-18-nmc-fallback-task-relabels-v1.json',JSON.stringify({schemaVersion:1,
  method:'AI-authored task corrections checked against the official NMC 2024 competency text; mechanism kept where the NMC row asks for it; IDs and wording unchanged; not faculty or clinical review.',
  reviewed:seen,keptMechanism:seen-changes.length,relabelled:changes.length,changes},null,1)+'\n');
 console.log(seen,'reviewed;',changes.length,'relabelled');
}
