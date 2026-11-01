// Read-only inspection against a disposable local GoTrue/PostgreSQL stack.
// No hosted links, credential logs, Auth row reads, grants or schema writes.
import {validateLocalAuthCatalogTarget,runLocalAuthCatalogProbe,LOCAL_AUTH_CATALOG_CONFIRM} from './lib/source-evidence-auth-catalog-probe.js';
async function main(){
 const e=process.env,config={
  databaseUrl:e.MLOS_LOCAL_AUTH_DB_URL,
  confirmation:e.MLOS_LOCAL_AUTH_PROBE_CONFIRM
 };
 validateLocalAuthCatalogTarget(config);
 if(typeof e.MLOS_LOCAL_AUTH_PG_MODULE_URL!=='string'||
    !e.MLOS_LOCAL_AUTH_PG_MODULE_URL.startsWith('file:///'))throw Error('local_auth_catalog_not_accepted');
 const {Client}=await import(e.MLOS_LOCAL_AUTH_PG_MODULE_URL);
 if(typeof Client!=='function')throw Error('local_auth_catalog_not_accepted');
 const result=await runLocalAuthCatalogProbe({...config,createClient:connectionString=>
  new Client({connectionString,connectionTimeoutMillis:5000,statement_timeout:5000,query_timeout:5000})});
 process.stdout.write(JSON.stringify(result)+'\n');
}
try{await main();}
catch{
 process.stderr.write('LOCAL_AUTH_CATALOG_NOT_ACCEPTED: local catalog checks failed; no schema rows, account identifiers or credentials printed.\n');
 process.exitCode=1;
}
