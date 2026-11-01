import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runStagingSyntheticIdentityLifecycle,validateStagingIdentityLifecycleSettings}
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
function scenario({create,signIn,probe,del,verify,begin,associate,clear}={}){
 const steps=[];
 const journal={
  begin:async email=>{steps.push('journal-begin');assert.equal(email,EMAIL);if(begin)await begin();},
  associate:async(email,userId)=>{steps.push('journal-associate');assert.equal(email,EMAIL);assert.equal(userId,USER);if(associate)await associate();},
  clear:async()=>{steps.push('journal-clear');if(clear)await clear();}
 };
 const adapters={
  create:async user=>{steps.push('create');if(user.email!==EMAIL||user.password!==PASSWORD)steps.push('synthetic-identity-mismatch');return create?create():{userId:USER};},
  signIn:async user=>{steps.push('signin');assert.equal(user.email,EMAIL);return signIn?signIn():{userId:USER,token:token()};},
  authProbe:async(t,u,s)=>{steps.push('hosted-readonly-auth-probe');assert.equal(t,token());assert.equal(u,USER);assert.equal(s,SESSION);return probe?probe():{reason:'staging-auth-getuser-readonly-pass',hostedJwtReadOnlyEvidence:true};},
  delete:async id=>{steps.push('delete');assert.equal(id,USER);return del?del():true;},
  isDeleted:async id=>{steps.push('verify-deleted');assert.equal(id,USER);return verify?verify():true;}
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
 assert.deepEqual(steps,['journal-begin','create','journal-associate',
  'signin','hosted-readonly-auth-probe','delete','verify-deleted','journal-clear']);
 assert.equal(result.reason,'staging-auth-test-deleted');
 assert.equal(result.hostedSignedJwtEvidence,true);
 assert.equal(result.syntheticAccountDeletionVerified,true);
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
test('creation response lost leaves journal with no auto-retry, manual cleanup required',async()=>{
 const {run,steps}=scenario({create:()=>{throw Error('server may have created user');}});
 const out=await run();
 assert.equal(out.reason,'staging-create-ambiguous-reconcile-journal');
 assert.equal(out.requiresManualReconciliation,true);
 assert.equal(out.syntheticAccountDeletionVerified,false);
 assert.deepEqual(steps,['journal-begin','create']);
 noAuthority(out);
});
test('signup succeeded but sign-in fails -> user is still deleted and deletion checked',async()=>{
 const {run,steps}=scenario({signIn:()=>{throw Error('password grant failed');}});
 const out=await run();
 assert.equal(out.reason,'staging-auth-failed-identity-deleted');
 assert.equal(out.hostedSignedJwtEvidence,false);
 assert.equal(out.syntheticAccountDeletionVerified,true);
 assert.deepEqual(steps,['journal-begin','create','journal-associate',
  'signin','delete','verify-deleted','journal-clear']);
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
  assert.equal(out.reason,'staging-auth-failed-identity-deleted');
  assert.equal(out.syntheticAccountDeletionVerified,true);
  assert.equal(out.hostedSignedJwtEvidence,false);
  assert.equal(steps.at(-1),'journal-clear');
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
 assert.deepEqual(a.steps,['journal-begin']);
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
 assert.match(source,/method:'DELETE'/);
 assert.match(source,/r\.status===404/);
 assert.match(source,/email_confirm:true/);
 assert.match(source,/app_metadata:\{mlos_staging_synthetic:true\}/);
 assert.doesNotMatch(source,/\/rest\/v1\/rpc\//);
 assert.doesNotMatch(source,/auth\.sessions/);
});
