import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');const db=new PGlite();
const actor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema extensions;create function extensions.digest(bytea,text) returns bytea language sql immutable as $$select sha256($1)$$;create table content_admin_account(admin_user_id uuid);create function is_content_admin(uuid) returns boolean language sql stable as $$select exists(select 1 from public.content_admin_account where admin_user_id=$1)$$;
 create table study_catalog(id int,version bigint,body jsonb);create table content_library_concept_metadata(concept_id text primary key,classification jsonb);grant usage on schema public,extensions to service_role,anon,authenticated;grant select on all tables in schema public to service_role;grant update on public.study_catalog to service_role;grant insert,update on public.content_library_concept_metadata to service_role;`);
 await db.query('insert into content_admin_account values($1)',[actor]);const cls={subjects:['medicine'],systems:[],organs:[],domains:[],tasks:[]};const catalog={concepts:[{conceptId:'existing',label:'Existing synthetic',aliases:[],subjectTags:['medicine']}],questions:[],sources:[]};await db.query('insert into study_catalog values(1,1,$1)',[catalog]);
 const files=await readdir(new URL('../supabase/migrations/',import.meta.url));const content=await readFile(new URL('../supabase/migrations/20261003224909_canonical_content_library.sql',import.meta.url),'utf8');for(const name of ['content_library_fields','content_library_strings','content_library_facets','content_library_text']){const pattern=new RegExp('create (?:or replace )?function public\\.'+name+'\\([\\s\\S]*?as (\\$[a-z_]*\\$)[\\s\\S]*?\\1;','i');await db.exec(content.match(pattern)[0]);}
 await db.exec(await readFile(new URL('../supabase/migrations/'+files.find(x=>x.endsWith('_admin_concept_drafts.sql')),import.meta.url),'utf8'));
 const inspect=async(id=null,revision=null,offset=0)=>(await db.query('select public.concept_draft_inspect_v1($1,$2,$3,$4) packet',[actor,id,revision,offset])).rows[0].packet;
 const save=async(input,user=actor)=>(await db.query('select public.concept_draft_save_v1($1,$2) receipt',[user,input])).rows[0].receipt;
 const fresh=()=>({schemaVersion:1,requestId:crypto.randomUUID(),proposalId:null,expectedDigest:null,conceptId:null,baseDigest:null,document:{label:'New synthetic concept',aliases:[],classification:cls,sourceEvidence:'Synthetic source locator, not reviewed',changeReason:'Add gap concept'}});
 await db.exec('set role service_role');const initial=await inspect();assert.equal(initial.concepts.length,1);assert.equal(initial.drafts.length,0);
 for(const bad of [{...fresh(),conceptId:123,baseDigest:'a'.repeat(64)},{...fresh(),document:{...fresh().document,classification:{...cls,systems:['x'.repeat(161)]}}}])await assert.rejects(save(bad),/concept_draft_invalid/);
 const twin=await save({...fresh(),document:{...fresh().document,label:'Existing synthetic'}});assert.equal((await inspect(twin.proposalId)).nameMatches[0].conceptId,'existing');
 const input=fresh();await assert.rejects(save(input,other),/content_admin_required/);const first=await save(input);assert.equal(first.revision,1);assert.ok(first.conceptId.startsWith('C-'));assert.deepEqual(await save(input),first);await assert.rejects(save({...input,document:{...input.document,label:'Changed under same key'}}),/concept_draft_request_conflict/);
 const packet=await inspect(first.proposalId,first.revision);assert.deepEqual(packet.version.document,input.document);assert.equal(packet.version.digest,first.digest);assert.equal(packet.history.length,1);
 const secondInput={...fresh(),proposalId:first.proposalId,expectedDigest:first.digest,conceptId:first.conceptId,document:{...input.document,label:'Revised synthetic'}};const second=await save(secondInput);assert.equal(second.revision,2);assert.equal((await inspect(first.proposalId)).history.length,2);assert.equal((await inspect(first.proposalId,1)).version.document.label,'New synthetic concept');await assert.rejects(save({...secondInput,requestId:crypto.randomUUID()}),/concept_draft_stale/);
 const target=initial.concepts[0];const editing={...fresh(),conceptId:target.conceptId,baseDigest:target.digest};const existingDraft=await save(editing);assert.equal((await inspect(existingDraft.proposalId)).version.operation,'revise');
 await db.exec('reset role');await db.query("update study_catalog set body=jsonb_set(body,'{concepts,0,label}','\"Canonical changed\"')");await db.exec('set role service_role');await assert.rejects(save({...editing,requestId:crypto.randomUUID()}),/concept_draft_target_changed/);
 for(const verb of ["update public.content_concept_draft_versions set revision=revision","delete from public.content_concept_draft_versions"])await assert.rejects(db.exec(verb),/permission denied|immutable/);
 await db.exec('reset role');assert.equal((await db.query("select jsonb_array_length(body->'concepts') n from study_catalog")).rows[0].n,1);assert.equal((await db.query("select jsonb_array_length(body->'questions') n from study_catalog")).rows[0].n,0);
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(inspect(),/permission denied/);await assert.rejects(save(fresh()),/permission denied/);await assert.rejects(db.exec('select * from public.content_concept_draft_versions'),/permission denied/);await db.exec('reset role');}

 // Acceptance runs only after the draft tests have confirmed that drafts alone do not write canonical records.
 await db.exec(await readFile(new URL('../supabase/migrations/'+files.find(x=>x.endsWith('_admin_concept_acceptance.sql')),import.meta.url),'utf8'));
 const declaration='identity-and-classification-reviewed-not-medical-or-learner-release';
 const decision=(receipt,notes='Owner reviewed identity and classification on the synthetic concept.')=>({
  schemaVersion:1,requestId:crypto.randomUUID(),proposalId:receipt.proposalId,
  revision:receipt.revision,digest:receipt.digest,reviewNotes:notes,attestation:declaration
 });
 const accept=async(d,user=actor)=>(await db.query('select public.concept_draft_accept_v1($1,$2) receipt',[user,d])).rows[0].receipt;
 await db.exec('set role service_role');
 await assert.rejects(accept(decision(second),other),/content_admin_required/);
 await assert.rejects(accept({...decision(second),attestation:'medical approved'}),/concept_accept_invalid/);
 const duplicate=await save({...fresh(),document:{...fresh().document,label:'Canonical changed'}});
 await assert.rejects(accept(decision(duplicate)),/concept_accept_identity_conflict/);
 await assert.rejects(accept(decision(existingDraft)),/concept_accept_target_changed/);
 const nowTarget=(await inspect()).concepts.find(c=>c.conceptId==='existing');
 const safeEdit=await save({...fresh(),conceptId:nowTarget.conceptId,baseDigest:nowTarget.digest});
 await assert.rejects(accept(decision(safeEdit)),/concept_accept_revision_requires_release/);
 await assert.rejects(accept({...decision(second),digest:'0'.repeat(64)}),/concept_accept_stale/);
 const approval=decision(second);
 const approved=await accept(approval);
 assert.equal(approved.status,'concept_accepted');assert.equal(approved.conceptId,second.conceptId);
 assert.deepEqual(await accept(approval),approved);
 await assert.rejects(accept({...approval,reviewNotes:'A new conflicting attestation under the same request identifier.'}),/concept_accept_request_conflict/);
 await assert.rejects(accept(decision(second)),/concept_already_accepted/);
 await assert.rejects(save({...secondInput,proposalId:second.proposalId,expectedDigest:second.digest,requestId:crypto.randomUUID()}),/concept_draft_target_changed/);
 await db.exec('reset role');
 const final=(await db.query('select body,version from study_catalog where id=1')).rows[0];
 assert.equal(final.body.concepts.length,2);assert.equal(final.body.questions.length,0);
 assert.equal(final.body.concepts.find(c=>c.conceptId===approved.conceptId).label,'Revised synthetic');
 assert.equal((await db.query('select count(*)::integer n from content_concept_acceptances')).rows[0].n,1);
 for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   await assert.rejects(accept(decision(second)),/permission denied/);
   await assert.rejects(db.exec('select * from public.content_concept_acceptances'),/permission denied/);
   await db.exec('reset role');
 }
 console.log('Concept acceptance PostgreSQL checks passed: strict attestation, exact current version, name/stale conflict, idempotence, immutable audit and no learner/question mutation.');
 console.log('Concept draft PostgreSQL checks passed: zero-question creation, immutable revisions, exact retry/readback, stale target/predecessor and browser isolation; no canonical writes.');
}finally{await db.close();}
