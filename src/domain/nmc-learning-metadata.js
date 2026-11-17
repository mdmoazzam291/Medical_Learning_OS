// Deterministic learning metadata for draft NMC objectives. Pure; no I/O. AI-authored rules, not faculty review.
import {TASKS} from './question-intelligence.js';
export const TASK_RULES=[
 ['emergency-priority',/\b(emergency|emergencies|resuscitat|life-threatening|triage|first aid|acute management)/],
 ['drug-safety',/\b(adverse (effect|drug|reaction)|drug interaction|contraindicat|toxicit|pharmacovigilance)/],
 ['ethics-communication-safety',/\b(consent|counsel|communicat|ethic|medico-?legal|confidential|legal|law|act\b|court|certif|breaking bad news|professional)/],
 ['treatment-selection',/\b(manag|treat|therap|drug of choice|prescri|dosing|regimen)/],
 ['prevention-screening',/\b(prevent|screen|immunis|immuniz|vaccin|programme|program\b|prophyla|surveillance|control measure|health education)/],
 ['investigation-selection',/\b(investigat|laboratory|test(s|ing)?\b|imaging|specimen collection)/],
 ['interpretation',/\b(interpret|analy[sz]e (results|reports|data))/],
 ['differential',/\b(differentia|distinguish|discriminat)/],
 ['diagnosis',/\b(diagnos)/],
 ['complication',/\b(complication|sequela)/],
 ['prognosis',/\b(prognos)/],
 ['etiology',/\b(aetiolog|etiolog|causes?\b|causative|predispos)/],
 ['risk-factor',/\b(risk factor)/],
 ['clinical-feature',/\b(clinical (feature|presentation)|signs? and symptoms?|present(s|ation)\b|manifestation)/],
 ['quantitative-reasoning',/\b(calculat|statistic|sample size|incidence|prevalence|odds ratio|relative risk|sensitivity and specificity)/],
 ['classification',/^(classify|categori[sz]e)|\bclassification\b/],
 ['mechanism',/\b(mechanism|pathogenes|pathophysiolog|regulat|function|physiolog|biochemi|metabol|synthes|transport|control of)/],
 ['localization',/\b(locali[sz]e|lesion site|level of (the )?lesion)/],
 ['recall',/^(describe|define|list|enumerate|name|identify|outline|state|recall|trace|map|match|label)\b/],
];
for(const [t] of TASK_RULES)if(!TASKS.includes(t))throw new Error('unknown task '+t);
// The earliest-mentioned focus wins (ties: rule order); the leading-verb recall rule applies only when no
// content keyword matches.
export function classifyTask(wording){
 const w=wording.toLowerCase();let best=null;
 for(const [task,re] of TASK_RULES){if(task==='recall')continue;const m=re.exec(w);if(m&&(!best||m.index<best.index))best={task,index:m.index};}
 if(best)return best.task;
 return TASK_RULES.find(([t])=>t==='recall')[1].test(w)?'recall':'mechanism';
}
export const POP={pediatrics:'children','obstetrics-gynaecology':'women'};
export const IND=new Set(['forensic-medicine','community-medicine']);
export function taskFacets(wording,primary){
 const w=wording.toLowerCase(),f=TASK_RULES.filter(([t,re])=>t!=='recall'&&re.test(w)).map(([t])=>t);
 return [...new Set([primary,...f])].filter(t=>TASKS.includes(t)).sort();
}
export function assessability(o){return o.depth==='performs'?'offline-only':o.task==='procedural-skill'||o.depth==='shows-how'?'in-app-partial':'in-app';}
export const ASSESSABILITY=['in-app','in-app-partial','offline-only'];
export function contextFor(subjects){
 const pops=new Set(subjects.map(s=>POP[s]||'not-specified'));
 return {population:pops.size===1?[...pops][0]:'not-specified',jurisdiction:subjects.length&&subjects.every(s=>IND.has(s))?'india':'not-specified'};
}
