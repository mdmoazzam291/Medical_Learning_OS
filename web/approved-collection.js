import {approvedCollectionMarkup} from './approved-collection-view.js';
export function mountApprovedCollection({root,loadPage,window:win=window}) {
 const fields=['search','kind','state','offset'];let filters={},generation=0,disposed=false;
 const fromUrl=()=>Object.fromEntries(fields.flatMap(k=>{const v=new URL(win.location.href).searchParams.get('ac_'+k);return v?[[k,v]]:[];}));
 async function load(next=fromUrl(),push=false){
  filters={...next};if(push){const url=new URL(win.location.href);for(const k of fields){url.searchParams.delete('ac_'+k);if(filters[k])url.searchParams.set('ac_'+k,filters[k]);}win.history.pushState(null,'',url);}
  const current=++generation;root.innerHTML=approvedCollectionMarkup(null,filters,{loading:true});
  try{const page=await loadPage({...filters});if(disposed||current!==generation)return;if(page?.contractId!=='admin-approved-collection-v1'||page.publicationAuthority!==false||page.releaseReadiness!=='not-assessed'||!page.summary||!Array.isArray(page.rows))throw Error('invalid_collection');root.innerHTML=approvedCollectionMarkup(page,filters);}
  catch(error){if(!disposed&&current===generation)root.innerHTML=approvedCollectionMarkup(null,filters,{error:Number(error?.status)||503});}
 }
 const submit=event=>{if(!event.target.matches('[data-collection-filters]'))return;event.preventDefault();load({...Object.fromEntries(new FormData(event.target)),offset:'0'},true);};
 const click=event=>{const b=event.target.closest('button');if(!b)return;if(b.hasAttribute('data-collection-refresh'))load(filters);else if(b.hasAttribute('data-collection-next'))load({...filters,offset:b.dataset.collectionNext},true);else if(b.hasAttribute('data-collection-prev'))load({...filters,offset:String(Math.max(0,Number(filters.offset||0)-50))},true);};
 const pop=()=>load();root.addEventListener('submit',submit);root.addEventListener('click',click);win.addEventListener('popstate',pop);load();
 return ()=>{disposed=true;generation++;root.removeEventListener('submit',submit);root.removeEventListener('click',click);win.removeEventListener('popstate',pop);root.replaceChildren();};
}
