// Manual-only opt-in, isolated test accounts. Never called by CI or production runtime.
// Requires an externally installed, pinned server-side SDK module; no app dependency.
import {validateNonproductionAuthProbeConfig,runIsolatedAuthProviderProbe} from './lib/source-evidence-auth-provider-probe.js';

async function main(){
 const e=process.env;
 const cfg={
  url:e.MLOS_AUTH_PROBE_URL,
  projectRef:e.MLOS_AUTH_PROBE_PROJECT_REF,
  confirmation:e.MLOS_AUTH_PROBE_CONFIRM,
  accountA:{email:e.MLOS_AUTH_PROBE_ACCOUNT_A_EMAIL,password:e.MLOS_AUTH_PROBE_ACCOUNT_A_PASSWORD},
  accountB:{email:e.MLOS_AUTH_PROBE_ACCOUNT_B_EMAIL,password:e.MLOS_AUTH_PROBE_ACCOUNT_B_PASSWORD}
 };
 const {url}=validateNonproductionAuthProbeConfig(cfg);
 const key=e.MLOS_AUTH_PROBE_PUBLISHABLE_KEY;
 if(typeof key!=='string'||!key.startsWith('sb_publishable_')||key.length>400||
    typeof e.MLOS_AUTH_PROBE_SDK_MODULE_URL!=='string'||
    !e.MLOS_AUTH_PROBE_SDK_MODULE_URL.startsWith('file:///'))throw Error('auth_probe_isolation_not_established');
 const sdk=await import(e.MLOS_AUTH_PROBE_SDK_MODULE_URL);
 if(typeof sdk.createClient!=='function')throw Error('auth_probe_dependency_invalid');
 const createClient=()=>sdk.createClient(url,key,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
 });
 const report=await runIsolatedAuthProviderProbe({createClient,accountA:cfg.accountA,accountB:cfg.accountB});
 process.stdout.write(JSON.stringify(report)+'\n');
}
try{await main();}
catch{process.stderr.write('AUTH_PROBE_NOT_ACCEPTED: inspect isolated test setup privately; no token/identity details printed.\n');process.exitCode=1;}
