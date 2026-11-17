// Cross-concept prerequisites ("understand A before B") between canonical concepts. Pure; no I/O.
// AI-drafted; not faculty or clinical review. Direct prerequisites only: chains are followed, not repeated.
const bad=()=>{throw new TypeError('concept_prerequisites_invalid');};
export const STRENGTHS=Object.freeze(['essential','helpful']);
export const REVIEW_THRESHOLD=6; // more direct prerequisites than this is flagged for a second look
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===[...keys].sort().join('|');
export function validateConceptPrerequisites(input,conceptIds){
 if(!exact(input,['schemaVersion','contractId','status','clinicalApproval','learnerActivation','subjectsAuthored','links'])||input.schemaVersion!==1||
  input.contractId!=='nmc-concept-prerequisites-v1'||input.status!=='ai-draft'||input.clinicalApproval!==false||input.learnerActivation!==false||
  !Array.isArray(input.subjectsAuthored)||!Array.isArray(input.links)||input.links.length>20000)bad();
 const known=new Set(conceptIds),seen=new Set(),out=new Map();
 for(const l of input.links){
  if(!exact(l,['prerequisiteConceptId','conceptId','prerequisiteLabel','label','strength','reason'])||!known.has(l.prerequisiteConceptId)||!known.has(l.conceptId)||
   l.prerequisiteConceptId===l.conceptId||!STRENGTHS.includes(l.strength)||typeof l.reason!=='string'||l.reason.trim().length<10||l.reason.length>200||
   typeof l.label!=='string'||typeof l.prerequisiteLabel!=='string')bad();
  const k=l.prerequisiteConceptId+'>'+l.conceptId;if(seen.has(k))bad();seen.add(k);
  (out.get(l.prerequisiteConceptId)||out.set(l.prerequisiteConceptId,[]).get(l.prerequisiteConceptId)).push(l.conceptId);
 }
 const state=new Map();
 const visit=n=>{const s=state.get(n);if(s===1)throw new TypeError('concept_prerequisites_cycle');if(s===2)return;state.set(n,1);for(const m of out.get(n)||[])visit(m);state.set(n,2);};
 for(const n of out.keys())visit(n);
 return structuredClone(input);
}
export function prerequisiteSummary(input){
 const incoming=new Map();for(const l of input.links)incoming.set(l.conceptId,(incoming.get(l.conceptId)||0)+1);
 return {links:input.links.length,essential:input.links.filter(l=>l.strength==='essential').length,conceptsWithPrerequisites:incoming.size,
  flaggedForReview:[...incoming].filter(([,n])=>n>REVIEW_THRESHOLD).map(([id])=>id)};
}
