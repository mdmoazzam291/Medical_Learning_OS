import { contentPlacement, draftLibrary } from '../src/domain/content-placement.js';
import { libraryRouteState, selectWorkspace } from '../src/domain/library-workspaces.js';
import { transitionContext } from '../src/domain/content-workspace.js';
import { workspaceFrame, neighborhoodMarkup } from './content-workspace-view.js';
import { escapeText as e } from './navigation-view.js';
export function placementMarkup(manifest) {
  const r=contentPlacement(manifest);
  return '<section class="review-packet" id="content-placement"><h3>Content Placement Inspector</h3><p>Draft metadata eligibility · not medical, reference or rights approval. Existing catalog links resolve on the server before publication.</p><div class="table-wrap"><table><thead><tr><th>Artifact / home</th><th>Location checks</th></tr></thead><tbody>'+r.items.map(x=>'<tr><th>'+e(x.id)+'<small> · '+e(x.home)+'</small></th><td><ul>'+x.checks.map(c=>'<li><strong>'+e(c.id)+' · '+e(c.status)+'</strong> — '+e(c.detail)+'</li>').join('')+'</ul></td></tr>').join('')+'</tbody></table></div><button type="button" data-draft-preview>Preview draft as learner</button><dialog id="draft-preview" class="cw-draft-dialog" aria-label="Draft learner preview"><div class="workspace-chips"><button type="button" data-preview-close>Close preview</button><button type="button" data-preview-size="desktop">Desktop · 1440 px</button><button type="button" data-preview-size="tablet">iPad · 1024 px</button></div><p>Draft only · no learner writes or publication. References to existing catalog objects may remain unresolved in this manifest-only preview.</p><div class="cw-preview-viewport" data-preview-width="tablet"><div class="cw-preview-canvas" data-preview-width="tablet" data-draft-canvas></div></div></dialog></section>';
}
export function setupPlacementPreview({detail,getDraft}) {
  let library=null,search='',width='tablet',trigger=null;
  function render() {
    const s=libraryRouteState(search),data=selectWorkspace(library,{view:s.view,filters:s.filters,...s.options});
    const content=s.view==='graph'?neighborhoodMarkup(library,s.filters.concept,{perspective:s.options.perspective||'exam'}):s.view==='questions'?'<h3>Draft questions</h3>'+data.questions.map(q=>'<article class="panel"><h4>'+e(q.stem)+'</h4><p>'+e(q.questionVersionId)+' · '+e(q.home.kind)+'</p><ol>'+q.options.map(o=>'<li>'+e(o.text)+'</li>').join('')+'</ol></article>').join(''):s.view==='notes'?'<h3>Draft notes</h3>'+data.notes.map(n=>'<article class="panel"><h4>'+e(n.title)+'</h4><p>'+e(n.noteVersionId)+'</p><div class="library-note-body">'+e(n.bodyMarkdown)+'</div></article>').join(''):'';
    detail.querySelector('[data-draft-canvas]').innerHTML=workspaceFrame({...s,library},content,{search,draft:true});
    for(const x of detail.querySelectorAll('[data-preview-width]'))x.dataset.previewWidth=width;
    // Only primary concept views and Explorer selections are interactive in this bounded draft renderer.
    for(const control of detail.querySelectorAll('[data-draft-canvas] [data-cw-toggle],[data-draft-canvas] [data-cw-close],[data-draft-canvas] [data-cw-more]'))control.hidden=true;
    for(const link of detail.querySelectorAll('[data-draft-canvas] a')){
      const u=new URL(link.href,location.origin);const v=u.searchParams.get('view');
      if(u.pathname!=='/web/library.html'||!['overview','notes','questions','graph'].includes(v)){link.removeAttribute('href');link.setAttribute('aria-disabled','true');}
    }
  }
  detail.addEventListener('click',event=>{
    const b=event.target.closest('button'),dialog=detail.querySelector('#draft-preview');
    if(b?.hasAttribute('data-draft-preview')){trigger=b;library=draftLibrary(getDraft().manifest);search='?view=overview'+(library.concepts[0]?'&concept='+encodeURIComponent(library.concepts[0].conceptId):'');render();dialog.showModal();}
    if(b?.hasAttribute('data-preview-close'))dialog.close();
    if(b?.dataset.previewSize){width=b.dataset.previewSize;render();}
    if(!event.target.closest('[data-draft-canvas]'))return;
    const a=event.target.closest('a[href]');if(a){event.preventDefault();search=new URL(a.href).search;render();}
    if(b?.dataset.view){search=new URL(transitionContext(search,{view:b.dataset.view}),location.origin).search;render();}
    if(b?.dataset.graphConcept){search=new URL(transitionContext(search,{concept:b.dataset.graphConcept}),location.origin).search;render();}
  });
  detail.addEventListener('change',event=>{if(!event.target.closest('[data-draft-canvas]'))return;const key=event.target.dataset.cwFacet||event.target.dataset.workspaceOption;if(key){search=new URL(transitionContext(search,{[key]:event.target.value}),location.origin).search;render();}});
  detail.addEventListener('submit',event=>{if(event.target.matches('[data-cw-search]')){event.preventDefault();const term=event.target.elements.conceptSearch.value.toLowerCase();const match=library.concepts.find(c=>[c.label,...c.aliases].some(x=>x.toLowerCase().includes(term)));if(match){search=new URL(transitionContext(search,{concept:match.conceptId}),location.origin).search;render();}}});
  detail.addEventListener('close',event=>{if(event.target.id==='draft-preview'){library=null;trigger?.focus();}},true);
}
