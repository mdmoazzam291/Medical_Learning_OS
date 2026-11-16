import {mountFoundationReview} from '/web/nmc-foundation-review.js';
import {mountConceptDraftEditor} from '/web/concept-draft-editor.js';
import {mountSyllabusBaselineEditor} from '/web/syllabus-baseline-editor.js';
import {createSupabaseAuth} from '/src/adapters/supabase-auth.js';
import {createCloudOwner} from '/src/adapters/cloud-owner.js';
import {cloudConfig} from '/web/cloud-config.js';
import {mountCoverage} from '/web/content-coverage.js';
const auth=createSupabaseAuth(cloudConfig),owner=createCloudOwner({...cloudConfig,auth});
const app=document.querySelector('#admin-app');
const mounts=new Map();
function reconcile(selector,mount){
 const root=app?.dataset.ownerState==='loaded'&&globalThis.mlosNavigationAdmin===true?app.querySelector(selector):null;
 const target=root&&!root.closest('[hidden]')?root:null;
 const current=mounts.get(selector);
 if(current?.root===target)return;
 if(current){mounts.delete(selector);current.dispose();}
 if(target)mounts.set(selector,{root:target,dispose:mount(target)});
}
function enhance(){
 reconcile('#owner-coverage-body',root=>mountCoverage({root,loadPage:filters=>owner.contentCoverage(filters)}));
 reconcile('#owner-concept-editor',root=>mountConceptDraftEditor({root,inspect:input=>owner.conceptDrafts(input),save:input=>owner.saveConceptDraft(input),accept:input=>owner.acceptConceptDraft(input)}));
 reconcile('#owner-syllabus-baselines',root=>mountSyllabusBaselineEditor({root,inspect:input=>owner.syllabusBaselineDrafts(input),save:input=>owner.saveSyllabusBaselineDraft(input),preflight:input=>owner.syllabusReviewPreflight(input)}));
 reconcile('#owner-foundation-objectives',root=>mountFoundationReview({root,load:filters=>owner.foundationObjectiveDrafts(filters),identity:async()=>globalThis.mlosNavigationAdmin===true?(await auth.getSession())?.user?.id||null:null}));
}
new MutationObserver(enhance).observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-owner-state']});
window.addEventListener('mlos:admin-ready',enhance);window.addEventListener('mlos:access',enhance);window.addEventListener('hashchange',enhance);enhance();
