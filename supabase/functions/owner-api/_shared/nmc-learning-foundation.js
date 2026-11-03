import pack from '../../../../data/nmc-learning-foundation-drafts.json' with {type:'json'};
import catalogue from '../../../../data/nmc-reference-catalogue.json' with {type:'json'};
import {foundationDraftPage,parseFoundationFilters} from '../../../../src/domain/nmc-learning-foundation.js';
const fail=(status,code)=>{throw Object.assign(new Error(code),{status,code});};
export async function readFoundationDrafts({admin,actor,method,params}){
 if(method!=='GET')fail(405,'method_not_allowed');
 let filters;
 try{
  if([...params.keys()].some(k=>params.getAll(k).length!==1))throw new Error();
  filters=parseFoundationFilters(Object.fromEntries(params));
  if(filters.subject&&!catalogue.references.some(r=>r.subjectId===filters.subject))throw new Error();
 }catch{fail(400,'foundation_filter_invalid');}
 const role=await admin.rpc('content_admin_status_v1',{p_user:actor});
 if(role.error)fail(503,'foundation_drafts_unavailable');
 if(role.data?.isAdmin!==true)fail(403,'content_admin_required');
 const result=await admin.from('study_catalog').select('version,body').eq('id',1).single();
 if(result.error||!result.data)fail(503,'foundation_drafts_unavailable');
 // Return the bounded Admin DTO; no source/question/note bodies or learner data.
 const concepts=result.data.body?.concepts;
 try{return await foundationDraftPage(pack,catalogue,{version:result.data.version,concepts:Array.isArray(concepts)?concepts.map(c=>({conceptId:c.conceptId,label:c.label,aliases:c.aliases||[],subjectTags:c.subjectTags})):null},filters);}
 catch{fail(503,'foundation_drafts_unavailable');}
}
