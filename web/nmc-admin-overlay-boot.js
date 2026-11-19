// Mounts the Admin-only NMC foundation panel on learner pages. Non-admins get nothing (no panel, no preview request).
import {mountNmcAdminOverlay,conceptFromSearch} from '/web/nmc-admin-overlay.js';
import {createSupabaseAuth} from '/src/adapters/supabase-auth.js';
import {createCloudReview} from '/src/adapters/cloud-review.js';
import {createCloudOwner} from '/src/adapters/cloud-owner.js';
import {cloudConfig} from '/web/cloud-config.js';
const root=document.querySelector('#nmc-admin-overlay');
if(root){
 const auth=createSupabaseAuth(cloudConfig),review=createCloudReview({...cloudConfig,auth}),owner=createCloudOwner({...cloudConfig,auth});
 const vault=document.querySelector('#vault-app');
 mountNmcAdminOverlay({root,auth,readAccess:()=>review.me(),load:filters=>owner.adminLearnerPreview(filters),
  conceptOf:vault?()=>conceptFromSearch(location.search):()=>'',watch:vault});
}
