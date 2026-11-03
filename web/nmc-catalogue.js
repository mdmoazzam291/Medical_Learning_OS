import {SUBJECT_INDEX} from '/src/domain/subject-index.js';
import {validateReferenceCatalogue,selectCatalogue} from '/src/domain/nmc-reference-catalogue.js';
const results=document.querySelector('#nmc-results'),status=document.querySelector('#nmc-status');
const search=document.querySelector('#nmc-search'),subject=document.querySelector('#nmc-subject'),pages=document.querySelector('#nmc-pages');
const names=new Map(SUBJECT_INDEX.map(s=>[s.id,s.label]));
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
subject.insertAdjacentHTML('beforeend',SUBJECT_INDEX.map(s=>'<option value="'+e(s.id)+'">'+e(s.label)+'</option>').join(''));
let catalogue=null;
function state(){const p=new URLSearchParams(location.search);return {search:(p.get('search')||'').slice(0,200),subject:names.has(p.get('subject'))?p.get('subject'):'',page:Number(p.get('page'))||1};}
function render(){
 if(!catalogue)return;
 const s=state();search.value=s.search;subject.value=s.subject;
 const data=selectCatalogue(catalogue,s);
 status.textContent=data.groupCount+' topic groups · '+data.referenceCount+' source reference appearances';
 results.innerHTML=data.groups.map(g=>'<article class="nmc-topic"><h2>'+e(g.label)+'</h2><p>'+g.allSubjects.map(s=>e(names.get(s))).join(' · ')+'</p><p>'+g.references.length+' matching references'+(g.allSubjects.length>1?' · Shared topic entry across subjects':'')+'</p><details><summary>View competency references</summary><ul class="nmc-references">'+g.references.map(r=>'<li><a href="'+catalogue.sourceUrl+'#page='+r.pdfPage+'" target="_blank" rel="noopener noreferrer">'+e(r.observedCode)+' ↗</a><small>'+e(names.get(r.subjectId))+' · PDF page '+r.pdfPage+'</small>'+(r.identifierState==='unresolved'?'<small class="nmc-alert">Source identifier unresolved; retained as printed.</small>':'')+(r.amendmentNotice?'<small class="nmc-alert"><a href="'+catalogue.clarificationUrl+'" target="_blank" rel="noopener noreferrer">Read October clarification</a></small>':'')+'</li>').join('')+'</ul></details></article>').join('')||'<p>No matching topics or codes. Try a broader search or clear the subject filter.</p>';
 pages.innerHTML='<button data-page="'+(data.page-1)+'" '+(data.page===1?'disabled':'')+'>Previous</button><span>Page '+data.page+' of '+data.pageCount+'</span><button data-page="'+(data.page+1)+'" '+(data.page===data.pageCount?'disabled':'')+'>Next</button>';
}
function route(next){const p=new URLSearchParams();if(next.search)p.set('search',next.search);if(next.subject)p.set('subject',next.subject);if(next.page>1)p.set('page',next.page);history.pushState(null,'',location.pathname+(p.size?'?'+p:''));render();}
document.querySelector('#nmc-filters').addEventListener('submit',event=>{event.preventDefault();route({search:search.value.trim(),subject:subject.value,page:1});});
subject.addEventListener('change',()=>route({search:search.value.trim(),subject:subject.value,page:1}));
document.querySelector('#nmc-clear').addEventListener('click',()=>route({search:'',subject:'',page:1}));
pages.addEventListener('click',event=>{const b=event.target.closest('button[data-page]');if(b&&!b.disabled){route({...state(),page:Number(b.dataset.page)});document.querySelector('#main').scrollIntoView();}});
window.addEventListener('popstate',render);
async function load(){
 try{const response=await fetch('/data/nmc-reference-catalogue.json');if(!response.ok)throw Error('catalogue_unavailable');catalogue=validateReferenceCatalogue(await response.json());render();}
 catch{status.textContent='The catalogue could not be loaded. Please try again.';results.innerHTML='<button id="nmc-retry">Retry</button>';document.querySelector('#nmc-retry').addEventListener('click',load,{once:true});}
}
load();
