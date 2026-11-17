// Canonical concept batch review/acceptance helpers. Pure; no I/O.
export const BATCH_CONTRACT='nmc-concept-batch-v1';
export const ATTESTATION='identity-and-classification-reviewed-not-medical-or-learner-release';
const KEY=/^nmc-concept:[a-f0-9]{16}$/;
// Review order: identity-changing items first so batch review is not a skim of 180 rows.
export const FLAG_ORDER=['reuses-accepted-identity','renamed-from-v1','new-split-in-v2','merges-source-rows','umbrella','split-source-row'];
const risk=c=>{const f=c.reviewFlags||[];const i=FLAG_ORDER.findIndex(x=>f.includes(x));return i<0?FLAG_ORDER.length:i;};
export function validateBatch(b){
 if(!b||b.schemaVersion!==1||typeof b.batchId!=='string'||!/^[a-z0-9][a-z0-9:._-]{0,119}$/.test(b.batchId)||b.learnerActivation!==false||b.clinicalApproval!==false)throw new Error('batch_invalid');
 if(!Array.isArray(b.concepts)||!Array.isArray(b.objectives)||!b.concepts.length)throw new Error('batch_invalid');
 const keys=new Set();
 for(const c of b.concepts){
  if(!KEY.test(c.conceptKey)||keys.has(c.conceptKey)||!c.document||typeof c.document.label!=='string')throw new Error('batch_invalid');
  keys.add(c.conceptKey);
 }
 if(b.objectives.some(o=>!keys.has(o.conceptKey)||typeof o.wording!=='string'||!o.wording))throw new Error('batch_invalid');
 return b;
}
export function newConcepts(b){return b.concepts.filter(c=>!c.existingConceptId);}
export function batchSummary(b,acceptance=null){
 const objs=new Map();for(const o of b.objectives){if(!objs.has(o.conceptKey))objs.set(o.conceptKey,[]);objs.get(o.conceptKey).push({code:o.code,task:o.task,depth:o.depth,mode:o.mode,wording:o.wording,basis:o.basis});}
 return {contractId:BATCH_CONTRACT,batchId:b.batchId,subjectId:b.subjectId,counts:b.counts,learnerActivation:false,
  acceptance:acceptance?{status:'batch_accepted',acceptedAt:acceptance.accepted_at||acceptance.acceptedAt,items:acceptance.item_count??acceptance.items}:null,
  concepts:b.concepts.map((c,i)=>({c,i})).sort((x,y)=>risk(x.c)-risk(y.c)||x.i-y.i).map(({c})=>({conceptKey:c.conceptKey,existingConceptId:c.existingConceptId||null,label:c.document.label,aliases:c.document.aliases,classification:c.document.classification,
  conceptType:c.conceptType||null,umbrella:c.umbrella===true,reviewFlags:c.reviewFlags||[],linkedCodes:c.linkedCodes,objectives:objs.get(c.conceptKey)||[]}))};
}
export function parseAcceptRequest(body,batchId){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new Error('batch_accept_invalid');
 const keys=Object.keys(body).sort().join(',');
 if(keys!=='attested,batchId,requestId,reviewNotes'||body.batchId!==batchId||body.attested!==true)throw new Error('batch_accept_invalid');
 if(typeof body.requestId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId))throw new Error('batch_accept_invalid');
 const notes=typeof body.reviewNotes==='string'?body.reviewNotes.trim():'';
 if(notes.length<20||notes.length>4000)throw new Error('batch_accept_invalid');
 return {requestId:body.requestId,reviewNotes:notes};
}
export function batchAcceptInput(b,batchSha256,{requestId,reviewNotes}){
 return {schemaVersion:1,requestId,batchId:b.batchId,batchSha256,reviewNotes,attestation:ATTESTATION,
  items:newConcepts(b).map(c=>({conceptKey:c.conceptKey,document:c.document}))};
}
// Subject-classification revisions of accepted private identities (kind 'subject-revision').
// Only additions to classification.subjects; each item names the identity digest it revises.
const SUBJECT_ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function validateRevisionBatch(b){
 if(!b||b.schemaVersion!==1||b.kind!=='subject-revision'||typeof b.batchId!=='string'||!/^[a-z0-9][a-z0-9:._-]{0,119}$/.test(b.batchId)||b.learnerActivation!==false||b.clinicalApproval!==false)throw new Error('batch_invalid');
 if(!Array.isArray(b.revisions)||!b.revisions.length||b.revisions.length>1000)throw new Error('batch_invalid');
 const ids=new Set();
 for(const r of b.revisions){
  if(typeof r.conceptId!=='string'||!/^C-(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/.test(r.conceptId)||ids.has(r.conceptId)||!/^[a-f0-9]{64}$/.test(r.previousIdentityDigest)||typeof r.label!=='string'||
   !Array.isArray(r.currentSubjects)||!Array.isArray(r.addSubjects)||!r.addSubjects.length||r.addSubjects.some(s=>!SUBJECT_ID.test(s)||r.currentSubjects.includes(s))||new Set(r.addSubjects).size!==r.addSubjects.length||!Array.isArray(r.evidenceCodes))throw new Error('batch_invalid');
  ids.add(r.conceptId);
 }
 return b;
}
export function revisionSummary(b,acceptance=null){
 return {contractId:BATCH_CONTRACT,kind:'subject-revision',batchId:b.batchId,subjectId:null,counts:b.counts,learnerActivation:false,
  acceptance:acceptance?{status:'batch_accepted',acceptedAt:acceptance.accepted_at||acceptance.acceptedAt,items:acceptance.item_count??acceptance.items}:null,
  concepts:b.revisions.map(r=>({conceptKey:r.conceptId,existingConceptId:r.conceptId,label:r.label,aliases:[],
   classification:{subjects:[...r.currentSubjects,...r.addSubjects],systems:[],domains:[]},conceptType:null,umbrella:false,
   reviewFlags:['adds-subjects: '+r.addSubjects.join(', ')],linkedCodes:r.evidenceCodes,objectives:[]}))};
}
export function revisionAcceptInput(b,batchSha256,{requestId,reviewNotes}){
 return {schemaVersion:1,requestId,batchId:b.batchId,batchSha256,reviewNotes,attestation:ATTESTATION,
  items:b.revisions.map(r=>({conceptId:r.conceptId,previousIdentityDigest:r.previousIdentityDigest,addSubjects:r.addSubjects}))};
}
