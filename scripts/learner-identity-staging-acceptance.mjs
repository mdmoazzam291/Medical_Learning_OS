// Operator-only Supabase staging probe; never creates/deletes users or accepts secrets via flags.
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {probeLearnerIdentitySessions} from './lib/learner-identity-session-probe.js';
const ref='vwtdwafjrraptrgeshzt',base='https://'+ref+'.supabase.co',api=base+'/functions/v1/learner-identity-api';
const fail=reason=>{process.stdout.write(JSON.stringify({status:'blocked',reason,signedInAssertionsPassed:false,cleanupVerified:false,productionChanged:false})+'\n');process.exitCode=2;};
const mode=process.argv[2];
const env=process.env;
if(process.argv.length!==3||!['--preflight','--run'].includes(mode))fail('use_preflight_or_run_without_credentials_in_arguments');
else if(env.MLOS_STAGING_REF!==ref||env.MLOS_STAGING_URL!==base||env.MLOS_STAGING_IDENTITY_CONFIRM!=='STAGING_LEARNER_IDENTITY_ACCEPTANCE')fail('explicit_staging_scope_required');
else if(!/^sb_publishable_[A-Za-z0-9_-]{12,}$/.test(env.MLOS_STAGING_PUBLISHABLE_KEY||'')||['A','B'].some(k=>!env['MLOS_STAGING_TEST_TOKEN_'+k]||!env['MLOS_STAGING_TEST_USER_'+k]))fail('trusted_operator_credentials_and_owned_test_ids_required');
else{
 try{
  const sdkDir=new URL('../ops/staging-auth-sdk/',import.meta.url),meta=JSON.parse(await readFile(new URL('node_modules/@supabase/supabase-js/package.json',sdkDir),'utf8'));
  if(meta.version!=='2.118.0')throw Error('sdk');
  const require=createRequire(new URL('package.json',sdkDir));const {createClient}=await import(pathToFileURL(require.resolve('@supabase/supabase-js')).href);
  if(mode==='--preflight')process.stdout.write(JSON.stringify({status:'ready_for_identity_verification_only',credentialsProjectBindingIndependentlyRequired:true,signedInAssertionsPassed:false,cleanupVerified:false})+'\n');
  else{
   const client=createClient(base,env.MLOS_STAGING_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(10000)})}});
   const result=await probeLearnerIdentitySessions({tokens:['A','B'].map(k=>env['MLOS_STAGING_TEST_TOKEN_'+k]),expectedIds:['A','B'].map(k=>env['MLOS_STAGING_TEST_USER_'+k]),async verifyIdentity(token){const {data,error}=await client.auth.getUser(token);if(error)return null;return data.user;},async request({token,path,method}){
    const headers={Origin:'http://localhost:3000'};if(token)headers.Authorization='Bearer '+token;
    const r=await fetch(api+path,{method,headers,redirect:'error',signal:AbortSignal.timeout(10000)});
    const reader=r.body?.getReader();let bytes=0,text='';const decoder=new TextDecoder();
    try{if(reader)for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>16384)throw Error('response_too_large');text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}
    finally{if(reader){void reader.cancel().catch(()=>{});reader.releaseLock();}}
    return {status:r.status,body:JSON.parse(text),privateResponse:r.headers.get('cache-control')==='no-store, private'&&r.headers.get('access-control-allow-origin')==='http://localhost:3000'};
   }});
   process.stdout.write(JSON.stringify({...result,executionMode:'trusted_operator_network',operatorAttestationStillRequired:true})+'\n');if(result.status!=='passed')process.exitCode=2;
  }
 }catch{fail('operator_sdk_or_network_unavailable_no_automatic_retry');}
}
