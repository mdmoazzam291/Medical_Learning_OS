-- Disposable row-lock investigation only. No provider Auth trigger or migration.
create role evidence_authority_locker nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
grant usage on schema auth,public,evidence_probe to evidence_authority_locker;
-- PostgreSQL row locking needs UPDATE privilege on at least one column.
-- Locking also consults UPDATE USING; WITH CHECK(false) prohibits actual writes.
grant select(id),update(id) on auth.users to evidence_authority_locker;
grant select(id,user_id),update(id) on auth.sessions to evidence_authority_locker;
grant select(singleton),update(singleton) on public.content_admin_account,evidence_probe.platform_feature to evidence_authority_locker;
alter table auth.users enable row level security;
alter table auth.sessions enable row level security;
create policy locker_read on auth.users for select to evidence_authority_locker using(true);
create policy locker_read on auth.sessions for select to evidence_authority_locker using(true);
create policy locker_read on public.content_admin_account for select to evidence_authority_locker using(true);
create policy locker_read on evidence_probe.platform_feature for select to evidence_authority_locker using(true);
create policy locker_lock on auth.users for update to evidence_authority_locker using(true) with check(false);
create policy locker_lock on auth.sessions for update to evidence_authority_locker using(true) with check(false);
create policy locker_lock on public.content_admin_account for update to evidence_authority_locker using(true) with check(false);
create policy locker_lock on evidence_probe.platform_feature for update to evidence_authority_locker using(true) with check(false);
create function evidence_probe.lock_platform_authority(p_actor uuid,p_session uuid)
returns void language plpgsql security definer set search_path='' as $$begin
 if pg_catalog.current_setting('transaction_isolation') <> 'read committed' then raise exception 'evidence_platform_isolation_unsupported';end if;
 if p_actor is null or p_session is null then raise exception 'evidence_platform_denied';end if;
 perform id from auth.users where id=p_actor for share;
 if not found then raise exception 'evidence_platform_denied';end if;
 perform id from auth.sessions where id=p_session and user_id=p_actor for share;
 if not found then raise exception 'evidence_platform_denied';end if;
 perform singleton from public.content_admin_account where singleton=true for share;
 if not found then raise exception 'evidence_platform_denied';end if;
 perform singleton from evidence_probe.platform_feature where singleton=true for share;
 if not found then raise exception 'evidence_platform_denied';end if;
end;$$;
grant create on schema evidence_probe to evidence_authority_locker;
alter function evidence_probe.lock_platform_authority(uuid,uuid) owner to evidence_authority_locker;
revoke create on schema evidence_probe from evidence_authority_locker;
revoke all on function evidence_probe.lock_platform_authority(uuid,uuid) from public,anon,authenticated,service_role,evidence_gateway;
grant execute on function evidence_probe.lock_platform_authority(uuid,uuid) to evidence_executor;
create or replace function evidence_probe.platform_guard(p_actor uuid,p_session uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare current_access jsonb;
begin
 -- Row locks precede the metadata advisory lock; plain authority writers need no hook.
 perform evidence_probe.lock_platform_authority(p_actor,p_session);
 perform pg_catalog.pg_advisory_xact_lock(730031);
 if (select enabled from evidence_probe.platform_feature where singleton=true) is not true then raise exception 'evidence_platform_denied';end if;
 current_access:=public.learner_runtime_access_v1(p_actor,p_session);
 if current_access->'allowed' is distinct from 'true'::jsonb or public.is_content_admin(p_actor) is not true then raise exception 'evidence_platform_denied';end if;
end;$$;
