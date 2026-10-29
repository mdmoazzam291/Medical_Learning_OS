import {mountConceptDraftEditor} from '/web/concept-draft-editor.js';
import {mountSyllabusBaselineEditor} from '/web/syllabus-baseline-editor.js';
import {createSupabaseAuth} from '/src/adapters/supabase-auth.js';
import {createCloudOwner} from '/src/adapters/cloud-owner.js';
import {cloudConfig} from '/web/cloud-config.js';
import {mountCoverage} from '/web/content-coverage.js';
const auth=createSupabaseAuth(cloudConfig),owner=createCloudOwner({...cloudConfig,auth});
const app=document.querySelector('#admin-app');
let mounted=null,dispose=null;
function enhance(){
 const target=app?.dataset.ownerState==='loaded'&&globalThis.mlosNavigationAdmin===true?app.querySelector('#owner-coverage-body'):null;
 if(mounted&&mounted!==target){dispose?.();mounted=null;dispose=null;}
 if(target&&!target.closest('[hidden]')&&target!==mounted){mounted=target;const inventoryDispose=mountCoverage({root:target,loadPage:filters=>owner.contentCoverage(filters)});const editor=app.querySelector('#owner-concept-editor');const editorDispose=editor?mountConceptDraftEditor({root:editor,inspect:input=>owner.conceptDrafts(input),save:input=>owner.saveConceptDraft(input),accept:input=>owner.acceptConceptDraft(input)}):null;const syllabus=app.querySelector('#owner-syllabus-baselines');const syllabusDispose=syllabus?mountSyllabusBaselineEditor({root:syllabus,inspect:input=>owner.syllabusBaselineDrafts(input),save:input=>owner.saveSyllabusBaselineDraft(input),preflight:input=>owner.syllabusReviewPreflight(input)}):null;dispose=()=>{inventoryDispose();editorDispose?.();syllabusDispose?.();};}
}
new MutationObserver(enhance).observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-owner-state']});
window.addEventListener('mlos:admin-ready',enhance);window.addEventListener('mlos:access',enhance);window.addEventListener('hashchange',enhance);enhance();
