// Disposable rehearsal only. Synthetic dependency tables are never deployed.
const {PGlite}=await import(process.env.PGLITE_MODULE_URL || '@electric-sql/pglite');
import {readdirSync,readFileSync} from 'node:fs';
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema extensions;create table auth.users(id uuid primary key,email text,banned_until timestamptz,deleted_at timestamptz,created_at timestamptz default now(),last_sign_in_at timestamptz,raw_user_meta_data jsonb,raw_app_meta_data jsonb);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id));create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function extensions.digest(bytea,text) returns bytea language sql immutable as $$select sha256($1)$$;create function extensions.digest(text,text) returns bytea language sql immutable as $$select sha256(convert_to($1,'UTF8'))$$;`);
const read=f=>readFileSync('supabase/migrations/'+f,'utf8');
try {
const dir='supabase/migrations/';
const baseline=readdirSync(dir).filter(x=>/^20260925\d{6}_.*\.sql$/.test(x)).sort();
for(const f of baseline)await db.exec(read(f));
await db.exec("create table public.content_reviewer_grants(reviewer_id uuid,review_kind text,expires_at timestamptz);");
const a=read('20260929032000_single_content_admin.sql');
await db.exec(a.slice(0,a.indexOf('with candidates as (')));
await db.exec(a.slice(a.indexOf('create or replace function public.is_content_admin'),a.indexOf('create or replace function public.require_content_admin_transfer_validation')));
const d=read('20261028204835_admin_concept_drafts.sql');
await db.exec(d.match(/create function public.concept_draft_immutable_v1[\s\S]*?\$\$;/)[0]);
const c=read('20261028215500_admin_concept_acceptance.sql');
await db.exec(c.slice(0,c.indexOf('create function public.concept_draft_accept_v1')));
const u='11111111-1111-4111-8111-111111111111', l='22222222-2222-4222-8222-222222222222';
await db.query('insert into auth.users(id) values($1),($2)',[u,l]);
await db.query("insert into public.content_admin_account(admin_user_id,bootstrap_source) values($1,'disposable fixture')",[u]);
await db.exec(`alter table auth.users add column email_confirmed_at timestamptz;
alter table public.content_reviewer_grants add column granted_at timestamptz;
create table public.neural_canonical_note_versions(status text);
create table public.learner_content_issue_reports(id uuid);
create table public.learner_content_issue_triage_events(report_id uuid);
create table public.source_rights_events(source_id text);
create table public.content_review_events(target_type text,target_id text,review_kind text);
create table public.exam_runs(created_at timestamptz,status text);`);
await db.exec(read('20261003111000_owner_admin_console_v1.sql'));
const assert=(await import('node:assert/strict')).default;
await db.exec('create table public.owner_learner_access_state(beta_access_until timestamptz);create table public.owner_admin_audit_events(created_at timestamptz);');
const access=read('20261003115000_owner_operations_v2_followup.sql');
await db.exec(access.slice(access.indexOf('create or replace function public.owner_admin_access_summary_v1'),access.indexOf('comment on function')));
await db.exec('set role service_role');
const summary=async()=>(await db.query('select public.owner_admin_access_summary_v1() as result')).rows[0].result;
assert.deepEqual(await summary(),{contractId:'owner-admin-access-summary-v1',activeBetaLearners:0,suspendedLearners:0,auditEvents:0,latestAuditAt:null});
const {readFoundationDrafts}=await import('file://'+process.cwd()+'/supabase/functions/owner-api/_shared/nmc-learning-foundation.js');
const dashboard=(await db.query('select public.owner_admin_dashboard_v1() as result')).rows[0].result;
assert.equal(dashboard.content.concepts,0);
let contentReads=0;
const admin={
 async rpc(name,{p_user}){assert.equal(name,'content_admin_status_v1');return {data:(await db.query('select public.content_admin_status_v1($1) as result',[p_user])).rows[0].result};},
 from(name){
  contentReads++;
  if(name==='study_catalog')return {select:()=>({eq:()=>({single:async()=>({data:(await db.query('select version,body from public.study_catalog where id=1')).rows[0]})})})};
  assert.equal(name,'content_concept_acceptances');
  return {select:()=>({in:async(_,ids)=>({data:(await db.query('select concept_id,accepted_document from public.content_concept_acceptances where concept_id=any($1::text[])',[ids])).rows})})};
 }
};
const call=actor=>readFoundationDrafts({admin,actor,method:'GET',params:new URLSearchParams()});
await assert.rejects(call(l),{status:403,code:'content_admin_required'});
assert.equal(contentReads,0);
const page=await call(u);
assert.deepEqual(Object.values(page.namesOnlyPreview).map(x=>x.length),[91,2,6,1]);
assert.deepEqual(page.namesOnlyPreview.held,['PS2.1']);
assert.equal(page.acceptedMappings,0);
assert.equal(page.learnerActivation,false);
console.log('PASS: dashboard and access summary on empty catalogue; actual handler returns 91 names to Admin and denies learner before content reads');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.close();}
