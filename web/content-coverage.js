import {coverageMarkup} from './content-coverage-view.js';
const fields=['subject','system','search','home','exam','year','task','state','gap','cursor','limit','snapshot'];
export function mountCoverage({root,loadPage,window:win=window}) {
 let page=null,selection={},generation=0,disposed=false;
 const fromUrl=()=>Object.fromEntries(fields.flatMap(key=>{const v=new URL(win.location.href).searchParams.get('cv_'+key);return v?[[key,v]]:[];}));
 const urlFor=values=>{const url=new URL(win.location.href);for(const key of fields){url.searchParams.delete('cv_'+key);if(values[key])url.searchParams.set('cv_'+key,String(values[key]));}return url;};
 const updateUrl=(values,replace=false)=>win.history[replace?'replaceState':'pushState'](null,'',urlFor(values));
 async function load(next=fromUrl(),{history=false,replace=false}={}){
  selection={...next};if(history)updateUrl(selection,replace);
  const current=++generation;
  root.innerHTML=coverageMarkup(page,selection,{loading:true});
  try{
   const result=await loadPage({...selection});
   if(disposed||current!==generation)return;
   if(result?.contractId!=='admin-content-coverage-v1'||!Array.isArray(result.rows)||!result.summary||!result.facets)throw new Error('coverage_response_invalid');
   page=result;selection={...selection,snapshot:result.snapshotId};updateUrl(selection,true);root.innerHTML=coverageMarkup(page,selection);
  }catch(error){if(!disposed&&current===generation){root.innerHTML=coverageMarkup(page,selection,{error:Number(error?.status)||503});}}
 }
 function submit(event){if(!event.target.matches('[data-coverage-filters]'))return;event.preventDefault();const values={...selection,cursor:'0'};for(const [key,value] of new FormData(event.target))values[key]=String(value);load(values,{history:true});}
 function click(event){const button=event.target.closest('button');if(!button)return;
  if(button.hasAttribute('data-coverage-refresh')){const {snapshot,...rest}=selection;load({...rest,cursor:'0'},{history:true});}
  else if(button.hasAttribute('data-coverage-retry'))load(selection);
  else if(button.hasAttribute('data-coverage-clear'))load({snapshot:selection.snapshot},{history:true});
  else if(button.hasAttribute('data-coverage-next'))load({...selection,cursor:button.dataset.coverageNext},{history:true});
  else if(button.hasAttribute('data-coverage-prev'))load({...selection,cursor:String(Math.max(0,Number(selection.cursor||0)-Number(selection.limit||50)))},{history:true});
 }
 const pop=()=>load();root.addEventListener('submit',submit);root.addEventListener('click',click);win.addEventListener('popstate',pop);load();
 return ()=>{disposed=true;generation++;root.removeEventListener('submit',submit);root.removeEventListener('click',click);win.removeEventListener('popstate',pop);root.replaceChildren();};
}
