import {validateBaselineDraft} from '../../../../src/domain/syllabus-baseline-drafts.js';
import registry from '../../../../data/preparation-curriculum.js';
const fail=(status,code)=>{throw Object.assign(new Error(code),{status,code});};
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
export async function syllabusBaselineDraftRequest({admin,actor,method,params,baselineId=null,input}){
 if(!['GET','POST'].includes(method)||(method==='POST'&&baselineId))fail(405,'method_not_allowed');
 for(const key of params.keys())if(!['offset','revision'].includes(key)||params.getAll(key).length!==1)fail(400,'syllabus_baseline_invalid');
 if(baselineId&&!uuid(baselineId))fail(400,'syllabus_baseline_invalid');
 let name,args;
 if(method==='GET'){
  const offset=params.get('offset')||'0',revision=params.get('revision');
  if(!/^(0|[1-9]\d{0,4})$/.test(offset)||Number(offset)>50000||
   (revision&&!/^(?:[1-9]\d{0,3}|10000)$/.test(revision))||(!baselineId&&revision)||
   (baselineId&&params.has('offset')))fail(400,'syllabus_baseline_invalid');
  name='syllabus_baseline_draft_inspect_v1';args={p_actor:actor,p_baseline_id:baselineId,p_revision:revision?Number(revision):null,p_offset:Number(offset)};
 }else{
  if(params.size)fail(400,'syllabus_baseline_invalid');
  let checked;try{checked=validateBaselineDraft(input,registry);}catch{fail(400,'syllabus_baseline_invalid');}
  name='syllabus_baseline_draft_save_v1';args={p_actor:actor,p_registry_version:registry.registryVersion,p_input:checked};
 }
 const {data,error}=await admin.rpc(name,args);
 if(error){
  const codes=['content_admin_required','syllabus_baseline_not_found','syllabus_baseline_stale',
   'syllabus_baseline_request_conflict','syllabus_baseline_unknown_concept','syllabus_baseline_invalid','syllabus_baseline_catalog_unavailable'];
  const code=codes.find(x=>String(error.message).includes(x));
  fail(code==='content_admin_required'?403:code==='syllabus_baseline_not_found'?404:code==='syllabus_baseline_invalid'?400:
   code==='syllabus_baseline_catalog_unavailable'||!code?503:409,code||'syllabus_baseline_unavailable');
 }
 return data;
}
