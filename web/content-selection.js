import {escapeText as e} from './navigation-view.js';
import {selectionItems} from '../src/domain/frozen-content-selections.js';
export function selectionMarkup({items=[],preview=null,pending=null,receipt=null,validation=null,busy=false,error=null}={}){
 return '<section class="review-packet" aria-label="Frozen evidence selection"><h3>Prepare an evidence selection</h3><p>Select up to 100 exact versions with current review evidence. Freezing saves metadata only and does not publish content. Saved evidence can become stale; future release must revalidate it.</p><p>'+e(items.length)+' selected versions</p><ul>'+items.map(x=>'<li>'+e(x.kind+' · '+x.versionId)+'</li>').join('')+'</ul>'+
 (error?'<p role="alert">'+(error==='revalidate'?'Current evidence could not be checked. The saved receipt is unchanged; retry the recheck.':error==='read'?'Saved selection could not be loaded. Retry with the authorized account.':error==='save'?'Save or readback was not confirmed. Retry the same request; do not start a replacement.':'Preview unavailable or evidence changed. Refresh the collection and try again.')+'</p>':'')+
 (busy?'<p role="status">Checking selection…</p>':'')+
 (receipt?'<p role="status">Evidence selection saved: <strong>'+e(receipt.selectionId)+'</strong></p><p>Digest '+e(receipt.digest)+' · catalog v'+e(receipt.catalogVersion)+'</p><p>Snapshot only. Release readiness remains not assessed.</p>':'')+
 (validation&&!busy&&!error?'<div data-selection-revalidation role="status"><strong>'+e(validation.state==='current'?'Current at observation':validation.state==='stale'?'Saved evidence is stale':'Current evidence is blocked')+'</strong><p>Checked '+e(validation.checkedAt)+' · '+e(validation.reasons.join(' · '))+'</p><p>This is not release authorization.</p></div>':'')+
 (!busy&&receipt?'<button type="button" data-selection-revalidate>Recheck saved evidence</button>':'')+
 (preview&&!receipt?'<p>Preview digest '+e(preview.digest)+' · catalog v'+e(preview.catalogVersion)+'</p>':'')+
 (!busy&&error==='read'?'<button type="button" data-selection-reopen>Retry saved selection</button>':'')+
 (!busy?(pending?'<button type="button" data-selection-freeze>Retry same selection save</button>':(items.length&&!receipt?'<button type="button" data-selection-preview>Preview selected evidence</button> ':'')+(preview&&!receipt?'<button type="button" data-selection-freeze>Freeze evidence selection</button> ':'')+(items.length?'<button class="secondary" type="button" data-selection-clear>Clear selection</button>':'')):'')+'</section>';
}
export function mountContentSelection({root,collectionRoot,previewSelection,freezeSelection,readSelection,revalidateSelection,window:win=window,uuid=()=>crypto.randomUUID()}){
 const selected=new Map();let preview=null,pending=null,receipt=null,validation=null,busy=false,error=null,generation=0,disposed=false;
 const items=()=>[...selected.values()];
 const saveLocation=id=>{const url=new URL(win.location.href);url.searchParams.delete('cs_id');if(id)url.searchParams.set('cs_id',id);win.history.replaceState(null,'',url);};
 function sync(){for(const box of collectionRoot.querySelectorAll('[data-selection-item]')){box.checked=selected.has(box.dataset.kind+':'+box.value);box.disabled=busy||!!pending||box.dataset.selectable!=='true';}}
 const render=()=>{if(disposed)return;root.innerHTML=selectionMarkup({items:items(),preview,pending,receipt,validation,busy,error});sync();};
 const observer=new MutationObserver(sync);observer.observe(collectionRoot,{childList:true,subtree:true});
 function change(event){const box=event.target;if(!box.matches('[data-selection-item]'))return;if(busy||pending){sync();return;}const key=box.dataset.kind+':'+box.value;
  if(box.checked){if(selected.size>=100){box.checked=false;return;}selected.set(key,{kind:box.dataset.kind,versionId:box.value});}else selected.delete(key);
  generation++;validation=null;preview=null;receipt=null;error=null;saveLocation(null);render();
 }
 async function click(event){const b=event.target.closest('button');if(!b||busy)return;if(b.hasAttribute('data-selection-reopen')){reopen();return;}
  if(b.hasAttribute('data-selection-revalidate')&&receipt&&revalidateSelection){
   const current=++generation,saved=receipt;busy=true;error=null;validation=null;render();
   try{const value=await revalidateSelection(saved.selectionId);if(disposed||current!==generation)return;
    if(value?.contractId!=='content-selection-revalidation-v1'||value.selectionId!==saved.selectionId||value.frozenDigest!==saved.digest||value.publicationAuthority!==false||value.releaseReadiness!=='not-assessed'||!['current','stale','blocked'].includes(value.state)||!Number.isFinite(Date.parse(value.checkedAt))||!Array.isArray(value.reasons)||value.reasons.some(x=>typeof x!=='string')||value.state==='current'&&(value.reasons.length||value.currentDigest!==saved.digest||value.currentCatalogVersion!==saved.catalogVersion))throw Error('revalidation');validation=value;
   }catch{if(!disposed&&current===generation)error='revalidate';}
   finally{if(!disposed&&current===generation){busy=false;render();}}return;
  }
  if(b.hasAttribute('data-selection-clear')&&!pending){generation++;validation=null;selected.clear();preview=null;receipt=null;error=null;saveLocation(null);render();return;}
  const isPreview=b.hasAttribute('data-selection-preview'),isSave=b.hasAttribute('data-selection-freeze');if(!isPreview&&!isSave)return;
  const current=++generation;busy=true;error=null;
  try{
   if(isPreview){preview=null;const requested=selectionItems(items());render();const value=await previewSelection(requested);if(disposed||current!==generation)return;
    if(value?.contractId!=='content-selection-binding-v1'||value.publicationAuthority!==false||value.releaseReadiness!=='not-assessed'||!Array.isArray(value.items)||JSON.stringify(selectionItems(value.items.map(x=>({kind:x.kind,versionId:x.versionId}))))!==JSON.stringify(requested))throw Error('preview');preview=value;
   }else{
    if(!pending){if(!preview)throw Error('preview');pending={items:selectionItems(items()),requestId:uuid(),expectedDigest:preview.digest,expectedCatalogVersion:preview.catalogVersion};}
    render();const value=await freezeSelection(pending);if(disposed||current!==generation)return;
    if(value?.contractId!=='frozen-content-selection-v1'||value.publicationAuthority!==false||value.requestId!==pending.requestId||value.digest!==pending.expectedDigest||value.catalogVersion!==pending.expectedCatalogVersion||!value.selectionId)throw Error('receipt');receipt=value;validation=null;pending=null;saveLocation(value.selectionId);
   }
  }catch(problem){if(!disposed&&current===generation){const rejected=isSave&&problem?.status===409;if(rejected){pending=null;preview=null;}error=isSave&&!rejected?'save':'preview';}}
  finally{if(!disposed&&current===generation){busy=false;render();}}
 }
 async function reopen(){const id=new URL(win.location.href).searchParams.get('cs_id');if(!id||!readSelection)return;const current=++generation;busy=true;validation=null;render();try{const value=await readSelection(id);if(disposed||current!==generation)return;if(value?.contractId!=='frozen-content-selection-v1'||value.selectionId!==id||value.publicationAuthority!==false)throw Error();selected.clear();for(const x of selectionItems(value.items.map(x=>({kind:x.kind,versionId:x.versionId}))))selected.set(x.kind+':'+x.versionId,x);receipt=value;preview=null;pending=null;error=null;}catch{if(!disposed&&current===generation)error='read';}finally{if(!disposed&&current===generation){busy=false;render();}}}
 collectionRoot.addEventListener('change',change);root.addEventListener('click',click);render();reopen();
 return ()=>{disposed=true;generation++;observer.disconnect();collectionRoot.removeEventListener('change',change);root.removeEventListener('click',click);selected.clear();pending=null;preview=null;receipt=null;validation=null;root.replaceChildren();};
}
