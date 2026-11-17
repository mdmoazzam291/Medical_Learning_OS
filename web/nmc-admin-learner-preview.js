import {escapeText as e} from './navigation-view.js';
const MODE={'knowledge':'Knowledge','performance-and-knowledge':'Skill + knowledge'};
const FINDING={'duplicate-wording':'duplicate wording','near-duplicate-in-concept':'near-duplicate in concept','no-leading-verb':'no action verb','non-measurable-verb':'non-measurable verb','no-source-binding':'no NMC row'};
const ASSESS={'in-app':'Assessable in app','in-app-partial':'Partly assessable in app','offline-only':'Offline assessment only'};
export function learnerPreviewMarkup(p=null,filters={},message='Load the learner preview to see accepted NMC objectives as a learner would.'){
 const banner='<div class="nmc-admin-banner" role="note"><strong>Admin preview only.</strong> Learners cannot see this. Objectives are AI-drafted and not faculty-reviewed (review skipped by the owner).</div>';
 const intro='<h2>NMC learning objectives · learner preview</h2>'+banner;
 if(!p)return intro+'<p role="status">'+e(message)+'</p><button type="button" data-preview-load>Load learner preview</button>';
 const names=new Map(p.subjects.map(s=>[s.subjectId,s.label]));
 return intro+'<p role="status">'+e(message)+'</p>'+
 '<form data-preview-filters role="search"><label>Subject<select name="subject"><option value="">All subjects</option>'+p.subjects.map(s=>'<option value="'+e(s.subjectId)+'"'+(s.subjectId===filters.subject?' selected':'')+'>'+e(s.label)+'</option>').join('')+'</select></label><label>Search<input name="search" maxlength="200" value="'+e(filters.search||'')+'"></label><button type="submit">Show</button></form>'+
 (p.filterRequired?'<p>'+e(p.total)+' objectives. Choose a subject or search to list them.</p>':'<p>'+e(p.matched)+' of '+e(p.total)+' objectives</p>')+
 (p.filterRequired?'':p.topics.length?p.topics.map(t=>'<article class="nmc-topic"><h3>'+e(t.topicLabel||'Untitled topic')+(t.topicLabelKind==='editorial-grouping'?' <small>(editorial grouping)</small>':'')+'</h3><p class="muted">'+e(names.get(t.subjectId)||t.subjectId)+'</p><p>By the end of this topic you should be able to:</p><ul>'+
  t.objectives.map(o=>'<li><p>'+e(o.objective)+'</p><small>'+e(MODE[o.mode]||o.mode)+(o.task?' · '+e(o.task):'')+(o.assessability?' · '+e(ASSESS[o.assessability]||o.assessability):'')+(o.prerequisiteCodes?.length?' · After '+e(o.prerequisiteCodes.join(', ')):'')+(o.reviewState==='needs-attention'?' · <strong>Needs attention: '+e(o.reviewFindings.map(f=>FINDING[f]||f).join(', '))+'</strong>':'')+' · <a href="'+e(p.sourceUrl)+'#page='+e(o.pdfPage)+'" target="_blank" rel="noopener noreferrer">NMC '+e(o.code)+' ↗</a></small></li>').join('')+'</ul></article>').join(''):'<p>No objectives match. Clear the filters.</p>')+
 '<button type="button" data-preview-load>Refresh</button>';
}
export function mountLearnerPreview({root,load,identity,window:win=window}){
 let generation=0,disposed=false,page=null,filters={};
 const clear=()=>{generation++;page=null;root.innerHTML=learnerPreviewMarkup();};
 async function read(next={}){
  const current=++generation;filters=next;page=null;root.innerHTML=learnerPreviewMarkup(null,{},'Loading learner preview…');
  try{
   const before=await identity();if(disposed||current!==generation)return;if(!before)throw new Error();
   const result=await load(next);const after=await identity();
   if(disposed||current!==generation)return;
   if(!after||before!==after)throw new Error();
   if(result?.contractId!=='nmc-admin-learner-preview-v1'||result.audience!=='admin-only'||result.learnerActivation!==false||!Array.isArray(result.topics)||!Array.isArray(result.subjects))throw new Error();
   page=result;root.innerHTML=learnerPreviewMarkup(page,filters,'Admin-only preview loaded.');
  }catch{if(!disposed&&current===generation){page=null;root.innerHTML=learnerPreviewMarkup(null,{},'Preview could not be loaded. Check Admin access and retry.');}}
 }
 function click(ev){const b=ev.target.closest('button');if(b?.hasAttribute('data-preview-load'))return read(filters);}
 function submit(ev){if(!ev.target.matches('[data-preview-filters]'))return;ev.preventDefault();return read(Object.fromEntries(new FormData(ev.target)));}
 root.innerHTML=learnerPreviewMarkup();root.addEventListener('click',click);root.addEventListener('submit',submit);
 for(const n of ['storage','focus','pageshow','mlos:access'])win.addEventListener(n,clear);
 return ()=>{disposed=true;generation++;root.removeEventListener('click',click);root.removeEventListener('submit',submit);for(const n of ['storage','focus','pageshow','mlos:access'])win.removeEventListener(n,clear);page=null;root.replaceChildren();};
}
