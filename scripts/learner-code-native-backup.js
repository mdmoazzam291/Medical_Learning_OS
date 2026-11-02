// Disposable table-only archive proof. Fixed private Unix socket; never accepts a hosted URL.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,chmod,stat,access} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {startDisposableNativePostgres} from './lib/disposable-native-postgres.js';
import {allocateLearnerCode} from '../ops/prototypes/learner-identity/learner-code.js';
const {postgres}=await import(process.env.NATIVE_PG_MODULE_URL||'@embedded-postgres/linux-x64');
const {Client}=await import(process.env.PG_MODULE_URL||'pg');
const omit=process.argv.includes('--omit-column-acl-audit');if(process.argv.slice(2).some(x=>x!=='--omit-column-acl-audit'))throw Error('unknown option');
const clientBin=process.env.PG_CLIENT_BIN;if(!clientBin?.startsWith('/'))throw Error('absolute_pg_client_bin_required');
const server=await startDisposableNativePostgres({postgres}),clients=[],errors=[],allowed=new Set(['postgres','restore_ok','restore_fk','restore_existing']);
const archive=join(server.root,'learner-mapping.dump'),ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
const code=n=>'ML-'+Array(4).fill(String(n).repeat(4)).join('-');
const digest=b=>createHash('sha256').update(b).digest('hex');
async function tool(name,args){
 return new Promise((resolve,reject)=>{
  const child=spawn(join(clientBin,name),args,{env:{PATH:process.env.PATH,LANG:'C',LC_ALL:'C'},stdio:['ignore','pipe','pipe']});let output='';
  const timeout=setTimeout(()=>child.kill('SIGKILL'),15000);
  for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{output=(output+b).slice(-4000);});
  child.once('error',e=>{clearTimeout(timeout);reject(e);});child.once('close',n=>{clearTimeout(timeout);n===0?resolve(output):reject(Error('archive_tool_failed: '+output));});
 });
}
function connection(database){if(!allowed.has(database))throw Error('fixture_database_not_allowed');return ['--host='+server.config.host,'--port='+server.config.port,'--username=postgres','--dbname='+database];}
async function connect(database='postgres',user='postgres'){
 if(!allowed.has(database))throw Error('fixture_database_not_allowed');
 const c=new Client({...server.config,database,user,password:'unused-private-fixture',ssl:false});c.on('error',e=>errors.push(e));await c.connect();clients.push(c);await c.query("set statement_timeout='10s';set timezone='UTC'");return c;
}
async function authFixture(c,list){
 await c.query('create schema auth;create table auth.users(id uuid primary key,banned_until timestamptz,deleted_at timestamptz);create table auth.sessions(id uuid primary key,user_id uuid not null references auth.users);grant usage on schema public to anon,authenticated,service_role');
 for(const id of list)await c.query('insert into auth.users(id) values($1)',[id]);
}
const rows=async c=>(await c.query('select auth_user_id,learner_code,format_version,created_at::text from public.learner_reference_codes order by auth_user_id')).rows;
async function signature(c){return {constraints:(await c.query("select conname,pg_get_constraintdef(oid) def from pg_constraint where conrelid='public.learner_reference_codes'::regclass order by conname")).rows,indexes:(await c.query("select indexname,indexdef from pg_indexes where schemaname='public' and tablename='learner_reference_codes' order by indexname")).rows};}
async function audit(c){
 const r=(await c.query("select relrowsecurity,relowner::regrole::text owner from pg_class where oid='public.learner_reference_codes'::regclass")).rows[0];assert.deepEqual(r,{relrowsecurity:true,owner:'postgres'});
 const acl=(await c.query("select x.grantee::regrole::text role,x.privilege_type,x.is_grantable from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x where c.oid='public.learner_reference_codes'::regclass and x.grantee<>c.relowner")).rows;
 assert.deepEqual(acl.map(x=>x.role+':'+x.privilege_type).sort(),['service_role:INSERT','service_role:SELECT']);assert.ok(acl.every(x=>x.is_grantable===false));
 if(!omit)assert.equal((await c.query("select count(*)::int n from pg_attribute a join pg_class c on c.oid=a.attrelid cross join lateral aclexplode(a.attacl) x where a.attrelid='public.learner_reference_codes'::regclass and x.grantee<>c.relowner")).rows[0].n,0);
 assert.equal((await c.query("select count(*)::int n from pg_policy where polrelid='public.learner_reference_codes'::regclass")).rows[0].n,0);
}
async function restore(c,database,pin){
 if(digest(await readFile(archive))!==pin)throw Error('archive_digest_mismatch');
 if((await c.query("select to_regclass('public.learner_reference_codes') r")).rows[0].r!==null)throw Error('restore_requires_fresh_target');
 await tool('pg_restore',[...connection(database),'--single-transaction','--exit-on-error',archive]);
}
try{
 const g=await connect();await g.query('create role anon login;create role authenticated login;create role service_role login bypassrls');await authFixture(g,ids);
 const migration=await readFile(new URL('../supabase/migrations/20261102084000_learner_reference_codes.sql',import.meta.url),'utf8'),runtime=await readFile(new URL('../ops/staging/learner-identity/runtime-access-parity.sql',import.meta.url),'utf8');await g.query(migration);await g.query(runtime);
 for(let i=0;i<2;i++)await g.query("insert into public.learner_reference_codes(auth_user_id,learner_code,created_at) values($1,$2,'2026-11-02T00:00:00.123456Z')",[ids[i],code(i)]);
 await g.query('insert into auth.sessions values($1,$2)',['44444444-4444-4444-8444-444444444444',ids[0]]);await audit(g);
 const version=(await g.query('show server_version')).rows[0].server_version;if(process.env.EXPECTED_NATIVE_PG_VERSION)assert.ok(version.startsWith(process.env.EXPECTED_NATIVE_PG_VERSION));
 const dumpVersion=await tool('pg_dump',['--version']),restoreVersion=await tool('pg_restore',['--version']);assert.match(dumpVersion,/PostgreSQL\) 18\./);assert.match(restoreVersion,/PostgreSQL\) 18\./);
 await tool('pg_dump',[...connection('postgres'),'--format=custom','--table=public.learner_reference_codes','--file='+archive]);await chmod(archive,0o600);const metadata=await stat(archive);assert.equal(metadata.mode&0o777,0o600);assert.ok(metadata.size>0&&metadata.size<1024*1024);
 const bytes=await readFile(archive);assert.equal(bytes.subarray(0,5).toString(),'PGDMP');const pin=digest(bytes);
 console.log('Native mapping archive: PostgreSQL '+version+'; official client18 custom archive created privately.');
 for(const name of ['restore_ok','restore_fk','restore_existing'])await g.query('create database '+name);
 const t=await connect('restore_ok');await authFixture(t,ids);await assert.rejects(restore(t,'restore_ok','0'.repeat(64)),/digest_mismatch/);await restore(t,'restore_ok',pin);
 assert.deepEqual(await rows(t),await rows(g));assert.deepEqual(await signature(t),await signature(g));await audit(t);await t.query(runtime);
 const a=await connect('restore_ok','service_role');const pid=async c=>(await c.query('select pg_backend_pid() p')).rows[0].p;assert.notEqual(await pid(a),await pid(t));
 for(let i=0;i<2;i++)assert.deepEqual(await allocateLearnerCode({authUserId:ids[i],randomBytes:()=>{throw Error('restored code must not rotate');},storage:{async readByAuthUserId(id){const r=(await a.query('select auth_user_id,learner_code from public.learner_reference_codes where auth_user_id=$1',[id])).rows[0];return r?{authUserId:r.auth_user_id,learnerCode:r.learner_code}:null;},async tryInsert(){throw Error('must read restored code');}}}),{authUserId:ids[i],learnerCode:code(i)});
 assert.equal((await a.query('select public.learner_runtime_access_v1($1,$2) r',[ids[0],'44444444-4444-4444-8444-444444444444'])).rows[0].r.allowed,false);assert.equal((await t.query('select count(*)::int n from auth.sessions')).rows[0].n,0);
 for(const role of ['anon','authenticated']){const b=await connect('restore_ok',role);await assert.rejects(b.query('select learner_code from public.learner_reference_codes'),e=>e.code==='42501');await assert.rejects(b.query('select public.learner_runtime_access_v1(null,null)'),e=>e.code==='42501');}
 for(const sql of ['set role postgres','update public.learner_reference_codes set learner_code=learner_code','delete from public.learner_reference_codes'])await assert.rejects(a.query(sql),e=>e.code==='42501');
 console.log('Native mapping restore PASS: exact UUID/code/format/microsecond timestamps, owner/ACL/RLS/index/constraint parity, stable codes, browser isolation and old-session denial.');
 for(const [id,value,format,expected] of [[ids[0],code(2),1,'23505'],[ids[2],code(0),1,'23505'],[ids[2],'bad',1,'23514'],[ids[2],code(2),2,'23514'],['99999999-9999-4999-8999-999999999999',code(2),1,'23503']])await assert.rejects(a.query('insert into public.learner_reference_codes(auth_user_id,learner_code,format_version) values($1,$2,$3)',[id,value,format]),e=>e.code===expected);
 await t.query('delete from auth.users where id=$1',[ids[1]]);assert.equal((await rows(t)).length,1);
 const bad=await connect('restore_fk');await authFixture(bad,[ids[0]]);await assert.rejects(restore(bad,'restore_fk',pin),/archive_tool_failed/);assert.equal((await bad.query("select to_regclass('public.learner_reference_codes') r")).rows[0].r,null);assert.equal((await bad.query('select count(*)::int n from auth.users')).rows[0].n,1);
 const existing=await connect('restore_existing');await authFixture(existing,ids);await existing.query(migration);await existing.query('insert into public.learner_reference_codes(auth_user_id,learner_code) values($1,$2)',[ids[0],code(3)]);await assert.rejects(restore(existing,'restore_existing',pin),/fresh_target/);assert.equal((await rows(existing))[0].learner_code,code(3));
 console.log('Native mapping negatives PASS: wrong pin/fresh-target guard, real PK/code/CHECK/FK/cascade and single-transaction restore failure leave no partial mapping table.');
 await t.query('grant select(learner_code) on public.learner_reference_codes to authenticated');let rejected=false;try{await audit(t);}catch{rejected=true;}assert.equal(rejected,true,'native_column_acl_rejection_not_observed');await t.query('revoke select(learner_code) on public.learner_reference_codes from authenticated');await audit(t);
 assert.equal(errors.length,0);console.log('Native mapping ACL control PASS: hidden column-level browser grant rejected after actual archive restore.');
}finally{
 await Promise.allSettled(clients.map(c=>c.query('rollback')));await Promise.allSettled(clients.map(c=>c.end()));await server.stop();await assert.rejects(access(server.root));console.log('Native mapping archive cleanup PASS');
}
