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
 for(const suffix of ['_admin_concept_drafts.sql','_admin_concept_acceptance.sql','_admin_concept_batch_acceptance.sql'])
  await db.exec(await readFile(new URL('../supabase/migrations/'+files.find(x=>x.endsWith(suffix)),import.meta.url),'utf8'));
 const catalogBefore=(await db.query('select body,version from public.study_catalog where id=1')).rows[0];
 const doc=(label,aliases=[])=>({label,aliases,classification:{subjects:['physiology'],systems:['general'],organs:[],domains:['normal-function'],tasks:['mechanism']},sourceEvidence:'Synthetic source locator',changeReason:'Synthetic batch check'});
 const key=i=>'nmc-concept:'+i.toString(16).padStart(16,'0');
 const input=(batchId,items,notes='Owner reviewed identity and classification for this synthetic batch.')=>({schemaVersion:1,requestId:crypto.randomUUID(),batchId,batchSha256:'a'.repeat(64),reviewNotes:notes,attestation:declaration,items});
 const run=async(i,user=actor)=>(await db.query('select public.concept_batch_accept_v1($1,$2) r',[user,i])).rows[0].r;
 const count=async t=>(await db.query('select count(*)::int n from public.'+t)).rows[0].n;
 await db.exec('set role service_role');
 const good=input('synthetic-batch-1',[{conceptKey:key(1),document:doc('Alpha concept')},{conceptKey:key(2),document:doc('Beta concept',['Beta alias'])},{conceptKey:key(3),document:doc('Gamma concept')}]);
 await assert.rejects(run(good,other),/content_admin_required/);
 await assert.rejects(run({...good,attestation:'medical approved'}),/concept_batch_invalid/);
 await assert.rejects(run({...good,reviewNotes:'too short'}),/concept_batch_invalid/);
 await assert.rejects(run({...good,items:[...good.items,good.items[0]]}),/concept_batch_duplicate_key/);
 await assert.rejects(run({...good,items:[{conceptKey:'bad',document:doc('X')}]}),/concept_batch_invalid/);
 const r=await run(good);
 assert.equal(r.status,'batch_accepted');assert.equal(r.items,3);assert.equal(r.learnerPublished,false);
 assert.ok(r.receipts.every(x=>/^C-/.test(x.conceptId)&&/^[a-f0-9]{64}$/.test(x.identityDigest)));
 assert.equal(await count('content_concept_acceptances'),3);assert.equal(await count('content_concept_batch_acceptances'),1);
 assert.deepEqual((await run(good)).receipts,r.receipts,'exact replay returns stored receipts');
 await assert.rejects(run({...good,requestId:crypto.randomUUID()}),/concept_batch_conflict/);
 // Atomicity: a later item colliding with an existing label rolls back the whole batch.
 const clash=input('synthetic-batch-2',[{conceptKey:key(4),document:doc('Delta concept')},{conceptKey:key(5),document:doc('Existing synthetic')}]);
 await assert.rejects(run(clash),/concept_accept_identity_conflict/);
 assert.equal(await count('content_concept_acceptances'),3,'no partial acceptance after a failed batch');
 assert.equal(await count('content_concept_batch_acceptances'),1);
 const alias=input('synthetic-batch-3',[{conceptKey:key(6),document:doc('Beta alias')}]);
 await assert.rejects(run(alias),/concept_accept_identity_conflict/);
 // Real Physiology pilot batch must accept cleanly against the fixture.
 const batch=JSON.parse(await readFile(new URL('../docs/evidence/2026-11-16-nmc-physiology-concept-batch-v2.json',import.meta.url),'utf8'));
 const fresh=batch.concepts.filter(c=>!c.existingConceptId).map(c=>({conceptKey:c.conceptKey,document:c.document}));
 const pr=await run(input(batch.batchId,fresh,'Owner reviewed identity and classification for the Physiology pilot batch.'));
 assert.equal(pr.items,fresh.length);assert.equal(new Set(pr.receipts.map(x=>x.conceptId)).size,fresh.length);
 for(const verb of ['update public.content_concept_batch_acceptances set item_count=item_count','delete from public.content_concept_batch_acceptances'])await assert.rejects(db.exec(verb),/permission denied|immutable/);
 await db.exec('reset role');
 assert.deepEqual((await db.query('select body,version from public.study_catalog where id=1')).rows[0],catalogBefore,'learner catalog unchanged');
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(run(good),/permission denied/);await assert.rejects(db.exec('select * from public.content_concept_batch_acceptances'),/permission denied/);await db.exec('reset role');}
 console.log(`Concept batch PostgreSQL checks passed: admin-only, atomic rollback on identity conflict, exact replay, conflict on reuse, immutable receipts, unchanged learner catalog, Physiology pilot batch (${fresh.length} concepts) accepted in fixture.`);
}finally{await db.close();}
