import {mountContentSelection} from '/web/content-selection.js';
import {createSupabaseAuth} from '/src/adapters/supabase-auth.js';
import {createCloudOwner} from '/src/adapters/cloud-owner.js';
import {cloudConfig} from '/web/cloud-config.js';
import {mountApprovedCollection} from '/web/approved-collection.js';
const auth=createSupabaseAuth(cloudConfig),owner=createCloudOwner({...cloudConfig,auth});
const app=document.querySelector('#admin-app');
let mounted=null,dispose=null;
function enhance(){
 const target=app?.dataset.ownerState==='loaded'&&globalThis.mlosNavigationAdmin===true?app.querySelector('#owner-approved-collection-body'):null;
 if(mounted&&mounted!==target){dispose?.();mounted=null;dispose=null;}
 if(target&&!target.closest('[hidden]')&&target!==mounted){mounted=target;const stopCollection=mountApprovedCollection({root:target,loadPage:filters=>owner.approvedCollection(filters)});
 const stopSelection=mountContentSelection({root:app.querySelector('#owner-content-selection-body'),collectionRoot:target,revalidateSelection:id=>owner.revalidateContentSelection(id),readSelection:id=>owner.readContentSelection(id),previewSelection:items=>owner.previewContentSelection(items),freezeSelection:input=>owner.freezeContentSelection(input)});
 dispose=()=>{stopSelection();stopCollection();};}
}
new MutationObserver(enhance).observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','data-owner-state']});
window.addEventListener('mlos:admin-ready',enhance);window.addEventListener('mlos:access',enhance);window.addEventListener('hashchange',enhance);enhance();
