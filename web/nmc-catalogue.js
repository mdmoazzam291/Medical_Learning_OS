import {auth,request} from '/web/content-library-client.js';
import {loadTopicConcepts} from '/src/domain/nmc-concept-discovery.js';
import {SUBJECT_INDEX} from '/src/domain/subject-index.js';
import {validateReferenceCatalogue,selectCatalogue} from '/src/domain/nmc-reference-catalogue.js';
const results=document.querySelector('#nmc-results'),status=document.querySelector('#nmc-status');
const search=document.querySelector('#nmc-search'),subject=document.querySelector('#nmc-subject'),pages=document.querySelector('#nmc-pages');
const names=new Map(SUBJECT_INDEX.map(s=>[s.id,s.label]));
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
subject.insertAdjacentHTML('beforeend',SUBJECT_INDEX.map(s=>'<option value="'+e(s.id)+'">'+e(s.label)+'</option>').join(''));
let catalogue=null,revision=0;
let visibleGroups=new Map();
function state(){const p=new URLSearchParams(location.search);return {search:(p.get('search')||'').slice(0,200),subject:names.has(p.get('subject'))?p.get('subject'):'',page:Number(p.get('page'))||1};}
function render(){
 if(!catalogue)return;
 revision++;
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
window.addEventListener('pageshow',render);
window.addEventListener('focus',render);
results.addEventListener('click',async event=>{
 const button=event.target.closest('button[data-nmc-connect]');if(!button||button.disabled)return;
 const group=visibleGroups.get(button.dataset.nmcConnect);if(!group)return;
 const panel=button.parentElement.querySelector('.nmc-connections'),ticket=revision;
 const discoveryUrl='/web/library.html?view=overview&search='+encodeURIComponent(group.label);
 button.disabled=true;panel.textContent='Finding published learning material…';
 try{
  const matches=await loadTopicConcepts(group,{request,identity:async()=>(await auth.getSession())?.user?.id||null});
  if(ticket!==revision||!panel.isConnected)return;
  const count=matches.length;
  panel.innerHTML=count?'<p>Name matches help you find existing material; they are not validated NMC mappings.</p>'+matches.slice(0,30).map(c=>'<section class="nmc-concept"><h3>'+e(c.label)+'</h3><p>'+c.questionCount+' published questions · '+c.noteCount+' published notes · '+(c.match==='alias'?'Alias match':'Title match')+'</p><div class="nmc-concept-links">'+[['concept','Open concept'],['notes','Notes'],['questions','Questions'],['graph','Graph']].map(([key,label])=>'<a href="'+e(c.urls[key])+'">'+label+'</a>').join('')+'</div></section>').join('')+(count>30?'<p>Showing 30 of '+count+' name matches.</p>':''):'<p>No published concepts match this topic by title or alias yet.</p>';
  panel.insertAdjacentHTML('beforeend','<p><a href="'+e(discoveryUrl)+'">Search all learning material</a></p>');
 }catch(error){
  if(ticket!==revision||!panel.isConnected)return;
  if(error.code==='authentication_required')panel.innerHTML='<p><a href="/web/account.html?returnTo='+encodeURIComponent(discoveryUrl)+'">Sign in to find learning material</a></p>';
  else panel.textContent=error.code==='identity_changed'?'Your account changed. Find learning material again.':'Learning material could not be loaded. Try Find learning material again.';
 }finally{if(ticket===revision&&button.isConnected)button.disabled=false;}
});
async function load(){
 try{const response=await fetch('/data/nmc-reference-catalogue.json');if(!response.ok)throw Error('catalogue_unavailable');catalogue=validateReferenceCatalogue(await response.json());render();}
 catch{status.textContent='The catalogue could not be loaded. Please try again.';results.innerHTML='<button id="nmc-retry">Retry</button>';document.querySelector('#nmc-retry').addEventListener('click',load,{once:true});}
}
load();
