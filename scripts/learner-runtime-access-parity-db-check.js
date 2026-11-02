// Staging-only production SQL parity: disposable PostgreSQL, no hosted Auth data.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE_URL || '@electric-sql/pglite');
const db = new PGlite();
const sql = await readFile(new URL('../ops/staging/learner-identity/runtime-access-parity.sql',import.meta.url),'utf8');
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
const c='33333333-3333-4333-8333-333333333333';
const sessionA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const sessionB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const absent='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const evaluate=async(userId,sessionId)=>(await db.query(
  'select public.learner_runtime_access_v1($1::uuid,$2::uuid) as result',[userId,sessionId]
)).rows[0].result;
try {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role; create schema auth;");
  await db.exec('create table auth.users(id uuid primary key,banned_until timestamptz,deleted_at timestamptz);');
  await db.exec('create table auth.sessions(id uuid primary key,user_id uuid not null references auth.users(id));');
  await db.query("insert into auth.users(id,banned_until,deleted_at) values ($1,null,null),($2,now()+interval '2 hours',null),($3,null,now())",[a,b,c]);
  await db.query('insert into auth.sessions(id,user_id) values ($1,$2),($3,$4)',[sessionA,a,sessionB,b]);
  await db.exec(sql);
  const rpc=(await db.query("select prosecdef,provolatile,proconfig from pg_proc where oid='public.learner_runtime_access_v1(uuid,uuid)'::regprocedure")).rows[0];
  assert.equal(rpc.prosecdef,true);
  assert.equal(rpc.provolatile,'s');
  assert.ok(Array.isArray(rpc.proconfig) && rpc.proconfig.some(value => /^search_path=/.test(value)),
    'function must pin an explicit search_path');
  for(const role of ['anon','authenticated']){
    const allowed=(await db.query('select has_function_privilege($1,$2,$3) as ok',[role,'public.learner_runtime_access_v1(uuid,uuid)','EXECUTE'])).rows[0].ok;
    assert.equal(allowed,false,role+' must not execute privileged runtime check');
  }
  assert.equal((await db.query("select has_function_privilege('service_role','public.learner_runtime_access_v1(uuid,uuid)','EXECUTE') as ok")).rows[0].ok,true);
  const active=await evaluate(a,sessionA);
  assert.equal(active.allowed,true);
  assert.equal(active.reason,'allowed');
  assert.equal(active.sessionActive,true);
  for(const [user,session,reason] of [
    [a,absent,'session_inactive'],
    [a,sessionB,'session_inactive'],
    [b,sessionB,'account_suspended'],
    [c,absent,'account_unavailable'],
    [absent,absent,'account_unavailable']
  ]){
    const result=await evaluate(user,session);
    assert.equal(result.allowed,false);
    assert.equal(result.reason,reason);
  }
  await db.exec('set role anon');
  await assert.rejects(db.query("select public.learner_runtime_access_v1($1,$2)",[a,sessionA]),/permission denied/i);
  await db.exec('reset role; set role authenticated;');
  await assert.rejects(db.query("select public.learner_runtime_access_v1($1,$2)",[a,sessionA]),/permission denied/i);
  await db.exec('reset role; set role service_role;');
  assert.equal((await evaluate(a,sessionA)).allowed,true);
  await db.exec('reset role');
  console.log('Staging runtime parity: genuine session matches; mismatch, absent, deleted, suspended denied; service-only EXECUTE.');
} finally {
  await db.close();
}
