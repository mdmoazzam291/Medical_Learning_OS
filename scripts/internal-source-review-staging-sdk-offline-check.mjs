// ADR-134: offline real-SDK API contract test. Run ONLY in a disposable CI
// directory with a pinned test SDK. Do not supply any actual keys or JWTs.
// Validates the SDK object shape and factory without a hosted Auth write.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {makeSupabaseSdkStagingAdapters} from './internal-source-review-staging-test-identity-lifecycle.mjs';

const EXPECTED_SDK='2.118.0';
const STAGING_REF='vwtdwafjrraptrgeshzt';
const STAGING_ORIGIN='https://'+STAGING_REF+'.supabase.co';
function errorCode(message){console.error(message);process.exitCode=1;}
async function main(){
 if(process.argv.length!==3||!process.argv[2]?.startsWith('/')){
  errorCode('offline_sdk_root_required');return;
 }
 const dir=resolve(process.argv[2]);
 const version=JSON.parse(await readFile(join(dir,'node_modules/@supabase/supabase-js/package.json'),'utf8')).version;
 assert.equal(version,EXPECTED_SDK,'unexpected or unpinned Supabase SDK version');
 const req=createRequire(join(dir,'package.json'));
 const sdk=req('@supabase/supabase-js');
 assert.equal(typeof sdk.createClient,'function');
 const events=[];
 const failNetwork=async()=>{events.push('unexpected-network');throw Error('offline-compatibility-network-denied');};
 const orig=sdk.createClient;
 let factoryCalls=0;
 const wrapped=(url,key,options)=>{
  factoryCalls++;
  assert.equal(url,STAGING_ORIGIN);
  assert.equal(options.auth.persistSession,false);
  assert.equal(options.auth.autoRefreshToken,false);
  assert.equal(options.auth.detectSessionInUrl,false);
  assert.ok([('sb_secret_'+'a'.repeat(40)),('sb_publishable_'+'b'.repeat(40))].includes(key));
  return orig(url,key,{...options,global:{fetch:failNetwork}});
 };
 const settings={
  MLOS_STAGING_IDENTITY_CONFIRM:'STAGING_SYNTHETIC_CREATE_AND_DELETE',
  MLOS_STAGING_REF:STAGING_REF,MLOS_STAGING_URL:STAGING_ORIGIN,
  MLOS_STAGING_PUBLISHABLE_KEY:'sb_publishable_'+'b'.repeat(40),
  MLOS_STAGING_ADMIN_SECRET_KEY:'sb_secret_'+'a'.repeat(40),
  MLOS_STAGING_IDENTITY_JOURNAL:'/tmp/mlos-synthetic-staging-recovery-unused.jsonl'
 };
 const policy=JSON.parse(await readFile(new URL('../ops/prototypes/source-evidence/internal-review-staging-policy.json',import.meta.url),'utf8'));
 const adapters=makeSupabaseSdkStagingAdapters(settings,policy,wrapped,failNetwork);
 for(const name of ['create','signIn','authProbe','verifyOwned','delete','isDeleted'])
  assert.equal(typeof adapters[name],'function',name);
 assert.equal(factoryCalls,2,'must construct exactly separate admin/public clients');
 assert.deepEqual(events,[],'SDK construction must not make network requests');
 // Ensure project gating holds before constructing a client with a wrong ref.
 let wrongCalled=false;
 assert.throws(()=>makeSupabaseSdkStagingAdapters({...settings,MLOS_STAGING_REF:'iyapppmeieqhflnzslao'},policy,()=>{
  wrongCalled=true;throw Error('should-not-init');
 }),/staging-sdk-target-denied/);
 assert.equal(wrongCalled,false);
 console.log('staging_sdk_'+EXPECTED_SDK+'_offline_contract_pass_no_credentials_no_http');
}
main().catch(()=>errorCode('staging_sdk_offline_contract_failed_closed'));
