import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');
const db=new PGlite();
const actor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create table content_admin_account(admin_user_id uuid);create function public.is_content_admin(uuid) returns boolean language sql stable as $$select exists(select 1 from public.content_admin_account where admin_user_id=$1)$$;
 create table study_catalog(id int,version bigint,body jsonb);create table content_library_concept_metadata(concept_id text,classification jsonb);
 create table content_library_question_metadata(question_id text,origins jsonb,classification jsonb,concept_links jsonb,concept_links_version_id text);
 create table neural_canonical_note_versions(id uuid,concept_id text,status text);create table content_library_imports(import_id text,status text,manifest jsonb);
 grant usage on schema public to anon,authenticated,service_role;grant select on all tables in schema public to service_role;`);
 await db.query('insert into content_admin_account values($1)',[actor]);
 const catalog={concepts:[{conceptId:'empty',label:'Empty synthetic concept',aliases:[],subjectTags:['medicine']}],questions:[{questionId:'one',questionVersionId:'one@1',version:1,status:'published',stem:'PRIVATE STEM',answerOptionId:'SECRET',explanation:'PRIVATE EXPLANATION',conceptLinks:[{conceptId:'empty',role:'primary'}],provenance:{kind:'recalled_pyq',exam:'NEET PG',year:2025}}],sources:[{sourceId:'s',evidence:'PRIVATE SOURCE'}]};
 await db.query('insert into study_catalog values(1,1,$1)',[catalog]);
 await db.query('insert into content_library_question_metadata(question_id,origins) values($1,$2)',['one',[{kind:'pyq',examId:'neet-pg',year:2025,session:'main'}]]);
 await db.query('insert into neural_canonical_note_versions values(gen_random_uuid(),$1,$2)',['empty','published']);
 const names=await readdir(new URL('../supabase/migrations/',import.meta.url));const name=names.find(n=>n.endsWith('_admin_content_coverage_snapshots.sql'));assert.ok(name);
 await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 const call=async(user=actor,id=null,registry='foundation@1')=>(await db.query('select public.owner_content_coverage_snapshot_v1($1,$2,$3) body',[user,id,registry])).rows[0].body;
 await db.exec('set role service_role');
 await assert.rejects(call(other),/content_admin_required/);
 const s=await call();assert.equal(s.concepts[0].conceptId,'empty');assert.equal(s.questions.length,1);assert.equal(s.questions[0].origins.length,1,'legacy provenance cannot duplicate an already represented exam/year appearance');assert.equal(s.notes.length,1);assert.equal(s.catalogVersion,1);assert.doesNotMatch(JSON.stringify(s),/PRIVATE|SECRET|answerOptionId|explanation|body_markdown/);
 await db.exec('reset role');await db.query("update study_catalog set version=2,body=jsonb_set(body,'{questions}','[]')");await db.exec('set role service_role');
 assert.deepEqual(await call(actor,s.snapshotId),s);assert.equal((await call()).questions.length,0);await assert.rejects(call(actor,s.snapshotId,'different@1'),/coverage_snapshot_expired/);
 await db.exec('reset role');await db.query('update content_admin_account set admin_user_id=$1',[other]);await assert.rejects(call(other,s.snapshotId),/coverage_snapshot_expired/);await db.query('update content_admin_account set admin_user_id=$1',[actor]);
 await db.query("update owner_content_coverage_snapshots set expires_at=now()-interval '1 second'");await assert.rejects(call(actor,s.snapshotId),/coverage_snapshot_expired/);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(call(actor),/permission denied/);await assert.rejects(db.query('select * from owner_content_coverage_snapshots'),/permission denied/);await db.exec('reset role');}
 assert.equal((await db.query('select version from study_catalog')).rows[0].version,2);
 console.log('Coverage PostgreSQL checks passed: private actor/registry-bound snapshots, frozen replay, expiry, metadata redaction and no canonical writes.');
}finally{await db.close();}
