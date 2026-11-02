// Native process-crash test only; starts its own private server, never a supplied URL.
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {startDisposableNativePostgres} from './lib/disposable-native-postgres.js';
import {allocateLearnerCode} from '../ops/prototypes/learner-identity/learner-code.js';
const {postgres}=await import(process.env.NATIVE_PG_MODULE_URL||'@embedded-postgres/linux-x64');
const {Client}=await import(process.env.PG_MODULE_URL||'pg');
const skipCrash=process.argv.includes('--skip-crash');
if(process.argv.slice(2).some(x=>x!=='--skip-crash'))throw Error('unknown option');
const server=await startDisposableNativePostgres({postgres}),clients=[],errors=[];
let interrupting=false;
async function connect(user='postgres'){
 const c=new Client({...server.config,user,query_timeout:10000});c.on('error',e=>errors.push({interrupting,code:e.code,message:e.message}));await c.connect();clients.push(c);await c.query("set statement_timeout='8s';set timezone='UTC'");return c;
}
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
const code=n=>'ML-'+Array(4).fill(String(n).repeat(4)).join('-');
const fill=n=>length=>new Uint8Array(length).fill(n);
const rows=async c=>(await c.query('select auth_user_id,learner_code,format_version,created_at::text from public.learner_reference_codes order by auth_user_id')).rows;
async function security(c){
 return {
  table:(await c.query("select relrowsecurity,relowner::regrole::text owner,relacl::text acl from pg_class where oid='public.learner_reference_codes'::regclass")).rows,
  columns:(await c.query("select attname,attacl::text acl from pg_attribute where attrelid='public.learner_reference_codes'::regclass and attnum>0 and not attisdropped order by attnum")).rows,
  constraints:(await c.query("select conname,pg_get_constraintdef(oid) def from pg_constraint where conrelid='public.learner_reference_codes'::regclass order by conname")).rows,
  policies:(await c.query("select polname from pg_policy where polrelid='public.learner_reference_codes'::regclass")).rows
 };
}
function storage(c,{loseAcknowledgement=false,forbidInsert=false}={}){
 let inserts=0;
 return {
  async readByAuthUserId(id){const r=(await c.query('select auth_user_id,learner_code from public.learner_reference_codes where auth_user_id=$1',[id])).rows[0];return r?{authUserId:r.auth_user_id,learnerCode:r.learner_code}:null;},
  async tryInsert({authUserId,learnerCode}){
   inserts++;if(forbidInsert)throw Error('committed mapping must not be inserted again');
   await c.query('insert into public.learner_reference_codes(auth_user_id,learner_code) values($1,$2)',[authUserId,learnerCode]);
   if(loseAcknowledgement)throw Error('synthetic acknowledgement lost after actual commit');return {status:'inserted'};
  },get inserts(){return inserts;}
 };
}
try{
 const g=await connect();await g.query('create role anon login;create role authenticated login;create role service_role login bypassrls;grant usage on schema public to anon,authenticated,service_role;create schema auth;create table auth.users(id uuid primary key)');
 await g.query(await readFile(new URL('../supabase/migrations/20261102084000_learner_reference_codes.sql',import.meta.url),'utf8'));
 for(const id of ids)await g.query('insert into auth.users values($1)',[id]);
 const version=(await g.query('show server_version')).rows[0].server_version;if(process.env.EXPECTED_NATIVE_PG_VERSION)assert.ok(version.startsWith(process.env.EXPECTED_NATIVE_PG_VERSION));
 for(const setting of ['fsync','full_page_writes','synchronous_commit'])assert.equal((await g.query('show '+setting)).rows[0][setting],'on');
 const a=await connect('service_role'),b=await connect('service_role');
 assert.equal(new Set(await Promise.all([g,a,b].map(async c=>(await c.query('select pg_backend_pid() p')).rows[0].p))).size,3);
 // Establish a checkpoint BEFORE mapping writes, so committed mappings require WAL replay.
 await g.query('checkpoint');
 await a.query("insert into public.learner_reference_codes(auth_user_id,learner_code,created_at) values($1,$2,'2026-11-02T00:00:00.123456Z')",[ids[0],code(0)]);
 await b.query('begin');await b.query('insert into public.learner_reference_codes(auth_user_id,learner_code) values($1,$2)',[ids[1],code(1)]);
 const lost=storage(a,{loseAcknowledgement:true});await assert.rejects(allocateLearnerCode({authUserId:ids[2],storage:lost,randomBytes:fill(2)}),/acknowledgement lost/);assert.equal(lost.inserts,1);
 const committed=await rows(g),beforeSecurity=await security(g);assert.deepEqual(committed.map(r=>r.auth_user_id),[ids[0],ids[2]]);
 assert.equal((await b.query('select count(*)::int n from public.learner_reference_codes')).rows[0].n,3);
 assert.equal(errors.length,0);interrupting=true;
 const recovery=skipCrash?{mode:'skipped',previousPid:0,newPid:0,recoveryLog:''}:await server.crashAndRestart();
 assert.ok(recovery.mode==='immediate'&&recovery.previousPid!==recovery.newPid&&/database system was interrupted/.test(recovery.recoveryLog)&&/redo starts at/.test(recovery.recoveryLog),'learner_crash_recovery_not_observed');
 for(const c of [g,a,b])await assert.rejects(c.query('select 1'));
 await Promise.allSettled([g,a,b].map(c=>c.end()));
 assert.ok(errors.every(e=>e.interrupting&&(['57P01','57P02'].includes(e.code)||e.message==='Connection terminated unexpectedly')),'unexpected_client_error');interrupting=false;
 const t=await connect(),s=await connect('service_role');
 assert.deepEqual(await rows(t),committed);assert.deepEqual(await security(t),beforeSecurity);
 for(const i of [0,2]){
  const retry=storage(s,{forbidInsert:true});assert.deepEqual(await allocateLearnerCode({authUserId:ids[i],storage:retry,randomBytes:()=>{throw Error('committed code must not rotate');}}),{authUserId:ids[i],learnerCode:code(i)});assert.equal(retry.inserts,0);
 }
 console.log('Learner crash durability PASS: PostgreSQL '+version+', interrupted server/WAL redo observed; committed exact rows and lost-response code survive without rotation or insertion.');
 assert.equal((await s.query('select count(*)::int n from public.learner_reference_codes where auth_user_id=$1',[ids[1]])).rows[0].n,0);
 const fresh=storage(s);assert.deepEqual(await allocateLearnerCode({authUserId:ids[1],storage:fresh,randomBytes:fill(3)}),{authUserId:ids[1],learnerCode:code(3)});assert.equal(fresh.inserts,1);
 assert.deepEqual((await t.query('select count(*)::int n,count(distinct auth_user_id)::int u,count(distinct learner_code)::int c from public.learner_reference_codes')).rows[0],{n:3,u:3,c:3});
 await assert.rejects(s.query('insert into public.learner_reference_codes(auth_user_id,learner_code) values($1,$2)',[ids[0],code(4)]),e=>e.code==='23505');
 for(const sql of ['set role postgres','update public.learner_reference_codes set learner_code=learner_code','delete from public.learner_reference_codes'])await assert.rejects(s.query(sql),e=>e.code==='42501');
 for(const role of ['anon','authenticated']){const c=await connect(role);await assert.rejects(c.query('select learner_code from public.learner_reference_codes'),e=>e.code==='42501');}
 assert.ok(errors.every(e=>e.interrupting),'post_restart_client_error');
 console.log('Learner crash rollback/ACL PASS: open uncommitted row absent, fresh allocation succeeds once, stale connections fail, exact ACL/RLS/constraints preserved and browser/service denials remain.');
}finally{
 await Promise.allSettled(clients.map(c=>c.query('rollback')));await Promise.allSettled(clients.map(c=>c.end()));await server.stop();await assert.rejects(access(server.root));console.log('Learner crash fixture cleanup PASS');
}
