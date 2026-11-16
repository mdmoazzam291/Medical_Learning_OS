// Canonical concept batch review/acceptance helpers. Pure; no I/O.
export const BATCH_CONTRACT='nmc-concept-batch-v1';
export const ATTESTATION='identity-and-classification-reviewed-not-medical-or-learner-release';
const KEY=/^nmc-concept:[a-f0-9]{16}$/;
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
  concepts:b.concepts.map(c=>({conceptKey:c.conceptKey,existingConceptId:c.existingConceptId||null,label:c.document.label,aliases:c.document.aliases,classification:c.document.classification,linkedCodes:c.linkedCodes,objectives:objs.get(c.conceptKey)||[]}))};
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
