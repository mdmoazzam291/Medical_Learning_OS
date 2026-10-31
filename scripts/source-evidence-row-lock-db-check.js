// Disposable ACL/behavior proof; native connections separately prove actual blocking.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {installPlatformFixture,platformFixture as f} from './lib/source-evidence-platform-fixture.js';
import {capabilityEnvelope} from './lib/source-evidence-capability-envelope.js';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');
const db=new PGlite();
async function stage(e){return (await db.query('select evidence_probe.stage_session($1,$2,$3,$4,$5,$6,$7) r',e.args)).rows[0].r;}
async function admin(sql,args=[]){await db.exec('set session authorization postgres');try{return await db.query(sql,args);}finally{await db.exec('set session authorization evidence_gateway');}}
try{
 await installPlatformFixture(db,{capability:true});await db.exec(await readFile(new URL('../ops/prototypes/source-evidence/authority-row-locks.sql',import.meta.url),'utf8'));
 await db.exec('update evidence_probe.platform_feature set enabled=true;set session authorization evidence_gateway');
 const e=await capabilityEnvelope();assert.equal((await stage(e)).status,'committed');
 await admin('update evidence_probe.platform_feature set enabled=false');await assert.rejects(stage(e),/evidence_platform_denied/);await admin('update evidence_probe.platform_feature set enabled=true');
 for(const sql of ['select * from auth.users','select * from auth.sessions','select evidence_probe.lock_platform_authority(null,null)','set role evidence_authority_locker'])await assert.rejects(db.exec(sql),/permission denied|cannot set role/);
 await db.exec('begin isolation level repeatable read');await assert.rejects(stage(e),/evidence_platform_isolation_unsupported/);await db.exec('rollback');
 await admin('update auth.users set deleted_at=now() where id=$1',[f.owner]);await assert.rejects(stage(e),/evidence_platform_denied/);await admin('update auth.users set deleted_at=null where id=$1',[f.owner]);
 // JWT verification may still succeed when a provider session row is retained
 // past not_after. The private stage gate must deny it independently.
 await admin("update auth.sessions set not_after=now()-interval '1 minute' where id=$1",[f.session]);
 await assert.rejects(stage(e),/evidence_platform_denied/);
 await admin("update auth.sessions set not_after=now()+interval '1 hour' where id=$1",[f.session]);
 assert.equal((await stage(e)).status,'committed');
 await admin('update auth.sessions set not_after=null where id=$1',[f.session]);
 console.log('Authority expiry local PASS: retained expired session denies, future/null deadlines preserve eligibility.');
 await admin('delete from auth.sessions where id=$1',[f.session]);await assert.rejects(stage(e),/evidence_platform_denied/);
 await admin('insert into auth.sessions(id,user_id) values($1,$2)',[f.session,f.owner]);assert.equal((await stage(e)).status,'committed');
 await admin('select 1');
 const catalog=await admin("select r.rolname,p.prosecdef,p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='evidence_probe' and p.proname='lock_platform_authority'");
 assert.equal(catalog.rows.length,1);assert.deepEqual(catalog.rows[0],{rolname:'evidence_authority_locker',prosecdef:true,proconfig:['search_path=""']});
 const role=(await admin("select rolcanlogin,rolsuper,rolbypassrls,rolinherit,rolcreaterole,rolcreatedb from pg_roles where rolname='evidence_authority_locker'")).rows[0];assert.ok(Object.values(role).every(v=>v===false));
 for(const r of ['evidence_gateway','evidence_executor'])assert.equal((await admin("select has_schema_privilege($1,'auth','USAGE') v",[r])).rows[0].v,false);
 await db.exec('set session authorization postgres;set session authorization evidence_authority_locker');
 for(const sql of ["update auth.users set id=id","delete from auth.sessions","update public.content_admin_account set singleton=singleton","update evidence_probe.platform_feature set singleton=singleton"]){await assert.rejects(db.query(sql),/row-level security|permission denied/);}
 console.log('Authority row locks local PASS: private owner/ACL, RLS denies writes, default off, current session/account denial, unsupported isolation fails closed.');
}finally{await db.close();}
