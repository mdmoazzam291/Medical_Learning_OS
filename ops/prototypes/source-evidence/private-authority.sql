-- DISPOSABLE NATIVE POSTGRES PROTOTYPE ONLY. NEVER migrate to hosted.
-- No auth schema/table access, trigger, grant or provider session metadata.
-- All roles are fixture-only trust-authenticated logins; no product secrets.
create role evidence_private_owner nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
create role evidence_private_gateway login noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
create role evidence_private_controller login noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
create schema evidence_private authorization evidence_private_owner;
revoke all on schema evidence_private from public;
set role evidence_private_owner;
create table evidence_private.subjects(
 actor uuid primary key,
 epoch bigint not null check(epoch>0),
 enabled boolean not null,
 lease_until timestamptz not null,
 updated_at timestamptz not null
);
create table evidence_private.receipts(
 request_id uuid primary key,
 actor uuid not null references evidence_private.subjects(actor),
 session_id uuid not null,
 subject_epoch bigint not null check(subject_epoch>0),
 digest text not null check(digest ~ '^[a-f0-9]{64}$'),
 staged_at timestamptz not null default clock_timestamp(),
 delivered_at timestamptz
);
-- Internal control may be called only through a separate trusted controller.
-- Its lease proves only MLOS-owned state, NOT freshness of GoTrue session.
create function evidence_private.control(p_actor uuid,p_enabled boolean,p_lease_seconds int)
returns void language plpgsql security definer set search_path='' as $$
declare until_at timestamptz;
begin
 if p_actor is null or p_enabled is null or p_lease_seconds is null
 or (p_enabled and p_lease_seconds not between 1 and 600)
 or (not p_enabled and p_lease_seconds<>0) then
  raise exception 'private_invalid';
 end if;
 until_at:=case when p_enabled then pg_catalog.clock_timestamp()+
   pg_catalog.make_interval(secs=>p_lease_seconds)
 else pg_catalog.clock_timestamp() end;
 insert into evidence_private.subjects(actor,epoch,enabled,lease_until,updated_at)
 values(p_actor,1,p_enabled,until_at,pg_catalog.clock_timestamp())
 on conflict(actor) do update set epoch=evidence_private.subjects.epoch+1,
  enabled=excluded.enabled,lease_until=excluded.lease_until,
  updated_at=pg_catalog.clock_timestamp();
end;$$;
-- Lock MLOS-owned row, not auth.sessions. The test's FOR SHARE allows
-- parallel stage/readback but conflicts with control's UPDATE.
create function evidence_private.require_active(p_actor uuid)
returns bigint language plpgsql security invoker set search_path='' as $$
declare v bigint;e boolean;expiry timestamptz;
begin
 select epoch,enabled,lease_until into v,e,expiry
 from evidence_private.subjects where actor=p_actor for share;
 if not found or e is distinct from true or expiry<=pg_catalog.clock_timestamp()
 then raise exception 'private_denied';end if;
 return v;
end;$$;
create function evidence_private.stage(p_actor uuid,p_session uuid,p_request uuid,p_digest text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v bigint;old evidence_private.receipts;
begin
 if p_actor is null or p_session is null or p_request is null or
 p_digest is null or p_digest !~ '^[a-f0-9]{64}$' then
  raise exception 'private_invalid';end if;
 v:=evidence_private.require_active(p_actor);
 insert into evidence_private.receipts(request_id,actor,session_id,subject_epoch,digest)
 values(p_request,p_actor,p_session,v,p_digest)
 on conflict(request_id) do nothing;
 select * into old from evidence_private.receipts where request_id=p_request for share;
 if not found or old.actor<>p_actor or old.session_id<>p_session or
 old.subject_epoch<>v or old.digest<>p_digest then raise exception 'private_conflict';end if;
 return pg_catalog.jsonb_build_object('status','staged');
end;$$;
create function evidence_private.deliver(p_actor uuid,p_session uuid,p_request uuid,p_digest text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v bigint;old evidence_private.receipts;
begin
 if p_actor is null or p_session is null or p_request is null or
 p_digest is null or p_digest !~ '^[a-f0-9]{64}$' then
  raise exception 'private_invalid';end if;
 v:=evidence_private.require_active(p_actor);
 select * into old from evidence_private.receipts where request_id=p_request for update;
 if not found or old.actor<>p_actor or old.session_id<>p_session or
 old.subject_epoch<>v or old.digest<>p_digest then raise exception 'private_denied';end if;
 if old.delivered_at is null then
  update evidence_private.receipts set delivered_at=pg_catalog.clock_timestamp()
  where request_id=p_request and delivered_at is null;
 end if;
 return pg_catalog.jsonb_build_object('status','delivered');
end;$$;
reset role;
revoke all on all tables in schema evidence_private from public;
revoke all on all functions in schema evidence_private from public;
grant usage on schema evidence_private to evidence_private_gateway,evidence_private_controller;
grant execute on function evidence_private.control(uuid,boolean,int) to evidence_private_controller;
grant execute on function evidence_private.stage(uuid,uuid,uuid,text),
 evidence_private.deliver(uuid,uuid,uuid,text) to evidence_private_gateway;
-- The private state, receipts, and internal guard have no direct gateway ACLs.
