// ADR-134: real managed STAGING Auth negative acceptance with NO credentials.
// Publishable API key is public, not a reviewer token or secret. Never use
// production, staging admin keys, reviewer accounts, writes or generic URLs.
// CI must be PR #374 only; test failure cannot authorize any feature.
// This tests only hosted negative boundaries, NOT signed-JWT positive auth.
const ORIGIN='https://vwtdwafjrraptrgeshzt.supabase.co';
const STAGING_PUBLISHABLE_KEY="sb_publishable_oivLc6grSgYnlKUxMEw07A_ZC2ZYeu0";
const DENIED=new Set([401,403]);
const mark=Object.freeze({
 hostedAuthAnonymousDenied:false,hostedAuthForgedJwtDenied:false,
 hostedAuthenticatedJwtAccepted:false,realReviewerAuthorization:false,
 sourceReviewWritesEnabled:false,sourceRightsApproved:false,
 productionReleaseApproved:false,learnerPublicationApproved:false
});
function encode(value){return Buffer.from(JSON.stringify(value),'utf8').toString('base64url');}
function forgedJwt(){
 const header=encode({alg:'HS256',typ:'JWT'});
 const payload=encode({
  iss:ORIGIN+'/auth/v1',aud:'authenticated',role:'authenticated',
  sub:'11111111-1111-4111-8111-111111111111',
  session_id:'22222222-2222-4222-8222-222222222222',
  exp:Math.floor(Date.now()/1000)+3600
 });
 return header+'.'+payload+'.'+'A'.repeat(43);
}
async function request(authorization,fetcher){
 const r=await fetcher(ORIGIN+'/auth/v1/user',{
  method:'GET',redirect:'error',cache:'no-store',
  signal:AbortSignal.timeout(10000),
  headers:{
   apikey:STAGING_PUBLISHABLE_KEY,
   Accept:'application/json',
   'Cache-Control':'no-store',
   ...(authorization?{Authorization:'Bearer '+authorization}:{})
  }
 });
 if(!Number.isInteger(r?.status))throw Error('invalid_hosted_response');
 return r.status;
}
export async function checkStagingAuthNegative(fetcher=fetch){
 const out={...mark};
 try{
  const unauth=await request(undefined,fetcher);
  out.hostedAuthAnonymousDenied=DENIED.has(unauth);
  if(!out.hostedAuthAnonymousDenied)return Object.freeze(out);
  const forgery=await request(forgedJwt(),fetcher);
  out.hostedAuthForgedJwtDenied=DENIED.has(forgery);
 }catch{/* untrusted transport responses do not grant acceptance */}
 return Object.freeze(out);
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 if(process.argv.length!==3||process.argv[2]!=='--read-only-hosted-negative'){
  console.error('staging_negative_auth_explicit_readonly_flag_required');
  process.exitCode=1;
 }else{
  const result=await checkStagingAuthNegative();
  // No body, JWT, public key, user identity, provider error or tokens logged.
  console.log(JSON.stringify(result));
  if(!result.hostedAuthAnonymousDenied||!result.hostedAuthForgedJwtDenied)
   process.exitCode=1;
 }
}
