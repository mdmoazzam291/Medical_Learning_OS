// Transient pane state only. Canonical selection and shareable filters live in the URL.
export function workspaceControls({root,render,navigate}) {
  let explorerSearch='',explorerLimit=60,graphLimit=30,explorerHidden=false,contextHidden=false,returnFocus=null,movedPane=null;
  const restore=()=>{if(movedPane){const {pane,parent,next}=movedPane;parent.insertBefore(pane,next);movedPane=null;}returnFocus?.focus();};
  function showPane(name,trigger) {
    const threshold=name==='context'?1400:1000;
    if(window.innerWidth>=threshold){if(name==='context')contextHidden=!contextHidden;else explorerHidden=!explorerHidden;render();root.querySelector('[data-cw-toggle="'+name+'"]')?.focus();return;}
    const pane=root.querySelector('[data-workspace-pane="'+name+'"]'),dialog=root.querySelector('#cw-pane-dialog');
    if(!pane||!dialog)return;returnFocus=trigger;movedPane={pane,parent:pane.parentNode,next:pane.nextSibling};
    dialog.querySelector('[data-cw-dialog-body]').append(pane);dialog.showModal();dialog.querySelector('button').focus();
  }
  root.addEventListener('close',event=>{if(event.target.id==='cw-pane-dialog')restore();},true);
  root.addEventListener('submit',event=>{if(event.target.matches('[data-cw-search]')){event.preventDefault();explorerSearch=event.target.elements.conceptSearch.value.trim().slice(0,300);explorerLimit=60;render();root.querySelector('[name="conceptSearch"]')?.focus();}});
  root.addEventListener('change',event=>{if(event.target.dataset.cwFacet)navigate({[event.target.dataset.cwFacet]:event.target.value,concept:''});});
  root.addEventListener('click',event=>{
    const b=event.target.closest('button');
    if(b?.dataset.cwToggle)showPane(b.dataset.cwToggle,b);
    if(b?.dataset.cwClose){const dialog=root.querySelector('#cw-pane-dialog');if(dialog?.open)dialog.close();else{if(b.dataset.cwClose==='context')contextHidden=true;else explorerHidden=true;render();root.querySelector('[data-cw-toggle="'+b.dataset.cwClose+'"]')?.focus();}}
    if(b?.hasAttribute('data-cw-dialog-close'))root.querySelector('#cw-pane-dialog')?.close();
    if(b?.dataset.cwMore){if(b.dataset.cwMore==='concepts')explorerLimit=Math.min(1000,explorerLimit+60);else graphLimit=Math.min(100,graphLimit+20);render();}
    const a=event.target.closest('a');
    if(a&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey&&event.button===0){const url=new URL(a.href,location.origin);if(url.origin===location.origin&&url.pathname==='/web/library.html'){event.preventDefault();const dialog=root.querySelector('#cw-pane-dialog');if(dialog?.open)dialog.close();navigate(null,url.search);root.querySelector('#cw-main')?.focus();}}
  });
  root.addEventListener('keydown',event=>{const tab=event.target.closest('[role="tab"]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const tabs=[...tab.parentNode.querySelectorAll('[role="tab"]')],i=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowLeft'?-1:1)+tabs.length)%tabs.length;event.preventDefault();tabs[next].click();root.querySelectorAll('[role="tab"]')[next]?.focus();});
  return {state:()=>({explorerSearch,explorerLimit,graphLimit,explorerHidden,contextHidden}),beforeRender(){const dialog=root.querySelector('#cw-pane-dialog');if(dialog?.open)dialog.close();movedPane=null;}};
}
