import {auth,request} from '/web/content-library-client.js';
import {loadPublishedConceptLibrary,loadTopicConcepts,selectIntegratedConcepts} from '/src/domain/nmc-concept-discovery.js';
import {SUBJECT_INDEX} from '/src/domain/subject-index.js';
import {validateReferenceCatalogue,selectCatalogue} from '/src/domain/nmc-reference-catalogue.js';
const results=document.querySelector('#nmc-results'),status=document.querySelector('#nmc-status');
const search=document.querySelector('#nmc-search'),subject=document.querySelector('#nmc-subject'),pages=document.querySelector('#nmc-pages');
const names=new Map(SUBJECT_INDEX.map(s=>[s.id,s.label]));
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
subject.insertAdjacentHTML('beforeend',SUBJECT_INDEX.map(s=>'<option value="'+e(s.id)+'">'+e(s.label)+'</option>').join(''));
let catalogue=null,revision=0;
const integrated=document.querySelector('#nmc-integrated');
const referenceView=document.querySelector('#nmc-reference-view');
const subjectViewLink=document.querySelector('#nmc-subject-view');
const integratedViewLink=document.querySelector('#nmc-integrated-view');
const access={request,identity:async()=>(await auth.getSession())?.user?.id||null};
const isIntegrated=()=>new URLSearchParams(location.search).get('view')==='integrated';
function integratedRoute(filters){
 const query=new URLSearchParams({view:'integrated'});
 for(const [key,value] of Object.entries(filters))if(value)query.set(key,value);
 history.pushState(null,'',location.pathname+'?'+query);
 render();
}
async function renderIntegrated(ticket){
 const query=new URLSearchParams(location.search);
 const filters={system:query.get('system')||'',organ:query.get('organ')||'',search:(query.get('search')||'').slice(0,200)};
 integrated.innerHTML='<p role="status">Loading published concepts…</p>';
 try{
  const library=await loadPublishedConceptLibrary(access);
  if(ticket!==revision)return;
  const {systems,organs,matches}=selectIntegratedConcepts(library.concepts,filters);
  const options=(values,selected)=>values.map(value=>'<option value="'+e(value)+'"'+(value===selected?' selected':'')+'>'+e(value.replaceAll('-',' '))+'</option>').join('');
  integrated.innerHTML='<h2>Browse published concepts</h2><p>Browse by system or organ. NMC competency coverage is tracked separately.</p>'+
   '<form class="nmc-filters" role="search"><label>Concept search<input name="search" type="search" maxlength="200" value="'+e(filters.search)+'"></label>'+
   '<label>System<select name="system"><option value="">All systems</option>'+options(systems,filters.system)+'</select></label>'+
   '<label>Organ<select name="organ"><option value="">All organs</option>'+options(organs,filters.organ)+'</select></label><button type="submit">Search</button></form>'+
   '<p role="status">'+matches.length+' published concepts'+(matches.length>50?' · Showing the first 50. Use search or filters to narrow the list.':'')+'</p>'+
   (matches.length?'<ul>'+matches.slice(0,50).map(c=>'<li><a href="'+e(c.url)+'">'+e(c.label)+'</a>'+(c.subjects.length?' · '+c.subjects.map(s=>e(names.get(s)||s)).join(' · '):'')+'</li>').join('')+'</ul>':'<p>No published concepts match. Try clearing the filters.</p>');
 }catch(error){
  if(ticket!==revision)return;
  integrated.innerHTML=error.code==='authentication_required'
   ?'<p><a href="/web/account.html?returnTo='+encodeURIComponent(location.pathname+location.search)+'">Sign in to browse published concepts</a></p>'
   :'<p role="status">Published concepts could not be loaded.</p><button type="button" data-integrated-retry>Retry</button>';
 }
}
integrated.addEventListener('submit',event=>{
 event.preventDefault();
 integratedRoute(Object.fromEntries(new FormData(event.target)));
});
integrated.addEventListener('change',event=>{
 if(event.target.name!=='system')return;
 const filters=Object.fromEntries(new FormData(event.target.form));
 integratedRoute({...filters,organ:''});
});
integrated.addEventListener('click',event=>{
 if(event.target.closest('[data-integrated-retry]'))render();
});
let visibleGroups=new Map();
function state(){const p=new URLSearchParams(location.search);return {search:(p.get('search')||'').slice(0,200),subject:names.has(p.get('subject'))?p.get('subject'):'',page:Number(p.get('page'))||1};}
function render(){
 const ticket=++revision;
 const showIntegrated=isIntegrated();
 referenceView.hidden=showIntegrated;
 integrated.hidden=!showIntegrated;
 (showIntegrated?integratedViewLink:subjectViewLink).setAttribute('aria-current','page');
 (showIntegrated?subjectViewLink:integratedViewLink).removeAttribute('aria-current');
 if(showIntegrated){
  results.replaceChildren();
  return renderIntegrated(ticket);
 }
 integrated.replaceChildren();
 if(!catalogue)return;
 const s=state();search.value=s.search;subject.value=s.subject;
 const data=selectCatalogue(catalogue,s);
 visibleGroups=new Map(data.groups.map(g=>[g.key,g]));
 status.textContent=data.groupCount+' topic groups · '+data.referenceCount+' source reference appearances';
 results.innerHTML=data.groups.map(g=>'<article class="nmc-topic"><h2>'+e(g.label)+'</h2><p>'+g.allSubjects.map(s=>e(names.get(s))).join(' · ')+'</p><p>'+g.references.length+' matching references'+(g.allSubjects.length>1?' · Shared topic entry across subjects':'')+'</p><button type="button" data-nmc-connect="'+e(g.key)+'">Find learning material</button><div class="nmc-connections" aria-live="polite"></div><details><summary>View competency references</summary><ul class="nmc-references">'+g.references.map(r=>'<li><a href="'+catalogue.sourceUrl+'#page='+r.pdfPage+'" target="_blank" rel="noopener noreferrer">'+e(r.observedCode)+' ↗</a><small>'+e(names.get(r.subjectId))+' · PDF page '+r.pdfPage+'</small>'+(r.identifierState==='unresolved'?'<small class="nmc-alert">Source identifier unresolved; retained as printed.</small>':'')+(r.amendmentNotice?'<small class="nmc-alert"><a href="'+catalogue.clarificationUrl+'" target="_blank" rel="noopener noreferrer">Read October clarification</a></small>':'')+'</li>').join('')+'</ul></details></article>').join('')||'<p>No matching topics or codes. Try a broader search or clear the subject filter.</p>';
 pages.innerHTML='<button data-page="'+(data.page-1)+'" '+(data.page===1?'disabled':'')+'>Previous</button><span>Page '+data.page+' of '+data.pageCount+'</span><button data-page="'+(data.page+1)+'" '+(data.page===data.pageCount?'disabled':'')+'>Next</button>';
}
function route(next){const p=new URLSearchParams();if(next.search)p.set('search',next.search);if(next.subject)p.set('subject',next.subject);if(next.page>1)p.set('page',next.page);history.pushState(null,'',location.pathname+(p.size?'?'+p:''));render();}
document.querySelector('#nmc-filters').addEventListener('submit',event=>{event.preventDefault();route({search:search.value.trim(),subject:subject.value,page:1});});
subject.addEventListener('change',()=>route({search:search.value.trim(),subject:subject.value,page:1}));
document.querySelector('#nmc-clear').addEventListener('click',()=>route({search:'',subject:'',page:1}));
pages.addEventListener('click',event=>{const b=event.target.closest('button[data-page]');if(b&&!b.disabled){route({...state(),page:Number(b.dataset.page)});document.querySelector('#main').scrollIntoView();}});
window.addEventListener('popstate',render);
// Never retain a previous account's published-library discovery panel.
window.addEventListener('storage',render);
window.addEventListener('mlos:access',render);
window.addEventListener('pageshow',render);
window.addEventListener('focus',render);
results.addEventListener('click',async event=>{
 const button=event.target.closest('button[data-nmc-connect]');if(!button||button.disabled)return;
 const group=visibleGroups.get(button.dataset.nmcConnect);if(!group)return;
 const panel=button.parentElement.querySelector('.nmc-connections'),ticket=revision;
 const discoveryUrl='/web/library.html?view=overview'+(group.allSubjects.length===1?'&subject='+encodeURIComponent(group.allSubjects[0]):'');
 button.disabled=true;panel.textContent='Finding published learning material…';
 try{
  const learning=await loadTopicConcepts(group,access);
  if(ticket!==revision||!panel.isConnected)return;
  const {matches}=learning;
  const count=matches.length;
  panel.innerHTML=count?'<p>Name matches help you find existing material; they are not validated NMC mappings.</p>'+matches.slice(0,30).map(c=>'<section class="nmc-concept"><h3>'+e(c.label)+'</h3><p>'+c.questionCount+' published questions · '+c.noteCount+' published notes · '+(c.match==='alias'?'Alias match':'Title match')+'</p><div class="nmc-concept-links">'+[['concept','Open concept'],['notes','Notes'],['questions','Questions'],['graph','Graph']].map(([key,label])=>'<a href="'+e(c.urls[key])+'">'+label+'</a>').join('')+'</div></section>').join('')+(count>30?'<p>Showing 30 of '+count+' name matches.</p>':''):'<p>No published concepts match this topic by title or alias yet.</p>';
  panel.insertAdjacentHTML('beforeend','<nav class="nmc-concept-links" aria-label="Browse published concepts">'+learning.subjects.map(s=>'<a href="'+e(s.url)+'">Browse '+e(names.get(s.subjectId)||s.subjectId)+' concepts ('+s.conceptCount+')</a>').join('')+'<a href="/web/library.html?view=overview">Browse all published concepts ('+learning.conceptCount+')</a></nav>');
 }catch(error){
  if(ticket!==revision||!panel.isConnected)return;
  if(error.code==='authentication_required')panel.innerHTML='<p><a href="/web/account.html?returnTo='+encodeURIComponent(discoveryUrl)+'">Sign in to find learning material</a></p>';
  else panel.textContent=error.code==='identity_changed'?'Your account changed. Find learning material again.':'Learning material could not be loaded. Try Find learning material again.';
 }finally{if(ticket===revision&&button.isConnected)button.disabled=false;}
});
async function load(){
 try{const response=await fetch('/data/nmc-reference-catalogue.json');if(!response.ok)throw Error('catalogue_unavailable');catalogue=validateReferenceCatalogue(await response.json());if(!isIntegrated())render();}
 catch{status.textContent='The catalogue could not be loaded. Please try again.';results.innerHTML='<button id="nmc-retry">Retry</button>';document.querySelector('#nmc-retry').addEventListener('click',load,{once:true});}
}
render();
load();
