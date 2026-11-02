// Disposable logical recovery proof only; no supplied URL, real identities or pg_dump certification.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {allocateLearnerCode,normalizeLearnerCode,validAuthUserId} from '../ops/prototypes/learner-identity/learner-code.js';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite'),dbs=[];
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
const migration=await readFile(new URL('../supabase/migrations/20261102084000_learner_reference_codes.sql',import.meta.url),'utf8');
const runtime=await readFile(new URL('../ops/staging/learner-identity/runtime-access-parity.sql',import.meta.url),'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex');
async function fresh(){
 const d=new PGlite();dbs.push(d);await d.exec('create role anon;create role authenticated;create role service_role bypassrls;grant usage on schema public to anon,authenticated,service_role;create schema auth;create table auth.users(id uuid primary key,banned_until timestamptz,deleted_at timestamptz);create table auth.sessions(id uuid primary key,user_id uuid references auth.users);');
 await d.exec(migration);await d.exec(runtime);for(const id of ids)await d.query('insert into auth.users(id) values($1)',[id]);return d;
}
const rows=async d=>(await d.query('select auth_user_id,learner_code,format_version,created_at::text from public.learner_reference_codes order by auth_user_id')).rows;
async function audit(d){
 const r=(await d.query("select relrowsecurity,relowner::regrole::text as owner from pg_class where oid='public.learner_reference_codes'::regclass")).rows[0];assert.equal(r.relrowsecurity,true);assert.equal(r.owner,'postgres');
 const privileges=(await d.query("select a.grantee::regrole::text role,a.privilege_type,a.is_grantable from pg_class c cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where c.oid='public.learner_reference_codes'::regclass and a.grantee<>c.relowner")).rows;
 assert.ok(privileges.every(x=>x.is_grantable===false));
 assert.deepEqual(privileges.map(x=>x.role+':'+x.privilege_type).sort(),['service_role:INSERT','service_role:SELECT']);
 assert.equal((await d.query("select count(*)::int n from pg_attribute a join pg_class c on c.oid=a.attrelid cross join lateral aclexplode(a.attacl) x where a.attrelid='public.learner_reference_codes'::regclass and x.grantee<>c.relowner")).rows[0].n,0,'unexpected column privilege');
 assert.equal((await d.query("select count(*)::int n from pg_policy where polrelid='public.learner_reference_codes'::regclass")).rows[0].n,0);
 for(const role of ['anon','authenticated'])assert.equal((await d.query("select has_function_privilege($1,'public.learner_runtime_access_v1(uuid,uuid)','EXECUTE') ok",[role])).rows[0].ok,false);
}
async function restore(d,bytes,expectedPin){
 if(typeof bytes!=='string'||Buffer.byteLength(bytes)>1024*1024||typeof expectedPin!=='string'||!/^[a-f0-9]{64}$/.test(expectedPin)||hash(bytes)!==expectedPin)throw Error('recovery_digest_invalid');
 const value=JSON.parse(bytes);
 if(Object.keys(value).sort().join(',')!=='format,rows'||value.format!=='learner-code-fixture-v1'||!Array.isArray(value.rows)||value.rows.length>5000)throw Error('recovery_shape_invalid');
 for(const r of value.rows){
  if(!r||Object.keys(r).sort().join(',')!=='auth_user_id,created_at,format_version,learner_code'||!validAuthUserId(r.auth_user_id)||normalizeLearnerCode(r.learner_code)!==r.learner_code||r.format_version!==1||typeof r.created_at!=='string'||r.created_at.length>64||!Number.isFinite(Date.parse(r.created_at)))throw Error('recovery_row_invalid');
 }
 await d.exec('begin');
 try{
  // Owner-only disposable fixture. Block concurrent writes while checking emptiness.
  await d.exec('lock table public.learner_reference_codes in access exclusive mode');
  if((await rows(d)).length)throw Error('recovery_target_nonempty');
  await audit(d);
  for(const r of value.rows)await d.query('insert into public.learner_reference_codes(auth_user_id,learner_code,format_version,created_at) values($1,$2,$3,$4)',[r.auth_user_id,r.learner_code,r.format_version,r.created_at]);
  assert.deepEqual(await rows(d),value.rows);await audit(d);await d.exec('commit');
 }catch(e){await d.exec('rollback');throw e;}
}
try{
 const source=await fresh();for(let i=0;i<2;i++)await source.query("insert into public.learner_reference_codes(auth_user_id,learner_code,created_at) values($1,$2,'2026-11-02T00:00:00.123Z')",[ids[i],'ML-'+Array(4).fill(String(i).repeat(4)).join('-')]);
 await source.query('insert into auth.sessions values($1,$2)',['33333333-3333-4333-8333-333333333333',ids[0]]);
 const bytes=JSON.stringify({format:'learner-code-fixture-v1',rows:await rows(source)}),pin=hash(bytes),target=await fresh();
 await restore(target,bytes,pin);assert.deepEqual(await rows(target),await rows(source));await audit(target);
 await target.exec('set role service_role');
 for(const id of ids){const result=await allocateLearnerCode({authUserId:id,randomBytes:()=>{throw Error('must never rotate restored code');},storage:{async readByAuthUserId(uuid){const r=(await target.query('select auth_user_id,learner_code from public.learner_reference_codes where auth_user_id=$1',[uuid])).rows[0];return r?{authUserId:r.auth_user_id,learnerCode:r.learner_code}:null;},async tryInsert(){throw Error('must not insert');}}});assert.equal(result.authUserId,id);}
 const denied=(await target.query('select public.learner_runtime_access_v1($1,$2) r',[ids[0],'33333333-3333-4333-8333-333333333333'])).rows[0].r;assert.equal(denied.allowed,false);assert.equal(denied.sessionActive,false);await target.exec('reset role');
 for(const role of ['anon','authenticated']){await target.exec('set role '+role);await assert.rejects(target.query('select * from public.learner_reference_codes'),/permission denied/);await target.exec('reset role');}
 console.log('Learner logical recovery PASS: exact UUID/code/format/timestamp parity, no rotation, browser ACL denial, old session not restored.');
 await assert.rejects(restore(target,bytes,pin),/nonempty/);
 const badPin=await fresh();await assert.rejects(restore(badPin,bytes,'0'.repeat(64)),/digest/);assert.equal((await rows(badPin)).length,0);
 const changed=JSON.parse(bytes);changed.rows[1].auth_user_id='99999999-9999-4999-8999-999999999999';const changedBytes=JSON.stringify(changed),missingUser=await fresh();await assert.rejects(restore(missingUser,changedBytes,hash(changedBytes)),/foreign key/);assert.equal((await rows(missingUser)).length,0);
 const duplicate=JSON.parse(bytes);duplicate.rows[1].learner_code=duplicate.rows[0].learner_code;const dupBytes=JSON.stringify(duplicate),dupTarget=await fresh();await assert.rejects(restore(dupTarget,dupBytes,hash(dupBytes)),/unique/);assert.equal((await rows(dupTarget)).length,0);
 const extra=await fresh();await extra.exec('create role recovery_rogue;grant select on public.learner_reference_codes to recovery_rogue');await assert.rejects(restore(extra,bytes,pin));assert.equal((await rows(extra)).length,0);
 const grants=await fresh();await grants.exec('grant select on public.learner_reference_codes to service_role with grant option');await assert.rejects(restore(grants,bytes,pin));assert.equal((await rows(grants)).length,0);
 const column=await fresh();await column.exec('grant select(learner_code) on public.learner_reference_codes to authenticated');await assert.rejects(restore(column,bytes,pin));assert.equal((await rows(column)).length,0);
 const broad=await fresh();await broad.exec('grant select on public.learner_reference_codes to authenticated');await assert.rejects(restore(broad,bytes,pin));assert.equal((await rows(broad)).length,0);
 console.log('Learner recovery negatives PASS: nonempty target/wrong pin reject, missing Auth identity and duplicate code roll back all rows, broadened ACL fails audit.');
}finally{await Promise.all(dbs.map(d=>d.close()));}
