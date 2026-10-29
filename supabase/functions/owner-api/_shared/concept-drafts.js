import {validateConceptDraft} from '../../../../src/domain/concept-drafts.js';
const fail=(status,code)=>{throw Object.assign(new Error(code),{status,code});};
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
export async function conceptDraftRequest({admin,actor,method,params,proposalId=null,input}){
 if(!['GET','POST'].includes(method)||(method==='POST'&&proposalId))fail(405,'method_not_allowed');
 for(const key of params.keys())if(!['offset','revision'].includes(key)||params.getAll(key).length!==1)fail(400,'concept_draft_invalid');
 if(proposalId&&!uuid(proposalId))fail(400,'concept_draft_invalid');
 let args,name;
 if(method==='GET'){
  const offset=params.get('offset')||'0',revision=params.get('revision');
  if(!/^(0|[1-9]\d{0,4})$/.test(offset)||Number(offset)>50000||(revision&&!/^[1-9]\d{0,3}$|^10000$/.test(revision))||(!proposalId&&revision)||(proposalId&&params.has('offset')))fail(400,'concept_draft_invalid');
  name='concept_draft_inspect_v1';args={p_actor:actor,p_proposal_id:proposalId,p_revision:revision?Number(revision):null,p_offset:Number(offset)};
 }else{
  if(params.size)fail(400,'concept_draft_invalid');let checked;try{checked=validateConceptDraft(input);}catch{fail(400,'concept_draft_invalid');}name='concept_draft_save_v1';args={p_actor:actor,p_input:checked};
 }
 const {data,error}=await admin.rpc(name,args);
 if(error){const code=['content_admin_required','concept_draft_not_found','concept_draft_request_conflict','concept_draft_stale','concept_draft_target_changed','concept_draft_invalid'].find(x=>String(error.message).includes(x));fail(code==='content_admin_required'?403:code==='concept_draft_not_found'?404:code==='concept_draft_invalid'?400:code?409:503,code||'concept_draft_unavailable');}
 return data;
}
