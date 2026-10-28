import {validateConceptAcceptance} from '../../../../src/domain/concept-acceptance.js';
const fail=(status,code)=>{throw Object.assign(new Error(code),{status,code});};
export async function acceptConceptDraft({admin,actor,method,params,input}){
 if(method!=='POST')fail(405,'method_not_allowed');
 if(params.size)fail(400,'concept_accept_invalid');
 let checked;try{checked=validateConceptAcceptance(input);}catch{fail(400,'concept_accept_invalid');}
 const {data,error}=await admin.rpc('concept_draft_accept_v1',{p_actor:actor,p_input:checked});
 if(error){
  const codes=['content_admin_required','concept_accept_not_found','concept_accept_request_conflict',
   'concept_accept_stale','concept_already_accepted','concept_accept_target_changed',
   'concept_accept_identity_conflict','concept_accept_revision_requires_release','concept_accept_invalid','concept_accept_catalog_unavailable'];
  const code=codes.find(x=>String(error.message).includes(x));
  fail(code==='content_admin_required'?403:code==='concept_accept_not_found'?404:code==='concept_accept_invalid'?400:
   code==='concept_accept_catalog_unavailable'||!code?503:409,code||'concept_accept_unavailable');
 }
 return data;
}
