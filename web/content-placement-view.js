import { contentPlacement, draftLibrary } from '../src/domain/content-placement.js';
import { libraryRouteState, selectWorkspace } from '../src/domain/library-workspaces.js';
import { transitionContext } from '../src/domain/content-workspace.js';
import { workspaceFrame, neighborhoodMarkup } from './content-workspace-view.js';
import { escapeText as e } from './navigation-view.js';
export function placementMarkup(manifest) {
  const r=contentPlacement(manifest);
  return '<section class="review-packet" id="content-placement"><h3>Content Placement Inspector</h3><p>Draft metadata eligibility · not medical, reference or rights approval. Existing catalog links resolve on the server before publication.</p><div class="table-wrap"><table><thead><tr><th>Artifact / home</th><th>Location checks</th></tr></thead><tbody>'+r.items.map(x=>'<tr><th>'+e(x.id)+'<small> · '+e(x.home)+'</small></th><td><ul>'+x.checks.map(c=>'<li><strong>'+e(c.id)+' · '+e(c.status)+'</strong> — '+e(c.detail)+'</li>').join('')+'</ul></td></tr>').join('')+'</tbody></table></div><button type="button" data-draft-preview>Preview draft as learner</button><dialog id="draft-preview" class="cw-draft-dialog" aria-label="Draft learner preview"><div class="workspace-chips"><button type="button" data-preview-close>Close preview</button><button type="button" data-preview-size="desktop">Desktop · 1440 px</button><button type="button" data-preview-size="tablet">iPad · 1024 px</button></div><p>Draft only · no learner writes or publication. References to existing catalog objects may remain unresolved in this manifest-only preview.</p><div class="cw-preview-viewport" data-preview-width="tablet"><iframe class="cw-preview-canvas" data-preview-width="tablet" data-draft-canvas title="Draft content viewport" sandbox="allow-scripts" referrerpolicy="no-referrer" height="900"></iframe></div></dialog></section>';
}
// The iframe has an opaque origin. Only this fixed, nonce-authorized event relay runs
// inside it; no manifest fields, account tokens, keys or arbitrary scripts are passed in.
function previewFrameBridge(revision) {
  const send = message => parent.postMessage({channel:'mlos-draft-preview',revision,...message}, '*');
  document.addEventListener('click', event => {
    const a=event.target.closest('a');
    if(a){event.preventDefault();if(a.hasAttribute('href'))send({kind:'link',href:a.getAttribute('href')});return;}
    const b=event.target.closest('button');
    if(b?.dataset.view){event.preventDefault();send({kind:'view',value:b.dataset.view});return;}
    const g=event.target.closest('[data-graph-concept],[data-graph-question],[data-graph-note]');
    if(g?.dataset.graphConcept)send({kind:'concept',value:g.dataset.graphConcept});
    else if(g?.hasAttribute('data-graph-question'))send({kind:'view',value:'questions'});
    else if(g?.hasAttribute('data-graph-note'))send({kind:'view',value:'notes'});
  });
  document.addEventListener('change',event=>{
    const facet=event.target.dataset.cwFacet||event.target.dataset.workspaceOption;
    if(facet)send({kind:'filter',field:facet,value:event.target.value});
  });
  document.addEventListener('submit',event=>{
    event.preventDefault();
    if(event.target.matches('[data-cw-search]'))send({kind:'search',value:event.target.elements.conceptSearch.value});
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'){send({kind:'close'});return;}
    const tab=event.target.closest('[role="tab"]');
    if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
      const tabs=[...tab.parentNode.querySelectorAll('[role="tab"]')],i=tabs.indexOf(tab);
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length;
      event.preventDefault();send({kind:'view',value:tabs[next].dataset.view});return;
    }
    if(event.target.matches('[data-graph-concept],[data-graph-question],[data-graph-note]')&&['Enter',' '].includes(event.key)){
      event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    }
  });
  send({kind:'ready'});
}
export function setupPlacementPreview({detail,getDraft}) {
  let library=null,search='',width='tablet',trigger=null,revision=0;
  const allowedViews=new Set(['overview','notes','questions','graph']);
  const filterKeys=new Set(['system','subject','task','perspective']);
  const frame=()=>detail.querySelector('[data-draft-canvas]');
  function render() {
    const s=libraryRouteState(search),data=selectWorkspace(library,{view:s.view,filters:s.filters,...s.options});
    const content=s.view==='graph'?neighborhoodMarkup(library,s.filters.concept,{perspective:s.options.perspective||'exam'}):s.view==='questions'?'<h3>Draft questions</h3>'+data.questions.map(q=>'<article class="panel"><h4>'+e(q.stem)+'</h4><p>'+e(q.questionVersionId)+' · '+e(q.home.kind)+'</p><ol>'+q.options.map(o=>'<li>'+e(o.text)+'</li>').join('')+'</ol></article>').join(''):s.view==='notes'?'<h3>Draft notes</h3>'+data.notes.map(n=>'<article class="panel"><h4>'+e(n.title)+'</h4><p>'+e(n.noteVersionId)+'</p><div class="library-note-body">'+e(n.bodyMarkdown)+'</div></article>').join(''):'';
    const canvas=frame();
    const currentRevision=++revision;
    canvas.dataset.revision=String(currentRevision);
    canvas.dataset.previewReady='false';
    canvas.setAttribute('aria-busy','true');
    for(const x of detail.querySelectorAll('[data-preview-width]'))x.dataset.previewWidth=width;
    // Parse the trusted renderer once to remove destinations outside this read-only preview.
    const scratch=document.createElement('div');
    scratch.innerHTML=workspaceFrame({...s,library},content,{search,draft:true});
    for(const link of scratch.querySelectorAll('a')){
      const raw=link.getAttribute('href');
      let valid=false;
      try {
        const url=new URL(raw,location.origin);
        valid=url.origin===location.origin&&url.pathname==='/web/library.html'&&allowedViews.has(libraryRouteState(url.search).view);
      }catch{/* Invalid links are disabled. */}
      if(!valid){link.removeAttribute('href');link.setAttribute('aria-disabled','true');}
    }
    const attrs=['palette','appearance','theme','surfaceStyle'].map(key=>document.documentElement.dataset[key]?' data-'+key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+'="'+e(document.documentElement.dataset[key])+'"':'').join('');
    const nonce=crypto.randomUUID().replaceAll('-','');
    // The opaque sandbox cannot access localStorage, cookies or the authenticated admin page.
    // CSP permits only our fixed inline relay; network calls, forms and other scripts are barred.
    const csp="default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'none'; script-src 'nonce-"+nonce+"'";
    canvas.srcdoc='<!doctype html><html'+attrs+'><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="'+e(csp)+'"><link rel="stylesheet" href="/web/styles.css"><link rel="stylesheet" href="/web/library.css"><link rel="stylesheet" href="/web/content-workspace.css"><link rel="stylesheet" href="/web/navigation.css"><link rel="stylesheet" href="/web/content-preview-frame.css"></head><body><main class="library-page">'+scratch.innerHTML+'</main><script nonce="'+nonce+'">('+previewFrameBridge.toString()+')('+currentRevision+');</script></body></html>';
  }
  const navigate=value=>{search=new URL(transitionContext(search,value),location.origin).search;render();};
  window.addEventListener('message',event=>{
    const m=event.data,canvas=frame(),dialog=detail.querySelector('#draft-preview');
    if(!library||!dialog?.open||event.source!==canvas.contentWindow||!m||m.channel!=='mlos-draft-preview'||m.revision!==revision)return;
    if(m.kind==='ready'){canvas.dataset.previewReady='true';canvas.removeAttribute('aria-busy');return;}
    if(m.kind==='close'){dialog.close();return;}
    if(m.kind==='view'&&allowedViews.has(m.value)){navigate({view:m.value});return;}
    if(m.kind==='concept'&&library.concepts.some(c=>c.conceptId===m.value)){navigate({concept:m.value});return;}
    if(m.kind==='search'&&typeof m.value==='string'){
      const term=m.value.slice(0,300).trim().toLowerCase();
      const match=library.concepts.find(c=>[c.label,...c.aliases].some(x=>x.toLowerCase().includes(term)));
      if(match)navigate({concept:match.conceptId});
      return;
    }
    if(m.kind==='filter'&&filterKeys.has(m.field)&&typeof m.value==='string'&&m.value.length<=150){
      if(m.field==='perspective'&&!['exam','learning','medical'].includes(m.value))return;
      if(m.field!=='perspective'&&m.value&&!library.concepts.some(c=>c.classification?.[m.field==='system'?'systems':m.field==='subject'?'subjects':'tasks']?.includes(m.value)))return;
      navigate({[m.field]:m.value});
      return;
    }
    if(m.kind==='link'&&typeof m.href==='string'&&m.href.length<=2048){
      try{
        const url=new URL(m.href,location.origin);
        if(url.origin===location.origin&&url.pathname==='/web/library.html'&&allowedViews.has(libraryRouteState(url.search).view)){
          search=url.search;render();
        }
      }catch{/* No external or invalid navigation from drafts. */}
    }
  });
  detail.addEventListener('click',event=>{
    const b=event.target.closest('button'),dialog=detail.querySelector('#draft-preview');
    if(b?.hasAttribute('data-draft-preview')){
      trigger=b;library=draftLibrary(getDraft().manifest);
      search='?view=overview'+(library.concepts[0]?'&concept='+encodeURIComponent(library.concepts[0].conceptId):'');
      dialog.showModal();render();
    }
    if(b?.hasAttribute('data-preview-close'))dialog.close();
    if(b?.dataset.previewSize){width=b.dataset.previewSize;render();}
  });
  detail.addEventListener('close',event=>{
    if(event.target.id==='draft-preview'){
      library=null;revision++;frame().srcdoc='';frame().dataset.previewReady='false';trigger?.focus();
    }
  },true);
}
