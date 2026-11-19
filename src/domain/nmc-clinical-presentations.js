// Clinical presentation layer: patient presentations (chest pain, jaundice...) linked to canonical concepts as
// causes to consider or as the approach (examination, tests, first steps). AI-drafted; not faculty or clinical
// review; not an exhaustive differential. Used for case-based reasoning, presentation-wise revision and Study Now.
const bad=()=>{throw new TypeError('clinical_presentations_invalid');};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===[...keys].sort().join('|');
export const PRESENTATION_ROLES=['cause','approach'];
export function validateClinicalPresentations(input,conceptIds){
 if(!exact(input,['schemaVersion','contractId','status','clinicalApproval','learnerActivation','presentations'])||input.schemaVersion!==1||
  input.contractId!=='nmc-clinical-presentations-v1'||input.status!=='ai-draft'||input.clinicalApproval!==false||input.learnerActivation!==false||
  !Array.isArray(input.presentations)||!input.presentations.length||input.presentations.length>500)bad();
 const known=new Set(conceptIds),ids=new Set();
 for(const p of input.presentations){
  if(!exact(p,['presentationId','label','links'])||typeof p.presentationId!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.presentationId)||ids.has(p.presentationId)||
   typeof p.label!=='string'||p.label.trim().length<3||p.label.length>120||!Array.isArray(p.links)||p.links.length<2||p.links.length>40)bad();
  ids.add(p.presentationId);
  const seen=new Set();
  for(const l of p.links){
   if(!exact(l,['conceptId','label','role'])||!known.has(l.conceptId)||typeof l.label!=='string'||!PRESENTATION_ROLES.includes(l.role)||seen.has(l.conceptId))bad();
   seen.add(l.conceptId);
  }
  if(!p.links.some(l=>l.role==='cause'))bad();
 }
 return structuredClone(input);
}
// Presentations a concept belongs to, for concept pages and Study Now.
export function presentationsForConcept(doc,conceptId){
 return doc.presentations.filter(p=>p.links.some(l=>l.conceptId===conceptId))
  .map(p=>({presentationId:p.presentationId,label:p.label,role:p.links.find(l=>l.conceptId===conceptId).role}));
}
