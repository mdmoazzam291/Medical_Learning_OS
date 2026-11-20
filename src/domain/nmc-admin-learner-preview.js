// Admin-only learner preview of owner-accepted NMC objectives. Pure functions; no I/O.
import {hierarchyIndex} from './concept-hierarchy.js';
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
 if(data.hierarchy!==undefined){const h=data.hierarchy;if(!h||typeof h.nodes!=='object'||Array.isArray(h.nodes)||!Array.isArray(h.links)||h.links.some(l=>typeof h.nodes[l.childId]!=='string'||typeof h.nodes[l.parentId]!=='string'))throw new Error('preview_data_invalid');}
 return data;
}
// Parent breadcrumb and sub-topics of a concept or topic (ADR-144); null when no hierarchy data.
const indexCache=new WeakMap();
export function hierarchyView(data,id){
 const h=data.hierarchy;if(!h||!id)return null;
 if(!indexCache.has(h))indexCache.set(h,hierarchyIndex({nodes:[],links:h.links}));
 const ix=indexCache.get(h),node=x=>({id:x,label:h.nodes[x]||x,kind:x.startsWith('C-')?'concept':x.startsWith('nmc-2024-topic:')?'nmc-topic':'subtopic'});
 const ancestors=ix.ancestors(id).map(node),children=ix.childrenOf(id).map(node);
 return ancestors.length||children.length?{ancestors,children}:null;
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
  return {...head(data),view:'concept',totalConcepts:conceptCount(data),matched:items.length,concept:{...layerView(data,concept,items[0].conceptLabel),subjectIds:sections.map(s=>s.subjectId),sections,hierarchy:hierarchyView(data,concept)}};
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
// Conventional MBBS order: subjects as they appear in the NMC CBME 2024 document, with their phase (checked against data/nmc-competency-source-metadata.json by tests).
export const NMC_SUBJECT_ORDER=[['anatomy','Phase 1'],['physiology','Phase 1'],['biochemistry','Phase 1'],['pharmacology','Phase 2'],['pathology','Phase 2'],['microbiology','Phase 2'],
 ['forensic-medicine','Phase III Part I'],['community-medicine','Phase III Part I'],['medicine','Phase III Part II'],['pediatrics','Phase III Part II'],['psychiatry','Phase III Part II'],['dermatology','Phase III Part II'],
 ['surgery','Phase III Part II'],['ophthalmology','Phase III Part I'],['ent','Phase III Part I'],['obstetrics-gynaecology','Phase III Part II'],['orthopaedics','Phase III Part II'],['anaesthesia','Phase III Part II'],['radiology','Phase III Part II']];
const PHASE_RANK={'Phase 1':1,'Phase 2':2,'Phase III Part I':3,'Phase III Part II':4};
function subjectIndex(data){
 const stats=new Map(data.subjects.map(s=>[s.subjectId,{subjectId:s.subjectId,label:s.label,objectives:0,concepts:new Set(),shared:new Set(),topics:new Set()}]));
 const conceptSubjects=new Map();
 for(const i of data.items){if(!conceptSubjects.has(i.conceptId))conceptSubjects.set(i.conceptId,new Set());conceptSubjects.get(i.conceptId).add(i.subjectId);}
 for(const i of data.items){const s=stats.get(i.subjectId);if(!s)continue;s.objectives++;s.concepts.add(i.conceptId);s.topics.add(i.topicLabel||'');if(conceptSubjects.get(i.conceptId).size>1)s.shared.add(i.conceptId);}
 const order=new Map(NMC_SUBJECT_ORDER.map(([id,phase],n)=>[id,{n,phase}]));
 return [...stats.values()].map(s=>({subjectId:s.subjectId,label:s.label,phase:order.get(s.subjectId)?.phase||null,objectives:s.objectives,concepts:s.concepts.size,topics:s.topics.size,sharedConcepts:s.shared.size}))
  .sort((a,b)=>(PHASE_RANK[a.phase]||9)-(PHASE_RANK[b.phase]||9)||(order.get(a.subjectId)?.n??99)-(order.get(b.subjectId)?.n??99));
}
const conceptCount=data=>new Set(data.items.map(i=>i.conceptId)).size;
export function previewPage(data,{subject='',search='',view='subject',concept=''}={}){
 if(subject&&!data.subjects.some(s=>s.subjectId===subject))throw new Error('preview_filter_invalid');
 if(view==='concept')return conceptPage(data,{subject,search,concept});
 // Listing all 2,865 objectives at once is too large for the screen: show the subject index instead.
 if(!subject&&!search)return {...head(data),view:'subject',matched:0,topics:[],filterRequired:true,subjectIndex:subjectIndex(data)};
 const byConcept=new Map();
 for(const i of data.items)if(i.conceptId){if(!byConcept.has(i.conceptId))byConcept.set(i.conceptId,[]);byConcept.get(i.conceptId).push(i);}
 const subjectOrder=new Map(data.subjects.map((s,n)=>[s.subjectId,n]));
 // Integration: other subjects linked to the same canonical concept (AI-mapped bindings, not NMC's own integration table).
 const connectedFor=(conceptId,subjectId)=>{
  const bySubject=new Map();
  for(const o of byConcept.get(conceptId)||[])if(o.subjectId!==subjectId){if(!bySubject.has(o.subjectId))bySubject.set(o.subjectId,[]);bySubject.get(o.subjectId).push({code:o.code,objective:o.objective,mode:o.mode,pdfPage:o.pdfPage,topicLabel:o.topicLabel||null});}
  return [...bySubject].sort(([a],[b])=>subjectOrder.get(a)-subjectOrder.get(b)).map(([subjectId,objectives])=>({subjectId,objectives}));
 };
 const items=data.items.filter(i=>(!subject||i.subjectId===subject)&&(!search||[i.code,i.objective,i.topicLabel||'',i.conceptLabel||''].some(v=>v.toLowerCase().includes(search))));
 const topics=[];const byKey=new Map();
 for(const i of items){
  const key=i.subjectId+'|'+(i.topicLabel||'');
  if(!byKey.has(key)){const t={subjectId:i.subjectId,topicLabel:i.topicLabel,topicLabelKind:i.topicLabelKind,objectives:[],concepts:[],integration:[],hierarchy:i.topicLabelKind==='source-topic'?hierarchyView(data,i.topicId):null};byKey.set(key,t);topics.push(t);}
  const t=byKey.get(key),layer=i.conceptId&&data.concepts?.[i.conceptId];
  // AI-draft concept layers (prerequisites, confusions, misconceptions, presentations), once per concept per topic.
  if(layer&&!t.concepts.some(c=>c.conceptId===i.conceptId))t.concepts.push(layerView(data,i.conceptId,i.conceptLabel));
  t.objectives.push({...objectiveView(i),conceptId:i.conceptId||null});
  if(i.conceptId&&!t.integration.some(c=>c.conceptId===i.conceptId)){const connected=connectedFor(i.conceptId,i.subjectId);if(connected.length)t.integration.push({conceptId:i.conceptId,label:i.conceptLabel||'',connected});}
 }
 return {...head(data),view:'subject',matched:items.length,topics};
}
