import {SUBJECTS} from './content-library.js';
const invalid=()=>{throw new TypeError('concept_draft_invalid');};
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const keys=(x,expected)=>{if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).sort().join('|')!==[...expected].sort().join('|'))invalid();};
const text=(x,max)=>{if(typeof x!=='string'||!x.trim()||x.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x))invalid();};
export function validateConceptDraft(input){
 keys(input,['schemaVersion','requestId','proposalId','expectedDigest','conceptId','baseDigest','document']);
 if(input.schemaVersion!==1||!uuid(input.requestId)||(input.proposalId!==null&&!uuid(input.proposalId))||(input.conceptId!==null&&(typeof input.conceptId!=='string'||!/^[a-zA-Z0-9:_@.\-]{1,160}$/.test(input.conceptId)))||(input.baseDigest!==null&&!hash(input.baseDigest))||(input.expectedDigest!==null&&!hash(input.expectedDigest)))invalid();
 if((input.proposalId===null)!==(input.expectedDigest===null)||(!input.proposalId&&Boolean(input.conceptId)!==Boolean(input.baseDigest))||(input.proposalId&&!input.conceptId))invalid();
 const d=input.document;keys(d,['label','aliases','classification','sourceEvidence','changeReason']);text(d.label,240);text(d.sourceEvidence,4000);text(d.changeReason,4000);
 const strings=(values,max)=>{if(!Array.isArray(values)||values.length>200||new Set(values).size!==values.length)invalid();values.forEach(x=>text(x,max));};strings(d.aliases,240);
 keys(d.classification,['subjects','systems','organs','domains','tasks']);for(const [facet,values] of Object.entries(d.classification)){strings(values,160);if(values.some(x=>!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x))||(facet==='subjects'&&values.some(x=>!SUBJECTS.includes(x))))invalid();}
 return structuredClone(input);
}
