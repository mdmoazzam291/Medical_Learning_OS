// Admin-only learner preview of owner-accepted NMC objectives. Pure functions; no I/O.
export const PREVIEW_CONTRACT='nmc-admin-learner-preview-v1';
const MODES=new Set(['knowledge','performance-and-knowledge']);
export function validatePreviewData(data){
 if(!data||data.contractId!==PREVIEW_CONTRACT||data.audience!=='admin-only'||data.learnerActivation!==false)throw new Error('preview_data_invalid');
 if(!Array.isArray(data.items)||!Array.isArray(data.subjects))throw new Error('preview_data_invalid');
 const ids=new Set();
 for(const i of data.items){
  if(typeof i.objectiveRevisionId!=='string'||!/^nmc-objrev:[0-9a-f]{16}$/.test(i.objectiveRevisionId)||ids.has(i.objectiveRevisionId))throw new Error('preview_data_invalid');
  if(typeof i.objective!=='string'||!i.objective||!MODES.has(i.mode)||typeof i.code!=='string'||typeof i.subjectId!=='string')throw new Error('preview_data_invalid');
  ids.add(i.objectiveRevisionId);
 }
 return data;
}
export function parsePreviewFilters(params){
 const subject=params.subject??'',search=params.search??'';
 if(typeof subject!=='string'||typeof search!=='string'||subject.length>60||search.length>200||Object.keys(params).some(k=>!['subject','search'].includes(k)))throw new Error('preview_filter_invalid');
 return {subject:subject.trim(),search:search.trim().toLowerCase()};
}
export function previewPage(data,{subject='',search=''}={}){
 if(subject&&!data.subjects.some(s=>s.subjectId===subject))throw new Error('preview_filter_invalid');
 const items=data.items.filter(i=>(!subject||i.subjectId===subject)&&(!search||[i.code,i.objective,i.topicLabel||''].some(v=>v.toLowerCase().includes(search))));
 const topics=[];const byKey=new Map();
 for(const i of items){
  const key=i.subjectId+'|'+(i.topicLabel||'');
  if(!byKey.has(key)){const t={subjectId:i.subjectId,topicLabel:i.topicLabel,topicLabelKind:i.topicLabelKind,objectives:[]};byKey.set(key,t);topics.push(t);}
  byKey.get(key).objectives.push({objectiveRevisionId:i.objectiveRevisionId,code:i.code,pdfPage:i.pdfPage,mode:i.mode,objective:i.objective});
 }
 return {contractId:PREVIEW_CONTRACT,audience:'admin-only',learnerActivation:false,status:data.status,sourceUrl:data.sourceUrl,subjects:data.subjects,total:data.items.length,matched:items.length,topics};
}
