import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { projectLibrary } from '../src/domain/content-library.js';
const { PGlite } = await import(process.env.PGLITE_MODULE_URL || '@electric-sql/pglite');
const root=new URL('../supabase/migrations/',import.meta.url);
const files=(await readdir(root)).sort();
const file=files.find(n=>n.endsWith('_medical_relationship_registry.sql'));
assert.ok(file,'the relationship registry migration must exist');
const db=new PGlite();
const actor='11111111-1111-4111-8111-111111111111', outsider='22222222-2222-4222-8222-222222222222';
try {
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create schema extensions; create function extensions.digest(bytea,text) returns bytea language sql immutable as $$select sha256($1)$$;
 create table public.study_catalog(id int primary key,version bigint,body jsonb,updated_at timestamptz);
 create table public.content_admin_account(singleton boolean primary key,admin_user_id uuid);
 create table public.content_reviewer_grants(reviewer_id uuid,review_kind text,expires_at timestamptz,primary key(reviewer_id,review_kind));
 create table public.source_rights_events(id uuid primary key,source_id text unique,reviewer_id uuid,rights_status text,source_fingerprint_sha256 text,reviewed_at timestamptz);
 create table public.neural_canonical_note_versions(id uuid,concept_id text,title text,body_markdown text,status text);
 create table public.content_library_question_metadata(question_id text);
 create table public.content_library_concept_metadata(concept_id text);
 create table public.content_library_note_question_links(note_version_id uuid,question_id text);
 create function public.content_library_observations_v1(uuid) returns jsonb language sql as $$select '[]'::jsonb$$;
 grant usage on schema public,auth to anon,authenticated,service_role;
 `);
 // Exact existing helpers, with a minimal platform/data shape; no copied clinical data or hosted writes.
 for(const [name,sourceFile] of [['is_content_admin','20260929032000_single_content_admin.sql'],['has_active_reviewer_grant','20260926140000_reviewer_grant_governance.sql'],['current_source_fingerprint_sha256','20260926133000_gate_specific_review_and_rights.sql']]) {
  const source=await readFile(new URL(sourceFile,root),'utf8');
  const pattern=new RegExp('create (?:or replace )?function public\\.'+name+'\\([\\s\\S]*?as (\\$[a-z_]*\\$)[\\s\\S]*?\\1;','i');
  const definition=source.match(pattern)?.[0];assert.ok(definition,name);await db.exec(definition);
 }
 await db.exec(await readFile(new URL(file,root),'utf8'));
 await db.query('insert into auth.users values($1),($2)',[actor,outsider]);
 await db.query('insert into content_admin_account values(true,$1)',[actor]);
 await db.query("insert into content_reviewer_grants select $1,k,null from unnest(array['medical','references','rights']) k",[actor]);
 const catalog={concepts:[{conceptId:'alpha',label:'Synthetic Alpha'},{conceptId:'beta',label:'Synthetic Beta'}],sources:[{sourceId:'s',title:'Synthetic evidence',version:'edition-1',rights:{status:'licensed'}}],questions:[]};
 await db.query('insert into study_catalog values(1,0,$1,now())',[catalog]);
 const assertion={relationshipId:'synthetic-relation',version:1,fromConceptId:'alpha',toConceptId:'beta',relationType:'mechanism-of',claimText:'Synthetic assertion only.',sourceId:'s',sourceVersion:'edition-1',evidenceVersionId:'synthetic-evidence@1',evidenceLocator:'Synthetic section A',previousVersionId:null,previousDigest:null,provenance:{kind:'external',authorLabel:'Synthetic external author',evidence:'Synthetic source packet'}};
 const rpc=async(name,args=[]) => (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) result`,args)).rows[0].result;
 const stage=(a=assertion,user=actor)=>rpc('medical_relationship_stage_v1',[a,user]);
 const inspect=id=>rpc('medical_relationship_inspect_v1',[actor,id]);
 const feed=()=>rpc('medical_relationship_feed_v1');
 const publish=(r,user=actor,attested=true)=>rpc('medical_relationship_publish_v1',[r.relationshipVersionId,user,r.digest,'Inspected synthetic target only.',attested]);
 const retire=(r,user=actor)=>rpc('medical_relationship_retire_v1',[r.relationshipVersionId,user,r.digest,'Synthetic correction']);
 await assert.rejects(stage(assertion,outsider),/content_admin_required/);
 for(const change of [{fromConceptId:'missing'},{toConceptId:'alpha'},{relationType:'invented'},{sourceVersion:'stale'},{claimText:''},{medicalReviewVerified:true},{version:2}])await assert.rejects(stage({...assertion,...change}));
 const first=await stage(); assert.equal(first.relationshipVersionId,'synthetic-relation@1'); assert.match(first.digest,/^[a-f0-9]{64}$/);assert.deepEqual(await stage(),first);
 await assert.rejects(stage({...assertion,claimText:'Different'}),/relationship_payload_conflict/);
 assert.equal((await feed())[0].status,'draft');
 await assert.rejects(publish(first),/publication_rights_unresolved/);
 assert.equal((await db.query('select count(*)::int n from medical_relationship_events')).rows[0].n,0);
 await db.query("insert into source_rights_events values(gen_random_uuid(),'s',$1,'licensed',public.current_source_fingerprint_sha256('s'),now())",[actor]);
 await assert.rejects(publish(first,outsider),/content_admin_required/);
 await assert.rejects(publish(first,actor,false),/review_attestation_required/);
 await assert.rejects(rpc('medical_relationship_publish_v1',[first.relationshipVersionId,actor,'0'.repeat(64),'Inspected',true]),/stale_relationship_digest/);
 for(const kind of ['medical','references','rights']){
  await db.query("update content_reviewer_grants set expires_at=now()-interval '1 second' where review_kind=$1",[kind]);
  await assert.rejects(publish(first),/reviewer_not_authorized/);
  await db.exec('update content_reviewer_grants set expires_at=null');
 }
 const published=await publish(first);assert.equal(published.status,'published');assert.deepEqual(await publish(first),published);
 let snapshot=await rpc('content_library_snapshot_v1',[outsider]);
 assert.equal(projectLibrary(snapshot).medicalRelationships.length,1);
 assert.doesNotMatch(JSON.stringify(projectLibrary(snapshot)),/reviewerId|reviewNotes|submitted_by|sourceFingerprintSha256|fingerprintSha256|Synthetic section/);
 for(const kind of ['medical','references','rights']){
  await db.query("update content_reviewer_grants set expires_at=now()-interval '1 second' where review_kind=$1",[kind]);
  assert.equal(projectLibrary(await rpc('content_library_snapshot_v1',[outsider])).medicalRelationships.length,0);
  await db.exec('update content_reviewer_grants set expires_at=null');
 }
 await db.query("update source_rights_events set rights_status='restricted'"); assert.equal((await feed())[0].rightsVerified,false);await db.exec("update source_rights_events set rights_status='licensed'");
 await db.query("update study_catalog set body=jsonb_set(body,'{sources,0,rights,status}','\"restricted\"')");assert.equal((await feed())[0].rightsVerified,false);await db.query('update study_catalog set body=$1',[catalog]);
 await db.query("update study_catalog set body=jsonb_set(body,'{sources,0,title}','\"Changed\"')");assert.equal(projectLibrary(await rpc('content_library_snapshot_v1',[outsider])).medicalRelationships.length,0);await db.query('update study_catalog set body=$1',[catalog]);
 await db.query("update study_catalog set body=jsonb_set(body,'{concepts,0,label}','\"Changed\"')");assert.equal((await feed())[0].medicalReviewVerified,false);await db.query('update study_catalog set body=$1',[catalog]);
 const correction={...assertion,version:2,evidenceVersionId:'synthetic-evidence@2',previousVersionId:first.relationshipVersionId,previousDigest:first.digest,claimText:'Corrected synthetic assertion.'};
 const second=await stage(correction);assert.equal(projectLibrary(await rpc('content_library_snapshot_v1',[outsider])).medicalRelationships.length,0);
 await assert.rejects(publish(first),/relationship_not_latest/);
 await assert.rejects(stage({...correction,version:3}),/stale_relationship_predecessor/);
 await db.query("update study_catalog set body=jsonb_set(body,'{sources,0,title}','\"Changed\"')");await assert.rejects(publish(second),/stale_relationship_target/);await db.query('update study_catalog set body=$1',[catalog]);
 assert.equal((await db.query('select count(*)::int n from medical_relationship_events')).rows[0].n,1);
 await publish(second);await assert.rejects(retire(second,outsider),/content_admin_required/);const retired=await retire(second);assert.equal(retired.status,'retired');assert.deepEqual(await retire(second),retired);await assert.rejects(publish(second),/relationship_retired/);
 assert.equal(projectLibrary(await rpc('content_library_snapshot_v1',[outsider])).medicalRelationships.length,0);
 const packet=await inspect(second.relationshipVersionId);assert.equal(packet.version.digest,second.digest);assert.equal(packet.events.length,2);assert.deepEqual(packet.reviewKinds,['medical','references','rights']);
 // Failed outer transaction rolls back draft and receipt together.
 await db.exec('begin');await stage({...assertion,relationshipId:'rollback'});await db.exec('rollback');assert.equal((await db.query("select count(*)::int n from medical_relationship_versions where relationship_id='rollback'")).rows[0].n,0);
 for(const table of ['medical_relationship_versions','medical_relationship_events']){
  for(const verb of ['update','delete'])await assert.rejects(db.query(`${verb==='update'?'update '+table+' set recorded_at=recorded_at':'delete from '+table}`),/immutable/);
 }
 await db.exec('set role service_role');
 assert.equal((await feed())[0].status,'retired');
 assert.equal((await inspect(second.relationshipVersionId)).version.digest,second.digest);
 await assert.rejects(db.query('delete from medical_relationship_events'),/permission denied/);
 await db.exec('reset role');
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  for(const table of ['medical_relationship_versions','medical_relationship_events'])await assert.rejects(db.query('select * from '+table),/permission denied/);
  for(const user of [actor,outsider])await assert.rejects(rpc('medical_relationship_inspect_v1',[user,null]),/permission denied/);
  for(const [name,args] of [['medical_relationship_stage_v1',[assertion,actor]],['medical_relationship_publish_v1',[first.relationshipVersionId,actor,first.digest,'forged',true]],['medical_relationship_retire_v1',[first.relationshipVersionId,actor,first.digest,'forged']],['medical_relationship_feed_v1',[]],['content_library_snapshot_v1',[outsider]]])await assert.rejects(rpc(name,args),/permission denied/);
  await db.exec('reset role');
 }
 console.log('Medical relationship PostgreSQL checks passed: immutable exact versions/receipts, live reviewer/rights gates, source/endpoint corrections, latest suppression, rollback, exact retry and browser/service isolation. Platform shape fixture only; no hosted writes.');
} finally { await db.close(); }
