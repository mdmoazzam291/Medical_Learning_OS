// Disposable synthetic platform bootstrap shared by capability checks, not an app connector.
import {readFile} from 'node:fs/promises';
export const platformFixture={owner:'11111111-1111-4111-8111-111111111111',other:'22222222-2222-4222-8222-222222222222',session:'33333333-3333-4333-8333-333333333333',otherSession:'44444444-4444-4444-8444-444444444444'};
async function definition(file,name){
 const source=await readFile(new URL('../../supabase/migrations/'+file,import.meta.url),'utf8'),start=source.indexOf('create or replace function public.'+name+'('),end=source.indexOf('$function$;',source.indexOf('as $function$',start));
 if(start<0||end<start)throw new Error('fixture_function_missing');return source.slice(start,end+11);
}
export async function installPlatformFixture(db,{capability=false}={}){
 const {owner,other,session,otherSession}=platformFixture;
 await db.exec('create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,banned_until timestamptz,deleted_at timestamptz);create table auth.sessions(id uuid primary key,user_id uuid not null references auth.users);');
 const source=await readFile(new URL('../../supabase/migrations/20260929032000_single_content_admin.sql',import.meta.url),'utf8'),start=source.indexOf('create table if not exists public.content_admin_account'),end=source.indexOf(');',start);
 if(start<0||end<start)throw new Error('fixture_table_missing');await db.exec(source.slice(start,end+2));
 await db.exec('alter table public.content_admin_account enable row level security;revoke all on public.content_admin_account from public,anon,authenticated,service_role;grant select on public.content_admin_account to service_role;');
 await db.exec(await definition('20261003153000_owner_operations_v3.sql','learner_runtime_access_v1'));
 await db.exec(await definition('20260929032000_single_content_admin.sql','is_content_admin'));
 await db.exec('revoke all on function public.learner_runtime_access_v1(uuid,uuid),public.is_content_admin(uuid) from public,anon,authenticated;grant execute on function public.learner_runtime_access_v1(uuid,uuid),public.is_content_admin(uuid) to service_role;');
 for(const actor of [owner,other])await db.query('insert into auth.users(id) values($1)',[actor]);
 for(const [sid,actor] of [[session,owner],[otherSession,other]])await db.query('insert into auth.sessions values($1,$2)',[sid,actor]);
 await db.query("insert into public.content_admin_account(singleton,admin_user_id,bootstrap_source) values(true,$1,'Synthetic capability fixture')",[owner]);
 for(const f of ['schema.sql','digests.sql','platform-gate.sql',...(capability?['capability.sql']:[])])await db.exec(await readFile(new URL('../../ops/prototypes/source-evidence/'+f,import.meta.url),'utf8'));
 for(const actor of [owner,other])await db.query('select evidence_probe.set_authority($1,true)',[actor]);
 await db.query('select evidence_probe.set_source_policy($1,$2,true)',['a'.repeat(64),'platform-fixture']);
}
