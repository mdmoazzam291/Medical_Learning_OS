import { transitionContext } from '/src/domain/content-workspace.js';
import { neighborhoodMarkup } from '/web/content-workspace-view.js';
import { guestContent } from '/web/guest-view.js';
import { SUBJECTS } from '/src/domain/content-library.js';
import { setupLibraryWorkspaces } from '/web/library-enhancements.js';
import { FILTER_KEYS, libraryRouteState, selectWorkspace, studySelection, libraryContextUrl, workspaceKeywordCounts } from '/src/domain/library-workspaces.js';
import { escape as e, request } from '/web/content-library-client.js';
import { renderCanonicalNote, renderNoteOutline } from '/web/canonical-note-reader.js';
const root=document.querySelector('#library-app');
let { building, sessionCount, view, filters, options } = libraryRouteState(location.search);
const keys = FILTER_KEYS;
let library=null, busy=false;
const facetKeys={subject:'subjects',system:'systems',organ:'organs',domain:'domains',task:'tasks'};
const label=s=>s.replace(/-/g,' ').replace(/^./,c=>c.toUpperCase());
const noteBody=n=>{const r=renderCanonicalNote(n.bodyMarkdown,{idPrefix:'library-note-'+n.noteVersionId});return '<div class="canonical-note-reader">'+renderNoteOutline(r.sections)+r.html+'</div>';};
function remember(push=false){const p=new URLSearchParams();keys.forEach(k=>{if(filters[k])p.set(k,filters[k]);});p.set('view',view);p.set('count',String(sessionCount));Object.entries(options).forEach(([k,v])=>{if(v)p.set(k,v);});if(building){p.set('build','1');p.set('master','study');}else if(['recall','cases','images','skills'].includes(view)||(view==='subjects'&&new URLSearchParams(location.search).get('master')==='study'))p.set('master','study');const href=location.pathname+'?'+p;if(push && href!==location.pathname+location.search)history.pushState(null,'',href);else history.replaceState(null,'',href);window.dispatchEvent(new CustomEvent('mlos:route'));}
function select(key,values){return '<label>'+label(key)+'<select aria-label="'+label(key)+'" data-filter="'+key+'"><option value="">All</option>'+values.map(v=>'<option value="'+e(v.id??v)+'" '+(filters[key]===(v.id??v)?'selected':'')+'>'+e(v.label??label(v))+'</option>').join('')+'</select></label>';}
function graph(data){
  return neighborhoodMarkup(library,filters.concept || data.concepts[0]?.conceptId,{perspective:options.perspective||'exam',limit:enhancements.graphLimit(),filters,...options});
}
function libraryGuest(active) {
  root.closest('main').classList.toggle('guest-page', active);
  const title = document.querySelector('#library-title');
  title.hidden = active;
  if (title.nextElementSibling) title.nextElementSibling.hidden = active;
}
function render(){
  enhancements.beforeRender?.();
  libraryGuest(false);
  const allData=selectWorkspace(library,{filters,view,...options});
  const limit=enhancements.contentLimit?.()||50;
  const data={...allData,questions:allData.questions.slice(0,limit),notes:allData.notes.slice(0,limit)};
  const values=k=>[...new Set(library.questions.flatMap(q=>k==='qualifier'?q.intelligence?.qualifiers||[]:k==='medium'?q.intelligence?.presentation||[]:k==='response'?[q.intelligence?.responseFormat].filter(Boolean):facetKeys[k]?q.classification[facetKeys[k]]:k==='exam'?q.home.exams:q.home.platforms))].sort();
  const counts=workspaceKeywordCounts(library,{filters,view,...options});
  const keywordOptions=counts.map(x=>({id:x.id,label:label(x.id)+' ('+x.count+')'}));
  if(filters.keyword&&!counts.some(x=>x.id===filters.keyword))keywordOptions.push({id:filters.keyword,label:label(filters.keyword)+' (0)'});
  root.innerHTML='<div class="library-filters"><label>Question search<input type="search" data-filter="search" value="'+e(filters.search)+'" placeholder="Search question text or concept" maxlength="300"></label>'+keys.filter(k=>k!=='search').map(k=>select(k,k==='keyword'?keywordOptions:k==='subject'?SUBJECTS:k==='concept'?library.concepts.map(c=>({id:c.conceptId,label:c.label})):values(k))).join('')+'</div><p>Keyword counts show unique matching questions, highest first.</p><div class="library-tabs" role="tablist" aria-label="Library view"><button role="tab" aria-selected="'+(view==='notes')+'" data-view="notes">Notes</button><button role="tab" aria-selected="'+(view==='questions')+'" data-view="questions">Questions</button><button role="tab" aria-selected="'+(view==='graph')+'" data-view="graph">Graph</button></div><p>'+data.questions.length+' unique questions · '+data.notes.length+' notes</p><div class="library-actions"><a href="/web/medical.html">Open Study</a><label>Question count<select data-session-count aria-label="Question count">'+[1,5,10,15,20,30,50].map(n=>'<option value="'+n+'" '+(sessionCount===n?'selected':'')+'>'+n+'</option>').join('')+'</select></label><button data-study '+(!data.questions.length||busy?'disabled':'')+'>Study these questions (up to '+sessionCount+')</button><button data-clear>Clear filters</button></div><p>Starts up to '+sessionCount+' filtered original questions. An unfinished session resumes first.</p><p class="library-status" id="library-status" role="status"></p>'+(view==='graph'?'<p class="library-legend">Gray: unattempted · Red: latest answer incorrect · Green: latest answer correct · Thick red outline: at least two incorrect attempts. These are observed answers, not mastery scores.</p>'+graph(data):'')+'<div class="library-grid"><section aria-label="Connected notes"><h2>Notes</h2>'+data.notes.map(n=>'<article class="panel" tabindex="-1" data-note-card="'+e(n.noteVersionId)+'"><h3>'+e(n.title)+'</h3><div class="library-note-body">'+noteBody(n)+'</div><a href="/web/vault.html?concept='+encodeURIComponent(n.conceptId)+'">Open concept in Vault</a></article>').join('')+(!data.notes.length?'<p>No published notes match these filters.</p>':'')+'</section><section aria-label="Connected questions"><h2>Questions</h2>'+data.questions.map(q=>'<article class="panel" tabindex="-1" id="question-'+e(q.questionId)+'" data-question-card="'+e(q.questionId)+'"><p>'+e(q.home.kind==='pyq'?'PYQ · '+q.origins.filter(o=>o.kind==='pyq').map(o=>o.examId+' '+o.year+' '+o.session).sort().join(' · '):q.home.platforms[0]||'Original')+'</p><h3>'+e(q.stem)+'</h3><p>'+e(q.connection)+' · '+q.observed.wrong+'/'+q.observed.attempts+' wrong · '+e(q.observed.state)+(q.observed.repeatedWrong?' · Repeated incorrect attempts':'')+'</p><ol class="library-question-choices">'+q.options.map(o=>'<li>'+e(o.text)+'</li>').join('')+'</ol><p>'+q.conceptLinks.map(l=>'<a href="'+e(libraryContextUrl(location.search,{concept:l.conceptId,view}))+'">'+e(library.concepts.find(c=>c.conceptId===l.conceptId)?.label||l.conceptId)+' ('+e(l.role)+')</a>').join(' · ')+'</p><p>Task: '+e(q.intelligence?.primaryTask||'Unclassified')+' · '+e((q.intelligence?.qualifiers||[]).join(', '))+'</p>'+((q.intelligence?.derivatives||[]).filter(d=>d.representation==='concise-practice').map(d=>'<details><summary>Concise practice · adapted from original</summary><h4>'+e(d.stem)+'</h4><p>This version is separate from full-question performance.</p><button data-concise-question="'+e(q.questionVersionId)+'" data-variant="'+e(d.variantId)+'" '+(busy?'disabled':'')+'>Practice this concise version</button></details>').join(''))+'<details><summary>Source occurrences</summary><pre>'+e(JSON.stringify(q.origins,null,2))+'</pre></details></article>').join('')+(!data.questions.length?'<p>No published questions match these filters.</p>':'')+'</section></div>';
  if(data.questions.length<allData.questions.length||data.notes.length<allData.notes.length)root.insertAdjacentHTML('beforeend','<p>Showing '+data.questions.length+' of '+allData.questions.length+' matching questions and '+data.notes.length+' of '+allData.notes.length+' notes.</p><button data-cw-more="content">Show more content</button>');
  enhancements.decorate();
}
async function load(){
  library=null; root.textContent='Loading reviewed content…';
  try { library=await request('/library'); render(); }
  catch(error) {
    const guest = error.code === 'authentication_required';
    libraryGuest(guest);
    root.innerHTML = guest ? guestContent('library', location.pathname + location.search)
      : '<section class="panel" role="status"><h2>Library could not be loaded.</h2><p>Check your connection and try again.</p><button data-retry>Retry library</button></section>';
  }
}
root.addEventListener('change',event=>{if(event.target.hasAttribute('data-session-count')){sessionCount=Number(event.target.value);remember();render();return;}const key=event.target.dataset.filter;if(key){filters[key]=event.target.value;remember(true);render();}});
root.addEventListener('click',async event=>{
  const noteLink=event.target.closest('.canonical-note-outline a[href^="#"]');
  if(noteLink&&typeof noteLink.getAttribute==='function'){
    const id=noteLink.getAttribute('href').slice(1),section=root.querySelector('[id="'+id+'"]');
    if(section){event.preventDefault();history.replaceState(null,'',location.pathname+location.search+'#'+id);section.scrollIntoView({block:'start'});section.focus({preventScroll:true});}
    return;
  }
  const t=event.target.closest('button,[data-graph-question],[data-graph-note],[data-graph-concept]');if(!t)return;
  if(t.hasAttribute('data-retry'))return load();
  if(t.dataset.view){const changed=view!==t.dataset.view;({view,filters,options}=libraryRouteState(new URL(transitionContext(location.search,{view:t.dataset.view}),location.origin).search));remember(changed);render();return root.querySelector('[data-view="'+view+'"]').focus();}
  if(t.hasAttribute('data-clear')){options=Object.fromEntries(Object.keys(options).map(k=>[k,'']));filters=Object.fromEntries(keys.map(k=>[k,'']));remember();return render();}
  if(t.dataset.graphConcept){filters.concept=t.dataset.graphConcept;remember(true);return render();}
  if(t.dataset.graphNote){const card=[...root.querySelectorAll('[data-note-card]')].find(c=>c.dataset.noteCard===t.dataset.graphNote);card?.focus();card?.scrollIntoView({block:'center'});return;}
  if(t.dataset.graphQuestion){const card=[...root.querySelectorAll('[data-question-card]')].find(c=>c.dataset.questionCard===t.dataset.graphQuestion);card?.focus();card?.scrollIntoView({block:'center'});return;}
  if((t.hasAttribute('data-study')||t.dataset.conciseQuestion)&&!busy){busy=true;render();try{const session=await request('/study',t.dataset.conciseQuestion?{questionVersionIds:[t.dataset.conciseQuestion],variants:{[t.dataset.conciseQuestion]:t.dataset.variant}}:{questionVersionIds:studySelection(selectWorkspace(library,{filters,view,...options}),sessionCount)});const url='/web/medical.html?resume='+encodeURIComponent(session.sessionId);if(session.resumedExisting){busy=false;render();document.querySelector('#library-status').innerHTML='You have an unfinished session. Finish it before starting this selection. <a href="'+e(url)+'">Continue unfinished session</a>';}else location.assign(url);}catch(error){busy=false;render();document.querySelector('#library-status').textContent=error.message;}}
});
root.addEventListener('keydown',event=>{if((event.target.dataset.graphQuestion||event.target.dataset.graphNote||event.target.dataset.graphConcept)&&['Enter',' '].includes(event.key)){event.preventDefault();event.target.click();}});
const enhancements=setupLibraryWorkspaces({root,state:()=>({library,view,filters,options,busy}),change(update){if(update.sessionCount)sessionCount=update.sessionCount;if(update.building!==undefined)building=update.building;if(update.view)view=update.view;if(update.filters)filters={...filters,...update.filters};if(update.options)options={...options,...update.options};},render,remember});
window.addEventListener('popstate',()=>{({building,sessionCount,view,filters,options}=libraryRouteState(location.search));if(library)render();window.dispatchEvent(new CustomEvent('mlos:route'));});
load();
