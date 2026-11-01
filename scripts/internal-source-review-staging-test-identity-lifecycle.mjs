// ADR-134: Synthetic staging Auth identity lifecycle. Explicit operator-only.
// Not executed in CI; no production or real reviewer accounts, no DB migration.
// It may create/delete ONLY an isolated staging-only synthetic Auth account.
// All secrets/tokens live in process memory; journal contains ONLY the test
// identity email/UUID (0600) to allow manual recovery after interruption.
import {randomBytes} from 'node:crypto';
import {constants as fsFlags} from 'node:fs';
import {open,readFile,unlink,lstat} from 'node:fs/promises';
import {dirname,isAbsolute,relative,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {probeStagingAuthGetUser} from './internal-source-review-staging-auth-getuser-probe.mjs';

const REF='vwtdwafjrraptrgeshzt';
const ORIGIN='https://vwtdwafjrraptrgeshzt.supabase.co';
const PROD='iyapppmeieqhflnzslao';
const LEGACY='ueuguguoladoqvtxkumt';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id=v=>typeof v==='string'&&UUID.test(v);
const result=(reason,auth=false,clean=false,reconcile=false,tokenDenied=false)=>Object.freeze({
 reason,hostedSignedJwtEvidence:auth,syntheticAccountDeletionVerified:clean,
 postDeletionAuthTokenRejected:tokenDenied,
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
// Read-only operator preflight. It does not create users, sessions, journals,
// review grants, receipts, tables or migrations. The static staging scope,
// exclusive-journal location and hosted empty-user inventory must ALL hold.
export async function checkStagingSyntheticOperatorPreflight({settings,policy,adapters}){
 const outcome=(reason,ready=false)=>Object.freeze({
  reason,operatorEnvironmentPreflightReady:ready,
  hostedSignedJwtEvidence:false,syntheticAccountDeletionVerified:false,
  sourceReviewWriteApproved:false,productionReleaseApproved:false,
  learnerPublicationApproved:false,testOnly:true
 });
 if(!validateStagingIdentityLifecycleSettings(settings,policy))
  return outcome('staging-operator-preflight-isolation-denied');
 const journalPath=settings.MLOS_STAGING_IDENTITY_JOURNAL;
 try{
  const uid=typeof process.getuid==='function'?process.getuid():null;
  const parent=await lstat(dirname(journalPath));
  // A private, unsymlinked parent prevents accidental disclosure of the
  // email/UUID recovery log, even when the journal itself is chmod 0600.
  if(!parent.isDirectory()||parent.isSymbolicLink()||
     (parent.mode&0o077)!==0||
     uid===null||parent.uid!==uid)
   return outcome('staging-operator-private-journal-directory-required');
  try{
   await lstat(journalPath);
   return outcome('staging-operator-existing-recovery-journal');
  }catch(error){
   if(error?.code!=='ENOENT')
    return outcome('staging-operator-journal-state-unverified');
  }
 }catch{
  return outcome('staging-operator-private-journal-directory-unverified');
 }
 if(typeof adapters?.auditEmpty!=='function')
  return outcome('staging-operator-inventory-adapter-missing');
 try{
  if((await adapters.auditEmpty())!==true)
   return outcome('staging-operator-hosted-inventory-not-empty-or-unverified');
 }catch{
  return outcome('staging-operator-hosted-inventory-unavailable');
 }
 return outcome('staging-operator-readonly-preflight-passed',true);
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
export function makeJournal(path){
 // Bind writes and unlink to the exact inode created by this invocation.
 // A new journal object cannot adopt/clear a prior interrupted run.
 let ownedFile=null;
 const exactOwned=stat=>ownedFile&&stat.isFile()&&stat.nlink===1&&
  (stat.mode&0o777)===0o600&&stat.dev===ownedFile.dev&&
  stat.ino===ownedFile.ino&&stat.uid===ownedFile.uid;
 return {
  async begin(email){
   // Exclusive create avoids overwriting a recovery file from an interrupted
   // prior run; O_NOFOLLOW rejects a final-component symlink.
   const handle=await open(path,
    fsFlags.O_CREAT|fsFlags.O_EXCL|fsFlags.O_WRONLY|fsFlags.O_NOFOLLOW,0o600);
   try{
    const stat=await handle.stat();
    if(!stat.isFile()||stat.nlink!==1||(stat.mode&0o777)!==0o600)
     throw Error('staging_identity_journal_permissions_invalid');
    ownedFile={dev:stat.dev,ino:stat.ino,uid:stat.uid};
    await handle.writeFile(JSON.stringify({
     kind:'mlos-staging-synthetic-v1',event:'pre-create',projectRef:REF,email
    })+'\n');
    await handle.sync();
   }finally{await handle.close();}
  },
  async associate(email,userId){
   // Append-only, never truncate the original pre-create recovery marker.
   // No O_CREAT: missing/replaced journal is an error, not a new file.
   const handle=await open(path,fsFlags.O_WRONLY|fsFlags.O_APPEND|fsFlags.O_NOFOLLOW);
   try{
    const stat=await handle.stat();
    if(!exactOwned(stat))
     throw Error('staging_identity_journal_identity_changed');
    await handle.writeFile(JSON.stringify({
     kind:'mlos-staging-synthetic-v1',event:'created',
     projectRef:REF,email,userId
    })+'\n');
    await handle.sync();
   }finally{await handle.close();}
  },
  async clear(){
   // Path-based unlink is not inode-atomic. The trusted private 0700
   // parent remains mandatory; refuse any detected replacement, mode
   // change or stale journal object before removing recovery evidence.
   if(!ownedFile)throw Error('staging_identity_journal_not_owned');
   const stat=await lstat(path);
   if(!exactOwned(stat))throw Error('staging_identity_journal_identity_changed');
   await unlink(path);
   ownedFile=null;
  }
 };
}
// The provider-supported server-side supabase-js Auth API takes opaque
// sb_secret_ keys safely. Do not implement raw HTTP Admin POST/DELETE with
// unverified header semantics, and do not persist the user session.
export function makeSupabaseSdkStagingAdapters(env,policy,createClient,fetcher=fetch){
 if(!validateStagingIdentityLifecycleSettings(env,policy))throw Error('staging-sdk-target-denied');
 if(typeof createClient!=='function')throw Error('trusted-sdk-unavailable');
 const options={auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}};
 const admin=createClient(ORIGIN,env.MLOS_STAGING_ADMIN_SECRET_KEY,options);
 const client=createClient(ORIGIN,env.MLOS_STAGING_PUBLISHABLE_KEY,options);
 if(!admin?.auth?.admin||!client?.auth)throw Error('trusted-sdk-invalid');
 const required=['createUser','getUserById','deleteUser','listUsers'];
 if(required.some(name=>typeof admin.auth.admin[name]!=='function')||
  typeof client.auth.signInWithPassword!=='function')
  throw Error('trusted-sdk-admin-interface-invalid');
 const pub=env.MLOS_STAGING_PUBLISHABLE_KEY;
 return {
  async auditEmpty(){
   // A fresh, isolated staging environment is required. Refuse even one
   // existing Auth account; do not page through or log account identities.
   // Unexpected users could indicate that the supplied secret is scoped to
   // the wrong project, or that an earlier test was not cleaned up.
   const {data,error}=await admin.auth.admin.listUsers({page:1,perPage:2});
   if(error||!Array.isArray(prop(data,'users')))return false;
   return data.users.length===0;
  },
  async create({email,password}){
   const {data,error}=await admin.auth.admin.createUser({
    email,password,email_confirm:true,
    app_metadata:{mlos_staging_synthetic:true}
   });
   if(error)throw Error('sdk-create-failed');
   const user=prop(data,'user');
   if(!id(prop(user,'id'))||prop(user,'email')!==email||
    prop(prop(user,'app_metadata'),'mlos_staging_synthetic')!==true)
    throw Error('sdk-created-identity-unverified');
   return {userId:user.id};
  },
  async signIn({email,password}){
   const {data,error}=await client.auth.signInWithPassword({email,password});
   if(error)throw Error('sdk-signin-failed');
   return {token:prop(prop(data,'session'),'access_token'),userId:prop(prop(data,'user'),'id')};
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
  async verifyOwned(userId,email){
   const {data,error}=await admin.auth.admin.getUserById(userId);
   if(error)return false;
   const user=prop(data,'user');
   return prop(user,'id')===userId&&prop(user,'email')===email&&
    prop(prop(user,'app_metadata'),'mlos_staging_synthetic')===true;
  },
  async delete(userId){
   const {error}=await admin.auth.admin.deleteUser(userId);
   return !error;
  },
  async isDeleted(userId){
   const {data,error}=await admin.auth.admin.getUserById(userId);
   // Only documented not-found status is accepted. Network/server errors
   // or an unexpected empty response never prove a user was deleted.
   return error?.status===404&&!prop(data,'user');
  },
  async verifyTokenDenied(token){
   // Auth GET denial after deletion is a separate observed fact from the
   // deleted account. It does NOT prove PostgREST rejects an unexpired JWT.
   if(typeof token!=='string'||token.length<150||token.length>8192)
    return false;
   try{
    const r=await fetcher(ORIGIN+'/auth/v1/user',{
     method:'GET',redirect:'error',cache:'no-store',
     signal:AbortSignal.timeout(10000),
     headers:{apikey:pub,'Cache-Control':'no-store',
      Authorization:'Bearer '+token}
    });
    return r?.status===401||r?.status===403;
   }catch{return false;}
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
  ['auditEmpty','create','signIn','authProbe','verifyOwned','delete','isDeleted','verifyTokenDenied'].some(k=>typeof adapters[k]!=='function')||
  ['begin','associate','clear'].some(k=>typeof journal[k]!=='function'))
  return result('staging-lifecycle-dependencies-invalid');
 // Read-only hosted Auth inventory gate before generating identity, creating
 // the local journal, or making any external write. No user data is logged.
 try{
  if((await adapters.auditEmpty())!==true)
   return result('staging-auth-inventory-not-empty-or-unverified');
 }catch{
  return result('staging-auth-inventory-unavailable');
 }
 let credentials,createdId=null,syntheticEmail=null,issuedToken=null,
  signinAttempted=false,recorded=false,authVerified=false,createResponseReceived=false;
 try{
  credentials=typeof makeIdentity==='function'?makeIdentity():
   {email:identityEmail(),password:secretPassword()};
  if(typeof credentials?.email!=='string'||
   !/^mlos-source-review-stage-[a-f0-9]{36}@example\.invalid$/.test(credentials.email)||
   typeof credentials.password!=='string'||credentials.password.length<32||
   credentials.password.length>256)
   return result('staging-lifecycle-identity-invalid');
  syntheticEmail=credentials.email;
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
  signinAttempted=true;
  const signed=await adapters.signIn(credentials);
  const token=prop(signed,'token');
  const sessionInfo=session(token);
  if(prop(signed,'userId')!==createdId||sessionInfo.userId!==createdId)
   throw Error('staging-signed-user-mismatch');
  const probe=await adapters.authProbe(token,createdId,sessionInfo.sessionId);
  if(prop(probe,'reason')!=='staging-auth-getuser-readonly-pass'||
   prop(probe,'hostedJwtReadOnlyEvidence')!==true)
   throw Error('staging-hosted-getuser-not-confirmed');
  // Only a genuinely Auth-verified bearer for the exact synthetic user
  // can prove post-deletion token rejection. A foreign, malformed or
  // previously rejected token must NOT close the recovery journal merely
  // because a later GET rejects it as expected.
  issuedToken=token;
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
 // Never delete a user solely because create() claimed a UUID. Re-read that
 // exact user via hosted Auth admin and prove the random marker and trusted
 // app_metadata flag before the irreversible delete operation.
 let owned=false;
 try{owned=(await adapters.verifyOwned(createdId,syntheticEmail))===true;}catch{}
 if(!owned)return result('staging-owned-identity-unverified-reconcile-journal',
  authVerified,false,true);
 let deleted=false;
 try{
  const requestAck=await adapters.delete(createdId);
  // Verification matters more than the delete request acknowledgement.
  deleted=(requestAck===true)&&await adapters.isDeleted(createdId)===true;
 }catch{/* deletion uncertain: leave secure journal for operator */}
 if(!deleted)return result('staging-deletion-unverified-reconcile-journal',authVerified,false,true);
 // The admin 404 only proves the user record was deleted. Supabase may
 // continue to accept access JWTs until their expiration. Verify the
 // Auth-server endpoint independently; never infer token revocation.
 if(!issuedToken){
  return result(signinAttempted
   ?'staging-deleted-session-unverified-reconcile-journal'
   :'staging-deleted-no-session-evidence-reconcile-journal',
   authVerified,true,true,false);
 }
 let tokenDenied=false;
 try{tokenDenied=await adapters.verifyTokenDenied(issuedToken)===true;}catch{}
 issuedToken=null;
 if(!tokenDenied)return result('staging-deleted-token-rejection-unverified-reconcile-journal',
  authVerified,true,true,false);
 try{await journal.clear();}
 catch{return result('staging-deleted-journal-cleanup-needed',authVerified,true,true,true);}
 return result(authVerified?'staging-auth-test-deleted':'staging-auth-failed-identity-deleted',
  authVerified,true,false,true);
}
async function main(mode){
 const policy=JSON.parse(await readFile(
  new URL('../ops/prototypes/source-evidence/internal-review-staging-policy.json',import.meta.url),'utf8'));
 if(!validateStagingIdentityLifecycleSettings(process.env,policy)){
  console.error('staging_synthetic_lifecycle_isolation_denied');
  process.exitCode=1;return;
 }
 // Fail before any write if the reviewed SDK version is absent/mismatched.
 // Operator installs the exact package and lockfile in a trusted environment.
 const sdkManifest=JSON.parse(await readFile(
  new URL('../ops/staging-auth-sdk/node_modules/@supabase/supabase-js/package.json',import.meta.url),'utf8'));
 if(sdkManifest.version!=='2.118.0')
  throw Error('staging_sdk_version_not_reviewed');
 // Load only from the isolated, npm-ci-installed operator package tree.
 // The main learner app stays free of staging administrative packages.
 const sdkRequire=createRequire(
  new URL('../ops/staging-auth-sdk/package.json',import.meta.url));
 const {createClient}=sdkRequire('@supabase/supabase-js');
 const adapters=makeSupabaseSdkStagingAdapters(process.env,policy,createClient,fetch);
 const preflight=await checkStagingSyntheticOperatorPreflight({
  settings:process.env,policy,adapters
 });
 if(mode==='--preflight'){
  console.log(JSON.stringify(preflight));
  if(!preflight.operatorEnvironmentPreflightReady)process.exitCode=1;
  return;
 }
 if(!preflight.operatorEnvironmentPreflightReady){
  console.log(JSON.stringify(preflight));
  process.exitCode=1;return;
 }
 const result=await runStagingSyntheticIdentityLifecycle({
  settings:process.env,policy,adapters,
  journal:makeJournal(process.env.MLOS_STAGING_IDENTITY_JOURNAL)
 });
 console.log(JSON.stringify(result));
 if(!result.syntheticAccountDeletionVerified||
    result.requiresManualReconciliation||!result.hostedSignedJwtEvidence)
  process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==3||!['--preflight','--create-and-delete'].includes(process.argv[2])){
  console.error('staging_synthetic_lifecycle_explicit_flag_required');
  process.exitCode=1;
 }else{
  main(process.argv[2]).catch(()=>{
   console.error('staging_synthetic_lifecycle_failed_closed');
   process.exitCode=1;
  });
 }
}
