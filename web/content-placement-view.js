import { contentPlacement, draftLibrary } from '../src/domain/content-placement.js';
import { libraryRouteState, selectWorkspace } from '../src/domain/library-workspaces.js';
import { transitionContext } from '../src/domain/content-workspace.js';
import { workspaceFrame, neighborhoodMarkup } from './content-workspace-view.js';
import { escapeText as e } from './navigation-view.js';
export function placementMarkup(manifest) {
  const r=contentPlacement(manifest);
  return '<section class="review-packet" id="content-placement"><h3>Content Placement Inspector</h3><p>Draft metadata eligibility · not medical, reference or rights approval. Existing catalog links resolve on the server before publication.</p><div class="table-wrap"><table><thead><tr><th>Artifact / home</th><th>Location checks</th></tr></thead><tbody>'+r.items.map(x=>'<tr><th>'+e(x.id)+'<small> · '+e(x.home)+'</small></th><td><ul>'+x.checks.map(c=>'<li><strong>'+e(c.id)+' · '+e(c.status)+'</strong> — '+e(c.detail)+'</li>').join('')+'</ul></td></tr>').join('')+'</tbody></table></div><button type="button" data-draft-preview>Preview draft as learner</button><dialog id="draft-preview" class="cw-draft-dialog" aria-label="Draft learner preview"><div class="workspace-chips"><button type="button" data-preview-close>Close preview</button><button type="button" data-preview-size="desktop">Desktop · 1440 px</button><button type="button" data-preview-size="tablet">iPad · 1024 px</button></div><p>Draft only · no learner writes or publication. References to existing catalog objects may remain unresolved in this manifest-only preview.</p><div class="cw-preview-viewport" data-preview-width="tablet"><iframe class="cw-preview-canvas" data-preview-width="tablet" data-draft-canvas title="Draft content viewport" sandbox="allow-same-origin" height="900"></iframe></div></dialog></section>';
}
export function setupPlacementPreview({detail,getDraft}) {
  let library=null,search='',width='tablet',trigger=null;
  function render() {
    const s=libraryRouteState(search),data=selectWorkspace(library,{view:s.view,filters:s.filters,...s.options});
    const content=s.view==='graph'?neighborhoodMarkup(library,s.filters.concept,{perspective:s.options.perspective||'exam'}):s.view==='questions'?'<h3>Draft questions</h3>'+data.questions.map(q=>'<article class="panel"><h4>'+e(q.stem)+'</h4><p>'+e(q.questionVersionId)+' · '+e(q.home.kind)+'</p><ol>'+q.options.map(o=>'<li>'+e(o.text)+'</li>').join('')+'</ol></article>').join(''):s.view==='notes'?'<h3>Draft notes</h3>'+data.notes.map(n=>'<article class="panel"><h4>'+e(n.title)+'</h4><p>'+e(n.noteVersionId)+'</p><div class="library-note-body">'+e(n.bodyMarkdown)+'</div></article>').join(''):'';
    const frame=detail.querySelector('[data-draft-canvas]');
    frame.dataset.previewReady='false';frame.setAttribute('aria-busy','true');
    for(const x of detail.querySelectorAll('[data-preview-width]'))x.dataset.previewWidth=width;
    const markup=workspaceFrame({...s,library},content,{search,draft:true});
    frame.onload=()=>{
      if(!library)return;
      const doc=frame.contentDocument;
      for(const key of ['palette','appearance','theme','surfaceStyle'])if(document.documentElement.dataset[key])doc.documentElement.dataset[key]=document.documentElement.dataset[key];
      for(const control of doc.querySelectorAll('[data-cw-toggle],[data-cw-close],[data-cw-more]'))control.hidden=true;
      for(const link of doc.querySelectorAll('a')){
        const u=new URL(link.href,location.origin),v=u.searchParams.get('view');
        if(u.pathname!=='/web/library.html'||!['overview','notes','questions','graph'].includes(v)){link.removeAttribute('href');link.setAttribute('aria-disabled','true');}
      }
      const navigate=value=>{search=new URL(transitionContext(search,value),location.origin).search;render();};
      doc.addEventListener('click',event=>{
        const a=event.target.closest('a[href]');if(a){event.preventDefault();search=new URL(a.href).search;render();return;}
        const b=event.target.closest('button');if(b?.dataset.view)navigate({view:b.dataset.view});
        const g=event.target.closest('[data-graph-concept],[data-graph-question],[data-graph-note]');
        if(g?.dataset.graphConcept)navigate({concept:g.dataset.graphConcept});
        else if(g?.dataset.graphQuestion)navigate({view:'questions'});
        else if(g?.dataset.graphNote)navigate({view:'notes'});
      });
      doc.addEventListener('keydown',event=>{
        if(event.key==='Escape'){detail.querySelector('#draft-preview').close();return;}
        const tab=event.target.closest('[role="tab"]');
        if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
          const tabs=[...tab.parentNode.querySelectorAll('[role="tab"]')],i=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length;
          event.preventDefault();navigate({view:tabs[next].dataset.view});
          frame.addEventListener('load',()=>frame.contentDocument.querySelectorAll('[role="tab"]')[next]?.focus(),{once:true});return;
        }
        if(event.target.matches('[data-graph-concept],[data-graph-question],[data-graph-note]')&&['Enter',' '].includes(event.key)){event.preventDefault();event.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}
      });
      doc.addEventListener('change',event=>{const key=event.target.dataset.cwFacet||event.target.dataset.workspaceOption;if(key)navigate({[key]:event.target.value});});
      doc.addEventListener('submit',event=>{event.preventDefault();if(event.target.matches('[data-cw-search]')){const term=event.target.elements.conceptSearch.value.toLowerCase(),match=library.concepts.find(c=>[c.label,...c.aliases].some(x=>x.toLowerCase().includes(term)));if(match)navigate({concept:match.conceptId});}});
      frame.dataset.previewReady='true';frame.removeAttribute('aria-busy');
    };
    // A script-free same-origin frame supplies a real responsive viewport independent of the admin's device.
    frame.srcdoc='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/web/styles.css"><link rel="stylesheet" href="/web/library.css"><link rel="stylesheet" href="/web/content-workspace.css"><link rel="stylesheet" href="/web/navigation.css"><link rel="stylesheet" href="/web/content-preview-frame.css"></head><body><main class="library-page">'+markup+'</main></body></html>';
  }
  detail.addEventListener('click',event=>{
    const b=event.target.closest('button'),dialog=detail.querySelector('#draft-preview');
    if(b?.hasAttribute('data-draft-preview')){trigger=b;library=draftLibrary(getDraft().manifest);search='?view=overview'+(library.concepts[0]?'&concept='+encodeURIComponent(library.concepts[0].conceptId):'');render();dialog.showModal();}
    if(b?.hasAttribute('data-preview-close'))dialog.close();
    if(b?.dataset.previewSize){width=b.dataset.previewSize;render();}
  });
  detail.addEventListener('close',event=>{if(event.target.id==='draft-preview'){library=null;detail.querySelector('[data-draft-canvas]').srcdoc='';trigger?.focus();}},true);
}
