// Callback assertions only; real hosted evidence requires the trusted network CLI/operator.
import {normalizeLearnerCode,validAuthUserId} from '../../ops/prototypes/learner-identity/learner-code.js';
export async function probeLearnerIdentitySessions(input){
 let attemptedWrites=false;
 const result=(status,reason)=>Object.freeze({status,reason,signedInAssertionsPassed:status==='passed',cleanupVerified:false,requiresOperatorCleanup:attemptedWrites,requiresManualReconciliation:attemptedWrites&&status!=='passed',hostedEvidenceAttested:false,productionChanged:false});
 let tokens,expectedIds,verifyIdentity,request;
 try{
  tokens=[...input.tokens];expectedIds=[...input.expectedIds].map(x=>typeof x==='string'?x.toLowerCase():x);verifyIdentity=input.verifyIdentity;request=input.request;
  if(tokens.length!==2||new Set(tokens).size!==2||tokens.some(t=>typeof t!=='string'||!t||t.length>10000)||expectedIds.length!==2||new Set(expectedIds).size!==2||!expectedIds.every(validAuthUserId)||typeof verifyIdentity!=='function'||typeof request!=='function')return result('blocked','invalid_operator_inputs');
  const verified=[];
  for(let i=0;i<2;i++){
   const u=await verifyIdentity(tokens[i]);
   if(!validAuthUserId(u?.id)||u.id.toLowerCase()!==expectedIds[i]||typeof u.email!=='string'||!u.email.endsWith('@example.invalid')||u.app_metadata?.mlos_staging_synthetic!==true)return result('blocked','synthetic_identity_ownership_unverified');
   verified.push(u.id.toLowerCase());
  }
  if(new Set(verified).size!==2)return result('blocked','distinct_identity_required');
 }catch{return result('blocked','identity_verification_unavailable');}
 const assert=v=>{if(!v)throw Error('assertion_failed');};
 function codeFrom(r,assignedOnly=false){
  assert(r?.status===200&&r.privateResponse===true&&r.body?.contractId==='learner-identity-self-v1');
  const b=r.body;assert(Object.keys(b).sort().join(',')==='contractId,learnerCode,status');
  if(b.status==='not_assigned'){assert(!assignedOnly&&b.learnerCode===null);return null;}
  assert(b.status==='assigned'&&typeof b.learnerCode==='string');assert(normalizeLearnerCode(b.learnerCode)===b.learnerCode);return b.learnerCode;
 }
 try{
  const codes=[];
  for(let i=0;i<2;i++){
   const req=(path,method='GET')=>request({token:tokens[i],path,method});
   const before=codeFrom(await req('/me'));
   attemptedWrites=true;const assigned=codeFrom(await req('/ensure','POST'),true);assert(before===null||before===assigned);
   assert(codeFrom(await req('/ensure','POST'),true)===assigned);
   assert(codeFrom(await req('/me'),true)===assigned);codes.push(assigned);
   const denied=await req('/me?auth_user_id=forbidden-target');
   assert(denied?.status===400&&denied.privateResponse===true&&denied.body?.error==='query_not_supported'&&denied.body?.learnerCode===undefined);
  }
  assert(codes[0]!==codes[1]);
  const anon=await request({token:null,path:'/me',method:'GET'});assert(anon?.status===401&&anon.privateResponse===true&&anon.body?.error==='unauthorized'&&anon.body?.learnerCode===undefined);
  return result('passed','self_only_issuance_retry_readback_assertions_passed');
 }catch{return result('failed','acceptance_assertion_failed');}
}
