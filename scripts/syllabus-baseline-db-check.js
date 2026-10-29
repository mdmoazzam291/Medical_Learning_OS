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
 -- Emulates the already-private immutable acceptance ledger from parent PR334.
 create table content_concept_acceptances(concept_id text primary key,accepted_identity_digest text not null,
   accepted_document jsonb not null);
 create function concept_draft_immutable_v1() returns trigger language plpgsql as $$begin raise exception 'immutable'; end;$$;
 grant usage on schema public,extensions,auth to service_role;grant select on auth.users to service_role;
 grant usage on schema public,extensions to anon,authenticated;
 grant select on public.study_catalog,public.content_admin_account,public.content_concept_acceptances to service_role;`);
 await db.query('insert into content_admin_account values($1)',[actor]);
 await db.query('insert into study_catalog values(1,4,$1)',[{concepts:[{conceptId:'one',label:'One synthetic'},{conceptId:'two',label:'Two synthetic'}],questions:[],sources:[]}]);
 const privateId='C-private-new',privateDigest='b'.repeat(64);
 await db.query('insert into content_concept_acceptances(concept_id,accepted_identity_digest,accepted_document) values($1,$2,$3)',
  [privateId,privateDigest,{conceptId:privateId,label:'Admin-only accepted synthetic',aliases:[],classification:{subjects:['medicine']}}]);
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
 const privateDraft=await save({...fresh(),document:{...doc(),conceptIds:['one',privateId]}});
 assert.deepEqual(privateDraft.privateIdentityBindings,[{conceptId:privateId,identityDigest:privateDigest}],
  'Admin-only acceptance must be a valid candidate checklist identity with a frozen digest');
 const privateDetail=await inspect(privateDraft.baselineId);
 assert.deepEqual(privateDetail.version.privateIdentityBindings,privateDraft.privateIdentityBindings,
  'Saved private identity binding must round-trip exactly to a protected Admin readback');
 assert.equal(privateDetail.version.catalogVersion,4,'Admin-only checklist must not mutate learner catalog');
 const privatePreflight=await preflight(privateDraft.baselineId,1);
 assert.equal(privatePreflight.members.length,2);
 assert.equal(privatePreflight.members[0].kind,'canonical');
 assert.equal(privatePreflight.members[0].bindingMatches,true);
 assert.equal(privatePreflight.members[1].conceptId,privateId);
 assert.equal(privatePreflight.members[1].kind,'accepted-private');
 assert.equal(privatePreflight.members[1].label,'Admin-only accepted synthetic');
 assert.equal(privatePreflight.members[1].identityDigest,privateDigest);
 assert.equal(privatePreflight.members[1].bindingMatches,true);
 assert.equal(privatePreflight.currentCatalogVersion,4,'Preflight cannot promote private concept');
 const privateOnlyPacket=await preflight(privateDraft.baselineId,1);
 assert.ok(!JSON.stringify(privateOnlyPacket).includes('answerKey'));
 // A distinct reviewer can inspect ONLY this granted draft's frozen private
 // meaning. No private concept is written to the public learner catalog.
 const privateGrant={requestId:crypto.randomUUID(),baselineId:privateDraft.baselineId,reviewerUserId:reviewer,
  action:'grant',reason:'Independent private identity scope review on this baseline'};
 await assert.rejects(target(privateDraft.baselineId,1,outsider),/syllabus_scope_reviewer_not_authorized/);
 await grant(privateGrant);
 const frozen=await target(privateDraft.baselineId,1);
 assert.equal(frozen.privateIdentityVerified,true);
 assert.equal(frozen.privateIdentities.length,1);
 assert.deepEqual(frozen.privateIdentities[0],{conceptId:privateId,identityDigest:privateDigest,
  identity:{conceptId:privateId,label:'Admin-only accepted synthetic',aliases:[],classification:{subjects:['medicine']}}});
 assert.equal(frozen.canReview,true);assert.equal(frozen.learnerRelease,false);
 const privateDecision={requestId:crypto.randomUUID(),baselineId:privateDraft.baselineId,revision:1,
  digest:privateDraft.digest,decision:'scope-reviewed',evidenceLocator:'Private synthetic independent evidence',
  evidenceSha256:'c'.repeat(64),note:'Independent source supports exact private synthetic concept identity.',
  attestationVersion:'independent-syllabus-scope-review-v1'};
 const privateReviewed=await decide(privateDecision);
 assert.equal(privateReviewed.decision,'scope-reviewed');
 assert.equal(privateReviewed.learnerRelease,false);


 const privateOnly=await save({...fresh(),document:{...doc(),conceptIds:[privateId]}});
 await assert.rejects(target(privateOnly.baselineId,1),/syllabus_scope_reviewer_not_authorized/);
 assert.equal(privateOnly.privateIdentityBindings.length,1,'Proposed checklist may contain only accepted-private identities');
 await grant({...privateGrant,baselineId:privateOnly.baselineId,requestId:crypto.randomUUID()});
 // Corrupt the local synthetic fixture to simulate a missing/mismatched registry
 // identity; production acceptance rows are immutable and cannot be edited.
 await db.exec('reset role');
 await db.query('update content_concept_acceptances set accepted_identity_digest=$1 where concept_id=$2',
  ['f'.repeat(64),privateId]);
 await db.exec('set role service_role');
 const stalePrivate=await target(privateOnly.baselineId,1);
 assert.equal(stalePrivate.privateIdentityVerified,false);
 assert.equal(stalePrivate.canReview,false);
 const blockedDecision={...privateDecision,requestId:crypto.randomUUID(),baselineId:privateOnly.baselineId,
  digest:privateOnly.digest};
 await assert.rejects(decide(blockedDecision),/syllabus_scope_private_identity_unverified/);
 const correction=await decide({...blockedDecision,requestId:crypto.randomUUID(),decision:'changes-required'});
 assert.equal(correction.decision,'changes-required');
 await db.exec('reset role');
 await db.query('update content_concept_acceptances set accepted_identity_digest=$1 where concept_id=$2',
  [privateDigest,privateId]);
 await db.exec('set role service_role');
 await assert.rejects(save({...fresh(),document:{...doc(),conceptIds:[privateId,'unknown-unaccepted']}}),
  /syllabus_baseline_unknown_concept/);
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
 assert.equal(review.members[0].label,'One synthetic');
 assert.equal(review.members[1].kind,'canonical');
 assert.equal(review.members[1].bindingMatches,true);
 assert.equal((await preflight(first.baselineId,1)).isLatest,false);
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
 assert.equal(catalog.body.concepts.some(c=>c.conceptId===privateId),false,
  'A private accepted identity must not leak into the learner-shared canonical catalog');
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  await assert.rejects(save(fresh()),/permission denied/);
  await assert.rejects(inspect(),/permission denied/);
  await assert.rejects(target(privateDraft.baselineId,1),/permission denied/);
  await assert.rejects(decide(privateDecision),/permission denied/);
  await assert.rejects(grant(privateGrant),/permission denied/);
  await assert.rejects(db.exec('select * from content_syllabus_scope_decisions'),/permission denied/);
  await assert.rejects(preflight(privateDraft.baselineId,1),/permission denied/);
  await assert.rejects(db.exec('select * from content_syllabus_baseline_draft_versions'),/permission denied/);
  await db.exec('reset role');
 }
 await db.query('update study_catalog set version=5 where id=1');
 const changed=await preflight(first.baselineId,2);
 assert.equal(changed.authoredCatalogVersion,4);
 assert.equal(changed.currentCatalogVersion,5,'preflight must report catalog drift, not imply current approval');
 console.log('Reviewer-scope PostgreSQL checks passed: private identity disclosure scoped to grants, exact digest checks, stale binding blocks positive attestation, denied roles and no learner publication.');
 console.log('Syllabus preflight PostgreSQL checks passed: Admin-only published/private/missing classification, frozen identity binding, metadata isolation, stale catalog and actor denials.');
 console.log('Syllabus baseline draft PostgreSQL tests passed: accepted-private identity bindings, immutable revisions, unknown IDs, role isolation, shared catalog unchanged, no activation.');
}finally{await db.close();}
