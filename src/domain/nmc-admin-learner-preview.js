// Admin-only learner preview of owner-accepted NMC objectives. Pure functions; no I/O.
export const PREVIEW_CONTRACT='nmc-admin-learner-preview-v1';
const MODES=new Set(['knowledge','performance-and-knowledge']);
export function validatePreviewData(data){
 if(!data||data.contractId!==PREVIEW_CONTRACT||data.audience!=='admin-only'||data.learnerActivation!==false)throw new Error('preview_data_invalid');
 if(!Array.isArray(data.items)||!Array.isArray(data.subjects))throw new Error('preview_data_invalid');
 if(data.concepts!==undefined&&(!data.concepts||typeof data.concepts!=='object'||Array.isArray(data.concepts)))throw new Error('preview_data_invalid');
 const ids=new Set();
 for(const i of data.items){
  if(typeof i.objectiveRevisionId!=='string'||!/^nmc-objrev:[0-9a-f]{16}$/.test(i.objectiveRevisionId)||ids.has(i.objectiveRevisionId))throw new Error('preview_data_invalid');
  if(typeof i.objective!=='string'||!i.objective||!MODES.has(i.mode)||typeof i.code!=='string'||typeof i.subjectId!=='string')throw new Error('preview_data_invalid');
  ids.add(i.objectiveRevisionId);
 }
 return data;
}
const VIEWS=new Set(['','subject','concept']);
const CONCEPT_ID=/^C-[0-9A-Za-z-]{1,80}$/;
export function parsePreviewFilters(params){
 const subject=params.subject??'',search=params.search??'',view=params.view??'',concept=params.concept??'';
 if([subject,search,view,concept].some(v=>typeof v!=='string')||subject.length>60||search.length>200||!VIEWS.has(view)||(concept&&!CONCEPT_ID.test(concept))||(concept&&view!=='concept')||Object.keys(params).some(k=>!['subject','search','view','concept'].includes(k)))throw new Error('preview_filter_invalid');
 return {subject:subject.trim(),search:search.trim().toLowerCase(),view:view||'subject',concept};
}
const objectiveView=i=>({objectiveRevisionId:i.objectiveRevisionId,code:i.code,conceptLabel:i.conceptLabel||null,pdfPage:i.pdfPage,mode:i.mode,task:i.task||null,assessability:i.assessability||null,
 reviewState:i.reviewState||null,reviewFindings:i.reviewFindings||[],prerequisiteCodes:i.prerequisiteCodes||[],objective:i.objective});
const layerView=(data,id,label)=>{const l=data.concepts?.[id]||{};return {conceptId:id,label:label||'',after:l.after||[],confusedWith:l.confusedWith||[],misconceptions:l.misconceptions||[],presentations:l.presentations||[]};};
const head=data=>({contractId:PREVIEW_CONTRACT,audience:'admin-only',learnerActivation:false,status:data.status,sourceUrl:data.sourceUrl,subjects:data.subjects,total:data.items.length});
// Concept-wise browsing: one canonical concept across only the subjects that actually link to it (no empty subject sections).
function conceptPage(data,{subject,search,concept}){
 const subjectOrder=new Map(data.subjects.map((s,n)=>[s.subjectId,n]));
 if(concept){
  const items=data.items.filter(i=>i.conceptId===concept);
  if(!items.length)throw new Error('preview_filter_invalid');
  const bySubject=new Map();
  for(const i of items){if(!bySubject.has(i.subjectId))bySubject.set(i.subjectId,[]);bySubject.get(i.subjectId).push({...objectiveView(i),topicLabel:i.topicLabel,topicLabelKind:i.topicLabelKind});}
  const sections=[...bySubject].sort(([a],[b])=>subjectOrder.get(a)-subjectOrder.get(b)).map(([subjectId,objectives])=>({subjectId,objectives}));
  return {...head(data),view:'concept',totalConcepts:conceptCount(data),matched:items.length,concept:{...layerView(data,concept,items[0].conceptLabel),subjectIds:sections.map(s=>s.subjectId),sections}};
 }
 const index=new Map();
 for(const i of data.items){
  if(!index.has(i.conceptId))index.set(i.conceptId,{conceptId:i.conceptId,label:i.conceptLabel||'',subjectIds:new Set(),codes:[],objectiveCount:0});
  const c=index.get(i.conceptId);c.subjectIds.add(i.subjectId);c.codes.push(i.code.toLowerCase());c.objectiveCount++;
 }
 const concepts=[...index.values()].filter(c=>(!subject||c.subjectIds.has(subject))&&(!search||c.label.toLowerCase().includes(search)||c.codes.some(x=>x===search)))
  .map(c=>({conceptId:c.conceptId,label:c.label,subjectIds:[...c.subjectIds].sort((a,b)=>subjectOrder.get(a)-subjectOrder.get(b)),objectiveCount:c.objectiveCount}))
  .sort((a,b)=>a.label.localeCompare(b.label)||a.conceptId.localeCompare(b.conceptId));
 return {...head(data),view:'concept',totalConcepts:index.size,matched:concepts.length,concepts};
}
const conceptCount=data=>new Set(data.items.map(i=>i.conceptId)).size;
export function previewPage(data,{subject='',search='',view='subject',concept=''}={}){
 if(subject&&!data.subjects.some(s=>s.subjectId===subject))throw new Error('preview_filter_invalid');
 if(view==='concept')return conceptPage(data,{subject,search,concept});
 // Listing all 2,865 objectives at once is too large for the screen: require a subject or a search.
 if(!subject&&!search)return {...head(data),view:'subject',matched:0,topics:[],filterRequired:true};
 const items=data.items.filter(i=>(!subject||i.subjectId===subject)&&(!search||[i.code,i.objective,i.topicLabel||'',i.conceptLabel||''].some(v=>v.toLowerCase().includes(search))));
 const topics=[];const byKey=new Map();
 for(const i of items){
  const key=i.subjectId+'|'+(i.topicLabel||'');
  if(!byKey.has(key)){const t={subjectId:i.subjectId,topicLabel:i.topicLabel,topicLabelKind:i.topicLabelKind,objectives:[],concepts:[]};byKey.set(key,t);topics.push(t);}
  const t=byKey.get(key),layer=i.conceptId&&data.concepts?.[i.conceptId];
  // AI-draft concept layers (prerequisites, confusions, misconceptions, presentations), once per concept per topic.
  if(layer&&!t.concepts.some(c=>c.conceptId===i.conceptId))t.concepts.push(layerView(data,i.conceptId,i.conceptLabel));
  t.objectives.push({...objectiveView(i),conceptId:i.conceptId||null});
 }
 return {...head(data),view:'subject',matched:items.length,topics};
}
