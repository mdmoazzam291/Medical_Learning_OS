import registry from '../../../../data/preparation-curriculum.js';
import {alignSyllabusReviewPacket} from '../../../../src/domain/syllabus-review-preflight.js';
const fail=(status,code)=>{throw Object.assign(new Error(code),{status,code});};
const uuid=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s);
export async function readSyllabusReviewPreflight({admin,actor,method,params,baselineId}){
 if(method!=='GET')fail(405,'method_not_allowed');
 if(!uuid(baselineId)||params.size!==1||params.getAll('revision').length!==1||
  !/^(?:[1-9]\d{0,3}|10000)$/.test(params.get('revision')||''))fail(400,'syllabus_review_preflight_invalid');
 const {data,error}=await admin.rpc('syllabus_baseline_review_preflight_v1',{
  p_actor:actor,p_baseline_id:baselineId,p_revision:Number(params.get('revision'))});
 if(error){
  const codes=['content_admin_required','syllabus_baseline_not_found','syllabus_review_preflight_invalid','syllabus_baseline_catalog_unavailable'];
  const code=codes.find(c=>String(error.message).includes(c));
  fail(code==='content_admin_required'?403:code==='syllabus_baseline_not_found'?404:
   code==='syllabus_review_preflight_invalid'?400:503,code||'syllabus_review_preflight_unavailable');
 }
 try{return alignSyllabusReviewPacket(data,registry);}
 catch{fail(503,'syllabus_review_preflight_unavailable');}
}
