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
 -- Emulates the already-private immutable acceptance ledger from parent PR334.
 create table content_concept_acceptances(concept_id text primary key,accepted_identity_digest text not null,
   accepted_document jsonb not null);
 create function concept_draft_immutable_v1() returns trigger language plpgsql as $$begin raise exception 'immutable'; end;$$;
 grant usage on schema public,extensions to service_role,anon,authenticated;
 grant select on public.study_catalog,public.content_admin_account,public.content_concept_acceptances to service_role;`);
 await db.query('insert into content_admin_account values($1)',[actor]);
 await db.query('insert into study_catalog values(1,4,$1)',[{concepts:[{conceptId:'one',label:'One synthetic'},{conceptId:'two',label:'Two synthetic'}],questions:[],sources:[]}]);
 const privateId='C-private-new',privateDigest='b'.repeat(64);
 await db.query('insert into content_concept_acceptances(concept_id,accepted_identity_digest,accepted_document) values($1,$2,$3)',
  [privateId,privateDigest,{conceptId:privateId,label:'Admin-only accepted synthetic',classification:{subjects:['medicine']}}]);
 await db.exec(await readFile(new URL('../supabase/migrations/20261028223000_admin_syllabus_baseline_drafts.sql',import.meta.url),'utf8'));
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
 const privateOnly=await save({...fresh(),document:{...doc(),conceptIds:[privateId]}});
 assert.equal(privateOnly.privateIdentityBindings.length,1,'Proposed checklist may contain only accepted-private identities');
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
  await assert.rejects(db.exec('select * from content_syllabus_baseline_draft_versions'),/permission denied/);
  await db.exec('reset role');
 }
 console.log('Syllabus baseline draft PostgreSQL tests passed: accepted-private identity bindings, immutable revisions, unknown IDs, role isolation, shared catalog unchanged, no activation.');
}finally{await db.close();}
