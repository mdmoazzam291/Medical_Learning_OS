// Misconception library: common wrong beliefs about canonical concepts, each with a short correction and an error
// kind. AI-drafted; not faculty or clinical review; corrections flagged guidelineSensitive must be rechecked when
// guidelines change. Used for distractor design, mistake classification and targeted remediation (mistake model).
const bad=()=>{throw new TypeError('concept_misconceptions_invalid');};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===[...keys].sort().join('|');
export const MISCONCEPTION_KINDS=['confusion','reversed','overgeneralisation','mechanism','test-interpretation','management',
 'sequence-timing','missed-red-flag','reasoning','factual'];
const text=(s,min,max)=>typeof s==='string'&&s.trim().length>=min&&s.length<=max&&!/[\u0000-\u001f]/.test(s);
export function validateConceptMisconceptions(input,conceptIds){
 if(!exact(input,['schemaVersion','contractId','status','clinicalApproval','learnerActivation','misconceptions'])||input.schemaVersion!==1||
  input.contractId!=='nmc-concept-misconceptions-v1'||input.status!=='ai-draft'||input.clinicalApproval!==false||input.learnerActivation!==false||
  !Array.isArray(input.misconceptions)||!input.misconceptions.length||input.misconceptions.length>20000)bad();
 const known=new Set(conceptIds),ids=new Set(),perConcept=new Map();
 for(const m of input.misconceptions){
  if(!exact(m,['misconceptionId','conceptId','label','misconception','correction','kind','guidelineSensitive'])||!known.has(m.conceptId)||
   typeof m.misconceptionId!=='string'||!/^mc:[a-f0-9]{16}$/.test(m.misconceptionId)||ids.has(m.misconceptionId)||typeof m.label!=='string'||
   !text(m.misconception,15,200)||!text(m.correction,20,260)||!MISCONCEPTION_KINDS.includes(m.kind)||typeof m.guidelineSensitive!=='boolean')bad();
  ids.add(m.misconceptionId);perConcept.set(m.conceptId,(perConcept.get(m.conceptId)||0)+1);
 }
 if([...perConcept.values()].some(n=>n>3))bad();
 return structuredClone(input);
}
