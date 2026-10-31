// Real GoTrue acceptance against a disposable, loopback-only local CLI stack.
// Manual opt-in. This file never calls a hosted project or stores login data.
import {randomBytes} from 'node:crypto';
import {validateNonproductionAuthProbeConfig,runIsolatedAuthProviderProbe} from './lib/source-evidence-auth-provider-probe.js';

const URL='http://127.0.0.1:54321';
const REF='local-gotrue-only';
const CONFIRM='ISOLATED_LOCAL_GOTRUE_TEST_STACK';
let phase='config';

async function main(){
 const e=process.env;
 if(e.MLOS_LOCAL_AUTH_PROBE_CONFIRM!==CONFIRM||
    e.MLOS_LOCAL_AUTH_PROBE_URL!==URL||
    typeof e.MLOS_LOCAL_AUTH_PROBE_SDK_MODULE_URL!=='string'||
    !e.MLOS_LOCAL_AUTH_PROBE_SDK_MODULE_URL.startsWith('file:///'))throw Error('local_auth_probe_isolation_denied');
 const key=e.MLOS_LOCAL_AUTH_PROBE_PUBLISHABLE_KEY;
 if(typeof key!=='string'||!key.startsWith('sb_publishable_')||key.length>400)throw Error('local_auth_probe_key_invalid');
 const nonce=randomBytes(12).toString('hex');
 const accountA={email:`a+mlos-probe-${nonce}@mlos.local`,password:randomBytes(32).toString('base64url')};
 const accountB={email:`b+mlos-probe-${nonce}@mlos.local`,password:randomBytes(32).toString('base64url')};
 const config={url:URL,projectRef:REF,confirmation:CONFIRM,accountA,accountB};
 validateNonproductionAuthProbeConfig(config);
 // Never dynamically load the SDK until every host/key/identity gate passes.
 phase='sdk_import';
 const sdk=await import(e.MLOS_LOCAL_AUTH_PROBE_SDK_MODULE_URL);
 if(typeof sdk.createClient!=='function')throw Error('local_auth_probe_sdk_invalid');
 const createClient=url=>sdk.createClient(url,key,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
 });
 for(const [index,account] of [accountA,accountB].entries()){
  phase=index===0?'signup_a':'signup_b';
  const c=createClient(URL);
  if(c.supabaseUrl!==URL)throw Error('local_auth_probe_client_wrong_host');
  const {data,error}=await c.auth.signUp(account);
  if(error||!data?.user?.id||!data?.session?.access_token)throw Error('local_auth_probe_signup_unavailable');
  const out=await c.auth.signOut({scope:'local'});
  if(out?.error)throw Error('local_auth_probe_signup_cleanup_failed');
 }
 phase='provider_protocol';
 const result=await runIsolatedAuthProviderProbe({...config,createClient,onPhase:p=>{phase='protocol_'+p;}});
 process.stdout.write(JSON.stringify({...result,environment:'disposable_local_gotrue'})+'\n');
}
try{await main();}
catch{
 process.stderr.write('LOCAL_AUTH_PROBE_NOT_ACCEPTED ('+phase+'): local setup or provider check failed; no credentials printed.\n');
 process.exitCode=1;
}
