import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');
const db=new PGlite();
const actor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const registry='pg-preparation:foundation@1';
const reviewer='33333333-3333-4333-8333-333333333333',outsider='44444444-4444-4444-8444-444444444444';
const doc=()=>({label:'Synthetic partial checklist',pathwayVersionId:'neet-pg:preparation@1',
 sourceKind:'historical',sourceLocator:'Synthetic nonclinical source locator',
 sourceVersion:'fixture@1',scopeDeclaration:'partial',conceptIds:['one'],
 changeReason:'Create synthetic scope proposal'});
const fresh=()=>({schemaVersion:1,requestId:crypto.randomUUID(),baselineId:null,expectedDigest:null,document:doc()});
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('33333333-3333-4333-8333-333333333333'),('44444444-4444-4444-8444-444444444444');
 create schema extensions;create function extensions.digest(bytea,text) returns bytea language sql immutable as $$select sha256($1)$$;
 create table content_admin_account(admin_user_id uuid);
 create function is_content_admin(uuid) returns boolean language sql stable as $$select exists(select 1 from public.content_admin_account where admin_user_id=$1)$$;
 create table study_catalog(id int primary key,version bigint,body jsonb);
 create function concept_draft_immutable_v1() returns trigger language plpgsql as $$begin raise exception 'immutable'; end;$$;
 grant usage on schema public,extensions,auth to service_role;grant select on auth.users to service_role;
 grant usage on schema public,extensions to anon,authenticated;
 grant select on public.study_catalog,public.content_admin_account to service_role;`);
 await db.query('insert into content_admin_account values($1)',[actor]);
 await db.query('insert into study_catalog values(1,4,$1)',[{concepts:[{conceptId:'one',label:'One synthetic'},{conceptId:'two',label:'Two synthetic'}],questions:[],sources:[]}]);
 await db.exec(await readFile(new URL('../supabase/migrations/20261028223000_admin_syllabus_baseline_drafts.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261029000100_admin_syllabus_review_preflight.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261029012000_syllabus_independent_scope_review.sql',import.meta.url),'utf8'));
 const grant=async(value,user=actor)=>(await db.query('select public.syllabus_scope_reviewer_grant_v1($1,$2) receipt',[user,value])).rows[0].receipt;
 const target=async(baseline,revision,user=reviewer)=>(await db.query('select public.syllabus_scope_review_inspect_v1($1,$2,$3) receipt',[user,baseline,revision])).rows[0].receipt;
 const decide=async(value,user=reviewer,reg=registry)=>(await db.query('select public.syllabus_scope_review_decide_v1($1,$2,$3) receipt',[user,reg,value])).rows[0].receipt;
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
 const grantInput={requestId:crypto.randomUUID(),baselineId:first.baselineId,reviewerUserId:reviewer,
  action:'grant',reason:'Independent scope review of synthetic baseline'};
 await assert.rejects(grant({...grantInput,reviewerUserId:actor}),/syllabus_scope_grant_invalid/);
 await assert.rejects(grant(grantInput,other),/content_admin_required/);
 await assert.rejects(target(first.baselineId,2),/syllabus_scope_reviewer_not_authorized/);
 await assert.rejects(grant({...grantInput,reviewerUserId:'55555555-5555-4555-8555-555555555555',
 requestId:crypto.randomUUID()}),/syllabus_scope_reviewer_unknown/);
 const grantReceipt=await grant(grantInput);assert.equal(grantReceipt.action,'grant');
 assert.deepEqual(await grant(grantInput),grantReceipt);
 await assert.rejects(grant({...grantInput,reason:'Different evidence under same request'}),/syllabus_scope_grant_request_conflict/);
 await assert.rejects(grant({...grantInput,requestId:crypto.randomUUID()}),/syllabus_scope_grant_state_conflict/);
 const targetPacket=await target(first.baselineId,2);
 assert.equal(targetPacket.canReview,true);assert.equal(targetPacket.reviewerId,reviewer);
 assert.equal(targetPacket.officialSyllabusCertified,false);assert.equal(targetPacket.document.conceptIds.length,2);
 const sourceDecision={requestId:crypto.randomUUID(),baselineId:first.baselineId,revision:2,digest:second.digest,
  decision:'scope-reviewed',evidenceLocator:'Synthetic independent scope evidence file',
  evidenceSha256:'a'.repeat(64),note:'Reviewed this synthetic scope against a separate evidence record.',
  attestationVersion:'independent-syllabus-scope-review-v1'};
 await assert.rejects(decide(sourceDecision,actor),/syllabus_scope_reviewer_not_authorized/);
 await assert.rejects(decide({...sourceDecision,digest:'b'.repeat(64)}),/syllabus_scope_review_stale/);
 await assert.rejects(decide({...sourceDecision,revision:1}),/syllabus_scope_review_stale/);
 await assert.rejects(decide({...sourceDecision,requestId:crypto.randomUUID()},outsider),/syllabus_scope_reviewer_not_authorized/);
 const decided=await decide(sourceDecision);assert.equal(decided.decision,'scope-reviewed');
 assert.equal(decided.learnerRelease,false);assert.equal(decided.curriculumActivated,false);
 assert.equal(decided.officialSyllabusCertified,false);
 assert.deepEqual(await decide(sourceDecision),decided);
 await assert.rejects(decide({...sourceDecision,decision:'changes-required'}),/syllabus_scope_review_request_conflict/);
 await assert.rejects(decide({...sourceDecision,requestId:crypto.randomUUID()}),/syllabus_scope_review_already_recorded/);
 assert.equal((await target(first.baselineId,2)).canReview,false);
 const revoke=await grant({...grantInput,requestId:crypto.randomUUID(),action:'revoke',reason:'Reviewer assignment completed and withdrawn'});
 assert.equal(revoke.action,'revoke');await assert.rejects(target(first.baselineId,2),/syllabus_scope_reviewer_not_authorized/);
 await assert.rejects(grant({...grantInput,requestId:crypto.randomUUID(),action:'revoke'}),/syllabus_scope_grant_state_conflict/);
 assert.deepEqual(await decide(sourceDecision),decided,'same committed request remains idempotent after grant revocation');
 for(const stmt of ['update content_syllabus_scope_decisions set review_note=review_note',
  'delete from content_syllabus_reviewer_grant_events'])await assert.rejects(db.exec(stmt),/permission denied|immutable/);
 console.log('Independent syllabus review PostgreSQL checks: grants, revocation, self-review denial, exact digests, stale, receipt and isolation passed.');
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
  await assert.rejects(grant(grantInput),/permission denied/);
  await assert.rejects(target(first.baselineId,2),/permission denied/);
  await assert.rejects(decide(sourceDecision),/permission denied/);
  await assert.rejects(db.exec('select * from content_syllabus_scope_decisions'),/permission denied/);
  await assert.rejects(db.exec('select * from content_syllabus_reviewer_grant_events'),/permission denied/);
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
