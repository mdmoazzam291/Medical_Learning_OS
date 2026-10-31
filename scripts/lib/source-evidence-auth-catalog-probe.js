// Provider-owned Auth metadata inspection ONLY. No row values, migrations,
// role grants, table locks, DDL or network connections to hosted projects.
const denied=()=>new Error('local_auth_catalog_not_accepted');
export const LOCAL_AUTH_CATALOG_CONFIRM='ISOLATED_LOCAL_GOTRUE_TEST_STACK';

export function validateLocalAuthCatalogTarget({databaseUrl,confirmation}){
 if(confirmation!==LOCAL_AUTH_CATALOG_CONFIRM||typeof databaseUrl!=='string'||databaseUrl.length>2048)throw denied();
 let parsed;
 try{parsed=new URL(databaseUrl);}catch{throw denied();}
 if(!['postgres:','postgresql:'].includes(parsed.protocol)||
    parsed.hostname!=='127.0.0.1'||parsed.port!=='54322'||
    decodeURIComponent(parsed.username)!=='postgres'||parsed.pathname!=='/postgres'||
    !parsed.password||parsed.search||parsed.hash)throw denied();
 return Object.freeze({host:parsed.hostname,port:Number(parsed.port),database:'postgres'});
}
const relationsSql=`select c.relname as table_name, pg_catalog.pg_get_userbyid(c.relowner) as owner_name,
 c.relrowsecurity as rls_enabled,c.relforcerowsecurity as rls_forced,
 (select count(*)::int from pg_catalog.pg_policy p where p.polrelid=c.oid) as policy_count,
 (select count(*)::int from pg_catalog.pg_trigger t where t.tgrelid=c.oid and not t.tgisinternal) as user_trigger_count
 from pg_catalog.pg_class c
 join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where n.nspname='auth' and c.relname in ('users','sessions') and c.relkind='r'
 order by c.relname`;
const columnsSql=`select c.relname as table_name,a.attname as column_name,
 pg_catalog.format_type(a.atttypid,a.atttypmod) as column_type
 from pg_catalog.pg_attribute a
 join pg_catalog.pg_class c on c.oid=a.attrelid
 join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where n.nspname='auth' and c.relname in ('users','sessions')
 and a.attnum>0 and not a.attisdropped order by c.relname,a.attnum`;
const rolesSql=`select rolname,rolcanlogin,rolbypassrls,rolsuper
 from pg_catalog.pg_roles
 where rolname in ('supabase_auth_admin','service_role','evidence_gateway','evidence_executor','evidence_authority_locker') order by rolname`;
const versionSql="select current_setting('server_version_num')::int as server_version_num, current_setting('transaction_read_only') as read_only";

export async function runLocalAuthCatalogProbe({databaseUrl,confirmation,createClient}){
 validateLocalAuthCatalogTarget({databaseUrl,confirmation});
 if(typeof createClient!=='function')throw denied();
 let client,connected=false;
 try{
  client=createClient(databaseUrl);
  if(!client||typeof client.connect!=='function'||typeof client.query!=='function'||typeof client.end!=='function')throw denied();
  await client.connect();connected=true;
  // Read-only transaction guards against accidentally broadening the probe.
  await client.query('begin read only');
  const [v,t,c,r]=await Promise.all([
   // Use sequential SQL requests below instead, to avoid parallel statements
   // on one connection and make the read-only boundary auditable.
  ]);
  const version=(await client.query(versionSql)).rows?.[0];
  const rel=(await client.query(relationsSql)).rows;
  const cols=(await client.query(columnsSql)).rows;
  const roles=(await client.query(rolesSql)).rows;
  if(version?.read_only!=='on'||!Number.isInteger(version?.server_version_num)||
     !Array.isArray(rel)||rel.length!==2||!Array.isArray(cols)||!Array.isArray(roles))throw denied();
  const tables=Object.fromEntries(rel.map(x=>[x.table_name,x]));
  if(!tables.users||!tables.sessions||rel.some(x=>x.owner_name!=='supabase_auth_admin'))throw denied();
  const has=(name,col,type)=>cols.some(x=>x.table_name===name&&x.column_name===col&&x.column_type===type);
  if(!has('users','id','uuid')||!has('sessions','id','uuid')||
     !has('sessions','user_id','uuid')||!has('sessions','not_after','timestamp with time zone'))throw denied();
  const roleMap=Object.fromEntries(roles.map(x=>[x.rolname,x]));
  if(!roleMap.supabase_auth_admin||!roleMap.service_role||
     roleMap.evidence_gateway||roleMap.evidence_executor||roleMap.evidence_authority_locker)throw denied();
  const output=Object.freeze({
   result:'local_gotrue_catalog_observed',environment:'disposable_local_postgresql',
   serverMajor:Math.floor(version.server_version_num/10000),
   authOwner:'supabase_auth_admin',
   authRlsEnabled:!!tables.users.rls_enabled&&!!tables.sessions.rls_enabled,
   policyCounts:{users:tables.users.policy_count,sessions:tables.sessions.policy_count},
   userTriggerCounts:{users:tables.users.user_trigger_count,sessions:tables.sessions.user_trigger_count},
   sessionHasNotAfter:true,
   serviceRoleBypassesRls:roleMap.service_role.rolbypassrls===true,
   restrictedGatewayAbsent:true,
   providerWriterLocks:'not_tested',restrictedAuthAclGrants:'not_tested',
   hostedAuthority:'not_tested',deployApproved:false
  });
  await client.query('rollback');connected=false;
  return output;
 }catch{throw denied();}
 finally{
  if(client){
   if(connected)try{await client.query('rollback');}catch{}
   try{await client.end();}catch{}
  }
 }
}
