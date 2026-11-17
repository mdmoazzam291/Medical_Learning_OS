import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');const db=new PGlite();
const actor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const declaration='identity-and-classification-reviewed-not-medical-or-learner-release';
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema extensions;create function extensions.digest(bytea,text) returns bytea language sql immutable as $$select sha256($1)$$;create table content_admin_account(admin_user_id uuid);create function is_content_admin(uuid) returns boolean language sql stable as $$select exists(select 1 from public.content_admin_account where admin_user_id=$1)$$;
 create table study_catalog(id int primary key,version bigint,body jsonb,updated_at timestamptz default now());create table content_library_concept_metadata(concept_id text primary key,classification jsonb);grant usage on schema public,extensions to service_role,anon,authenticated;grant select on all tables in schema public to service_role;grant update on public.study_catalog to service_role;grant insert,update on public.content_library_concept_metadata to service_role;`);
 await db.query('insert into content_admin_account values($1)',[actor]);
 await db.query('insert into study_catalog values(1,7,$1)',[{concepts:[{conceptId:'existing',label:'Existing synthetic',aliases:[],subjectTags:['medicine']}],questions:[],sources:[]}]);
 const files=await readdir(new URL('../supabase/migrations/',import.meta.url));
 const content=await readFile(new URL('../supabase/migrations/20261003224909_canonical_content_library.sql',import.meta.url),'utf8');
 for(const name of ['content_library_fields','content_library_strings','content_library_facets','content_library_text']){const pattern=new RegExp('create (?:or replace )?function public\\.'+name+'\\([\\s\\S]*?as (\\$[a-z_]*\\$)[\\s\\S]*?\\1;','i');await db.exec(content.match(pattern)[0]);}
 for(const suffix of ['_admin_concept_drafts.sql','_admin_concept_acceptance.sql','_admin_concept_batch_acceptance.sql','_admin_concept_subject_revisions.sql'])
  await db.exec(await readFile(new URL('../supabase/migrations/'+files.find(x=>x.endsWith(suffix)),import.meta.url),'utf8'));
 const doc=label=>({label,aliases:[],classification:{subjects:['physiology'],systems:['general'],organs:[],domains:['normal-function'],tasks:['mechanism']},sourceEvidence:'Synthetic source locator',changeReason:'Synthetic revision check'});
 const key=i=>'nmc-concept:'+i.toString(16).padStart(16,'0');
 const notes='Owner reviewed subject classification for this synthetic revision batch.';
 await db.exec('set role service_role');
 const accepted=(await db.query('select public.concept_batch_accept_v1($1,$2) r',[actor,{schemaVersion:1,requestId:crypto.randomUUID(),batchId:'synthetic-accept',batchSha256:'a'.repeat(64),reviewNotes:notes,attestation:declaration,
  items:[1,2,3].map(i=>({conceptKey:key(i),document:doc('Concept '+i)}))}])).rows[0].r;
 const [a,b,c]=accepted.receipts.map(x=>x.conceptId);
 const current=async id=>(await db.query('select concept_id,accepted_document,identity_digest,identity_revision from public.content_concept_current_identities where concept_id=$1',[id])).rows[0];
 const da=(await current(a)).identity_digest,dbb=(await current(b)).identity_digest;
 assert.equal(da,accepted.receipts[0].identityDigest,'view starts from the acceptance digest');
 const input=(batchId,items,extra={})=>({schemaVersion:1,requestId:crypto.randomUUID(),batchId,batchSha256:'b'.repeat(64),reviewNotes:notes,attestation:declaration,items,...extra});
 const run=async(i,user=actor)=>(await db.query('select public.concept_subject_revision_batch_v1($1,$2) r',[user,i])).rows[0].r;
 const count=async t=>(await db.query('select count(*)::int n from public.'+t)).rows[0].n;
 const good=input('synthetic-revision-1',[{conceptId:a,previousIdentityDigest:da,addSubjects:['biochemistry']},{conceptId:b,previousIdentityDigest:dbb,addSubjects:['pathology','medicine']}]);
 await assert.rejects(run(good,other),/content_admin_required/);
 await assert.rejects(run({...good,attestation:'medical approved'}),/concept_revision_invalid/);
 await assert.rejects(run({...good,items:[...good.items,good.items[0]]}),/concept_revision_duplicate/);
 await assert.rejects(run(input('x',[{conceptId:a,previousIdentityDigest:'c'.repeat(64),addSubjects:['biochemistry']}])),/concept_revision_stale/);
 await assert.rejects(run(input('x',[{conceptId:a,previousIdentityDigest:da,addSubjects:['physiology']}])),/concept_revision_invalid/,'already-present subject');
 await assert.rejects(run(input('x',[{conceptId:a,previousIdentityDigest:da,addSubjects:['cardiology']}])),/concept_revision_invalid/,'unknown subject');
 await assert.rejects(run(input('x',[{conceptId:a,previousIdentityDigest:da,addSubjects:['biochemistry'],label:'Renamed'}])),/concept_revision_invalid/,'only subjects may change');
 await assert.rejects(run(input('x',[{conceptId:'C-missing',previousIdentityDigest:da,addSubjects:['biochemistry']}])),/concept_revision_not_found/);
 // Atomicity: a bad later item stores nothing.
 await assert.rejects(run(input('x',[good.items[0],{conceptId:c,previousIdentityDigest:'d'.repeat(64),addSubjects:['anatomy']}])),/concept_revision_stale/);
 assert.equal(await count('content_concept_identity_revisions'),0);assert.equal(await count('content_concept_revision_batches'),0);
 const r=await run(good);
 assert.equal(r.status,'batch_accepted');assert.equal(r.items,2);assert.equal(r.learnerPublished,false);
 const ca=await current(a);
 assert.equal(ca.identity_revision,2);assert.deepEqual(ca.accepted_document.classification.subjects,['physiology','biochemistry']);
 assert.notEqual(ca.identity_digest,da);assert.equal(ca.accepted_document.label,'Concept 1');
 assert.deepEqual((await current(b)).accepted_document.classification.subjects,['physiology','pathology','medicine']);
 assert.equal((await current(c)).identity_revision,1,'untouched concept keeps its acceptance');
 assert.equal((await db.query('select accepted_identity_digest d from public.content_concept_acceptances where concept_id=$1',[a])).rows[0].d,da,'original acceptance unchanged');
 assert.deepEqual((await run(good)).receipts,r.receipts,'exact replay');
 await assert.rejects(run({...good,requestId:crypto.randomUUID()}),/concept_revision_conflict/);
 await assert.rejects(run(input('synthetic-revision-2',[{conceptId:a,previousIdentityDigest:da,addSubjects:['anatomy']}])),/concept_revision_stale/,'old digest after revision');
 const r2=await run(input('synthetic-revision-2',[{conceptId:a,previousIdentityDigest:ca.identity_digest,addSubjects:['anatomy']}]));
 assert.equal(r2.receipts[0].revision,3);
 for(const verb of ['update public.content_concept_identity_revisions set revision=revision','delete from public.content_concept_revision_batches'])await assert.rejects(db.exec(verb),/permission denied|immutable/);
 await db.exec('reset role');
 // Learner-visible identities cannot be revised here.
 await db.query("update study_catalog set body=jsonb_set(body,'{concepts}',(body->'concepts')||jsonb_build_array(jsonb_build_object('conceptId',$1::text,'label','Concept 3','aliases','[]'::jsonb,'subjectTags','[]'::jsonb))) where id=1",[c]);
 const dc=(await current(c)).identity_digest;
 await db.exec('set role service_role');
 await assert.rejects(run(input('synthetic-revision-3',[{conceptId:c,previousIdentityDigest:dc,addSubjects:['anatomy']}])),/concept_revision_learner_visible/);
 await db.exec('reset role');
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(run(good),/permission denied/);for(const t of ['content_concept_identity_revisions','content_concept_revision_batches','content_concept_current_identities'])await assert.rejects(db.exec('select * from public.'+t),/permission denied/);await db.exec('reset role');}
 // Scale: the real Physiology batch, then one revision batch over all of it.
 await db.exec('set role service_role');
 const batch=JSON.parse(await readFile(new URL('../docs/evidence/2026-11-16-nmc-physiology-concept-batch-v3.json',import.meta.url),'utf8'));
 const fresh=batch.concepts.filter(x=>!x.existingConceptId).map(x=>({conceptKey:x.conceptKey,document:x.document}));
 const pr=(await db.query('select public.concept_batch_accept_v1($1,$2) r',[actor,{schemaVersion:1,requestId:crypto.randomUUID(),batchId:batch.batchId,batchSha256:'a'.repeat(64),reviewNotes:notes,attestation:declaration,items:fresh}])).rows[0].r;
 const items=pr.receipts.map(x=>({conceptId:x.conceptId,previousIdentityDigest:x.identityDigest,addSubjects:['biochemistry']}));
 const t0=Date.now();const big=await run(input('synthetic-revision-scale',items));const ms=Date.now()-t0;
 assert.equal(big.items,items.length);
 console.log(`Concept subject revision PostgreSQL checks passed: admin-only, subjects-only additions, stale/duplicate/unknown rejection, atomic rollback, exact replay, conflict on reuse, chained revisions, learner-visible identities refused, immutable receipts, role isolation; ${items.length} revisions in ${ms} ms.`);
}finally{await db.close();}
