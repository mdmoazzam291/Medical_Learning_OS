// Editorial metadata, not a psychometric difficulty/mastery estimate.
export const TASKS=Object.freeze(['recall','classification','mechanism','etiology','risk-factor','association','clinical-feature','diagnosis','differential','localization','investigation-selection','interpretation','next-best-step','treatment-selection','emergency-priority','treatment-sequence','complication','prognosis','prevention-screening','drug-safety','quantitative-reasoning','evidence-interpretation','ethics-communication-safety','longitudinal-management']);
export const QUALIFIERS=Object.freeze(['initial','confirmatory','most-accurate','reference-standard','definitive','first-line','drug-choice','treatment-failure','follow-up','special-population','adverse-effect','contraindication','interaction','discriminating-clue','except','most-common']);
export const PRESENTATIONS=Object.freeze(['one-line','clinical-vignette','experimental-vignette','chart','lab-panel','graph','table','image','ecg-tracing','histology','audio','video','sequential-case']);
export const COMPRESSION_GATES=Object.freeze(['decision-facts','polarity-timing','options-key','media-units','task-qualifiers','distractor-logic','reasoning-demand','no-answer-leakage']);
const aliases={diagnosis:['diagnosis'],investigation:['investigation-selection'],'investigation-of-choice':['investigation-selection'],'gold-standard':['investigation-selection','reference-standard'],'initial-investigation':['investigation-selection','initial'],'confirmatory-investigation':['investigation-selection','confirmatory'],'most-accurate-investigation':['investigation-selection','most-accurate'],'next-best-step':['next-best-step'],'initial-treatment':['treatment-selection','initial'],'first-line-treatment':['treatment-selection','first-line'],'definitive-treatment':['treatment-selection','definitive'],'drug-of-choice':['treatment-selection','drug-choice'],'initial-management':['next-best-step','initial'],'emergency-management':['emergency-priority'],'adverse-effect':['drug-safety','adverse-effect'],contraindication:['drug-safety','contraindication'],interaction:['drug-safety','interaction'],prevention:['prevention-screening'],image:[null,null,'image'],ecg:[null,null,'ecg-tracing'],histology:[null,null,'histology']};
const fail=code=>{throw new TypeError(code);};
const nonempty=(s,max=100000)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;
const exact=(v,keys)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join('|')!==[...keys].sort().join('|'))fail('intelligence_fields_invalid');};
const strings=(v,allowed)=>{if(!Array.isArray(v)||v.length>40||new Set(v).size!==v.length||v.some(s=>!nonempty(s,240)||(allowed&&!allowed.includes(s))))fail('intelligence_tags_invalid');};
export function taskAxes(q){
  if(q.intelligence)return q.intelligence;
  const tasks=[],qualifiers=[],presentation=[];
  for(const tag of q.classification?.tasks||[]){const a=aliases[tag]||[TASKS.includes(tag)?tag:null,QUALIFIERS.includes(tag)?tag:null,PRESENTATIONS.includes(tag)?tag:null];if(a[0])tasks.push(a[0]);if(a[1])qualifiers.push(a[1]);if(a[2])presentation.push(a[2]);}
  return {primaryTask:tasks.includes('diagnosis')?'diagnosis':tasks[0]||null,qualifiers:[...new Set(qualifiers)].sort(),presentation:[...new Set(presentation)].sort(),responseFormat:null,reasoningOperations:[]};
}
export function validateIntelligence(q,m){
  exact(m,['primaryTask','qualifiers','presentation','responseFormat','reasoningOperations','sourceQuestionVersionId','derivatives']);
  if(!TASKS.includes(m.primaryTask)||m.responseFormat!=='single-best-answer')fail('unsupported_task_or_response');
  strings(m.qualifiers,QUALIFIERS);strings(m.presentation,PRESENTATIONS);strings(m.reasoningOperations);
  const sourceVersion=q.questionVersionId||q.questionId+'@1';
  if(m.sourceQuestionVersionId!==sourceVersion)fail('stale_source_version');
  // Media is not supported by the current portable importer. Never replace it with text.
  if(m.presentation.some(x=>['image','ecg-tracing','histology','audio','video','sequential-case'].includes(x))&&m.derivatives.length)fail('media_derivative_requires_asset_contract');
  if(!Array.isArray(m.derivatives)||m.derivatives.length>10)fail('derivatives_invalid');
  const seen=new Set();
  for(const d of m.derivatives){
    exact(d,['variantId','version','representation','sourceQuestionVersionId','stem','options','answerOptionId','protectedFacts','removedFacts','validationChecks']);
    if(!/^[a-zA-Z0-9:_@.\-]{1,160}$/.test(d.variantId)||seen.has(d.variantId)||!Number.isSafeInteger(d.version)||d.version<1)fail('variant_identity_invalid');seen.add(d.variantId);
    if(!['concise-practice','revision-cue'].includes(d.representation)||d.sourceQuestionVersionId!==sourceVersion||!nonempty(d.stem))fail('variant_invalid');
    if(JSON.stringify(d.options)!==JSON.stringify(q.options)||d.answerOptionId!==q.answerOptionId)fail('variant_options_key_changed');
    strings(d.protectedFacts);if(!d.protectedFacts.length||d.protectedFacts.some(f=>!q.stem.includes(f)||!d.stem.includes(f)))fail('protected_fact_lost');
    if(!Array.isArray(d.removedFacts)||d.removedFacts.length>100||d.removedFacts.some(f=>{exact(f,['text','reason']);return !nonempty(f.text,4000)||!q.stem.includes(f.text)||!nonempty(f.reason,4000);}))fail('removal_evidence_invalid');
    exact(d.validationChecks,COMPRESSION_GATES);
    for(const gate of COMPRESSION_GATES){const c=d.validationChecks[gate];exact(c,['passed','evidence']);if(c.passed!==true||!nonempty(c.evidence,4000))fail('compression_gate_failed');}
  }
  return m;
}
export function learnerIntelligence(q,m){
  if(!m||m.sourceQuestionVersionId!==q.questionVersionId)return {...taskAxes({...q,intelligence:null}),derivatives:[]};
  // Enumerate prompt fields; keys, review notes and removed-fact explanations stay private.
  return {primaryTask:m.primaryTask,qualifiers:m.qualifiers,presentation:m.presentation,responseFormat:m.responseFormat,reasoningOperations:m.reasoningOperations,derivatives:(m.derivatives||[]).filter(d=>d.sourceQuestionVersionId===q.questionVersionId).map(d=>({variantId:d.variantId,version:d.version,representation:d.representation,sourceQuestionVersionId:d.sourceQuestionVersionId,...(d.representation==='concise-practice'?{stem:d.stem,options:d.options}:{})}))};
}
export function selectConcise(q,intelligence,variantId){
  const d=intelligence?.derivatives?.find(d=>d.variantId===variantId&&d.representation==='concise-practice'&&d.sourceQuestionVersionId===q.questionVersionId);
  if(!d)fail('variant_unavailable');
  return {representation:d.representation,variantId:d.variantId,variantVersion:d.version,sourceQuestionId:q.questionId,sourceQuestionVersionId:q.questionVersionId,stem:d.stem,options:d.options};
}
