// Registry @27: resolve the 8 duplicate-wording findings of @26 without removing any objective ID.
// Same-concept copies of a combined sentence are split into its two skills; cross-concept copies
// name their own condition. AI-authored wording; not faculty or clinical review.
import {readFileSync,writeFileSync} from 'node:fs';
import {taskFacets,assessability} from '../../src/domain/nmc-learning-metadata.js';
const REG='data/nmc-learning-foundation-drafts.json',raw=readFileSync(REG,'utf8'),reg=JSON.parse(raw);
export const FIXES={
 'lo:98cbfe39687f7f89:mechanism:9f54034b@1':{task:'mechanism',wording:'Compare the major diarrhoeal pathogens by epidemiology, morphology, pathogenic mechanism, presentation and diagnostic tests.'},
 'lo:cd7d81b90e3910e1:mechanism:447e3a28@1':{task:'mechanism',wording:'Compare the major dysentery-causing pathogens by epidemiology, morphology, pathogenic mechanism, presentation and diagnostic tests.'},
 'lo:62a56e9bdcc582d4:mechanism:c1db96b9@1':{task:'investigation-selection',wording:'Explain the indications and contraindications for bone marrow aspiration and trephine biopsy.'},
 'lo:62a56e9bdcc582d4:mechanism:5d542ccb@1':{task:'interpretation',wording:'Interpret representative bone marrow aspirate and trephine biopsy reports.'},
 'lo:b48106c10635a23c:mechanism:d68ea5df@1':{task:'recall',wording:'Define obesity and its grades using the cut-offs recommended for Indian adults.'},
 'lo:b48106c10635a23c:mechanism:fe33ba01@1':{task:'quantitative-reasoning',wording:'Measure and calculate BMI, waist circumference and waist-to-hip ratio in an adult and classify the result.'},
 'lo:b48106c10635a23c:mechanism:cc8bb38d@1':{task:'risk-factor',wording:'Compare modifiable and non-modifiable risk factors for obesity.'},
 'lo:b48106c10635a23c:mechanism:8f185d3d@1':{task:'etiology',wording:'Identify clinical clues that suggest a secondary cause of obesity.'}
};
if(process.argv[2]==='--write'){
 const changes=[];
 for(const row of reg.objectives){const f=FIXES[row.objective.objectiveVersionId];if(!f)continue;
  changes.push({objectiveVersionId:row.objective.objectiveVersionId,before:{task:row.objective.task,wording:row.wording},after:f});
  row.objective.task=f.task;row.wording=f.wording;row.taskFacets=taskFacets(f.wording,f.task);row.assessability=assessability(row.objective);}
 if(changes.length!==8)throw new Error('expected 8 objectives');
 writeFileSync(REG,JSON.stringify(reg,null,/^\{\n  "/.test(raw)?2:1)+'\n');
 writeFileSync('docs/evidence/2026-11-18-nmc-duplicate-wording-fixes-v1.json',JSON.stringify({schemaVersion:1,
  method:'AI-authored rewrites resolving the @26 duplicate-wording findings; objective IDs unchanged; not faculty or clinical review.',changes},null,1)+'\n');
 console.log(changes.length,'rewritten');
}
