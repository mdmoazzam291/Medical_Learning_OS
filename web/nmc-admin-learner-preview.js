import {escapeText as e} from './navigation-view.js';
const MODE={'knowledge':'Knowledge','performance-and-knowledge':'Skill + knowledge'};
const FINDING={'duplicate-wording':'duplicate wording','near-duplicate-in-concept':'near-duplicate in concept','no-leading-verb':'no action verb','non-measurable-verb':'non-measurable verb','no-source-binding':'no NMC row'};
const KIND={'confusion':'confusion','reversed':'reversed','overgeneralisation':'overgeneralisation','mechanism':'mechanism','test-interpretation':'test interpretation','management':'management','sequence-timing':'sequence or timing','missed-red-flag':'missed red flag','reasoning':'reasoning','factual':'factual'};
const list=(title,rows)=>rows.length?'<p><strong>'+e(title)+'</strong></p><ul>'+rows.join('')+'</ul>':'';
export function conceptLayerMarkup(c){
 return '<section class="nmc-concept-layer"><h4>'+e(c.label||'Concept')+'</h4>'+
  list('Builds on',c.after.map(a=>'<li>'+e(a.label)+(a.strength==='essential'?' <small>(essential)</small>':'')+' — '+e(a.reason)+'</li>'))+
  list('Commonly confused with',c.confusedWith.map(x=>'<li>'+e(x.label)+' — '+e(x.discriminator)+'</li>'))+
  list('Common misconceptions',c.misconceptions.map(m=>'<li><p>✗ '+e(m.misconception)+'</p><p>✓ '+e(m.correction)+'</p><small>'+e(KIND[m.kind]||m.kind)+(m.guidelineSensitive?' · check against current guidelines':'')+'</small></li>'))+
  list('Seen in presentations',c.presentations.map(x=>'<li>'+e(x.label)+' <small>('+(x.role==='cause'?'cause to consider':'part of the approach')+')</small></li>'))+'</section>';
}
const ASSESS={'in-app':'Assessable in app','in-app-partial':'Partly assessable in app','offline-only':'Offline assessment only'};
const objectiveMeta=(o,p,{conceptLink=true}={})=>'<small>'+(o.conceptLabel?(conceptLink&&o.conceptId?'<button type="button" class="link-button" data-preview-concept="'+e(o.conceptId)+'">'+e(o.conceptLabel)+'</button>':e(o.conceptLabel))+' · ':'')+e(MODE[o.mode]||o.mode)+(o.task?' · '+e(o.task):'')+(o.assessability?' · '+e(ASSESS[o.assessability]||o.assessability):'')+(o.prerequisiteCodes?.length?' · After '+e(o.prerequisiteCodes.join(', ')):'')+(o.reviewState==='needs-attention'?' · <strong>Needs attention: '+e(o.reviewFindings.map(f=>FINDING[f]||f).join(', '))+'</strong>':'')+' · <a href="'+e(p.sourceUrl)+'#page='+e(o.pdfPage)+'" target="_blank" rel="noopener noreferrer">NMC '+e(o.code)+' ↗</a></small>';
function filtersMarkup(p,filters){
 const view=filters.view==='concept'?'concept':'subject';
 return '<form data-preview-filters role="search"><label>Browse by<select name="view"><option value="subject"'+(view==='subject'?' selected':'')+'>Subject</option><option value="concept"'+(view==='concept'?' selected':'')+'>Concept (across subjects)</option></select></label><label>Subject<select name="subject"><option value="">All subjects</option>'+p.subjects.map(s=>'<option value="'+e(s.subjectId)+'"'+(s.subjectId===filters.subject?' selected':'')+'>'+e(s.label)+'</option>').join('')+'</select></label><label>Search<input name="search" maxlength="200" value="'+e(filters.search||'')+'"></label><button type="submit">Show</button></form>';
}
const plural=(n,one,many)=>e(n)+' '+(n===1?one:many);
function subjectIndexMarkup(p){
 return '<p>'+e(p.total)+' objectives across '+e(p.subjectIndex.length)+' subjects. Open a subject to see its topics and where each topic is also taught.</p><ul class="nmc-subject-index">'+
  p.subjectIndex.map(s=>'<li><button type="button" class="nmc-subject-card" data-preview-subject="'+e(s.subjectId)+'">'+(s.phase?'<small>'+e(s.phase)+'</small>':'')+'<strong>'+e(s.label)+'</strong><small>'+plural(s.topics,'topic','topics')+' · '+plural(s.concepts,'concept','concepts')+' · '+plural(s.objectives,'objective','objectives')+'</small><small>'+plural(s.sharedConcepts,'concept','concepts')+' shared with other subjects</small></button></li>').join('')+'</ul>';
}
// Textbook-style integration box: the same concept as taught in other subjects (AI-mapped via shared concepts).
function integrationMarkup(t,p,names){
 if(!t.integration?.length)return '';
 const subjects=new Set(t.integration.flatMap(c=>c.connected.map(x=>x.subjectId)));
 return '<section class="nmc-integration"><h4>Also taught in '+e([...subjects].map(s=>names.get(s)||s).join(' · '))+'</h4><p class="muted"><small>Linked by shared concept (AI-mapped), not NMC\'s own integration list.</small></p>'+
  t.integration.map(c=>'<div class="nmc-integration-concept"><p><button type="button" class="link-button" data-preview-concept="'+e(c.conceptId)+'">'+e(c.label||c.conceptId)+'</button></p>'+
   c.connected.map(x=>'<details><summary>'+e(names.get(x.subjectId)||x.subjectId)+' · '+plural(x.objectives.length,'objective','objectives')+'</summary><ul>'+x.objectives.map(o=>'<li><p>'+e(o.objective)+'</p><small>'+(o.topicLabel?e(o.topicLabel)+' · ':'')+e(MODE[o.mode]||o.mode)+' · <a href="'+e(p.sourceUrl)+'#page='+e(o.pdfPage)+'" target="_blank" rel="noopener noreferrer">NMC '+e(o.code)+' ↗</a></small></li>').join('')+'</ul></details>').join('')+'</div>').join('')+'</section>';
}
function subjectViewMarkup(p,names){
 if(p.filterRequired)return p.subjectIndex?.length?subjectIndexMarkup(p):'<p>'+e(p.total)+' objectives. Choose a subject or search to list them, or browse by concept.</p>';
 return '<p>'+e(p.matched)+' of '+e(p.total)+' objectives</p>'+(p.topics.length?p.topics.map(t=>'<article class="nmc-topic"><h3>'+e(t.topicLabel||'Untitled topic')+(t.topicLabelKind==='editorial-grouping'?' <small>(editorial grouping)</small>':'')+'</h3>'+hierarchyMarkup(t.hierarchy)+'<p class="muted">'+e(names.get(t.subjectId)||t.subjectId)+'</p><p>By the end of this topic you should be able to:</p><ul>'+
  t.objectives.map(o=>'<li><p>'+e(o.objective)+'</p>'+objectiveMeta(o,p)+'</li>').join('')+'</ul>'+integrationMarkup(t,p,names)+(t.concepts?.length?'<details><summary>Concept links and misconceptions ('+e(t.concepts.length)+') · AI draft</summary>'+t.concepts.map(conceptLayerMarkup).join('')+'</details>':'')+'</article>').join(''):'<p>No objectives match. Clear the filters.</p>');
}
function conceptIndexMarkup(p,names){
 return '<p>'+e(p.matched)+' of '+e(p.totalConcepts)+' concepts. Each concept lists only the subjects that link to it.</p>'+(p.concepts.length?'<ul class="nmc-concept-index">'+p.concepts.map(c=>'<li><button type="button" class="link-button" data-preview-concept="'+e(c.conceptId)+'">'+e(c.label||c.conceptId)+'</button> <small>'+e(c.subjectIds.map(s=>names.get(s)||s).join(' · '))+' · '+e(c.objectiveCount)+(c.objectiveCount===1?' objective':' objectives')+'</small></li>').join('')+'</ul>':'<p>No concepts match. Clear the filters.</p>');
}
// Parent breadcrumb and sub-topics (ADR-144). Concepts open their concept page; other nodes are plain labels.
export function hierarchyMarkup(h){
 if(!h)return '';
 const node=n=>n.kind==='concept'?'<button type="button" class="link-button" data-preview-concept="'+e(n.id)+'">'+e(n.label)+'</button>':e(n.label);
 return '<nav class="nmc-hierarchy" aria-label="Topic hierarchy">'+(h.ancestors.length?'<p><small>Part of: '+[...h.ancestors].reverse().map(node).join(' › ')+'</small></p>':'')+
  (h.children.length?'<p><small>Sub-topics: '+h.children.map(node).join(' · ')+'</small></p>':'')+'</nav>';
}
function conceptDetailMarkup(p,names){
 const c=p.concept;
 return '<button type="button" data-preview-back>← Back</button><article class="nmc-topic nmc-concept-page"><h3>'+e(c.label||c.conceptId)+'</h3>'+hierarchyMarkup(c.hierarchy)+'<p class="muted">'+e(c.subjectIds.length)+(c.subjectIds.length===1?' subject':' subjects')+': '+e(c.subjectIds.map(s=>names.get(s)||s).join(' · '))+' · '+e(p.matched)+(p.matched===1?' objective':' objectives')+'</p>'+
  c.sections.map(sec=>'<section><h4>'+e(names.get(sec.subjectId)||sec.subjectId)+'</h4><ul>'+sec.objectives.map(o=>'<li><p>'+e(o.objective)+'</p>'+(o.topicLabel?'<small>'+e(o.topicLabel)+(o.topicLabelKind==='editorial-grouping'?' (editorial grouping)':'')+'</small><br>':'')+objectiveMeta(o,p,{conceptLink:false})+'</li>').join('')+'</ul></section>').join('')+
  '<details open><summary>Concept links and misconceptions · AI draft</summary>'+conceptLayerMarkup(c)+'</details></article>';
}
export function learnerPreviewMarkup(p=null,filters={},message='Load the learner preview to see accepted NMC objectives as a learner would.'){
 const banner='<div class="nmc-admin-banner" role="note"><strong>Admin preview only.</strong> Learners cannot see this. Objectives are AI-drafted and not faculty-reviewed (review skipped by the owner).</div>';
 const intro='<h2>NMC learning objectives · learner preview</h2>'+banner;
 if(!p)return intro+'<p role="status">'+e(message)+'</p><button type="button" data-preview-load>Load learner preview</button>';
 const names=new Map(p.subjects.map(s=>[s.subjectId,s.label]));
 const body=p.view==='concept'?(p.concept?conceptDetailMarkup(p,names):conceptIndexMarkup(p,names)):subjectViewMarkup(p,names);
 return intro+'<p role="status">'+e(message)+'</p>'+(p.concept?'':filtersMarkup(p,filters))+body+'<button type="button" data-preview-load>Refresh</button>';
}
export const validPreviewResult=r=>r?.contractId==='nmc-admin-learner-preview-v1'&&r.audience==='admin-only'&&r.learnerActivation===false&&Array.isArray(r.subjects)&&
 (r.view==='concept'?(Array.isArray(r.concepts)||(r.concept&&Array.isArray(r.concept.sections))):Array.isArray(r.topics));
export function mountLearnerPreview({root,load,identity,window:win=window,initial=null}){
 let generation=0,disposed=false,page=null,filters={},back={},owner=null;
 // Admin console: blank on any focus/storage/access change. Learner-page panels (initial set): reload only if the signed-in user changed.
 const clear=async()=>{
  if(initial){const current=await identity();if(disposed||(current&&current===owner))return;if(!current){generation++;page=null;root.innerHTML=learnerPreviewMarkup(null,{},'Sign in as Admin to see this preview.');return;}return read(initial);}
  generation++;page=null;back={};root.innerHTML=learnerPreviewMarkup();
 };
 async function read(next={}){
  const current=++generation;filters=next;page=null;root.innerHTML=learnerPreviewMarkup(null,{},'Loading learner preview…');
  try{
   const before=await identity();if(disposed||current!==generation)return;if(!before)throw new Error();
   const result=await load(next);const after=await identity();
   if(disposed||current!==generation)return;
   if(!after||before!==after)throw new Error();
   if(!validPreviewResult(result))throw new Error();
   page=result;owner=after;root.innerHTML=learnerPreviewMarkup(page,filters,'Admin-only preview loaded.');
  }catch{if(!disposed&&current===generation){page=null;root.innerHTML=learnerPreviewMarkup(null,{},'Preview could not be loaded. Check Admin access and retry.');}}
 }
 function click(ev){
  const b=ev.target.closest('button');if(!b)return;
  if(b.hasAttribute('data-preview-load'))return read(filters);
  if(b.hasAttribute('data-preview-subject')){back={};return read({view:'subject',subject:b.getAttribute('data-preview-subject')});}
  if(b.hasAttribute('data-preview-concept')){if(!filters.concept)back=filters;return read({view:'concept',concept:b.getAttribute('data-preview-concept')});}
  if(b.hasAttribute('data-preview-back'))return read(back.view||back.subject||back.search?back:{view:'concept'});
 }
 function submit(ev){if(!ev.target.matches('[data-preview-filters]'))return;ev.preventDefault();return read(Object.fromEntries(new FormData(ev.target)));}
 root.innerHTML=learnerPreviewMarkup();if(initial)read(initial);root.addEventListener('click',click);root.addEventListener('submit',submit);
 for(const n of ['storage','focus','pageshow','mlos:access'])win.addEventListener(n,clear);
 return ()=>{disposed=true;generation++;root.removeEventListener('click',click);root.removeEventListener('submit',submit);for(const n of ['storage','focus','pageshow','mlos:access'])win.removeEventListener(n,clear);page=null;root.replaceChildren();};
}
