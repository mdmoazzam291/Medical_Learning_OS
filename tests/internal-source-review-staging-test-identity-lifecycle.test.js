import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,stat,symlink,unlink,chmod,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makeJournal,makeSupabaseSdkStagingAdapters,checkStagingSyntheticOperatorPreflight,runStagingSyntheticIdentityLifecycle,validateStagingIdentityLifecycleSettings}
 from '../scripts/internal-source-review-staging-test-identity-lifecycle.mjs';

const STAGING='vwtdwafjrraptrgeshzt',ORIGIN='https://'+STAGING+'.supabase.co';
const USER='11111111-1111-4111-8111-111111111111';
const SESSION='22222222-2222-4222-8222-222222222222';
const EMAIL='mlos-source-review-stage-'+'a'.repeat(36)+'@example.invalid';
const PASSWORD='b'.repeat(42);
const policy=()=>({
 approvedStagingProjectRef:STAGING,productionProjectRef:'iyapppmeieqhflnzslao',
 excludedLegacyProjectRefs:['ueuguguoladoqvtxkumt'],
 requiredStagingProjectName:'medical_learning_os_staging',
 requiresExplicitOwnerApproval:true
});
const settings=()=>({
 MLOS_STAGING_IDENTITY_CONFIRM:'STAGING_SYNTHETIC_CREATE_AND_DELETE',
 MLOS_STAGING_REF:STAGING,MLOS_STAGING_URL:ORIGIN,
 MLOS_STAGING_PUBLISHABLE_KEY:'sb_publishable_'+'a'.repeat(24),
 MLOS_STAGING_ADMIN_SECRET_KEY:'sb_secret_'+'b'.repeat(24),
 MLOS_STAGING_IDENTITY_JOURNAL:'/tmp/mlos-test-auth-cleanup-journal.json'
});
const identity=()=>({email:EMAIL,password:PASSWORD});
const encoded=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const token=()=>encoded({alg:'HS256',typ:'JWT'})+'.'+
 encoded({iss:ORIGIN+'/auth/v1',aud:'authenticated',role:'authenticated',
  sub:USER,session_id:SESSION,exp:Math.floor(Date.now()/1000)+3600})+'.'+'a'.repeat(45);
function scenario({audit,create,signIn,probe,own,del,verify,tokenDenial,begin,associate,clear}={}){
 const steps=[];
 const journal={
  begin:async email=>{steps.push('journal-begin');assert.equal(email,EMAIL);if(begin)await begin();},
  associate:async(email,userId)=>{steps.push('journal-associate');assert.equal(email,EMAIL);assert.equal(userId,USER);if(associate)await associate();},
  clear:async()=>{steps.push('journal-clear');if(clear)await clear();}
 };
 const adapters={
  auditEmpty:async()=>{steps.push('audit-empty');return audit?audit():true;},
  create:async user=>{steps.push('create');if(user.email!==EMAIL||user.password!==PASSWORD)steps.push('synthetic-identity-mismatch');return create?create():{userId:USER};},
  signIn:async user=>{steps.push('signin');assert.equal(user.email,EMAIL);return signIn?signIn():{userId:USER,token:token()};},
  authProbe:async(t,u,s)=>{steps.push('hosted-readonly-auth-probe');assert.equal(t,token());assert.equal(u,USER);assert.equal(s,SESSION);return probe?probe():{reason:'staging-auth-getuser-readonly-pass',hostedJwtReadOnlyEvidence:true};},
  verifyOwned:async(id,email)=>{steps.push('verify-owned');assert.equal(id,USER);assert.equal(email,EMAIL);return own?own():true;},
  delete:async id=>{steps.push('delete');assert.equal(id,USER);return del?del():true;},
  isDeleted:async id=>{steps.push('verify-deleted');assert.equal(id,USER);return verify?verify():true;},
  verifyTokenDenied:async t=>{steps.push('verify-token-rejected');assert.equal(t,token());return tokenDenial?tokenDenial():true;}
 };
 const run=()=>runStagingSyntheticIdentityLifecycle({
  settings:settings(),policy:policy(),adapters,journal,makeIdentity:identity
 });
 return {run,steps};
}
function noAuthority(out){
 assert.equal(Object.isFrozen(out),true);
 for(const name of ['productionSourceReviewApproved','stagingReviewWriteApproved',
  'managedMigrationApproved','providerLogoutAtomicityVerified',
  'reviewerGrantAuthorityVerified','protectedReceiptVerified','clinicalApproved',
  'rightsApproved','examScopeApproved','learnerRelease','automaticRetryAllowed'])
  assert.equal(out[name],false,name);
 const json=JSON.stringify(out);
 for(const value of [USER,SESSION,EMAIL,PASSWORD,'sb_secret_','sb_publishable_'])
  assert.ok(!json.includes(value),'unexpected credential/identity in output');
}
test('all steps including privileged admin deletion and independent verification happen exactly once',async()=>{
 const {run,steps}=scenario();
 const result=await run();
 assert.deepEqual(steps,['audit-empty','journal-begin','create','journal-associate',
  'signin','hosted-readonly-auth-probe','verify-owned','delete','verify-deleted','verify-token-rejected','journal-clear']);
 assert.equal(result.reason,'staging-auth-test-deleted');
 assert.equal(result.hostedSignedJwtEvidence,true);
 assert.equal(result.syntheticAccountDeletionVerified,true);
 assert.equal(result.postDeletionAuthTokenRejected,true);
 assert.equal(result.requiresManualReconciliation,false);
 noAuthority(result);
});
test('unconfigured, production, legacy, publishable-as-admin or repository journal fails before any side effect',async()=>{
 const input=settings(),p=policy();
 for(const e of [
  {...input,MLOS_STAGING_IDENTITY_CONFIRM:'yes'},
  {...input,MLOS_STAGING_REF:'iyapppmeieqhflnzslao'},
  {...input,MLOS_STAGING_REF:'ueuguguoladoqvtxkumt'},
  {...input,MLOS_STAGING_URL:'https://iyapppmeieqhflnzslao.supabase.co'},
  {...input,MLOS_STAGING_URL:ORIGIN+'@danger.invalid'},
  {...input,MLOS_STAGING_ADMIN_SECRET_KEY:input.MLOS_STAGING_PUBLISHABLE_KEY},
  {...input,MLOS_STAGING_IDENTITY_JOURNAL:'./cleanup.json'},
  {...input,MLOS_STAGING_IDENTITY_JOURNAL:process.cwd()+'/test-journal.json'},
  {...input,MLOS_STAGING_IDENTITY_JOURNAL:'/mnt/data/test.json'}
 ]){
  assert.equal(validateStagingIdentityLifecycleSettings(e,p),false);
  let steps=0;
  const out=await runStagingSyntheticIdentityLifecycle({
   settings:e,policy:p,adapters:{create(){steps++;}},journal:{}});
  assert.equal(out.reason,'staging-lifecycle-not-authorized');
  assert.equal(steps,0);noAuthority(out);
 }
 for(const bad of [
  {...p,approvedStagingProjectRef:'iyapppmeieqhflnzslao'},
  {...p,productionProjectRef:'vwtdwafjrraptrgeshzt'},
  {...p,requiresExplicitOwnerApproval:false}
 ])assert.equal(validateStagingIdentityLifecycleSettings(input,bad),false);
});
test('hosted Auth inventory must be verified empty before journal or account creation',async()=>{
 for(const outcome of [()=>false,()=>null,()=>{throw Error('admin listUsers unavailable');}]){
  const {run,steps}=scenario({audit:outcome});
  const result=await run();
  assert.equal(result.syntheticAccountDeletionVerified,false);
  assert.equal(result.hostedSignedJwtEvidence,false);
  assert.equal(result.reason,outcome.toString().includes('throw')
   ?'staging-auth-inventory-unavailable'
   :'staging-auth-inventory-not-empty-or-unverified');
  assert.deepEqual(steps,['audit-empty']);
  noAuthority(result);
 }
});
test('creation response lost leaves journal with no auto-retry, manual cleanup required',async()=>{
 const {run,steps}=scenario({create:()=>{throw Error('server may have created user');}});
 const out=await run();
 assert.equal(out.reason,'staging-create-ambiguous-reconcile-journal');
 assert.equal(out.requiresManualReconciliation,true);
 assert.equal(out.syntheticAccountDeletionVerified,false);
 assert.deepEqual(steps,['audit-empty','journal-begin','create']);
 noAuthority(out);
});
test('signup succeeded but sign-in fails -> user is deleted but session cleanup needs reconciliation',async()=>{
 const {run,steps}=scenario({signIn:()=>{throw Error('password grant failed');}});
 const out=await run();
 assert.equal(out.reason,'staging-deleted-session-unverified-reconcile-journal');
 assert.equal(out.hostedSignedJwtEvidence,false);
 assert.equal(out.syntheticAccountDeletionVerified,true);
 assert.equal(out.postDeletionAuthTokenRejected,false);
 assert.equal(out.requiresManualReconciliation,true);
 assert.deepEqual(steps,['audit-empty','journal-begin','create','journal-associate',
  'signin','verify-owned','delete','verify-deleted']);
 noAuthority(out);
});
test('forged session, foreign JWT or rejected probe leads to immediate deletion',async()=>{
 for(const variants of [
  {signIn:()=>({userId:'33333333-3333-4333-8333-333333333333',token:token()})},
  {signIn:()=>({userId:USER,token:'not a signed token'})},
  {probe:()=>({reason:'staging-token-not-verified',hostedJwtReadOnlyEvidence:false})},
  {probe:()=>({reason:'staging-auth-getuser-readonly-pass',hostedJwtReadOnlyEvidence:false})}
 ]){
  const {run,steps}=scenario(variants);
  const out=await run();
  const invalidToken=typeof variants.signIn==='function' &&
   variants.signIn().token==='not a signed token';
  if(invalidToken){
   assert.equal(out.reason,'staging-deleted-session-unverified-reconcile-journal');
   assert.equal(out.requiresManualReconciliation,true);
   assert.equal(out.postDeletionAuthTokenRejected,false);
   assert.ok(!steps.includes('journal-clear'));
  }else{
   assert.equal(out.reason,'staging-auth-failed-identity-deleted');
   assert.equal(out.postDeletionAuthTokenRejected,true);
   assert.equal(steps.at(-1),'journal-clear');
  }
  assert.equal(out.syntheticAccountDeletionVerified,true);
  assert.equal(out.hostedSignedJwtEvidence,false);
  noAuthority(out);
 }
});
test('deleted account with unverified token rejection keeps journal for human reconciliation',async()=>{
 for(const tokenDenial of [()=>false,()=>{throw Error('transport failure');}]){
  const {run,steps}=scenario({tokenDenial});
  const out=await run();
  assert.equal(out.reason,'staging-deleted-token-rejection-unverified-reconcile-journal');
  assert.equal(out.syntheticAccountDeletionVerified,true);
  assert.equal(out.postDeletionAuthTokenRejected,false);
  assert.equal(out.requiresManualReconciliation,true);
  assert.deepEqual(steps.slice(-4),['verify-owned','delete','verify-deleted','verify-token-rejected']);
  assert.ok(!steps.includes('journal-clear'));
  noAuthority(out);
 }
});
test('a user is never deleted unless Auth admin confirms exact staging synthetic ownership',async()=>{
 for(const own of [()=>false,()=>{throw Error('admin identity lookup failed');}]){
  const {run,steps}=scenario({own});
  const out=await run();
  assert.equal(out.reason,'staging-owned-identity-unverified-reconcile-journal');
  assert.equal(out.syntheticAccountDeletionVerified,false);
  assert.equal(out.requiresManualReconciliation,true);
  assert.ok(steps.includes('verify-owned'));
  assert.ok(!steps.includes('delete'));
  assert.ok(!steps.includes('journal-clear'));
  noAuthority(out);
 }
});
test('deletion acknowledgement alone never suffices; unverifiable cleanup keeps recovery journal',async()=>{
 for(const variants of [
  {del:()=>false},{del:()=>{throw Error('delete response lost');}},
  {verify:()=>false},{verify:()=>{throw Error('admin read error');}}
 ]){
  const {run,steps}=scenario(variants);
  const out=await run();
  assert.equal(out.reason,'staging-deletion-unverified-reconcile-journal');
  assert.equal(out.syntheticAccountDeletionVerified,false);
  assert.equal(out.requiresManualReconciliation,true);
  assert.ok(!steps.includes('journal-clear'));
  noAuthority(out);
 }
});
test('journal failure refuses creation; cleanup journal unlink failure is distinguished from identity cleanup',async()=>{
 const a=scenario({begin:()=>{throw Error('journal not writable');}});
 const noJournal=await a.run();
 assert.equal(noJournal.reason,'staging-lifecycle-journal-unavailable');
 assert.deepEqual(a.steps,['audit-empty','journal-begin']);
 noAuthority(noJournal);
 const b=scenario({clear:()=>{throw Error('disk failure');}});
 const cleanup=await b.run();
 assert.equal(cleanup.reason,'staging-deleted-journal-cleanup-needed');
 assert.equal(cleanup.syntheticAccountDeletionVerified,true);
 assert.equal(cleanup.requiresManualReconciliation,true);
 noAuthority(cleanup);
});
test('journal associated before token sign-in; no Auth data is ever written into repository or CI',async()=>{
 const source=await readFile(new URL('../scripts/internal-source-review-staging-test-identity-lifecycle.mjs',import.meta.url),'utf8');
 assert.match(source,/journal\.begin\(credentials\.email\)/);
 assert.match(source,/journal\.associate\(credentials\.email,createdId\)/);
 assert.match(source,/journal\.clear\(\)/);
 assert.match(source,/file:\/\/|https:\/\//);
 assert.match(source,/--create-and-delete/);
 assert.match(source,/admin\.deleteUser\(userId\)/);
 assert.match(source,/async verifyTokenDenied\(token\)/);
 assert.match(source,/postDeletionAuthTokenRejected/);
 assert.match(source,/error\?\.status===404/);
 assert.match(source,/email_confirm:true/);
 assert.match(source,/app_metadata:\{mlos_staging_synthetic:true\}/);
 assert.doesNotMatch(source,/\/rest\/v1\/rpc\//);
 assert.ok(!source.includes("Authorization:'Bearer '+secret"));
 assert.match(source,/admin\.createUser\(/);
 assert.match(source,/client\.auth\.signInWithPassword\(/);
 assert.match(source,/sdkManifest\.version!=='2\.118\.0'/);
 assert.doesNotMatch(source,/\/auth\/v1\/admin\/users/);
 assert.doesNotMatch(source,/auth\.sessions/);
});

test('actual restricted journal appends without destroying original pre-create recovery marker',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mlos-staging-journal-test-'));
 const location=join(dir,'recovery.jsonl');
 try{
  const journal=makeJournal(location);
  await journal.begin(EMAIL);
  const first=await readFile(location,'utf8');
  const initial=JSON.parse(first.trim());
  assert.equal(initial.event,'pre-create');
  assert.equal(initial.userId,undefined);
  assert.equal(initial.email,EMAIL);
  assert.equal((await stat(location)).mode&0o777,0o600);
  await assert.rejects(journal.begin(EMAIL),{code:'EEXIST'});
  await journal.associate(EMAIL,USER);
  const contents=await readFile(location,'utf8');
  assert.ok(contents.startsWith(first),'created UUID append must preserve original marker');
  const entries=contents.trim().split('\n').map(v=>JSON.parse(v));
  assert.equal(entries.length,2);
  assert.equal(entries[1].event,'created');
  assert.equal(entries[1].userId,USER);
  assert.equal(entries[1].email,EMAIL);
  assert.ok(!contents.includes(PASSWORD),'must not persist token/password');
  await journal.clear();
  await assert.rejects(stat(location),{code:'ENOENT'});
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('journal rejects final symlink, absent file, and broadened file permissions',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mlos-staging-journal-hardening-'));
 const location=join(dir,'recovery.jsonl');
 const target=join(dir,'unrelated');
 try{
  await symlink(target,location);
  await assert.rejects(makeJournal(location).begin(EMAIL));
  await assert.rejects(makeJournal(location).associate(EMAIL,USER));
  await unlink(location);
  await assert.rejects(makeJournal(location).associate(EMAIL,USER),{code:'ENOENT'});
  const journal=makeJournal(location);
  await journal.begin(EMAIL);
  const before=await readFile(location,'utf8');
  await chmod(location,0o644);
  await assert.rejects(journal.associate(EMAIL,USER),/permissions_invalid/);
  assert.equal(await readFile(location,'utf8'),before,'unsafe journal not modified');
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('official SDK adapter checks exact staging and calls admin create/read/delete with separate public password signin',async()=>{
 const calls=[],P=policy(),E=settings();
 const state={exists:true};
 const user={id:USER,email:EMAIL,app_metadata:{mlos_staging_synthetic:true}};
 const admin={
  listUsers:async()=>({data:{users:[]},error:null}),
  createUser:async payload=>{
   calls.push('create');
   assert.equal(payload.email,EMAIL);
   assert.equal(payload.password,PASSWORD);
   assert.equal(payload.email_confirm,true);
   assert.equal(payload.app_metadata.mlos_staging_synthetic,true);
   return {data:{user},error:null};
  },
  getUserById:async uid=>{
   calls.push('read-owned');
   assert.equal(uid,USER);
   return state.exists?{data:{user},error:null}:
    {data:{user:null},error:{status:404}};
  },
  deleteUser:async uid=>{
   calls.push('delete');
   assert.equal(uid,USER);
   state.exists=false;
   return {data:{},error:null};
  }
 };
 const createClient=(url,key,options)=>{
  calls.push('init');
  assert.equal(url,ORIGIN);
  assert.equal(options.auth.persistSession,false);
  assert.equal(options.auth.autoRefreshToken,false);
  assert.equal(options.auth.detectSessionInUrl,false);
  if(key===E.MLOS_STAGING_ADMIN_SECRET_KEY)return {auth:{admin}};
  assert.equal(key,E.MLOS_STAGING_PUBLISHABLE_KEY);
  return {auth:{signInWithPassword:async credentials=>{
   calls.push('signin');
   assert.equal(credentials.email,EMAIL);
   assert.equal(credentials.password,PASSWORD);
   return {data:{user,session:{access_token:token()}},error:null};
  }}};
 };
 let req=0;
 const fetcher=async(url,opts)=>{
  req++;
  assert.equal(url,ORIGIN+'/auth/v1/user');
  assert.equal(opts.method,'GET');
  return req===1?{status:200,async json(){return {id:USER};}}:
   {status:401,async json(){return {};}};
 };
 const adapters=makeSupabaseSdkStagingAdapters(E,P,createClient,fetcher);
 const created=await adapters.create(identity());
 assert.equal(created.userId,USER);
 const signed=await adapters.signIn(identity());
 assert.equal(signed.userId,USER);
 const probe=await adapters.authProbe(signed.token,USER,SESSION);
 assert.equal(probe.reason,'staging-auth-getuser-readonly-pass');
 assert.equal(req,3);
 assert.equal(await adapters.verifyOwned(USER,EMAIL),true);
 assert.equal(await adapters.delete(USER),true);
 assert.equal(await adapters.isDeleted(USER),true);
 assert.deepEqual(calls,['init','init','create','signin','read-owned','delete','read-owned']);
});
test('SDK preflight only accepts an empty, verified first page of Auth users',async()=>{
 const E=settings(),P=policy();
 for(const ans of [
  {data:{users:[]},error:null},
  {data:{users:[{id:USER}]},error:null},
  {data:{},error:null},
  {data:null,error:{status:403}}
 ]){
  const server={auth:{admin:{
   listUsers:async opts=>{
    assert.deepEqual(opts,{page:1,perPage:2});
    return ans;
   },
   createUser:async()=>{throw Error('unexpected write');},
   getUserById:async()=>({data:{user:null},error:{status:404}}),
   deleteUser:async()=>{throw Error('unexpected write');}
  }}};
  const client={auth:{signInWithPassword:async()=>{throw Error('unexpected signin');}}};
  const a=makeSupabaseSdkStagingAdapters(E,P,(_url,key)=>
   key===E.MLOS_STAGING_ADMIN_SECRET_KEY?server:client);
  const found=await a.auditEmpty();
  assert.equal(found,Array.isArray(ans.data?.users)&&ans.data.users.length===0&&!ans.error);
 }
});
test('SDK post-deletion bearer check requires 401/403 and uses only GET against pinned staging Auth',async()=>{
 const E=settings(),P=policy();
 for(const status of [200,201,400,401,403,404,429,500]){
  const captured=[];
  const server={auth:{admin:{
   listUsers:async()=>({data:{users:[]},error:null}),
   createUser:async()=>({data:{user:null},error:null}),
   getUserById:async()=>({data:{user:null},error:{status:404}}),
   deleteUser:async()=>({data:{},error:null})
  }}};
  const client={auth:{signInWithPassword:async()=>({data:null,error:{status:401}})}};
  const adapters=makeSupabaseSdkStagingAdapters(E,P,
   (_url,key)=>key===E.MLOS_STAGING_ADMIN_SECRET_KEY?server:client,
   async(url,opts)=>{captured.push({url,opts});return {status};});
  assert.equal(await adapters.verifyTokenDenied(token()),status===401||status===403);
  assert.equal(captured.length,1);
  assert.equal(captured[0].url,ORIGIN+'/auth/v1/user');
  assert.equal(captured[0].opts.method,'GET');
  assert.equal(captured[0].opts.headers.apikey,E.MLOS_STAGING_PUBLISHABLE_KEY);
  assert.equal(captured[0].opts.headers.Authorization,'Bearer '+token());
 }
});
test('SDK rejects wrong project before client initialization and fails closed on absent synthetic marker',async()=>{
 const E=settings(),P=policy();
 let creates=0;
 assert.throws(()=>makeSupabaseSdkStagingAdapters(
  {...E,MLOS_STAGING_REF:'iyapppmeieqhflnzslao'},P,
  ()=>{creates++;return {};}),
 /staging-sdk-target-denied/);
 assert.equal(creates,0);
 const idObj={id:USER,email:EMAIL,app_metadata:{}};
 const server={auth:{admin:{
  listUsers:async()=>({data:{users:[]},error:null}),
  createUser:async()=>({data:{user:idObj},error:null}),
  getUserById:async()=>({data:{user:idObj},error:null}),
  deleteUser:async()=>({error:{status:403}})
 }}};
 const client={auth:{signInWithPassword:async()=>({data:null,error:{status:401}})}};
 const adapters=makeSupabaseSdkStagingAdapters(E,P,(_url,key)=>
  key===E.MLOS_STAGING_ADMIN_SECRET_KEY?server:client);
 await assert.rejects(()=>adapters.create(identity()),/identity-unverified/);
 assert.equal(await adapters.verifyOwned(USER,EMAIL),false);
 assert.equal(await adapters.delete(USER),false);
 assert.equal(await adapters.isDeleted(USER),false);
});
test('SDK user lookup error 401 or an empty success response NEVER counts as verified deletion',async()=>{
 const E=settings(),P=policy();
 for(const answer of [
  {data:{user:null},error:{status:401}},
  {data:{user:null},error:{status:403}},
  {data:{user:null},error:{status:500}},
  {data:{user:null},error:null}
 ]){
  const server={auth:{admin:{
   listUsers:async()=>({data:{users:[]},error:null}),
   createUser:async()=>({data:{user:null},error:null}),
   getUserById:async()=>answer,
   deleteUser:async()=>({data:{},error:null})
  }}};
  const adapters=makeSupabaseSdkStagingAdapters(E,P,(_url,key)=>
   key===E.MLOS_STAGING_ADMIN_SECRET_KEY?server:{auth:{signInWithPassword:async()=>({})}});
  assert.equal(await adapters.isDeleted(USER),false);
 }
});

test('operator preflight verifies private empty journal directory and hosted empty Auth users without any writes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mlos-op-preflight-'));
 const path=join(dir,'recovery.jsonl');
 try{
  const E={...settings(),MLOS_STAGING_IDENTITY_JOURNAL:path};
  const calls=[];
  const good=await checkStagingSyntheticOperatorPreflight({
   settings:E,policy:policy(),adapters:{auditEmpty:async()=>{calls.push('read-only-list');return true;}}
  });
  assert.equal(good.reason,'staging-operator-readonly-preflight-passed');
  assert.equal(good.operatorEnvironmentPreflightReady,true);
  assert.equal(good.hostedSignedJwtEvidence,false);
  assert.equal(good.syntheticAccountDeletionVerified,false);
  assert.equal(good.sourceReviewWriteApproved,false);
  assert.equal(good.productionReleaseApproved,false);
  assert.equal(good.learnerPublicationApproved,false);
  assert.equal(Object.isFrozen(good),true);
  assert.deepEqual(calls,['read-only-list']);
  await assert.rejects(stat(path),{code:'ENOENT'});
  // An unresolved recovery marker MUST block all future creates, without
  // clearing, reading or modifying the marker and without hitting Auth.
  await makeJournal(path).begin(EMAIL);
  const original=await readFile(path,'utf8');
  const blocked=await checkStagingSyntheticOperatorPreflight({
   settings:E,policy:policy(),adapters:{auditEmpty:async()=>{throw Error('must not call hosted Auth');}}
  });
  assert.equal(blocked.reason,'staging-operator-existing-recovery-journal');
  assert.equal(blocked.operatorEnvironmentPreflightReady,false);
  assert.equal(await readFile(path,'utf8'),original);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('operator preflight blocks nonprivate directory, wrong project and unavailable or nonempty hosted inventory',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'mlos-op-preflight-negative-'));
 const path=join(dir,'journal.jsonl'),E={...settings(),MLOS_STAGING_IDENTITY_JOURNAL:path};
 try{
  for(const auditEmpty of [async()=>false,async()=>null,async()=>{throw Error('network');}]){
   const blocked=await checkStagingSyntheticOperatorPreflight({
    settings:E,policy:policy(),adapters:{auditEmpty}
   });
   assert.equal(blocked.operatorEnvironmentPreflightReady,false);
   assert.match(blocked.reason,/inventory-not-empty-or-unverified|inventory-unavailable/);
   assert.equal(blocked.productionReleaseApproved,false);
   await assert.rejects(stat(path),{code:'ENOENT'});
  }
  const denied=await checkStagingSyntheticOperatorPreflight({
   settings:{...E,MLOS_STAGING_REF:'iyapppmeieqhflnzslao'},
   policy:policy(),adapters:{auditEmpty:async()=>{throw Error('must not query');}}
  });
  assert.equal(denied.reason,'staging-operator-preflight-isolation-denied');
  await chmod(dir,0o755);
  const insecure=await checkStagingSyntheticOperatorPreflight({
   settings:E,policy:policy(),adapters:{auditEmpty:async()=>{throw Error('must not query');}}
  });
  assert.equal(insecure.reason,'staging-operator-private-journal-directory-required');
  await chmod(dir,0o700);
 }finally{await rm(dir,{recursive:true,force:true});}
});
