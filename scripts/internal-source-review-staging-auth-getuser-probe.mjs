// ADR-134: pre-existing, explicitly supplied STAGING JWT -> Auth getUser.
// NO signup, refresh, signout, writes, migrations, source review or credential logging.
// Executable only by explicit --read-only with all strict staging env variables.
// A successful probe is Auth read-only evidence, NEVER production review authority.
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const STAGING_REF='vwtdwafjrraptrgeshzt';
const PRODUCTION_REF='iyapppmeieqhflnzslao';
const LEGACY_REF='ueuguguoladoqvtxkumt';
const ORIGIN='https://vwtdwafjrraptrgeshzt.supabase.co';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const JWT=/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+$/;
const identity=value=>typeof value==='string'&&UUID.test(value);
const output=(reason,verified=false,negative=false)=>Object.freeze({
 reason,metadataOnly:false,
 hostedAuthGetUserChecked:verified,
 anonymousGetUserDenied:negative,
 forgedJwtDenied:negative,
 hostedJwtReadOnlyEvidence:verified&&negative,
 productionSourceReviewApproved:false,
 managedMigrationApproved:false,
 stagingSourceReviewWriteApproved:false,
 stagingReaderRpcApproved:false,
 reviewerGrantAuthorityVerified:false,
 transactionalProviderSignoutVerified:false,
 readbackReceiptVerified:false,
 clinicalApproved:false,
 rightsApproved:false,
 examScopeApproved:false,
 learnerRelease:false,
 automaticWriteRetryAllowed:false
});
const own=(v,k)=>{
 try {
  if(!v||typeof v!=='object'||Array.isArray(v)||
     ![Object.prototype,null].includes(Object.getPrototypeOf(v)))return undefined;
  const d=Object.getOwnPropertyDescriptor(v,k);
  return d?.enumerable&&Object.hasOwn(d,'value')?d.value:undefined;
 }catch{return undefined;}
};
function parseToken(token){
 if(typeof token!=='string'||token.length<150||token.length>8192||
    !JWT.test(token))throw Error('token-invalid');
 const [header64,payload64,signature64]=token.split('.');
 if(signature64.length<20)throw Error('token-invalid');
 const header=JSON.parse(Buffer.from(header64,'base64url').toString('utf8'));
 const payload=JSON.parse(Buffer.from(payload64,'base64url').toString('utf8'));
 if(!['RS256','ES256','HS256'].includes(own(header,'alg'))||
  own(payload,'iss')!==ORIGIN+'/auth/v1'||
  own(payload,'aud')!=='authenticated'||
  own(payload,'role')!=='authenticated'||
  !identity(own(payload,'sub'))||!identity(own(payload,'session_id'))||
  !Number.isSafeInteger(own(payload,'exp'))||
  own(payload,'exp')<=Math.floor(Date.now()/1000)+30)
  throw Error('claims-invalid');
 return {header64,payload64,signature64,payload};
}
function validateConfig(config,policy){
 try{
  if(own(policy,'approvedStagingProjectRef')!==STAGING_REF||
   own(policy,'productionProjectRef')!==PRODUCTION_REF||
   !Array.isArray(own(policy,'excludedLegacyProjectRefs'))||
   !policy.excludedLegacyProjectRefs.includes(LEGACY_REF)||
   own(policy,'requiredStagingProjectName')!=='medical_learning_os_staging'||
   own(policy,'requiresExplicitOwnerApproval')!==true)
   return null;
  if(own(config,'MLOS_STAGING_READONLY_CONFIRM')!=='STAGING_AUTH_GETUSER_NO_WRITES'||
   own(config,'MLOS_STAGING_REF')!==STAGING_REF||
   own(config,'MLOS_STAGING_URL')!==ORIGIN||
   !identity(own(config,'MLOS_STAGING_TEST_USER_ID'))||
   !identity(own(config,'MLOS_STAGING_TEST_SESSION_ID')))
   return null;
  const key=own(config,'MLOS_STAGING_PUBLISHABLE_KEY');
  if(typeof key!=='string'||!/^sb_publishable_[a-zA-Z0-9_-]{12,}$/.test(key)||
   key.length>256)return null;
  const token=own(config,'MLOS_STAGING_TEST_ACCESS_TOKEN');
  const parsed=parseToken(token);
  if(parsed.payload.sub!==config.MLOS_STAGING_TEST_USER_ID||
     parsed.payload.session_id!==config.MLOS_STAGING_TEST_SESSION_ID)
   return null;
  return {key,token,parsed};
 }catch{return null;}
}
/**
 * No network can occur until config, project policy and token shape match.
 * The local claims are UNTRUSTED. The hosted Auth GET /user response must
 * verify the token, and forged/anonymous calls must be denied.
 * No refresh token or password is accepted by this contract.
 */
export async function probeStagingAuthGetUser(config,policy,fetcher=fetch){
 const valid=validateConfig(config,policy);
 if(!valid||typeof fetcher!=='function')return output('staging-probe-not-configured');
 const url=ORIGIN+'/auth/v1/user';
 const headers={apikey:valid.key,'Cache-Control':'no-store'};
 async function request(authorization){
  const response=await fetcher(url,{
   method:'GET',
   redirect:'error',
   cache:'no-store',
   signal:AbortSignal.timeout(10000),
   headers:authorization?{...headers,Authorization:'Bearer '+authorization}:headers
  });
  if(!Number.isInteger(response?.status))throw Error('invalid-response');
  return response;
 }
 try{
  const positive=await request(valid.token);
  if(positive.status!==200)return output('staging-token-not-verified');
  const user=await positive.json();
  if(own(user,'id')!==valid.parsed.payload.sub||
     user.id!==config.MLOS_STAGING_TEST_USER_ID)
   return output('staging-auth-user-mismatch');
  const anonymous=await request(null);
  if(anonymous.status<400||anonymous.status>499)
   return output('staging-anonymous-not-denied',true);
  // Re-encode a DIFFERENT JWT payload but retain the original signature.
  // This guarantees signature invalidity without changing user information.
  const tamperedBody={...valid.parsed.payload,mlos_staging_tamper:'unsigned-change'};
  const forged=valid.parsed.header64+'.'+
   Buffer.from(JSON.stringify(tamperedBody)).toString('base64url')+'.'+
   valid.parsed.signature64;
  const denied=await request(forged);
  if(denied.status<400||denied.status>499)
   return output('staging-tampered-jwt-not-denied',true);
  return output('staging-auth-getuser-readonly-pass',true,true);
 }catch{
  return output('staging-auth-request-unavailable');
 }
}
async function main(){
 // A read-only runner is explicitly invoked; never auto-run on import/CI.
 const policy=JSON.parse(await readFile(
  new URL('../ops/prototypes/source-evidence/internal-review-staging-policy.json',import.meta.url),
  'utf8'));
 const result=await probeStagingAuthGetUser(process.env,policy);
 // Never print user ID, JWT, session ID, email, key or underlying error text.
 console.log(JSON.stringify(result));
 if(result.reason!=='staging-auth-getuser-readonly-pass')process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==3||process.argv[2]!=='--read-only'){
  console.error('staging_auth_probe_explicit_readonly_flag_required');
  process.exitCode=1;
 }else{
  main().catch(()=>{
   console.error('staging_auth_probe_failed_closed');
   process.exitCode=1;
  });
 }
}
