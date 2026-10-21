import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const { PGlite } = await import(process.env.PGLITE_MODULE_URL || '@electric-sql/pglite');
const db = new PGlite();
const root = new URL('../supabase/migrations/', import.meta.url);
const files = (await readdir(root)).filter(n => /^20260925\d{6}_.*\.sql$/.test(n)).sort();
const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const sa = '33333333-3333-4333-8333-333333333333';
const sb = '44444444-4444-4444-8444-444444444444';
try {
  // Minimal Supabase Auth platform fixture. Real app DDL/RPCs/policies below
  // execute unmodified; this does not claim to replay the Auth service itself.
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;`);
  assert.equal(files.length, 5);
  for (const file of files) await db.exec(await readFile(new URL(file, root), 'utf8'));
  const catalog = (await db.query('select version,body from public.study_catalog')).rows;
  assert.deepEqual(catalog, [{version:0,body:{schemaVersion:1,concepts:[],sources:[],questions:[]}}]);
  await db.query('insert into auth.users values ($1),($2)', [a,b]);
  await db.exec('set role service_role');
  for (const [learner,session] of [[a,sa],[b,sb]]) {
    await db.query('select public.study_start_session($1,$2,$3,now())', [learner,session,['synthetic@1']]);
  }
  const event = {schemaVersion:1,type:'question.answered',eventId:'55555555-5555-4555-8555-555555555555',learnerId:a,questionVersionId:'synthetic@1'};
  const receipt = {catalogVersion:0,event,selectedOptionId:'a'};
  const answer = async (r=receipt) => (await db.query('select public.study_record_attempt($1,$2,$3,0,$4,$5,$6) as result',[a,sa,'synthetic-request','a',event,r])).rows[0].result;
  assert.equal((await answer({...receipt,catalogVersion:1})).error, 'catalog_changed');
  assert.equal((await db.query('select count(*)::int as n from public.study_attempts')).rows[0].n,0);
  assert.deepEqual((await answer()).receipt,receipt);
  assert.deepEqual((await answer()).receipt,receipt); // Idempotent retry.
  assert.equal((await db.query('select count(*)::int as n from public.study_attempts')).rows[0].n,1);
  await db.query('select public.study_advance_session($1,$2,0,now())',[a,sa]);
  assert.equal((await db.query('select closed from public.study_sessions where id=$1',[sa])).rows[0].closed,true);
  await db.exec('reset role; set role authenticated');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[b]);
  assert.deepEqual((await db.query('select learner_id from public.study_sessions')).rows,[{learner_id:b}]);
  assert.equal((await db.query('select count(*)::int as n from public.study_attempts')).rows[0].n,0);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[a]);
  assert.deepEqual((await db.query('select learner_id from public.study_sessions')).rows,[{learner_id:a}]);
  assert.equal((await db.query('select count(*)::int as n from public.study_attempts')).rows[0].n,1);
  await assert.rejects(db.query('delete from public.study_bookmarks'),/permission denied/);
  await assert.rejects(db.query('select public.study_cancel_session($1,$2)',[a,sa]),/permission denied/);
  await db.exec('reset role; set role anon');
  await assert.rejects(db.query('select * from public.study_sessions'),/permission denied/);
  await db.exec('reset role');
  console.log('Recovered baseline PostgreSQL check passed: five exact migrations, empty catalog, service RPCs, stale-version rejection, idempotent answer, session completion, two-learner RLS and browser denials. Auth platform fixture only; no hosted writes.');
} finally {
  await db.close();
}
