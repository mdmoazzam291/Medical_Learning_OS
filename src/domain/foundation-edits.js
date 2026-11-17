// Admin edits to accepted private concept identities (label, aliases) and draft NMC objective wording.
// Pure validation mirroring the database RPCs. Owner edits are not faculty, clinical or medical review.
const bad=code=>{throw new TypeError(code);};
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===[...keys].sort().join('|');
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const hex=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const plain=(x,min,max)=>typeof x==='string'&&x.trim().length>=min&&x.trim().length<=max&&!/[\u0000-\u001f\u007f]/.test(x);
export const normaliseName=s=>s.trim().replace(/\s+/g,' ').toLowerCase();
export const normaliseWording=s=>s.replace(/\s+/g,' ').trim();
export const CONCEPT_ID=/^C-([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/;
export const OBJECTIVE_ID=/^lo:[A-Za-z0-9:._-]{1,200}@[0-9]{1,4}$/;
export function validateIdentityEdit(input){
 if(!exact(input,['schemaVersion','requestId','conceptId','previousIdentityDigest','label','aliases','changeReason'])||input.schemaVersion!==1||
  !uuid(input.requestId)||typeof input.conceptId!=='string'||!CONCEPT_ID.test(input.conceptId)||!hex(input.previousIdentityDigest)||
  !plain(input.label,2,240)||!plain(input.changeReason,10,2000)||!Array.isArray(input.aliases)||input.aliases.length>50||
  !input.aliases.every(a=>plain(a,1,240)))bad('concept_edit_invalid');
 const names=input.aliases.map(normaliseName);
 if(new Set(names).size!==names.length||names.includes(normaliseName(input.label)))bad('concept_edit_invalid');
 return structuredClone(input);
}
export function validateObjectiveEdit(input){
 if(!exact(input,['schemaVersion','requestId','objectiveVersionId','baseWordingSha256','wording','changeReason'])||input.schemaVersion!==1||
  !uuid(input.requestId)||typeof input.objectiveVersionId!=='string'||!OBJECTIVE_ID.test(input.objectiveVersionId)||!hex(input.baseWordingSha256)||
  typeof input.wording!=='string'||normaliseWording(input.wording).length<12||normaliseWording(input.wording).length>500||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(input.wording)||
  !plain(input.changeReason,10,2000))bad('objective_edit_invalid');
 return structuredClone(input);
}
export async function sha256Text(s){
 return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
}
