import {validateScopeReviewerGrant} from '../../../../src/domain/syllabus-independent-review.js';
const fail=(status,code)=>{throw Object.assign(new Error(code),{status,code});};
export async function saveSyllabusScopeReviewerGrant({admin,actor,input}){
 let payload;try{payload=validateScopeReviewerGrant(input);}catch{fail(400,'syllabus_scope_grant_invalid');}
 // Production service_role cannot SELECT auth.users. Verify an actual existing
 // Supabase Auth identity using the server-only Admin API, not an SQL grant.
 // Revocation must still work even if the reviewer account was deleted.
 if(payload.action==='grant'){
  let identity;
  try{identity=await admin.auth.admin.getUserById(payload.reviewerUserId);}
  catch{fail(503,'syllabus_scope_reviewer_lookup_unavailable');}
  if(identity?.error){
   if(identity.error.status===404||identity.error.code==='user_not_found')
    fail(400,'syllabus_scope_reviewer_unknown');
   fail(503,'syllabus_scope_reviewer_lookup_unavailable');
  }
  if(identity?.data?.user?.id!==payload.reviewerUserId)
   fail(400,'syllabus_scope_reviewer_unknown');
 }
 const {data,error}=await admin.rpc('syllabus_scope_reviewer_grant_v1',{p_actor:actor,p_input:payload});
 if(error){
  const codes=['content_admin_required','syllabus_baseline_not_found','syllabus_scope_self_review_blocked',
   'syllabus_scope_reviewer_unknown','syllabus_scope_grant_state_conflict','syllabus_scope_grant_request_conflict','syllabus_scope_grant_invalid'];
  const code=codes.find(v=>String(error.message).includes(v));
  fail(code==='content_admin_required'||code==='syllabus_scope_self_review_blocked'?403:
    code==='syllabus_baseline_not_found'?404:
    code==='syllabus_scope_grant_state_conflict'||code==='syllabus_scope_grant_request_conflict'?409:
    code==='syllabus_scope_grant_invalid'?400:503,code||'syllabus_scope_grant_unavailable');
 }
 if(data?.contractId!=='syllabus-scope-grant-event-v1'||data.baselineId!==payload.baselineId||
    data.reviewerUserId!==payload.reviewerUserId||data.action!==payload.action||data.learnerRelease!==false)
  fail(503,'syllabus_scope_grant_unavailable');
 return data;
}
