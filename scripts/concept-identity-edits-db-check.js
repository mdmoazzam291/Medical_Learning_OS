import assert from 'node:assert/strict';import {readFile,readdir} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');const db=new PGlite();
const actor='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const declaration='identity-and-classification-reviewed-not-medical-or-learner-release';
const sha=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema extensions;create function extensions.digest(bytea,text) returns bytea language sql immutable as $$select sha256($1)$$;create table content_admin_account(admin_user_id uuid);create function is_content_admin(uuid) returns boolean language sql stable as $$select exists(select 1 from public.content_admin_account where admin_user_id=$1)$$;
 create table study_catalog(id int primary key,version bigint,body jsonb,updated_at timestamptz default now());create table content_library_concept_metadata(concept_id text primary key,classification jsonb);grant usage on schema public,extensions to service_role,anon,authenticated;grant select on all tables in schema public to service_role;grant update on public.study_catalog to service_role;grant insert,update on public.content_library_concept_metadata to service_role;`);
 await db.query('insert into content_admin_account values($1)',[actor]);
 await db.query('insert into study_catalog values(1,7,$1)',[{concepts:[{conceptId:'existing',label:'Existing synthetic',aliases:['Catalogue alias'],subjectTags:['medicine']}],questions:[],sources:[]}]);
 const files=await readdir(new URL('../supabase/migrations/',import.meta.url));
 const content=await readFile(new URL('../supabase/migrations/20261003224909_canonical_content_library.sql',import.meta.url),'utf8');
 for(const name of ['content_library_fields','content_library_strings','content_library_facets','content_library_text']){const pattern=new RegExp('create (?:or replace )?function public\\.'+name+'\\([\\s\\S]*?as (\\$[a-z_]*\\$)[\\s\\S]*?\\1;','i');await db.exec(content.match(pattern)[0]);}
 const migrate=async suffix=>db.exec(await readFile(new URL('../supabase/migrations/'+files.find(x=>x.endsWith(suffix)),import.meta.url),'utf8'));
 for(const suffix of ['_admin_concept_drafts.sql','_admin_concept_acceptance.sql','_admin_concept_batch_acceptance.sql','_admin_concept_subject_revisions.sql'])await migrate(suffix);
 const doc=(label,aliases=[])=>({label,aliases,classification:{subjects:['physiology'],systems:['general'],organs:[],domains:['normal-function'],tasks:['mechanism']},sourceEvidence:'Synthetic source locator',changeReason:'Synthetic identity check'});
 const key=i=>'nmc-concept:'+i.toString(16).padStart(16,'0');
 const notes='Owner reviewed identity and classification for this synthetic batch.';
 const accept=async(batchId,items)=>(await db.query('select public.concept_batch_accept_v1($1,$2) r',[actor,{schemaVersion:1,requestId:crypto.randomUUID(),batchId,batchSha256:'a'.repeat(64),reviewNotes:notes,attestation:declaration,items}])).rows[0].r;
 // Identities accepted before the index exists are backfilled by the migration.
 await db.exec('set role service_role');
 const before=await accept('pre-index',[{conceptKey:key(1),document:doc('Alpha concept',['Alpha alias'])}]);
 await db.exec('reset role');
 await migrate('_concept_identity_name_index.sql');await migrate('_admin_identity_and_objective_edits.sql');
 await db.exec('set role service_role');
 const names=async id=>(await db.query('select name_norm from public.content_concept_identity_names where concept_id=$1 order by 1',[id])).rows.map(r=>r.name_norm);
 const alpha=before.receipts[0].conceptId;
 assert.deepEqual(await names(alpha),['alpha alias','alpha concept'],'backfilled');
 // Conflicts: any incoming name against any existing label or alias, case/space-insensitive, catalogue included.
 for(const [label,aliases] of [['ALPHA  concept',[]],['Fresh',['alpha alias']],['Alpha alias',[]],['Fresh two',['catalogue ALIAS']],['existing synthetic',[]]])
  await assert.rejects(accept('conflict-'+label.length+aliases.length,[{conceptKey:key(90),document:doc(label,aliases)}]),/concept_accept_identity_conflict/,label);
 // Scale: 300 identities with aliases, then a 200-item batch on top.
 for(let b=0;b<2;b++)await accept('scale-'+b,Array.from({length:150},(_,i)=>({conceptKey:key(1000+b*150+i),document:doc('Scale concept '+(b*150+i),['Scale alias '+(b*150+i),'Scale other '+(b*150+i)])})));
 const t0=Date.now();const big=await accept('scale-big',Array.from({length:200},(_,i)=>({conceptKey:key(5000+i),document:doc('Big concept '+i,['Big alias '+i])})));const ms=Date.now()-t0;
 assert.equal(big.items,200);
 assert.equal((await db.query('select count(*)::int n from public.content_concept_identity_names')).rows[0].n,2+300*3+200*2);
 // Identity edits.
 const cur=async id=>(await db.query('select * from public.content_concept_current_identities where concept_id=$1',[id])).rows[0];
 const edit=async(input,user=actor)=>(await db.query('select public.concept_identity_edit_v1($1,$2) r',[user,input])).rows[0].r;
 const a0=await cur(alpha),beta=big.receipts[0].conceptId;
 const e1={schemaVersion:1,requestId:crypto.randomUUID(),conceptId:alpha,previousIdentityDigest:a0.identity_digest,label:'Alpha renamed',aliases:['Alpha concept','Alpha short'],changeReason:'Owner prefers the clearer name.'};
 await assert.rejects(edit(e1,other),/content_admin_required/);
 await assert.rejects(edit({...e1,previousIdentityDigest:'c'.repeat(64)}),/concept_edit_stale/);
 await assert.rejects(edit({...e1,label:'Big concept 3'}),/concept_edit_identity_conflict/,'another identity label');
 await assert.rejects(edit({...e1,aliases:['big alias 4']}),/concept_edit_identity_conflict/,'another identity alias');
 await assert.rejects(edit({...e1,aliases:['Alpha renamed']}),/concept_edit_invalid/,'alias equal to label');
 await assert.rejects(edit({...e1,aliases:['X1','x1']}),/concept_edit_invalid/,'duplicate aliases');
 await assert.rejects(edit({...e1,label:'Alpha concept',aliases:['Alpha alias']}),/concept_edit_no_change/);
 await assert.rejects(edit({...e1,classification:{}}),/concept_edit_invalid/,'only label and aliases');
 await assert.rejects(edit({...e1,conceptId:'C-'+'0'.repeat(32)}),/concept_edit_not_found/);
 const r1=await edit(e1);
 assert.equal(r1.revision,2);assert.equal(r1.learnerPublished,false);
 const a1=await cur(alpha);assert.equal(a1.accepted_document.label,'Alpha renamed');assert.deepEqual(a1.accepted_document.classification,a0.accepted_document.classification,'classification unchanged');
 assert.deepEqual(await names(alpha),['alpha concept','alpha renamed','alpha short'],'names follow the current identity');
 assert.deepEqual(await edit(e1),r1,'exact replay');
 await assert.rejects(edit({...e1,label:'Other name'}),/concept_edit_request_conflict/);
 // A freed name can be taken by another identity; a held one cannot.
 const b0=await cur(beta);
 await edit({schemaVersion:1,requestId:crypto.randomUUID(),conceptId:beta,previousIdentityDigest:b0.identity_digest,label:'Alpha alias',aliases:[],changeReason:'Reuse a name the other identity released.'});
 assert.equal((await db.query("select public.concept_identity_name_conflict_v1('C-other','{\"label\":\"alpha short\",\"aliases\":[]}'::jsonb) c")).rows[0].c,true);
 // Subject revisions chain on top of an edit.
 const sr=(await db.query('select public.concept_subject_revision_batch_v1($1,$2) r',[actor,{schemaVersion:1,requestId:crypto.randomUUID(),batchId:'after-edit',batchSha256:'b'.repeat(64),reviewNotes:notes,attestation:declaration,items:[{conceptId:alpha,previousIdentityDigest:a1.identity_digest,addSubjects:['biochemistry']}]}])).rows[0].r;
 assert.equal(sr.receipts[0].revision,3);assert.equal((await cur(alpha)).accepted_document.label,'Alpha renamed');
 assert.equal((await db.query("select change_kind k from public.content_concept_identity_revisions where concept_id=$1 and revision=3",[alpha])).rows[0].k,'subject-addition');
 // Objective wording revisions.
 const oid='lo:C-'+'1'.repeat(32)+':diagnosis@1',base=await sha('Diagnose the synthetic condition from findings.');
 const orev=async(input,user=actor)=>(await db.query('select public.foundation_objective_revision_v1($1,$2) r',[user,input])).rows[0].r;
 const o1={schemaVersion:1,requestId:crypto.randomUUID(),objectiveVersionId:oid,baseWordingSha256:base,wording:'Diagnose the synthetic   condition from history and findings.',changeReason:'Owner clarified the scope.'};
 await assert.rejects(orev(o1,other),/content_admin_required/);
 await assert.rejects(orev({...o1,objectiveVersionId:'not an id'}),/objective_edit_invalid/);
 await assert.rejects(orev({...o1,wording:'Too short'}),/objective_edit_invalid/);
 await assert.rejects(orev({...o1,wording:'Diagnose the synthetic condition from findings.'}),/objective_edit_no_change/);
 const w1=await orev(o1);
 assert.equal(w1.revision,1);assert.equal(w1.wording,'Diagnose the synthetic condition from history and findings.','whitespace normalised');
 assert.equal(w1.wordingSha256,await sha(w1.wording));
 assert.deepEqual(await orev(o1),w1,'exact replay');
 await assert.rejects(orev({...o1,requestId:crypto.randomUUID(),wording:'Another wording for the objective.'}),/objective_edit_stale/,'base must be the latest revision');
 const w2=await orev({...o1,requestId:crypto.randomUUID(),baseWordingSha256:w1.wordingSha256,wording:'Another wording for the objective.'});
 assert.equal(w2.revision,2);
 assert.equal((await db.query('select wording from public.foundation_objective_current_wordings where objective_version_id=$1',[oid])).rows[0].wording,'Another wording for the objective.');
 for(const verb of ['update public.foundation_objective_revisions set wording=wording','delete from public.foundation_objective_revisions','update public.content_concept_identity_revisions set change_reason=null'])await assert.rejects(db.exec(verb),/permission denied|immutable/);
 await db.exec('reset role');
 // Learner-visible identities cannot be edited.
 await db.query("update study_catalog set body=jsonb_set(body,'{concepts}',(body->'concepts')||jsonb_build_array(jsonb_build_object('conceptId',$1::text,'label','Big concept 9','aliases','[]'::jsonb,'subjectTags','[]'::jsonb))) where id=1",[big.receipts[9].conceptId]);
 await db.exec('set role service_role');
 const v0=await cur(big.receipts[9].conceptId);
 await assert.rejects(edit({schemaVersion:1,requestId:crypto.randomUUID(),conceptId:big.receipts[9].conceptId,previousIdentityDigest:v0.identity_digest,label:'Visible rename',aliases:[],changeReason:'Should need a learner release.'}),/concept_edit_learner_visible/);
 await db.exec('reset role');
 for(const role of ['anon','authenticated']){await db.exec('set role '+role);
  await assert.rejects(edit(e1),/permission denied/);await assert.rejects(orev(o1),/permission denied/);
  for(const t of ['content_concept_identity_names','foundation_objective_revisions','foundation_objective_current_wordings'])await assert.rejects(db.exec('select * from public.'+t),/permission denied/);
  await db.exec('reset role');}
 console.log(`Concept identity edit PostgreSQL checks passed: name index backfill and triggers, conflict detection incl. catalogue, label/alias edits (admin-only, stale/no-change/conflict/learner-visible refused, replay, freed names), subject revisions chain after edits, objective wording revisions (normalised, stale base refused, replay), immutability, role isolation; 200-item batch over 302 identities in ${ms} ms.`);
}finally{await db.close();}
