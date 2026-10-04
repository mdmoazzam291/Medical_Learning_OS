import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');
const db=new PGlite();
const base=await readFile('supabase/migrations/20261003224909_canonical_content_library.sql','utf8');
const migration=await readFile('supabase/migrations/'+(await readdir('supabase/migrations')).find(p=>p.endsWith('_question_intelligence.sql')),'utf8');
const start=await readFile('supabase/migrations/20260930090000_m11f4_learner_delivery_render.sql','utf8');
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create function auth.uid() returns uuid language sql as $$select null::uuid$$;
create table study_catalog(id int primary key,version bigint,body jsonb,updated_at timestamptz);
create table content_library_imports(import_id text primary key,manifest jsonb,status text);
create table content_library_question_metadata(question_id text primary key,classification jsonb);
create table study_sessions(id uuid primary key,learner_id uuid,position int default 0,question_version_ids jsonb,question_started_at timestamptz,closed boolean default false,created_at timestamptz default now());
create table study_attempts(id uuid primary key,learner_id uuid,request_key text,session_id uuid,position int,option_id text,event jsonb,receipt jsonb,recorded_at timestamptz default now());
create function study_open_ordinary_session_id_v1(p uuid) returns uuid language sql as $$ select id from public.study_sessions where learner_id=p and not closed limit 1 $$;
create function content_library_review_publish_v1(text,uuid,text,jsonb,text,boolean) returns jsonb language sql as $$ select '{}'::jsonb $$;
create function study_record_attempt(uuid,uuid,text,integer,text,jsonb,jsonb) returns jsonb language sql as $$ select '{}'::jsonb $$;
`);
const validators=base.slice(base.indexOf('create function public.content_library_text'),base.indexOf('create function public.content_library_stage_v1'));
await db.exec(validators);
await db.exec(start.slice(start.indexOf('create or replace function public.study_start_session'),start.indexOf('create or replace function public.study_retention_probe_learner_inbox')));
// Original scheduler table and implementation are real, not mocked.
await db.exec(await readFile('supabase/migrations/20260926172500_revision_projection.sql','utf8'));
await db.exec(migration);
// Rehearse every evidence definition against a data-free column snapshot. Load
// genuine existing helper definitions only when the SQL compiler requires them.
await db.exec('create table auth.users(id uuid primary key, email text);');
await db.exec(await readFile('tests/fixtures/question-intelligence-evidence-schema.sql','utf8'));
const definitions = new Map();
for (const file of (await readdir('supabase/migrations')).sort()) {
  const sql = await readFile('supabase/migrations/'+file,'utf8');
  const pattern = /create\s+(?:or\s+replace\s+)?function\s+public\.([a-z0-9_]+)\s*\([\s\S]*?\bas\s+(\$[a-z0-9_]*\$)[\s\S]*?\2\s*;/gi;
  for (const match of sql.matchAll(pattern)) definitions.set(match[1],match[0]);
}
const preparing = new Set();
async function compile(sql) {
  try { await db.exec(sql); } catch (error) {
    const name = error.code === '42883' && error.message.match(/function (?:public\.)?([a-z0-9_]+)\(/i)?.[1];
    if (!name || !definitions.has(name) || preparing.has(name)) throw error;
    preparing.add(name); await compile(definitions.get(name)); preparing.delete(name);
    await compile(sql);
  }
}
const evidenceMigration = (await readdir('supabase/migrations')).find(p=>p.endsWith('_original_question_evidence.sql'));
await compile(await readFile('supabase/migrations/'+evidenceMigration,'utf8'));
const options=[{optionId:'a',text:'Alpha'},{optionId:'b',text:'Beta'}];
const source={questionId:'fresh-synthetic',questionVersionId:'fresh-synthetic@1',status:'published',stem:'A synthetic subject has no signal for 3 days. Best initial test?',options,answerOptionId:'a',conceptLinks:[{conceptId:'synthetic-concept',role:'primary'}]};
const gates=['decision-facts','polarity-timing','options-key','media-units','task-qualifiers','distractor-logic','reasoning-demand','no-answer-leakage'];
const metadata={primaryTask:'investigation-selection',qualifiers:['initial'],presentation:['clinical-vignette'],responseFormat:'single-best-answer',reasoningOperations:['recognition','test-selection'],sourceQuestionVersionId:source.questionVersionId,derivatives:[{variantId:'fresh-short',version:1,representation:'concise-practice',sourceQuestionVersionId:source.questionVersionId,stem:'Synthetic subject: no signal for 3 days. Best initial test?',options,answerOptionId:'a',protectedFacts:['no signal','3 days','initial'],removedFacts:[],validationChecks:Object.fromEntries(gates.map(k=>[k,{passed:true,evidence:'Nonclinical synthetic check.'}]))}]};
await db.query('select question_intelligence_validate_v1($1,$2)',[source,metadata]);
for(const mutate of [m=>m.derivatives[0].answerOptionId='b',m=>m.derivatives[0].stem='no signal 3 days; definitive test?',m=>m.derivatives[0].validationChecks['no-answer-leakage'].passed=false,m=>m.sourceQuestionVersionId='other@1']){
 const m=structuredClone(metadata);mutate(m);await assert.rejects(db.query('select question_intelligence_validate_v1($1,$2)',[source,m]));
}
await db.query('insert into study_catalog values(1,1,$1,now())',[{concepts:[],sources:[],questions:[source]}]);
await db.query('insert into content_library_question_metadata(question_id,classification,intelligence) values($1,$2,$3)',[source.questionId,{},metadata]);
const learner='11111111-1111-4111-8111-111111111111',sid='22222222-2222-4222-8222-222222222222';
let r=await db.query('select study_start_library_session_v2($1,$2,$3,now(),$4) result',[learner,sid,[source.questionVersionId],{[source.questionVersionId]:'fresh-short'}]);assert.equal(r.rows[0].result.id,sid);
r=await db.query('select question_presentations from study_sessions where id=$1',[sid]);assert.equal(r.rows[0].question_presentations[source.questionVersionId].stem,metadata.derivatives[0].stem);
await assert.rejects(db.query('select study_start_library_session_v2($1,$2,$3,now(),$4)',[learner,sid,[source.questionVersionId],{[source.questionVersionId]:'unknown'}]));
const event={schemaVersion:1,type:'question.answered',eventId:'33333333-3333-4333-8333-333333333333',learnerId:learner,questionVersionId:source.questionVersionId,conceptId:'synthetic-concept',correct:true,durationMs:1000,occurredAt:new Date().toISOString()};
await db.query('insert into study_attempts(id,learner_id,request_key,session_id,position,option_id,event,receipt) values($1,$2,$3,$4,0,\'a\',$5,$6)',[event.eventId,learner,'synthetic-only',sid,event,{event}]);
r=await db.query('select presentation,receipt from study_attempts');assert.equal(r.rows[0].presentation.representation,'concise-practice');assert.equal(r.rows[0].receipt.presentation.variantId,'fresh-short');
await db.query('select study_rebuild_revision_state($1,null)',[learner]);assert.equal((await db.query('select * from study_revision_state')).rows.length,0);
assert.equal((await db.query('select content_library_observations_v1($1) r',[learner])).rows[0].r.length,0);
await assert.rejects(db.query("update study_sessions set question_presentations='{}' where id=$1",[sid]));
// Verify the same original answer creates original-only scheduling evidence.
await db.query('update study_sessions set closed=true where id=$1',[sid]);
const sid2='44444444-4444-4444-8444-444444444444';await db.query('select study_start_session($1,$2,$3,now())',[learner,sid2,[source.questionVersionId]]);
event.eventId='55555555-5555-4555-8555-555555555555';await db.query('insert into study_attempts(id,learner_id,request_key,session_id,position,option_id,event,receipt) values($1,$2,$3,$4,0,\'a\',$5,$6)',[event.eventId,learner,'synthetic-original',sid2,event,{event}]);await db.query('select study_rebuild_revision_state($1,null)',[learner]);r=await db.query('select attempts,correct from study_revision_state');assert.equal(r.rows[0].attempts,1);assert.equal(r.rows[0].correct,1);
assert.equal((await db.query("select count(*)::int n from information_schema.routine_privileges where routine_name='study_start_library_session_v2' and grantee in ('PUBLIC','anon','authenticated')")).rows[0].n,0);
assert.equal((await db.query('select count(*)::int n from study_original_attempt_evidence_v1')).rows[0].n,1);
const conceptEvidence=(await db.query('select study_concept_evidence($1) r',[learner])).rows[0].r;
assert.equal(conceptEvidence.concepts[0].totalAttempts,1);
const stream=(await db.query('select study_learning_event_stream_v2($1) r',[learner])).rows[0].r;
assert.equal(stream.events.filter(e=>e.family==='question.answered').length,2);
assert.deepEqual(stream.events.filter(e=>e.family==='question.answered').map(e=>e.payload.presentation.representation).sort(),['concise-practice','original']);
await db.close();console.log('Isolated PostgreSQL checks passed: critical gates, stale source, server prompt binding, immutable presentation, original-only scheduling and privileges. Synthetic fixtures only; no hosted writes.');
