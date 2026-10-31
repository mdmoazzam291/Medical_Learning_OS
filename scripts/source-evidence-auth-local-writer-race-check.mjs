// Opt-in real GoTrue session-writer lock experiment; disposable loopback only.
// No hosted projects, Auth schema mutations, privileged credential logging.
import {randomBytes} from 'node:crypto';
import {validateLocalGoTrueWriterRaceConfig,runLocalGoTrueWriterRace} from './lib/source-evidence-auth-local-writer-race.js';
const confirmation='ISOLATED_LOCAL_GOTRUE_TEST_STACK';
const url='http://127.0.0.1:54321';
async function main(){
 const e=process.env;
 if(e.MLOS_LOCAL_AUTH_PROBE_CONFIRM!==confirmation||
    e.MLOS_LOCAL_AUTH_PROBE_URL!==url||
    typeof e.MLOS_LOCAL_AUTH_PG_MODULE_URL!=='string'||
    !e.MLOS_LOCAL_AUTH_PG_MODULE_URL.startsWith('file:///')||
    typeof e.MLOS_LOCAL_AUTH_PROBE_SDK_MODULE_URL!=='string'||
    !e.MLOS_LOCAL_AUTH_PROBE_SDK_MODULE_URL.startsWith('file:///'))throw Error('local_auth_writer_race_not_accepted');
 const key=e.MLOS_LOCAL_AUTH_PROBE_PUBLISHABLE_KEY;
 if(typeof key!=='string'||!key.startsWith('sb_publishable_')||key.length>400)throw Error('local_auth_writer_race_not_accepted');
 const nonce=randomBytes(12).toString('hex');
 const accountA={email:`a+mlos-probe-${nonce}@mlos.local`,password:randomBytes(32).toString('base64url')};
 const accountB={email:`b+mlos-probe-${nonce}@mlos.local`,password:randomBytes(32).toString('base64url')};
 const config={databaseUrl:e.MLOS_LOCAL_AUTH_DB_URL,confirmation,url,accountA,accountB};
 validateLocalGoTrueWriterRaceConfig(config);
 // Load both modules only after exact loopback and disposable identity gates.
 const [{Client},sdk]=await Promise.all([
  import(e.MLOS_LOCAL_AUTH_PG_MODULE_URL),
  import(e.MLOS_LOCAL_AUTH_PROBE_SDK_MODULE_URL)
 ]);
 if(typeof Client!=='function'||typeof sdk.createClient!=='function')throw Error('local_auth_writer_race_not_accepted');
 const result=await runLocalGoTrueWriterRace({...config,
  createDbClient:connectionString=>new Client({
   connectionString,connectionTimeoutMillis:4000,statement_timeout:6000,query_timeout:6000
  }),
  createAuthClient:origin=>sdk.createClient(origin,key,{
   auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  })
 });
 process.stdout.write(JSON.stringify(result)+'\n');
}
try{await main();}
catch{
 process.stderr.write('LOCAL_AUTH_WRITER_RACE_NOT_ACCEPTED: disposable provider session-lock measurement failed. No credentials or session identifiers printed.\n');
 process.exitCode=1;
}
