// Disposable role capability checks; no hosted users or production credential.
import assert from 'node:assert/strict';
import {capabilityEnvelope as envelope} from './lib/source-evidence-capability-envelope.js';
import {installPlatformFixture,platformFixture} from './lib/source-evidence-platform-fixture.js';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');
const db=new PGlite(),{owner,session}=platformFixture;
const stage=async e=>(await db.query('select evidence_probe.stage_session($1,$2,$3,$4,$5,$6,$7) r',e.args)).rows[0].r;
try{
 await installPlatformFixture(db,{capability:true});await db.exec('update evidence_probe.platform_feature set enabled=true;set session authorization evidence_gateway');
 const e=await envelope();assert.equal((await stage(e)).status,'committed');
 const denied=async sql=>assert.rejects(db.exec(sql),/permission denied|must be member|cannot set role/);
 for(const t of ['authority','source_policy','packages','revisions','cases','requests','events','withdrawals','platform_feature']){
  await denied('select * from evidence_probe.'+t);await denied('delete from evidence_probe.'+t);
 }
 for(const sql of ["set role evidence_executor","set role service_role","create table public.gateway_escape(x int)","select evidence_probe.set_authority('"+owner+"',false)","select evidence_probe.stage(null,null,null,null,null,null)","select evidence_probe.platform_guard(null,null)","select public.learner_runtime_access_v1(null,null)"])await denied(sql);
 await db.exec('set session authorization postgres;update evidence_probe.platform_feature set enabled=false;set session authorization evidence_gateway');
 await assert.rejects(stage(e),/evidence_platform_denied/);
 await db.exec('set session authorization postgres;update evidence_probe.platform_feature set enabled=true;delete from auth.sessions;set session authorization evidence_gateway');
 await assert.rejects(stage(e),/evidence_platform_denied/);
 await db.exec('set session authorization postgres');
 const roles=(await db.query("select rolname,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb,rolinherit,rolcanlogin from pg_roles where rolname in ('evidence_gateway','evidence_executor')")).rows;
 assert.equal(roles.length,2);for(const r of roles){for(const k of ['rolsuper','rolbypassrls','rolcreaterole','rolcreatedb','rolinherit'])assert.equal(r[k],false);assert.equal(r.rolcanlogin,r.rolname==='evidence_gateway');}
 assert.equal((await db.query("select count(*)::int n from pg_auth_members m join pg_roles r on r.oid=m.member where r.rolname='evidence_gateway'")).rows[0].n,0);
 const bridges=(await db.query("select p.proname,r.rolname,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='evidence_probe' and p.prosecdef order by p.proname")).rows;
 assert.deepEqual(bridges.map(r=>r.proname),['readback_session','stage_session']);
 for(const r of bridges){assert.equal(r.rolname,'evidence_executor');assert.equal(r.prosecdef,true);assert.deepEqual(r.proconfig,['search_path=""']);}
 assert.equal((await db.query("select count(*)::int n from pg_auth_members m join pg_roles r on r.oid=m.member where r.rolname='evidence_executor'")).rows[0].n,0);
 for(const role of ['evidence_gateway','evidence_executor'])for(const schema of ['public','evidence_probe'])assert.equal((await db.query('select has_schema_privilege($1,$2,\'CREATE\') v',[role,schema])).rows[0].v,false);
 console.log('Narrow capability PASS: gated stage, raw tables/helpers/governors/role escalation denied, feature/session revocation denies retry.');
}finally{await db.close();}
