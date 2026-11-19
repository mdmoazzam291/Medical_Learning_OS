// Admin-only NMC foundation panel for learner pages (Library, NMC topics, Vault).
// Shown only after the server confirms the signed-in user is an Admin; data comes from the
// Admin-gated nmc-admin-preview function, which refuses everyone else. Nothing is published to learners.
// Data loads only when the Admin opens the panel.
import {mountLearnerPreview} from './nmc-admin-learner-preview.js';
import {resolveAdminAccess} from './navigation-access.js';

export const OVERLAY_CONCEPT_ID=/^C-[0-9A-Za-z-]{1,80}$/;
export function overlaySummary(conceptId){
 return conceptId?'NMC foundation for this concept · Admin preview (AI draft)':'NMC foundation · Admin preview (AI draft)';
}
export function conceptFromSearch(search){
 const id=new URLSearchParams(search||'').get('concept')||'';
 return OVERLAY_CONCEPT_ID.test(id)?id:'';
}
// root: an empty, hidden <section>. conceptOf: () => concept ID to focus ('' = full browser).
export async function mountNmcAdminOverlay({root,auth,readAccess,load,conceptOf=()=>'',watch=null,window:win=window}){
 if(!root||!auth?.currentUser?.())return ()=>{};
 if(!(await resolveAdminAccess(readAccess)))return ()=>{};
 const identity=async()=>(await auth.getSession())?.user?.id||null;
 let dispose=null,mountedFor=null,observer=null;
 root.hidden=false;root.classList.add('nmc-admin-overlay');
 root.innerHTML='<details><summary></summary><div data-overlay-body></div></details>';
 const details=root.querySelector('details'),summary=root.querySelector('summary'),body=root.querySelector('[data-overlay-body]');
 const unmount=()=>{dispose?.();dispose=null;mountedFor=null;body.replaceChildren();};
 const sync=()=>{
  const concept=conceptOf()||'';
  summary.textContent=overlaySummary(concept);
  if(!details.open){if(mountedFor!==null&&mountedFor!==concept)unmount();return;}
  if(mountedFor===concept)return;
  unmount();mountedFor=concept;
  dispose=mountLearnerPreview({root:body,load,identity,window:win,initial:concept?{view:'concept',concept}:{view:'concept'}});
 };
 details.addEventListener('toggle',sync);
 if(watch){observer=new MutationObserver(sync);observer.observe(watch,{childList:true,subtree:true});}
 sync();
 return ()=>{observer?.disconnect();details.removeEventListener('toggle',sync);unmount();root.replaceChildren();root.hidden=true;};
}
