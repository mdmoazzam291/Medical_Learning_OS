/* Trusted, static relay for a sandboxed opaque-origin draft preview.
 * No network calls, credentials, state persistence, publication or access to parent DOM.
 * The parent verifies the frame window and revision and validates every transition.
 */
(() => {
  'use strict';
  const revision=Number(document.documentElement.dataset.previewRevision);
  const send=message=>parent.postMessage({channel:'mlos-draft-preview',revision,...message},'*');
  document.addEventListener('click',event=>{
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
    const field=event.target.dataset.cwFacet||event.target.dataset.workspaceOption;
    if(field)send({kind:'filter',field,value:event.target.value});
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
})();
