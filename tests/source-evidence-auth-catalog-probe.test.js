import test from 'node:test';
import assert from 'node:assert/strict';
import {validateLocalAuthCatalogTarget,runLocalAuthCatalogProbe,LOCAL_AUTH_CATALOG_CONFIRM} from '../scripts/lib/source-evidence-auth-catalog-probe.js';
const target={databaseUrl:'postgresql://postgres:synthetic-only@127.0.0.1:54322/postgres',
 confirmation:LOCAL_AUTH_CATALOG_CONFIRM};
function fixture({mutate}={}){
 const sql=[];
 const relations=[
  {table_name:'sessions',owner_name:'supabase_auth_admin',rls_enabled:true,rls_forced:false,policy_count:0,user_trigger_count:0},
  {table_name:'users',owner_name:'supabase_auth_admin',rls_enabled:true,rls_forced:false,policy_count:0,user_trigger_count:0}
 ];
 const columns=[{table_name:'users',column_name:'id',column_type:'uuid'},
 {table_name:'sessions',column_name:'id',column_type:'uuid'},
 {table_name:'sessions',column_name:'user_id',column_type:'uuid'},
 {table_name:'sessions',column_name:'not_after',column_type:'timestamp with time zone'}];
 const roles=[
 {rolname:'supabase_auth_admin',rolcanlogin:true,rolbypassrls:true,rolsuper:false},
 {rolname:'service_role',rolcanlogin:false,rolbypassrls:true,rolsuper:false}
 ];
 const privileges=['anon','authenticated','service_role','supabase_auth_admin'].flatMap(roleName=>
  ['sessions','users'].map(tableName=>({
   role_name:roleName,table_name:tableName,
   schema_usage:roleName!=='anon',table_select:roleName==='supabase_auth_admin',
   id_select:roleName==='supabase_auth_admin',
   id_update:roleName==='supabase_auth_admin',
   user_id_select:tableName==='sessions'?roleName==='supabase_auth_admin':null,
   not_after_select:tableName==='sessions'?roleName==='supabase_auth_admin':null
  })));
 if(mutate)mutate({relations,columns,roles,privileges});
 let ended=false,connected=false;
 return {sql,get ended(){return ended;},createClient(){
  return {async connect(){connected=true;},
   async query(q){
    assert.equal(connected,true);
    sql.push(q);
    if(q==='begin read only'||q==='rollback')return {rows:[]};
    if(q.includes("transaction_read_only"))return {rows:[{server_version_num:170006,read_only:'on'}]};
    if(q.includes('pg_catalog.pg_policy'))return {rows:relations};
    if(q.includes('pg_catalog.pg_attribute'))return {rows:columns};
    if(q.includes('pg_catalog.has_schema_privilege'))return {rows:privileges};
    if(q.includes('pg_catalog.pg_roles'))return {rows:roles};
    throw Error('unexpected SQL');
   },async end(){ended=true;}};
 }};
}
function privilegesFixture(){
 return ['anon','authenticated','service_role','supabase_auth_admin'].flatMap(role=>
  ['sessions','users'].map(table=>[
   role+'_'+table,{
    schemaUsage:role!=='anon',tableSelect:role==='supabase_auth_admin',
    idSelect:role==='supabase_auth_admin',idUpdate:role==='supabase_auth_admin',
    ...(table==='sessions'?{userIdSelect:role==='supabase_auth_admin',
      notAfterSelect:role==='supabase_auth_admin'}:{})
   }
  ]));
}
test('local database target accepts only exact loopback credential and explicit local confirmation',()=>{
 assert.deepEqual(validateLocalAuthCatalogTarget(target),{host:'127.0.0.1',port:54322,database:'postgres'});
 for(const databaseUrl of [
  'postgresql://postgres:test@localhost:54322/postgres',
  'postgresql://postgres:test@0.0.0.0:54322/postgres',
  'postgresql://postgres:test@127.0.0.1:54323/postgres',
  'postgresql://root:test@127.0.0.1:54322/postgres',
  'postgresql://postgres:test@127.0.0.1:54322/production',
  'postgresql://postgres:test@127.0.0.1:54322/postgres?sslmode=disable',
  'https://127.0.0.1:54322/postgres',
  'postgresql://postgres:test@host.supabase.co:5432/postgres',
 ]){
  assert.throws(()=>validateLocalAuthCatalogTarget({...target,databaseUrl}),/local_auth_catalog_not_accepted/);
 }
 assert.throws(()=>validateLocalAuthCatalogTarget({...target,confirmation:'no'}),/local_auth_catalog_not_accepted/);
});
test('real-schema catalog read uses a single read-only transaction and emits no Auth row values',async()=>{
 const fake=fixture();
 const result=await runLocalAuthCatalogProbe({...target,createClient:fake.createClient});
 assert.deepEqual(result,{
  result:'local_gotrue_catalog_observed',environment:'disposable_local_postgresql',
  serverMajor:17,authOwner:'supabase_auth_admin',authRlsEnabled:true,
  policyCounts:{users:0,sessions:0},userTriggerCounts:{users:0,sessions:0},
  sessionHasNotAfter:true,serviceRoleBypassesRls:true,restrictedGatewayAbsent:true,
  existingRoleAuthPrivilegeMatrix:Object.fromEntries(privilegesFixture()),
  restrictedGatewaySessionAccess:'not_demonstrated',
  providerWriterLocks:'not_tested',restrictedAuthAclGrants:'not_tested',
  hostedAuthority:'not_tested',deployApproved:false
 });
 assert.equal(fake.sql[0],'begin read only');
 assert.equal(fake.sql.at(-1),'rollback');
 assert.equal(fake.sql.length,7);
 assert.ok(fake.sql.slice(1,-1).every(q=>/^select /i.test(q)));
 assert.ok(fake.sql.every(q=>!/(auth\.sessions\s+(where|for|limit)|auth\.users\s+(where|for|limit)|insert\s+into|create\s+role|grant\s+|alter\s+table)/i.test(q)));
 assert.equal(fake.ended,true);
 assert.ok(!JSON.stringify(result).includes('synthetic-only'));
});
test('missing Auth columns, unexpected ownership and pre-existing privileged gateways fail closed',async()=>{
 for(const mutate of [
  ({columns})=>columns.splice(columns.findIndex(x=>x.column_name==='not_after'),1),
  ({relations})=>relations[0].owner_name='postgres',
  ({roles})=>roles.push({rolname:'evidence_gateway',rolcanlogin:true,rolbypassrls:true}),
  ({privileges})=>privileges.pop(),
  ({privileges})=>privileges[0].id_update=null,
  ({privileges})=>privileges[0].role_name='postgres',
  ({privileges})=>privileges.push({...privileges[0]} )
 ]){
  const fake=fixture({mutate});
  await assert.rejects(runLocalAuthCatalogProbe({...target,createClient:fake.createClient}),/local_auth_catalog_not_accepted/);
  assert.equal(fake.ended,true);
  assert.equal(fake.sql.at(-1),'rollback');
 }
});
test('invalid local target never allocates a database client',async()=>{
 let called=0;
 await assert.rejects(runLocalAuthCatalogProbe({...target,databaseUrl:'postgresql://postgres:secret@prod.supabase.co:5432/postgres',
  createClient:()=>{called++;return {};}}),/local_auth_catalog_not_accepted/);
 assert.equal(called,0);
});

test('catalog ACL matrix is informational: even a reported grant cannot imply usable Auth row authority',async()=>{
 const fake=fixture({mutate:({privileges})=>{
  const row=privileges.find(p=>p.role_name==='authenticated'&&p.table_name==='sessions');
  row.schema_usage=true;row.table_select=true;row.id_select=true;row.id_update=true;
  row.user_id_select=true;row.not_after_select=true;
 }});
 const out=await runLocalAuthCatalogProbe({...target,createClient:fake.createClient});
 assert.equal(out.existingRoleAuthPrivilegeMatrix.authenticated_sessions.idUpdate,true);
 assert.equal(out.restrictedGatewaySessionAccess,'not_demonstrated',
  'even a table/column grant is not proof of RLS access, writer ordering or login');
 assert.equal(out.deployApproved,false);
 assert.equal(fake.ended,true);
});
