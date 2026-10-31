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
const privilegeSql=`select r.rolname as role_name,c.relname as table_name,
 pg_catalog.has_schema_privilege(r.oid,n.oid,'USAGE') as schema_usage,
 pg_catalog.has_table_privilege(r.oid,c.oid,'SELECT') as table_select,
 pg_catalog.has_column_privilege(r.oid,c.oid,'id','SELECT') as id_select,
 pg_catalog.has_column_privilege(r.oid,c.oid,'id','UPDATE') as id_update,
 case when c.relname='sessions' then pg_catalog.has_column_privilege(r.oid,c.oid,'user_id','SELECT') else null end as user_id_select,
 case when c.relname='sessions' then pg_catalog.has_column_privilege(r.oid,c.oid,'not_after','SELECT') else null end as not_after_select
 from pg_catalog.pg_roles r
 cross join pg_catalog.pg_class c
 join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where r.rolname in ('anon','authenticated','service_role','supabase_auth_admin')
   and n.nspname='auth' and c.relname in ('users','sessions') and c.relkind='r'
 order by r.rolname,c.relname`;
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
  const version=(await client.query(versionSql)).rows?.[0];
  const rel=(await client.query(relationsSql)).rows;
  const cols=(await client.query(columnsSql)).rows;
  const roles=(await client.query(rolesSql)).rows;
  const privileges=(await client.query(privilegeSql)).rows;
  if(version?.read_only!=='on'||!Number.isInteger(version?.server_version_num)||
     !Array.isArray(rel)||rel.length!==2||!Array.isArray(cols)||
     !Array.isArray(roles)||!Array.isArray(privileges))throw denied();
  const tables=Object.fromEntries(rel.map(x=>[x.table_name,x]));
  if(!tables.users||!tables.sessions||rel.some(x=>x.owner_name!=='supabase_auth_admin'))throw denied();
  const has=(name,col,type)=>cols.some(x=>x.table_name===name&&x.column_name===col&&x.column_type===type);
  if(!has('users','id','uuid')||!has('sessions','id','uuid')||
     !has('sessions','user_id','uuid')||!has('sessions','not_after','timestamp with time zone'))throw denied();
  const roleMap=Object.fromEntries(roles.map(x=>[x.rolname,x]));
  if(!roleMap.supabase_auth_admin||!roleMap.service_role||
     roleMap.evidence_gateway||roleMap.evidence_executor||roleMap.evidence_authority_locker)throw denied();
  // Fixed role/target inventory: absence, duplication or malformed catalog
  // boolean is inconclusive. Never turn missing grants into assumed denial.
  const expectedRoles=['anon','authenticated','service_role','supabase_auth_admin'];
  const authRoleMatrix={};
  if(privileges.length!==expectedRoles.length*2)throw denied();
  for(const row of privileges){
   if(!expectedRoles.includes(row.role_name)||!['sessions','users'].includes(row.table_name))throw denied();
   for(const field of ['schema_usage','table_select','id_select','id_update'])
    if(typeof row[field]!=='boolean')throw denied();
   for(const field of ['user_id_select','not_after_select']){
    if(row.table_name==='sessions'&&typeof row[field]!=='boolean')throw denied();
    if(row.table_name==='users'&&row[field]!==null)throw denied();
   }
   const name=row.role_name+'_'+row.table_name;
   if(authRoleMatrix[name])throw denied();
   authRoleMatrix[name]=Object.freeze({
    schemaUsage:row.schema_usage,tableSelect:row.table_select,
    idSelect:row.id_select,idUpdate:row.id_update,
    ...(row.table_name==='sessions'?{userIdSelect:row.user_id_select,
      notAfterSelect:row.not_after_select}:{})
   });
  }
  if(Object.keys(authRoleMatrix).length!==8)throw denied();
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
   existingRoleAuthPrivilegeMatrix:authRoleMatrix,
   // Grants are not authorization: RLS can still deny actual rows, and no
   // restricted direct-login gateway exists. Do not infer a viable role.
   restrictedGatewaySessionAccess:'not_demonstrated',
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
