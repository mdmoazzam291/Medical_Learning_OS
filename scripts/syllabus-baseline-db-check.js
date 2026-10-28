import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');
const db=new PGlite();
const actor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const registry='pg-preparation:foundation@1';
const doc=()=>({label:'Synthetic partial checklist',pathwayVersionId:'neet-pg:preparation@1',
 sourceKind:'historical',sourceLocator:'Synthetic nonclinical source locator',
 sourceVersion:'fixture@1',scopeDeclaration:'partial',conceptIds:['one'],
 changeReason:'Create synthetic scope proposal'});
const fresh=()=>({schemaVersion:1,requestId:crypto.randomUUID(),baselineId:null,expectedDigest:null,document:doc()});
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema extensions;create function extensions.digest(bytea,text) returns bytea language sql immutable as $$select sha256($1)$$;
 create table content_admin_account(admin_user_id uuid);
 create function is_content_admin(uuid) returns boolean language sql stable as $$select exists(select 1 from public.content_admin_account where admin_user_id=$1)$$;
 create table study_catalog(id int primary key,version bigint,body jsonb);
 create function concept_draft_immutable_v1() returns trigger language plpgsql as $$begin raise exception 'immutable'; end;$$;
 grant usage on schema public,extensions to service_role,anon,authenticated;
 grant select on public.study_catalog,public.content_admin_account to service_role;`);
 await db.query('insert into content_admin_account values($1)',[actor]);
 await db.query('insert into study_catalog values(1,4,$1)',[{concepts:[{conceptId:'one',label:'One synthetic'},{conceptId:'two',label:'Two synthetic'}],questions:[],sources:[]}]);
 await db.exec(await readFile(new URL('../supabase/migrations/20261028223000_admin_syllabus_baseline_drafts.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261029000100_admin_syllabus_review_preflight.sql',import.meta.url),'utf8'));
 const preflight=async(id,revision,user=actor)=>(await db.query('select public.syllabus_baseline_review_preflight_v1($1,$2,$3) packet',
 [user,id,revision])).rows[0].packet;
 const save=async(value,user=actor,reg=registry)=>(await db.query('select public.syllabus_baseline_draft_save_v1($1,$2,$3) receipt',[user,reg,value])).rows[0].receipt;
 const inspect=async(id=null,revision=null,user=actor)=>(await db.query('select public.syllabus_baseline_draft_inspect_v1($1,$2,$3,0) packet',[user,id,revision])).rows[0].packet;
 await db.exec('set role service_role');
 assert.equal((await inspect()).total,0);
 await assert.rejects(save(fresh(),other),/content_admin_required/);
 await assert.rejects(save({...fresh(),status:'approved'}),/syllabus_baseline_invalid/);
 await assert.rejects(save({...fresh(),document:{...doc(),scopeDeclaration:null}}),/syllabus_baseline_invalid/);
 await assert.rejects(save({...fresh(),document:{...doc(),sourceKind:null}}),/syllabus_baseline_invalid/);
 await assert.rejects(save({...fresh(),document:{...doc(),conceptIds:['not-real']}}),/syllabus_baseline_unknown_concept/);
 await assert.rejects(save({...fresh(),document:{...doc(),conceptIds:['one','one']}}),/syllabus_baseline_invalid/);
 const empty=await save({...fresh(),document:{...doc(),conceptIds:[]}});assert.equal(empty.status,'draft');
 const input=fresh();const first=await save(input);assert.equal(first.revision,1);
 assert.deepEqual(await save(input),first,'exact retries return original receipt');
 await assert.rejects(save({...input,document:{...doc(),label:'Changed under same request'}}),/syllabus_baseline_request_conflict/);
 const detail=await inspect(first.baselineId);assert.equal(detail.version.document.label,doc().label);
 assert.equal(detail.version.catalogVersion,4);assert.equal(detail.version.registryVersion,registry);
 const revised={...fresh(),baselineId:first.baselineId,expectedDigest:first.digest,
 document:{...doc(),conceptIds:['one','two'],changeReason:'Revised synthetic scope after inventory audit'}};
 const second=await save(revised);assert.equal(second.revision,2);
 const review=await preflight(first.baselineId,2);
 assert.equal(review.contractId,'admin-syllabus-review-preflight-v1');
 assert.equal(review.digest,second.digest);assert.equal(review.currentCatalogVersion,4);
 assert.equal(review.isLatest,true);assert.equal(review.members.length,2);
 assert.equal(review.members[0].label,'One synthetic');assert.equal(review.members[1].exists,true);
 assert.equal((await preflight(first.baselineId,1)).isLatest,false);
 assert.ok(!/answerKey|PRIVATE STEM|clinicalAnswer/.test(JSON.stringify(review)));
 assert.equal(review.sourceKind,'historical');assert.equal(review.scopeDeclaration,'partial');
 await assert.rejects(preflight(first.baselineId,2,other),/content_admin_required/);
 await assert.rejects(preflight(first.baselineId,3),/syllabus_baseline_not_found/);
 assert.equal((await inspect(first.baselineId,1)).version.digest,first.digest);
 assert.equal((await inspect(first.baselineId)).history.length,2);
 await assert.rejects(save({...revised,requestId:crypto.randomUUID()}),/syllabus_baseline_stale/);
 await assert.rejects(save({...revised,requestId:crypto.randomUUID(),expectedDigest:second.digest},
 actor,'changed@2'),/syllabus_baseline_stale/);
 for(const stmt of ['update public.content_syllabus_baseline_draft_versions set revision=revision',
   'delete from public.content_syllabus_baseline_draft_versions'])await assert.rejects(db.exec(stmt),/permission denied|immutable/);
 await db.exec('reset role');
 const catalog=(await db.query('select version,body from public.study_catalog where id=1')).rows[0];
 assert.equal(catalog.version,4);assert.equal(catalog.body.concepts.length,2);
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  await assert.rejects(save(fresh()),/permission denied/);
  await assert.rejects(inspect(),/permission denied/);
  await assert.rejects(preflight(first.baselineId,2),/permission denied/);
  await assert.rejects(db.exec('select * from content_syllabus_baseline_draft_versions'),/permission denied/);
  await db.exec('reset role');
 }
 await db.query('update study_catalog set version=5 where id=1');
 const changed=await preflight(first.baselineId,2);assert.equal(changed.authoredCatalogVersion,4);
 assert.equal(changed.currentCatalogVersion,5,'changed catalog must invalidate alignment instead of silently reusing it');
 assert.equal((await db.query('select count(*)::integer n from content_syllabus_baseline_draft_versions')).rows[0].n,3);
 console.log('Read-only review packet PostgreSQL checks passed: exact revision, labels, actor/grants, stale catalog, zero publication and source metadata.');
 console.log('Syllabus baseline draft PostgreSQL tests passed: request replay, immutable versions, missing IDs, actor/grant isolation, catalog untouched and no activation.');
}finally{await db.close();}
