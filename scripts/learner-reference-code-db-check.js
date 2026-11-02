// Isolated PostgreSQL/RLS rehearsal. Never connects to hosted or learner data.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE_URL || '@electric-sql/pglite');
const db = new PGlite();
const migration = await readFile(
  new URL('../supabase/migrations/20261102084000_learner_reference_codes.sql', import.meta.url),'utf8');
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const first = 'ML-0000-0000-0000-0000';
const second = 'ML-1111-1111-1111-1111';
const one = async (sql, params=[]) => (await db.query(sql,params)).rows[0];
try {
  await db.exec([
    'create role anon',
    'create role authenticated',
    'create role service_role bypassrls',
    'grant usage on schema public to anon,authenticated,service_role',
    'create schema auth',
    'create table auth.users(id uuid primary key)'
  ].join(';') + ';');
  await db.query('insert into auth.users(id) values ($1),($2)',[alice,bob]);
  await db.exec(migration);
  const rls = await one("select relrowsecurity as enabled from pg_class where oid='public.learner_reference_codes'::regclass");
  assert.equal(rls.enabled,true);
  for (const verb of ['SELECT','INSERT']) {
    const allowed=await one("select has_table_privilege('service_role','public.learner_reference_codes',$1) as ok",[verb]);
    assert.equal(allowed.ok,true);
  }
  for (const role of ['anon','authenticated']) {
    for (const verb of ['SELECT','INSERT','UPDATE','DELETE']) {
      const allowed=await one('select has_table_privilege($1, $2, $3) as ok',
        [role,'public.learner_reference_codes',verb]);
      assert.equal(allowed.ok,false, role+' must not '+verb);
    }
  }
  for (const verb of ['UPDATE','DELETE']) {
    const allowed=await one("select has_table_privilege('service_role','public.learner_reference_codes',$1) as ok",[verb]);
    assert.equal(allowed.ok,false);
  }
  const policies=await db.query("select policyname from pg_policies where schemaname='public' and tablename='learner_reference_codes'");
  assert.equal(policies.rows.length,0);
  await db.exec('set role anon');
  await assert.rejects(db.query('select * from public.learner_reference_codes'),/permission denied/i);
  await db.exec('reset role; set role authenticated;');
  await assert.rejects(db.query('select * from public.learner_reference_codes'),/permission denied/i);
  await db.exec('reset role; set role service_role;');
  const insert='insert into public.learner_reference_codes(auth_user_id,learner_code) values ($1,$2)';
  await db.query(insert,[alice,first]);
  assert.equal((await one('select count(*)::int as n from public.learner_reference_codes')).n,1);
  await assert.rejects(db.query(insert,[bob,first]),/duplicate key|unique constraint/i);
  await db.query(insert,[bob,second]);
  await assert.rejects(db.query(insert,[alice,'ML-2222-2222-2222-2222']),/duplicate key|unique constraint/i);
  await assert.rejects(db.query(insert,[bob,'ML-22O2-2222-2222-2222']),/check constraint/i);
  await assert.rejects(db.query('update public.learner_reference_codes set learner_code=$1 where auth_user_id=$2',[first,bob]),/permission denied/i);
  await assert.rejects(db.query('delete from public.learner_reference_codes where auth_user_id=$1',[bob]),/permission denied/i);
  await db.exec('reset role');
  await assert.rejects(db.query(insert,['33333333-3333-4333-8333-333333333333','ML-3333-3333-3333-3333']),/foreign key/i);
  assert.equal((await one('select count(*)::int as n from public.learner_reference_codes')).n,2);
  await db.query('delete from auth.users where id=$1',[bob]);
  assert.equal((await one('select count(*)::int as n from public.learner_reference_codes')).n,1);
  console.log('Learner code SQL: role grants, RLS, exact format, uniqueness, FK, cascade, and immutability passed.');
} finally {
  await db.close();
}
