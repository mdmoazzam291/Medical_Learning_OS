// ADR-134: Synthetic staging Auth identity lifecycle. Explicit operator-only.
// Not executed in CI; no production or real reviewer accounts, no DB migration.
// It may create/delete ONLY an isolated staging-only synthetic Auth account.
// All secrets/tokens live in process memory; journal contains ONLY the test
// identity email/UUID (0600) to allow manual recovery after interruption.
import {randomBytes} from 'node:crypto';
import {open,readFile,writeFile,unlink} from 'node:fs/promises';
import {isAbsolute,relative,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {probeStagingAuthGetUser} from './internal-source-review-staging-auth-getuser-probe.mjs';

const REF='vwtdwafjrraptrgeshzt';
const ORIGIN='https://vwtdwafjrraptrgeshzt.supabase.co';
const PROD='iyapppmeieqhflnzslao';
const LEGACY='ueuguguoladoqvtxkumt';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id=v=>typeof v==='string'&&UUID.test(v);
const result=(reason,auth=false,clean=false,reconcile=false)=>Object.freeze({
 reason,hostedSignedJwtEvidence:auth,syntheticAccountDeletionVerified:clean,
 requiresManualReconciliation:reconcile, testOnly:true,
 noProductionAccess:true,readOnlyProbeOnly:true,
 productionSourceReviewApproved:false,stagingReviewWriteApproved:false,
 managedMigrationApproved:false,providerLogoutAtomicityVerified:false,
 reviewerGrantAuthorityVerified:false,protectedReceiptVerified:false,
 clinicalApproved:false,rightsApproved:false,examScopeApproved:false,
 learnerRelease:false,automaticRetryAllowed:false
});
function prop(o,k){
 try{
  if(!o||typeof o!=='object'||Array.isArray(o)||
   ![Object.prototype,null].includes(Object.getPrototypeOf(o)))return undefined;
  const d=Object.getOwnPropertyDescriptor(o,k);
  return d?.enumerable&&Object.hasOwn(d,'value')?d.value:undefined;
 }catch{return undefined;}
}
export function validateStagingIdentityLifecycleSettings(env,policy){
 try{
  if(prop(policy,'approvedStagingProjectRef')!==REF||
   prop(policy,'productionProjectRef')!==PROD||
   prop(policy,'requiresExplicitOwnerApproval')!==true||
   !Array.isArray(prop(policy,'excludedLegacyProjectRefs'))||
   !prop(policy,'excludedLegacyProjectRefs').includes(LEGACY)||
   prop(policy,'requiredStagingProjectName')!=='medical_learning_os_staging'||
   prop(env,'MLOS_STAGING_IDENTITY_CONFIRM')!=='STAGING_SYNTHETIC_CREATE_AND_DELETE'||
   prop(env,'MLOS_STAGING_REF')!==REF||
   prop(env,'MLOS_STAGING_URL')!==ORIGIN)return false;
  const publicKey=prop(env,'MLOS_STAGING_PUBLISHABLE_KEY');
  const adminKey=prop(env,'MLOS_STAGING_ADMIN_SECRET_KEY');
  const journal=prop(env,'MLOS_STAGING_IDENTITY_JOURNAL');
  return typeof publicKey==='string'&&/^sb_publishable_[a-zA-Z0-9_-]{12,}$/.test(publicKey)&&publicKey.length<257&&
   typeof adminKey==='string'&&/^sb_secret_[a-zA-Z0-9_-]{12,}$/.test(adminKey)&&adminKey.length<257&&
   typeof journal==='string'&&isAbsolute(journal)&&journal.length<1024&&
   !journal.includes('\0')&&!journal.startsWith('/mnt/data/')&&
   (()=>{const rel=relative(process.cwd(),journal);return rel==='..'||rel.startsWith('..'+sep);})()&&
   publicKey!==adminKey;
 }catch{return false;}
}
function identityEmail(){
 return 'mlos-source-review-stage-'+randomBytes(18).toString('hex')+'@example.invalid';
}
function secretPassword(){
 return randomBytes(36).toString('base64url');
}
function session(token){
 if(typeof token!=='string'||token.length<150||token.length>8192)throw Error('invalid-token');
 const pieces=token.split('.');
 if(pieces.length!==3)throw Error('invalid-token');
 const claims=JSON.parse(Buffer.from(pieces[1],'base64url').toString('utf8'));
 if(prop(claims,'iss')!==ORIGIN+'/auth/v1'||prop(claims,'aud')!=='authenticated'||
  prop(claims,'role')!=='authenticated'||!id(prop(claims,'sub'))||
  !id(prop(claims,'session_id'))||!Number.isSafeInteger(prop(claims,'exp'))||
  claims.exp<Math.floor(Date.now()/1000)+30)throw Error('invalid-claims');
 return {userId:claims.sub,sessionId:claims.session_id};
}
function makeJournal(path){
 return {
  async begin(email){
   const handle=await open(path,'wx',0o600);
   try{
    await handle.writeFile(JSON.stringify({kind:'mlos-staging-synthetic-v1',projectRef:REF,email,userId:null})+'\n');
    await handle.sync();
   }finally{await handle.close();}
  },
  async associate(email,userId){
   // Sensitive journal remains local and must not contain tokens/passwords.
   await writeFile(path,JSON.stringify({
    kind:'mlos-staging-synthetic-v1',projectRef:REF,email,userId
   })+'\n',{mode:0o600,flag:'w'});
  },
  async clear(){await unlink(path);}
 };
}
async function response(fetcher,path,secret,apikey,{method='GET',body}={}){
 const url=ORIGIN+path;
 const res=await fetcher(url,{
  method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
  headers:{apikey,Authorization:'Bearer '+secret,'Cache-Control':'no-store',
   ...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 if(!res||!Number.isInteger(res.status))throw Error('bad-hosted-response');
 return res;
}
function liveAdapters(env,fetcher){
 const secret=env.MLOS_STAGING_ADMIN_SECRET_KEY,pub=env.MLOS_STAGING_PUBLISHABLE_KEY;
 return {
  async create({email,password}){
   const r=await response(fetcher,'/auth/v1/admin/users',secret,secret,{
    method:'POST',body:{email,password,email_confirm:true,
     app_metadata:{mlos_staging_synthetic:true}}
   });
   if(r.status!==200&&r.status!==201)throw Error('create-not-confirmed');
   const body=await r.json();
   const u=prop(body,'user')??body;
   const found=prop(u,'id');
   if(!id(found)||prop(u,'email')!==email)throw Error('create-identity-unverified');
   return {userId:found};
  },
  async signIn({email,password}){
   const r=await response(fetcher,'/auth/v1/token?grant_type=password',pub,pub,{
    method:'POST',body:{email,password}
   });
   if(r.status!==200)throw Error('signin-not-confirmed');
   const body=await r.json();
   return {token:prop(body,'access_token'),userId:prop(prop(body,'user'),'id')};
  },
  async authProbe(token,userId,sessionId){
   return probeStagingAuthGetUser({
    MLOS_STAGING_READONLY_CONFIRM:'STAGING_AUTH_GETUSER_NO_WRITES',
    MLOS_STAGING_REF:REF,MLOS_STAGING_URL:ORIGIN,
    MLOS_STAGING_PUBLISHABLE_KEY:pub,
    MLOS_STAGING_TEST_ACCESS_TOKEN:token,
    MLOS_STAGING_TEST_USER_ID:userId,
    MLOS_STAGING_TEST_SESSION_ID:sessionId
   },{
    approvedStagingProjectRef:REF,productionProjectRef:PROD,
    excludedLegacyProjectRefs:[LEGACY],
    requiredStagingProjectName:'medical_learning_os_staging',
    requiresExplicitOwnerApproval:true
   },fetcher);
  },
  async delete(userId){
   const r=await response(fetcher,'/auth/v1/admin/users/'+userId,secret,secret,{method:'DELETE'});
   return r.status>=200&&r.status<300;
  },
  async isDeleted(userId){
   const r=await response(fetcher,'/auth/v1/admin/users/'+userId,secret,secret);
   // Do not treat HTTP 401/403, network failures or malformed data as deletion.
   return r.status===404;
  }
 };
}

/**
 * Testable lifecycle with injected privileged API and exclusive journal.
 * Never retries account creation or ambiguous write operations. If create
 * succeeded but the reply was lost, journal is left for human reconciliation.
 * Callbacks must be staging-scoped and trusted; this module is not a role
 * or permissions boundary on its own.
 */
export async function runStagingSyntheticIdentityLifecycle({settings,policy,adapters,journal,makeIdentity}){
 if(!validateStagingIdentityLifecycleSettings(settings,policy))
  return result('staging-lifecycle-not-authorized');
 if(!adapters||!journal||
  ['create','signIn','authProbe','delete','isDeleted'].some(k=>typeof adapters[k]!=='function')||
  ['begin','associate','clear'].some(k=>typeof journal[k]!=='function'))
  return result('staging-lifecycle-dependencies-invalid');
 let credentials,createdId=null,recorded=false,authVerified=false,createResponseReceived=false;
 try{
  credentials=typeof makeIdentity==='function'?makeIdentity():
   {email:identityEmail(),password:secretPassword()};
  if(typeof credentials?.email!=='string'||
   !/^mlos-source-review-stage-[a-f0-9]{36}@example\.invalid$/.test(credentials.email)||
   typeof credentials.password!=='string'||credentials.password.length<32||
   credentials.password.length>256)
   return result('staging-lifecycle-identity-invalid');
  await journal.begin(credentials.email);recorded=true;
  const created=await adapters.create(credentials);
  createResponseReceived=true;
  // Trusted adapter returns a normalized own-data property. Descriptors
  // avoid invoking accessors and accept cross-realm plain response records.
  const descriptor=created&&typeof created==='object'&&!Array.isArray(created)
   ?Object.getOwnPropertyDescriptor(created,'userId'):null;
  createdId=descriptor?.enumerable&&Object.hasOwn(descriptor,'value')?descriptor.value:null;
  if(!id(createdId))throw Error('unknown-new-user-id');
  await journal.associate(credentials.email,createdId);
  const signed=await adapters.signIn(credentials);
  const token=prop(signed,'token');
  const sessionInfo=session(token);
  if(prop(signed,'userId')!==createdId||sessionInfo.userId!==createdId)
   throw Error('staging-signed-user-mismatch');
  const probe=await adapters.authProbe(token,createdId,sessionInfo.sessionId);
  if(prop(probe,'reason')!=='staging-auth-getuser-readonly-pass'||
   prop(probe,'hostedJwtReadOnlyEvidence')!==true)
   throw Error('staging-hosted-getuser-not-confirmed');
  authVerified=true;
 }catch{/* do not expose passwords, JWTs, email, ids or provider errors */}
 finally{
  // No credential/token value goes into result or GitHub logs.
  credentials=null;
 }
 if(!recorded)return result('staging-lifecycle-journal-unavailable');
 if(!id(createdId))return result(createResponseReceived
  ?'staging-create-identity-unverified-'+(createdId===null?'missing':typeof createdId==='string'?'invalid-string':typeof createdId)+'-reconcile-journal'
  :'staging-create-ambiguous-reconcile-journal',false,false,true);
 let deleted=false;
 try{
  const requestAck=await adapters.delete(createdId);
  // Verification matters more than the delete request acknowledgement.
  deleted=(requestAck===true)&&await adapters.isDeleted(createdId)===true;
 }catch{/* deletion uncertain: leave secure journal for operator */}
 if(!deleted)return result('staging-deletion-unverified-reconcile-journal',authVerified,false,true);
 try{await journal.clear();}
 catch{return result('staging-deleted-journal-cleanup-needed',authVerified,true,true);}
 return result(authVerified?'staging-auth-test-deleted':'staging-auth-failed-identity-deleted',
  authVerified,true,false);
}
async function main(){
 const policy=JSON.parse(await readFile(
  new URL('../ops/prototypes/source-evidence/internal-review-staging-policy.json',import.meta.url),'utf8'));
 if(!validateStagingIdentityLifecycleSettings(process.env,policy)){
  console.error('staging_synthetic_lifecycle_isolation_denied');
  process.exitCode=1;return;
 }
 const result=await runStagingSyntheticIdentityLifecycle({
  settings:process.env,policy,
  adapters:liveAdapters(process.env,fetch),
  journal:makeJournal(process.env.MLOS_STAGING_IDENTITY_JOURNAL)
 });
 console.log(JSON.stringify(result));
 if(!result.syntheticAccountDeletionVerified||
    result.requiresManualReconciliation||!result.hostedSignedJwtEvidence)
  process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==3||process.argv[2]!=='--create-and-delete'){
  console.error('staging_synthetic_lifecycle_explicit_flag_required');
  process.exitCode=1;
 }else{
  main().catch(()=>{
   console.error('staging_synthetic_lifecycle_failed_closed');
   process.exitCode=1;
  });
 }
}
