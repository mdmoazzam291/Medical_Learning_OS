import {loadFoundationData} from './foundation-data.js';
import {validateIdentityEdit,validateObjectiveEdit,sha256Text} from '../../../../src/domain/foundation-edits.js';
const fail=(status,code)=>{throw Object.assign(new Error(code),{status,code});};
const mapError=(error,codes,invalid)=>{
 const code=codes.find(x=>String(error?.message).includes(x));
 fail(code==='content_admin_required'?403:code?.endsWith('_not_found')?404:code===invalid?400:code?409:503,code||invalid.replace('_invalid','_unavailable'));
};
export async function editConceptIdentity({admin,actor,method,params,input}){
 if(method!=='POST')fail(405,'method_not_allowed');
 if(params.size)fail(400,'concept_edit_invalid');
 let checked;try{checked=validateIdentityEdit(input);}catch{fail(400,'concept_edit_invalid');}
 const {data,error}=await admin.rpc('concept_identity_edit_v1',{p_actor:actor,p_input:checked});
 if(error)mapError(error,['content_admin_required','concept_edit_not_found','concept_edit_request_conflict','concept_edit_stale','concept_edit_no_change',
  'concept_edit_identity_conflict','concept_edit_learner_visible','concept_edit_invalid'],'concept_edit_invalid');
 return data;
}
// The registry wording is revision 0. The first edit must start from it; later edits from the latest revision
// (the database enforces the latter). Objectives outside the pinned registry cannot be edited.
export async function editObjectiveWording({admin,actor,method,params,input}){
 if(method!=='POST')fail(405,'method_not_allowed');
 if(params.size)fail(400,'objective_edit_invalid');
 let checked;try{checked=validateObjectiveEdit(input);}catch{fail(400,'objective_edit_invalid');}
 let pack;try{({pack}=await loadFoundationData());}catch{fail(503,'objective_edit_unavailable');}
 const row=pack.objectives.find(r=>r.objective.objectiveVersionId===checked.objectiveVersionId);
 if(!row)fail(404,'objective_edit_not_found');
 const latest=await admin.from('foundation_objective_current_wordings').select('wording_sha256').eq('objective_version_id',checked.objectiveVersionId).maybeSingle();
 if(latest.error)fail(503,'objective_edit_unavailable');
 const current=latest.data?.wording_sha256||await sha256Text(row.wording);
 if(checked.baseWordingSha256!==current)fail(409,'objective_edit_stale');
 const {data,error}=await admin.rpc('foundation_objective_revision_v1',{p_actor:actor,p_input:checked});
 if(error)mapError(error,['content_admin_required','objective_edit_request_conflict','objective_edit_stale','objective_edit_no_change','objective_edit_invalid'],'objective_edit_invalid');
 return data;
}
