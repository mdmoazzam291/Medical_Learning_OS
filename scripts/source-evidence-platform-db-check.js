// Synthetic platform compatibility only; no real Auth service/session or hosted URL.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {canonicalize,digestCanonical} from '../src/domain/canonical-integrity.js';
import {digestSourceRowPackage} from '../src/domain/source-row-evidence.js';
import {prepareSourceEvidenceStagingRequest,matchesSourceEvidenceStagingReceipt} from '../src/domain/source-evidence-staging.js';
const {PGlite}=await import(process.env.PGLITE_MODULE_URL||'@electric-sql/pglite');
const db=new PGlite(),owner='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',session='33333333-3333-4333-8333-333333333333',otherSession='44444444-4444-4444-8444-444444444444',newSession='55555555-5555-4555-8555-555555555555';
async function functionSql(path,name){
 const source=await readFile(new URL(path,import.meta.url),'utf8'),start=source.indexOf('create or replace function public.'+name+'(');
 assert.ok(start>=0);const end=source.indexOf('$function$;',source.indexOf('as $function$',start));assert.ok(end>start);return source.slice(start,end+'$function$;'.length);
}
async function envelope(actor=owner,p=null){
 p??={packageId:crypto.randomUUID(),packageVersion:1,cases:[{caseId:'platform-case',caseVersion:1,sourceSha256:'a'.repeat(64),sourceEdition:'platform-fixture',appearance:{pdfPage:1,rowOrdinal:1,rotation:0,bboxMilliPoints:[0,0,1,1],rawCellSha256:'b'.repeat(64)},interpretation:{proposedIdentity:null,relation:'unresolved',rationaleSha256:'c'.repeat(64)}}]};
 const m=await digestSourceRowPackage(p),b=await prepareSourceEvidenceStagingRequest({...p,requestId:crypto.randomUUID(),expectedPackageDigest:m.packageDigest},actor),{packageDigest,...manifest}=m;
 const payload={contractId:'source-evidence-staging-receipt-v1',receiptId:crypto.randomUUID(),...b,recordedAt:new Date().toISOString(),sourceReviewOnly:true,clinicalApproved:false,rightsApproved:false,examScopeApproved:false,learnerRelease:false};
 return {p,b,body:[canonicalize(p),canonicalize({contractId:'source-row-package-evidence-v1',...manifest}),b,canonicalize(payload),canonicalize({...payload,receiptDigest:(await digestCanonical(payload)).digestHex})]};
}
const stage=async(e,s=session,actor=e.b.actorId)=>(await db.query('select evidence_probe.stage_session($1,$2,$3,$4,$5,$6,$7) r',[actor,s,...e.body])).rows[0].r;
const read=async(e,s=session,actor=e.b.actorId)=>(await db.query('select evidence_probe.readback_session($1,$2,$3,$4,$5,$6) r',[actor,s,e.b.packageId,1,e.b.packageDigest,e.b.requestId])).rows[0].r;
async function govern(sql,args=[]){await db.exec('reset role');try{await db.query(sql,args);}finally{await db.exec('set role service_role');}}
try{
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,banned_until timestamptz,deleted_at timestamptz);create table auth.sessions(id uuid primary key,user_id uuid not null references auth.users);');
 const adminSource=await readFile(new URL('../supabase/migrations/20260929032000_single_content_admin.sql',import.meta.url),'utf8'),tableStart=adminSource.indexOf('create table if not exists public.content_admin_account'),tableEnd=adminSource.indexOf(');',tableStart);
 await db.exec(adminSource.slice(tableStart,tableEnd+2));
 await db.exec('alter table public.content_admin_account enable row level security;revoke all on public.content_admin_account from public,anon,authenticated,service_role;');
 await db.exec(await functionSql('../supabase/migrations/20261003153000_owner_operations_v3.sql','learner_runtime_access_v1'));
 await db.exec(await functionSql('../supabase/migrations/20260929032000_single_content_admin.sql','is_content_admin'));
 await db.exec('revoke all on function public.learner_runtime_access_v1(uuid,uuid),public.is_content_admin(uuid) from public,anon,authenticated;grant execute on function public.learner_runtime_access_v1(uuid,uuid),public.is_content_admin(uuid) to service_role;grant select on public.content_admin_account to service_role;');
 for(const actor of [owner,other])await db.query('insert into auth.users(id) values($1)',[actor]);
 for(const [sid,actor] of [[session,owner],[otherSession,other]])await db.query('insert into auth.sessions values($1,$2)',[sid,actor]);
 await db.query("insert into public.content_admin_account(singleton,admin_user_id,bootstrap_source) values(true,$1,'Synthetic platform acceptance fixture')",[owner]);
 for(const f of ['schema.sql','digests.sql','platform-gate.sql'])await db.exec(await readFile(new URL('../ops/prototypes/source-evidence/'+f,import.meta.url),'utf8'));
 for(const actor of [owner,other])await db.query('select evidence_probe.set_authority($1,true)',[actor]);
 await db.query('select evidence_probe.set_source_policy($1,$2,true)',['a'.repeat(64),'platform-fixture']);await db.exec('set role service_role');
 const e=await envelope();
 await assert.rejects(stage(e),/evidence_platform_denied/);
 await govern('update evidence_probe.platform_feature set enabled=true');
 const first=await stage(e);assert.equal(first.status,'committed');assert.equal(await matchesSourceEvidenceStagingReceipt(first.receipt,e.b),true);
 assert.deepEqual(JSON.parse((await read(e)).receipt),first.receipt);
 console.log('Platform owner gate PASS: default off, current session/Admin/owner permit exact private stage/readback.');
 const deniedBoth=async(s=session,actor=owner,pattern=/evidence_platform_denied/)=>{
  await assert.rejects(stage(e,s,actor),pattern);await assert.rejects(read(e,s,actor),pattern);
 };
 await deniedBoth(null);await deniedBoth(otherSession,owner);await deniedBoth(session,other);
 const unknownSession='66666666-6666-4666-8666-666666666666';await deniedBoth(unknownSession);
 await govern('delete from auth.sessions where id=$1',[session]);await deniedBoth();
 await govern('insert into auth.sessions values($1,$2)',[newSession,owner]);
 assert.deepEqual(await stage(e,newSession),first,'new verified session can retry original actor-bound request');
 await deniedBoth(session);
 console.log('Platform session PASS: missing, foreign and revoked sessions deny; new same-owner session preserves original receipt.');

 await govern("update auth.users set banned_until=now()+interval '1 day' where id=$1",[owner]);await deniedBoth(newSession);
 await govern("update auth.users set banned_until=now()-interval '1 minute' where id=$1",[owner]);assert.deepEqual(await stage(e,newSession),first);
 await govern('update auth.users set deleted_at=now() where id=$1',[owner]);await deniedBoth(newSession);
 await govern('update auth.users set deleted_at=null where id=$1',[owner]);
 console.log('Platform account PASS: live suspension/deletion deny despite existing session; explicit fixture reset restores next scenario.');
 await govern("create or replace function public.learner_runtime_access_v1(p_user uuid,p_session uuid) returns jsonb language sql stable security definer set search_path='' as $$select null::jsonb$$");
 await deniedBoth(newSession);
 await govern(await functionSql('../supabase/migrations/20261003153000_owner_operations_v3.sql','learner_runtime_access_v1'));
 assert.deepEqual(await stage(e,newSession),first);
 console.log('Platform lookup PASS: missing runtime result denies; repository RPC restored for remaining scenarios.');


 await govern('update public.content_admin_account set admin_user_id=$1',[other]);await deniedBoth(newSession);
 const replacement=await envelope(other);assert.equal((await stage(replacement,otherSession)).status,'committed');
 await assert.rejects(read(e,otherSession,other),/evidence_denied/);
 await assert.rejects(stage(await envelope(other,e.p),otherSession),/evidence_denied/);
 await govern('update public.content_admin_account set admin_user_id=$1',[owner]);assert.deepEqual(await stage(e,newSession),first);
 console.log('Platform ownership PASS: current Admin transfer does not transfer existing immutable package ownership.');

 await govern('select evidence_probe.set_source_policy($1,$2,false)',['a'.repeat(64),'platform-fixture']);await deniedBoth(newSession,owner,/evidence_denied/);
 await govern('select evidence_probe.set_source_policy($1,$2,true)',['a'.repeat(64),'platform-fixture']);
 await govern('select evidence_probe.withdraw_metadata($1,$2,$3,$4)',[owner,e.b.packageId,1,e.b.packageDigest]);await deniedBoth(newSession,owner,/evidence_denied/);
 const later=await envelope();assert.equal((await stage(later,newSession)).status,'committed');
 await govern('update evidence_probe.platform_feature set enabled=false');
 await assert.rejects(read(later,newSession),/evidence_platform_denied/);await assert.rejects(stage(later,newSession),/evidence_platform_denied/);
 const committed=(await db.query('select count(*)::int n from evidence_probe.requests where request_id=$1',[later.b.requestId])).rows[0].n;assert.equal(committed,1,'postcommit feature denial retains audit record');
 console.log('Platform policy PASS: metadata withdrawal and postcommit feature off deny without removing committed evidence.');

 for(const role of ['anon','authenticated']){
  await db.exec('reset role;set role '+role);
  await assert.rejects(stage(later,newSession),/permission denied/);await assert.rejects(read(later,newSession),/permission denied/);
  await assert.rejects(db.exec('select * from evidence_probe.platform_feature'),/permission denied/);
 }
 await db.exec('reset role;set role service_role');
 await assert.rejects(db.exec('update evidence_probe.platform_feature set enabled=true'),/permission denied/);
 console.log('Platform ACL PASS: browser roles cannot invoke wrappers or read feature state; backend cannot enable gate.');

}finally{await db.close();}
