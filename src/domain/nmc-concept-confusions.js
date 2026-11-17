// "Commonly confused with" pairs between canonical concepts, each with the key discriminator.
// Undirected; AI-drafted; not faculty or clinical review. Used for misconception detection and compare cards.
const bad=()=>{throw new TypeError('concept_confusions_invalid');};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===[...keys].sort().join('|');
export const pairKey=(a,b)=>a<b?a+'|'+b:b+'|'+a;
export function validateConceptConfusions(input,conceptIds){
 if(!exact(input,['schemaVersion','contractId','status','clinicalApproval','learnerActivation','pairs'])||input.schemaVersion!==1||
  input.contractId!=='nmc-concept-confusions-v1'||input.status!=='ai-draft'||input.clinicalApproval!==false||input.learnerActivation!==false||
  !Array.isArray(input.pairs)||input.pairs.length>20000)bad();
 const known=new Set(conceptIds),seen=new Set();
 for(const p of input.pairs){
  if(!exact(p,['conceptIdA','conceptIdB','labelA','labelB','discriminator'])||!known.has(p.conceptIdA)||!known.has(p.conceptIdB)||p.conceptIdA===p.conceptIdB||
   typeof p.labelA!=='string'||typeof p.labelB!=='string'||typeof p.discriminator!=='string'||p.discriminator.trim().length<10||p.discriminator.length>240)bad();
  const k=pairKey(p.conceptIdA,p.conceptIdB);if(seen.has(k))bad();seen.add(k);
 }
 return structuredClone(input);
}
