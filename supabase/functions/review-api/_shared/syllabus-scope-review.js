import registry from '../../../../data/preparation-curriculum.js';
import {validateScopeReviewDecision,verifyScopeReviewReceipt} from '../../../../src/domain/syllabus-independent-review.js';
const fail=(status,code)=>{throw Object.assign(new Error(code),{status,code});};
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const known=['syllabus_scope_reviewer_not_authorized','syllabus_scope_self_review_blocked','syllabus_baseline_not_found',
 'syllabus_scope_review_stale','syllabus_scope_review_request_conflict','syllabus_scope_review_already_recorded',
 'syllabus_scope_review_empty','syllabus_scope_private_identity_unverified',
 'syllabus_scope_review_invalid'];
function err(error){
 const code=known.find(x=>String(error?.message||'').includes(x));
 fail(code?.includes('not_authorized')||code==='syllabus_scope_self_review_blocked'?403:
      code==='syllabus_baseline_not_found'?404:
      code==='syllabus_scope_review_invalid'?400:
      code?409:503,code||'syllabus_scope_review_unavailable');
}
export async function syllabusScopeReviewRequest({admin,reviewerId,method,baselineId,params,input}){
 if(!uuid(baselineId)||!['GET','POST'].includes(method))fail(400,'syllabus_scope_review_invalid');
 if(method==='GET'){
   if(params.size!==1||params.getAll('revision').length!==1||
      !/^(?:[1-9]\d{0,3}|10000)$/.test(params.get('revision')||''))fail(400,'syllabus_scope_review_invalid');
   const {data,error}=await admin.rpc('syllabus_scope_review_inspect_v1',{
      p_reviewer:reviewerId,p_baseline_id:baselineId,p_revision:Number(params.get('revision'))});
   if(error)err(error);
   if(data?.contractId!=='syllabus-scope-review-target-v1'||data.baselineId!==baselineId||
     data.reviewerId!==reviewerId||data.officialSyllabusCertified!==false||
     data.curriculumActivated!==false||data.learnerRelease!==false||
     typeof data.privateIdentityVerified!=='boolean'||!Array.isArray(data.privateIdentities)||
     !Array.isArray(data.document?.conceptIds)||data.document.conceptIds.length>2000||
     (data.privateIdentityVerified===false&&data.canReview!==false)||
     data.privateIdentities.some(item=>!item||typeof item.conceptId!=='string'||
       !data.document.conceptIds.includes(item.conceptId)||
       !/^[a-f0-9]{64}$/.test(item.identityDigest)||
       item.identity?.conceptId!==item.conceptId||
       typeof item.identity?.label!=='string'||!Array.isArray(item.identity?.aliases)||
       !item.identity?.classification)||
     new Set(data.privateIdentities.map(item=>item.conceptId)).size!==data.privateIdentities.length)
     fail(503,'syllabus_scope_review_unavailable');
   return data;
 }
 if(params.size)fail(400,'syllabus_scope_review_invalid');
 let payload;try{payload=validateScopeReviewDecision(input);}catch{fail(400,'syllabus_scope_review_invalid');}
 if(payload.baselineId!==baselineId)fail(400,'syllabus_scope_review_invalid');
 const {data,error}=await admin.rpc('syllabus_scope_review_decide_v1',{
  p_reviewer:reviewerId,p_registry_version:registry.registryVersion,p_input:payload});
 if(error)err(error);
 if(!verifyScopeReviewReceipt(data,payload,reviewerId))fail(503,'syllabus_scope_review_unavailable');
 return data;
}
