// Builds the subject-revision batch for accepted private NMC concepts whose linked
// NMC source rows carry subjects missing from the accepted classification.
// Accepted documents come from the committed concept batches + receipt IDs; the
// identity digest reproduces PostgreSQL jsonb::text so the RPC can refuse stale items.
import {readFileSync,readdirSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const jsonbText=v=>{
 if(v===null)return 'null';if(Array.isArray(v))return '['+v.map(jsonbText).join(', ')+']';
 if(typeof v==='object'){const k=Object.keys(v).sort((a,b)=>Buffer.byteLength(a)-Buffer.byteLength(b)||Buffer.compare(Buffer.from(a),Buffer.from(b)));return '{'+k.map(x=>JSON.stringify(x)+': '+jsonbText(v[x])).join(', ')+'}';}
 return JSON.stringify(v);};
export const identityDigest=(conceptId,doc)=>createHash('sha256').update(jsonbText({conceptId,label:doc.label,aliases:doc.aliases,classification:doc.classification}),'utf8').digest('hex');
const reg=read('data/nmc-learning-foundation-drafts.json'),cat=read('data/nmc-reference-catalogue.json');
const ref=new Map(cat.references.map(r=>[r.referenceId,r])),conceptOf=new Map(reg.objectives.map(o=>[o.objective.objectiveVersionId,o.objective.conceptId]));
const evidence=new Map();
for(const b of reg.sourceBindings){const r=ref.get(b.referenceId),c=conceptOf.get(b.objectiveVersionId);if(!evidence.has(c))evidence.set(c,{subjects:new Set(),codes:new Set()});const e=evidence.get(c);e.subjects.add(r.subjectId);e.codes.add(r.observedCode);}
const files=readdirSync('docs/evidence');const accepted=new Map();
for(const r of readdirSync('ops/nmc/receipts').sort()){
 const ids=readFileSync('ops/nmc/receipts/'+r,'utf8').trim().split(/[,\s]+/);const m=r.match(/^(.+)-(v\d+)-concept-ids\.txt$/);
 const f=files.find(x=>x.endsWith('-nmc-'+m[1]+'-concept-batch-'+m[2]+'.json'));const fresh=read('docs/evidence/'+f).concepts.filter(c=>!c.existingConceptId);
 if(fresh.length!==ids.length)throw new Error('receipt/batch mismatch: '+r);
 ids.forEach((id,i)=>accepted.set('C-'+id,fresh[i].document));}
const revisions=[];
for(const [c,e] of [...evidence].sort(([a],[b])=>a<b?-1:1)){
 const doc=accepted.get(c);if(!doc)continue; // not accepted through a receipt: covered by the production check
 const add=[...e.subjects].filter(s=>!doc.classification.subjects.includes(s)).sort();
 if(add.length)revisions.push({conceptId:c,previousIdentityDigest:identityDigest(c,doc),label:doc.label,currentSubjects:doc.classification.subjects,addSubjects:add,evidenceCodes:[...e.codes].sort()});}
const batch={schemaVersion:1,kind:'subject-revision',batchId:'nmc-concept-subject-revisions-v1-20261117',learnerActivation:false,clinicalApproval:false,
 basis:'Subjects added only where an accepted concept is bound to an NMC 2024 source row of that subject in registry '+reg.draftVersion+'.',
 counts:{revisions:revisions.length,addedSubjects:revisions.reduce((n,r)=>n+r.addSubjects.length,0)},revisions};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(batch,null,1)+'\n');
console.log(batch.counts,reg.draftVersion);
