import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');
const db=new PGlite(),actor='11111111-1111-4111-8111-111111111111';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create table content_admin_account(admin_user_id uuid);create function is_content_admin(uuid) returns boolean language sql stable as $$select exists(select 1 from public.content_admin_account where admin_user_id=$1)$$;
 create table study_catalog(id int,version bigint,body jsonb);
 create table neural_canonical_note_versions(id uuid,concept_id text,version int,status text,source_ids jsonb);
 create table content_review_events(target_type text,target_id text,review_kind text,decision text,target_sha256 text);
 create table source_rights_events(source_id text,source_fingerprint_sha256 text);
 create table learner_content_issue_reports(id uuid,target_type text,target_id text);
 create table learner_content_issue_triage_events(report_id uuid,decision text);
 create function current_review_target_sha256(text,text) returns text language sql as $$select repeat('a',64)$$;
 create function current_neural_note_review_target_sha256(uuid,text) returns text language sql as $$select repeat('b',64)$$;
 create function current_source_fingerprint_sha256(text) returns text language sql as $$select repeat('c',64)$$;
 grant usage on schema public to anon,authenticated,service_role;grant select on all tables in schema public to service_role;`);
 await db.query('insert into content_admin_account values($1)',[actor]);
 const q={questionId:'q',questionVersionId:'q@1',version:1,status:'published',sourceIds:['s'],stem:'PRIVATE STEM',answerOptionId:'SECRET'};
 const catalog={questions:[q],sources:[{sourceId:'s',rights:{status:'licensed'},evidence:'PRIVATE EVIDENCE'}]};
 await db.query('insert into study_catalog values(1,446,$1)',[catalog]);
 await db.exec("insert into source_rights_events values('s',repeat('c',64));insert into content_review_events select 'question_version','q@1',k,'approved',repeat('a',64) from unnest(array['medical','references','rights']) k;");
 const names=await readdir(new URL('../supabase/migrations/',import.meta.url));const migration=names.find(n=>n.endsWith('_admin_approved_collection_preflight.sql'));assert.ok(migration);
 await db.exec(await readFile(new URL('../supabase/migrations/'+migration,import.meta.url),'utf8'));
 const call=async (who=actor)=>(await db.query('select owner_approved_collection_preflight_v1($1) body',[who])).rows[0].body;

 await db.exec(`create schema extensions;create function extensions.digest(bytea,text) returns bytea language sql immutable as $$select decode(md5($1)||md5($1),'hex')$$;grant usage on schema extensions to service_role;`);
 const selectionMigration=(await readdir(new URL('../supabase/migrations/',import.meta.url))).find(n=>n.endsWith('_frozen_content_selections.sql'));
 await db.exec(await readFile(new URL('../supabase/migrations/'+selectionMigration,import.meta.url),'utf8'));
 const items=[{kind:'question',versionId:'q@1'}],request='33333333-3333-4333-8333-333333333333';
 const preview=async who=> (await db.query('select owner_content_selection_preview_v1($1,$2) body',[who||actor,items])).rows[0].body;
 const save=async(p,req=request,who=actor)=>(await db.query('select owner_content_selection_save_v1($1,$2,$3,$4,$5) body',[who,req,items,p.digest,p.catalogVersion])).rows[0].body;
 await db.exec('set role service_role');await assert.rejects(preview('22222222-2222-4222-8222-222222222222'),/content_admin_required/);
 const p=await preview();assert.equal(p.publicationAuthority,false);assert.equal(p.items[0].versionId,'q@1');
 await assert.rejects(save({...p,digest:'d'.repeat(64)},'44444444-4444-4444-8444-444444444444'),/content_selection_stale/);
 const receipt=await save(p);assert.equal(receipt.publicationAuthority,false);assert.equal(receipt.items.length,1);assert.match(receipt.selectionId,/^[0-9a-f-]{36}$/);
 assert.deepEqual(await save(p),receipt);
 const read=await db.query('select owner_content_selection_read_v1($1,$2) body',[actor,receipt.selectionId]);assert.deepEqual(read.rows[0].body,receipt);
 await assert.rejects(save({...p,digest:'d'.repeat(64)}),/content_selection_request_conflict/);
 await db.exec('reset role');await db.exec("update content_review_events set target_sha256=repeat('d',64) where review_kind='medical'");await db.exec('set role service_role');
 await assert.rejects(preview(),/content_selection_item_blocked/);assert.deepEqual(await save(p),receipt,'successful retry stays immutable after evidence drift');
 await assert.rejects(db.query("update owner_content_selections set digest=repeat('e',64)"),/permission denied/);
 await db.exec('reset role');await assert.rejects(db.query("update owner_content_selections set digest=repeat('e',64)"),/content_selection_immutable/);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(preview(),/permission denied/);await assert.rejects(db.query('select * from owner_content_selections'),/permission denied/);await db.exec('reset role');}
 assert.equal((await db.query('select version from study_catalog')).rows[0].version,446);
 assert.doesNotMatch(JSON.stringify(receipt),/PRIVATE|SECRET|stem|answerOptionId|evidence|reviewer_id/);
 console.log('Frozen selection SQL passed: exact bindings, actor/browser denial, immutable save/readback/retry, conflicting request, drift blocks, no canonical writes. Crypto/fingerprint routines are fixture stubs.');
}finally{await db.close();}
