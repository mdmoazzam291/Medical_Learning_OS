// Independent native fixture; no hosted URL or real learner data accepted.
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {startDisposableNativePostgres} from './lib/disposable-native-postgres.js';
import {allocateLearnerCode} from '../ops/prototypes/learner-identity/learner-code.js';
const {postgres}=await import(process.env.NATIVE_PG_MODULE_URL||'@embedded-postgres/linux-x64');
const {Client}=await import(process.env.PG_MODULE_URL||'pg');
const omit=process.argv.includes('--omit-user-uniqueness');
if(process.argv.slice(2).some(a=>a!=='--omit-user-uniqueness'))throw Error('unknown option');
const server=await startDisposableNativePostgres({postgres}),clients=[],errors=[];
async function connect(user='postgres'){
 const c=new Client({...server.config,user});c.on('error',e=>errors.push(e));await c.connect();clients.push(c);await c.query("set statement_timeout='8s';set lock_timeout='8s'");return c;
}
const ids=Array.from({length:6},(_,i)=>`${i+1}1111111-1111-4111-8111-111111111111`);
const code=n=>'ML-'+Array(4).fill(String(n).repeat(4)).join('-');
const fill=n=>len=>new Uint8Array(len).fill(n);
function storage(c,{loseAck=false}={}){
 let inserts=0;
 const adapter={
  async readByAuthUserId(id){const row=(await c.query('select auth_user_id,learner_code from public.learner_reference_codes where auth_user_id=$1',[id])).rows[0];return row?{authUserId:row.auth_user_id,learnerCode:row.learner_code}:null;},
  async tryInsert({authUserId,learnerCode}){
   inserts++;
   try{await c.query('insert into public.learner_reference_codes(auth_user_id,learner_code) values($1,$2)',[authUserId,learnerCode]);}
   catch(e){if(e.code!=='23505')throw e;return {status:await adapter.readByAuthUserId(authUserId)?'existing':'code_collision'};}
   if(loseAck)throw Error('simulated acknowledgement unavailable after actual commit');return {status:'inserted'};
  },get inserts(){return inserts;}
 };return adapter;
}
const outcome=p=>p.then(value=>({value}),error=>({error}));
try{
 const g=await connect();await g.query('create role anon;create role authenticated;create role service_role login bypassrls;grant usage on schema public to anon,authenticated,service_role;create schema auth;create table auth.users(id uuid primary key)');
 let migration=await readFile(new URL('../supabase/migrations/20261102084000_learner_reference_codes.sql',import.meta.url),'utf8');
 if(omit)migration=migration.replace('auth_user_id uuid primary key','auth_user_id uuid');await g.query(migration);
 for(const id of ids)await g.query('insert into auth.users values($1)',[id]);
 const a=await connect('service_role'),b=await connect('service_role');
 const pid=async c=>(await c.query('select pg_backend_pid() p')).rows[0].p;
 const [ap,bp,gp]=await Promise.all([a,b,g].map(pid));assert.equal(new Set([ap,bp,gp]).size,3);
 const version=(await g.query('show server_version')).rows[0].server_version;if(process.env.EXPECTED_NATIVE_PG_VERSION)assert.ok(version.startsWith(process.env.EXPECTED_NATIVE_PG_VERSION));
 console.log('Learner native fixture: PostgreSQL '+version+', independent actual service-role logins.');
 async function blocked(){
  const end=Date.now()+2500;
  while(Date.now()<end){const r=(await g.query("select pid from pg_locks where pid=$1 and locktype in ('transactionid','tuple') and not granted",[bp])).rows;if(r.length){assert.ok((await g.query('select pg_blocking_pids($1) p',[bp])).rows[0].p.includes(ap));return;}await new Promise(r=>setTimeout(r,20));}
  throw Error('learner_unique_barrier_not_observed');
 }
 async function held(id,n){await a.query('begin');await a.query('insert into public.learner_reference_codes(auth_user_id,learner_code) values($1,$2)',[id,code(n)]);}
 await held(ids[0],0);const same=outcome(allocateLearnerCode({authUserId:ids[0],storage:storage(b),randomBytes:fill(1)}));await blocked();await a.query('commit');assert.deepEqual((await same).value,{authUserId:ids[0],learnerCode:code(0)});
 console.log('Learner concurrency PASS: same UUID concurrent allocation waits for unique winner and returns original persisted code.');
 await held(ids[1],2);let attempt=0;const crossStore=storage(b),cross=outcome(allocateLearnerCode({authUserId:ids[2],storage:crossStore,randomBytes:len=>fill(attempt++===0?2:3)(len)}));await blocked();await a.query('commit');assert.deepEqual((await cross).value,{authUserId:ids[2],learnerCode:code(3)});assert.equal(crossStore.inserts,2);
 console.log('Learner concurrency PASS: different UUID code collision waits, retries once, and never returns the other learner mapping.');
 await held(ids[3],4);const rollback=outcome(allocateLearnerCode({authUserId:ids[3],storage:storage(b),randomBytes:fill(5)}));await blocked();await a.query('rollback');assert.deepEqual((await rollback).value,{authUserId:ids[3],learnerCode:code(5)});
 console.log('Learner concurrency PASS: rolled-back winner releases waiter with one committed mapping.');
 const lost=storage(b,{loseAck:true});await assert.rejects(allocateLearnerCode({authUserId:ids[4],storage:lost,randomBytes:fill(6)}),/acknowledgement unavailable/);assert.equal(lost.inserts,1);
 const retry=storage(b);assert.deepEqual(await allocateLearnerCode({authUserId:ids[4],storage:retry,randomBytes:()=>{throw Error('must read original');}}),{authUserId:ids[4],learnerCode:code(6)});assert.equal(retry.inserts,0);
 assert.deepEqual((await g.query('select count(*)::int n,count(distinct auth_user_id)::int u,count(distinct learner_code)::int c from public.learner_reference_codes')).rows[0],{n:5,u:5,c:5});
 for(const sql of ['update public.learner_reference_codes set learner_code=learner_code','delete from public.learner_reference_codes'])await assert.rejects(b.query(sql),/permission denied/);
 assert.equal(errors.length,0);console.log('Learner recovery/ACL PASS: actual committed lost-response write reconciles without another insert; service UPDATE/DELETE denied.');
}finally{
 await Promise.allSettled(clients.map(c=>c.query('rollback')));await Promise.allSettled(clients.map(c=>c.end()));await server.stop();await assert.rejects(access(server.root));console.log('Learner native fixture cleanup PASS');
}
