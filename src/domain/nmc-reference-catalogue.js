// Curriculum navigation only. Source appearances are neither clinical concepts
// nor learner evidence. Nothing here modifies accepted content or mastery.
import {SUBJECT_INDEX} from './subject-index.js';
const subjects=new Set(SUBJECT_INDEX.map(s=>s.id));
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).sort().join('|')===keys.sort().join('|');
const fail=()=>{throw new TypeError('nmc_reference_catalogue_invalid');};
const sha='aa601690b9e92b74f7412973a70969539e93210b41829018f052059bbf5ae23c';
const id=(v,type)=>typeof v==='string'&&new RegExp('^nmc-2024-'+type+':[a-f0-9]{64}$').test(v);
const page=v=>Number.isInteger(v)&&v>=108&&v<=459;
export function validateReferenceCatalogue(c){
 if(!exact(c,['schemaVersion','edition','sourceSha256','sourceUrl','clarificationUrl','scope','completeCompetencyCoverage','clinicalContentIncluded','topics','references'])||
 c.schemaVersion!==1||c.edition!=='nmc-cbme-2024-09-12'||c.sourceSha256!==sha||
 c.sourceUrl!=='https://nmc.org.in/rules-regulation-nmc/33/file'||c.clarificationUrl!=='https://nmc.org.in/rules-regulation-nmc/34/file'||
 c.scope!=='core-defining-reference-navigation'||c.completeCompetencyCoverage!==false||c.clinicalContentIncluded!==false||
 !Array.isArray(c.topics)||!Array.isArray(c.references)||c.topics.length>1000||c.references.length>10000)fail();
 const topics=new Map(),refs=new Set();
 for(const t of c.topics){
  if(!exact(t,['topicId','subjectId','number','label','pdfPage'])||!id(t.topicId,'topic')||topics.has(t.topicId)||!subjects.has(t.subjectId)||
   !(t.number===null||Number.isInteger(t.number)&&t.number>0&&t.number<1000)||typeof t.label!=='string'||t.label.length<2||t.label.length>180||!page(t.pdfPage))fail();
  topics.set(t.topicId,t);
 }
 for(const r of c.references){
  const t=topics.get(r.topicId);
  if(!exact(r,['referenceId','subjectId','observedCode','searchCode','pdfPage','topicId','identifierState','amendmentNotice'])||
   !id(r.referenceId,'ref')||refs.has(r.referenceId)||!subjects.has(r.subjectId)||!page(r.pdfPage)||
   typeof r.observedCode!=='string'||r.observedCode.length<1||r.observedCode.length>80||
   r.searchCode!==r.observedCode.replace(/\s+/g,'')||!['standard','unresolved'].includes(r.identifierState)||
   (r.identifierState==='standard')!==/^[A-Z]{2,4}\d{1,3}\.\d{1,3}$/.test(r.searchCode)||
   r.amendmentNotice!==['PS9.2','PY9.1','PE6.4'].includes(r.searchCode)||
   !(r.topicId===null||t&&t.subjectId===r.subjectId))fail();
  refs.add(r.referenceId);
 }
 return c;
}
const normalise=label=>label.replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replaceAll('anaemia','anemia').replaceAll('&',' and ').replace(/[^a-z0-9]+/g,' ').trim();
export function topicKey(label,subject){
 const key=normalise(label);
 // Generic headings are discipline-specific; no fuzzy or clinical equivalence.
 return /^(general|introduction|basics|miscellaneous|overview|principles)( |$)/.test(key)?subject+':'+key:key;
}
export function selectCatalogue(c,{subject='',search='',page:requested=1}={}){
 const topicMap=new Map(c.topics.map(t=>[t.topicId,t]));
 const groups=new Map();
 for(const r of c.references){
  const t=topicMap.get(r.topicId);
  const key=t?topicKey(t.label,t.subjectId):r.subjectId+':unassigned';
  if(!groups.has(key))groups.set(key,{key,label:t?.label||'Topic heading unresolved',subjects:new Set(),references:[],labels:new Set()});
  const g=groups.get(key);g.subjects.add(r.subjectId);g.references.push(r);if(t)g.labels.add(t.label);
 }
 const query=String(search).toLowerCase().trim().slice(0,200),compact=query.replace(/\s+/g,'');
 const selected=[];
 for(const g of groups.values()){
  // Topic-name matches select all references; code matches select exact appearances.
  const topicMatch=[...g.labels].some(label=>normalise(label).includes(normalise(query))||normalise(label).replace(/ /g,'').includes(normalise(query).replace(/ /g,'')));
  const references=g.references.filter(r=>(!subject||r.subjectId===subject)&&(!query||topicMatch||r.searchCode.toLowerCase().includes(compact)));
  if(references.length)selected.push({...g,subjects:[...new Set(references.map(r=>r.subjectId))].sort(),allSubjects:[...g.subjects].sort(),references,labels:[...g.labels]});
 }
 selected.sort((a,b)=>a.label.localeCompare(b.label)||a.key.localeCompare(b.key));
 const pageCount=Math.max(1,Math.ceil(selected.length/20));
 const current=Math.min(pageCount,Math.max(1,Number.isInteger(Number(requested))?Number(requested):1));
 return {groups:selected.slice((current-1)*20,current*20),groupCount:selected.length,
  referenceCount:selected.reduce((n,g)=>n+g.references.length,0),page:current,pageCount};
}
