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
// --- Registry @26: same-concept prerequisite sequencing and automated (not human) review state. ---
// Tiers: knowing the concept -> recognising it clinically -> acting on it. Phase: NMC curriculum phase of
// the subject that lists the objective (preclinical 1, paraclinical 2, clinical 3).
export const TASK_TIER=Object.freeze({recall:0,identification:0,classification:0,drawing:0,localization:0,'anatomical-reasoning':0,
 'pathway-tracing':0,mechanism:0,etiology:0,'risk-factor':0,'quantitative-reasoning':0,comparison:0,'pattern-recognition':0,
 'clinical-feature':1,complication:1,prognosis:1,differential:1,diagnosis:1,interpretation:1,'investigation-selection':1,
 'treatment-selection':2,'drug-safety':2,'prevention-screening':2,'emergency-priority':2,'ethics-communication-safety':2,'procedural-skill':2});
const PHASE1=new Set(['anatomy','physiology','biochemistry']),PHASE2=new Set(['pathology','pharmacology','microbiology','forensic-medicine','community-medicine']);
export const curriculumPhase=subjects=>Math.min(...subjects.map(s=>PHASE1.has(s)?1:PHASE2.has(s)?2:3));
// Each objective depends on the objectives of the same concept at the nearest lower (tier, phase) level.
// Edges only go from a strictly lower key to a higher one, so the graph is acyclic by construction.
export function sameConceptPrerequisites(rows){
 const key=r=>{const t=TASK_TIER[r.task];if(t===undefined)throw new TypeError('task_tier_unknown');return t*10+r.phase;};
 const byConcept=new Map();for(const r of rows){if(!byConcept.has(r.conceptId))byConcept.set(r.conceptId,[]);byConcept.get(r.conceptId).push(r);}
 const out=new Map();
 for(const group of byConcept.values())for(const r of group){
  const lower=group.filter(x=>key(x)<key(r));const k=lower.length?Math.max(...lower.map(key)):null;
  out.set(r.id,lower.filter(x=>key(x)===k).map(x=>x.id).sort());
 }
 return out;
}
export const REVIEW_STATES=Object.freeze(['auto-checked','needs-attention']);
export const REVIEW_FINDINGS=Object.freeze(['duplicate-wording','near-duplicate-in-concept','no-leading-verb','non-measurable-verb','no-source-binding']);
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const ACTION_VERBS=new Set(('compare explain identify use describe demonstrate trace distinguish classify relate discuss map interpret recognize recognise elicit select '+
 'define assess match perform observe orient locate present connect prioritize prioritise draw build apply diagram measure link enumerate choose plan counsel differentiate '+
 'document outline write calculate sequence develop prepare estimate justify sketch predict label role-play integrate analyze analyse show sort record review localize localise '+
 'explore group take order generate align contrast complete assign conduct examine collect participate obtain mark agree place appraise deliver adapt work grade respond '+
 'track adjust draft turn summarize summarise coordinate design combine simulate assist give evaluate synthesize determine name visit secure educate list break annotate '+
 'import side check follow lift rotate characterize state set tailor decide brief propose manage resolve mentor formulate enter administer insert prescribe advise').split(' '));
const VAGUE=/^(understand|know|appreciate|learn|be aware|become familiar)\b/;
const jaccard=(a,b)=>{const A=new Set(a.split(' ')),B=new Set(b.split(' '));let i=0;for(const x of A)if(B.has(x))i++;return i/(A.size+B.size-i);};
// Deterministic wording checks. 'auto-checked' means these checks found nothing; it is not faculty review.
export function reviewFindings(rows){
 const counts=new Map();for(const r of rows){const k=norm(r.wording);counts.set(k,(counts.get(k)||0)+1);}
 const byConcept=new Map();for(const r of rows){if(!byConcept.has(r.conceptId))byConcept.set(r.conceptId,[]);byConcept.get(r.conceptId).push(r);}
 const out=new Map();
 for(const r of rows){
  const w=norm(r.wording),words=w.split(' '),f=[];
  if(counts.get(w)>1)f.push('duplicate-wording');
  if(byConcept.get(r.conceptId).some(x=>x.id!==r.id&&norm(x.wording)!==w&&jaccard(norm(x.wording),w)>=0.8))f.push('near-duplicate-in-concept');
  if(!r.wording.toLowerCase().split(/[^a-z-]+/).slice(0,16).some(x=>ACTION_VERBS.has(x)))f.push('no-leading-verb');
  if(VAGUE.test(w))f.push('non-measurable-verb');
  if(!r.bound)f.push('no-source-binding');
  out.set(r.id,f);
 }
 return out;
}
