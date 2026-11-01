-- DISPOSABLE NATIVE POSTGRES PROTOTYPE ONLY. NEVER migrate to hosted.
-- No auth schema/table access, trigger, grant or provider session metadata.
-- All roles are fixture-only trust-authenticated logins; no product secrets.
create role evidence_private_owner nologin noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
create role evidence_private_gateway login noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
create role evidence_private_controller login noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
create role evidence_private_confirmer login noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
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
 staged_at timestamptz not null default clock_timestamp()
);
-- One intent per immutable staged request. Retries NEVER produce a new attempt:
-- a lost commit/ack is ambiguous and requires independent reconciliation.
create table evidence_private.delivery_attempts(
 request_id uuid primary key references evidence_private.receipts(request_id),
 attempt_id uuid not null unique default pg_catalog.gen_random_uuid(),
 status text not null default 'intent' check(status in ('intent','uncertain','acknowledged')),
 intent_at timestamptz not null default pg_catalog.clock_timestamp(),
 ack_digest text check(ack_digest ~ '^[a-f0-9]{64}$'),
 acknowledged_at timestamptz,
 check((status='acknowledged')=(ack_digest is not null and acknowledged_at is not null))
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
-- Transactional intent only. This function NEVER sends a payload.
-- Once an intent exists, the gateway cannot dispatch it again by retrying.
create function evidence_private.reserve_intent(p_actor uuid,p_session uuid,p_request uuid,p_digest text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v bigint;old evidence_private.receipts;aid uuid;
begin
 if p_actor is null or p_session is null or p_request is null or
 p_digest is null or p_digest !~ '^[a-f0-9]{64}$' then raise exception 'private_invalid';end if;
 v:=evidence_private.require_active(p_actor);
 select * into old from evidence_private.receipts where request_id=p_request for update;
 if not found or old.actor<>p_actor or old.session_id<>p_session or
 old.subject_epoch<>v or old.digest<>p_digest then raise exception 'private_denied';end if;
 insert into evidence_private.delivery_attempts(request_id) values(p_request)
 on conflict(request_id) do nothing returning attempt_id into aid;
 if aid is null then
  return pg_catalog.jsonb_build_object('status','reconciliation-required');
 end if;
 return pg_catalog.jsonb_build_object('status','intent-recorded','attemptId',aid);
end;$$;
-- Safe to record uncertain completion after a timeout, even if the private
-- authority was subsequently revoked. Does NOT grant re-dispatch rights.
create function evidence_private.mark_uncertain(p_request uuid,p_attempt uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old evidence_private.delivery_attempts;
begin
 if p_request is null or p_attempt is null then raise exception 'private_invalid';end if;
 select * into old from evidence_private.delivery_attempts
 where request_id=p_request and attempt_id=p_attempt for update;
 if not found then raise exception 'private_denied';end if;
 if old.status='intent' then
  update evidence_private.delivery_attempts set status='uncertain' where request_id=p_request;
 end if;
 return pg_catalog.jsonb_build_object('status','reconciliation-required');
end;$$;
-- AUDIT ONLY: the separate confirmer must first validate an external,
-- durable acknowledgement via its trusted, non-client-supplied connector.
-- This DB function cannot verify external delivery by itself.
create function evidence_private.record_ack(p_request uuid,p_attempt uuid,p_digest text,p_ack_digest text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old evidence_private.delivery_attempts;original evidence_private.receipts;
begin
 if p_request is null or p_attempt is null or
 p_digest is null or p_digest !~ '^[a-f0-9]{64}$' or
 p_ack_digest is null or p_ack_digest !~ '^[a-f0-9]{64}$' then
  raise exception 'private_invalid';end if;
 select * into original from evidence_private.receipts where request_id=p_request;
 if not found or original.digest<>p_digest then raise exception 'private_denied';end if;
 select * into old from evidence_private.delivery_attempts
 where request_id=p_request and attempt_id=p_attempt for update;
 if not found then raise exception 'private_denied';end if;
 if old.status='acknowledged' then
  if old.ack_digest<>p_ack_digest then raise exception 'private_conflict';end if;
 else
  update evidence_private.delivery_attempts set status='acknowledged',
   ack_digest=p_ack_digest,acknowledged_at=pg_catalog.clock_timestamp()
  where request_id=p_request;
 end if;
 return pg_catalog.jsonb_build_object('status','acknowledgement-recorded');
end;$$;
-- Trusted confirmer-only lookup for a commit response lost *before*
-- the gateway saw its generated attempt ID. Never enables dispatch.
create function evidence_private.inspect_intent(p_request uuid,p_digest text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare original evidence_private.receipts;old evidence_private.delivery_attempts;
begin
 if p_request is null or p_digest is null or p_digest !~ '^[a-f0-9]{64}$'
 then raise exception 'private_invalid';end if;
 select * into original from evidence_private.receipts where request_id=p_request;
 if not found or original.digest<>p_digest then raise exception 'private_denied';end if;
 select * into old from evidence_private.delivery_attempts where request_id=p_request;
 if not found then return pg_catalog.jsonb_build_object('status','no-intent');end if;
 return pg_catalog.jsonb_build_object('status','intent-found',
  'attemptId',old.attempt_id,'state',old.status);
end;$$;
reset role;
revoke all on all tables in schema evidence_private from public;
revoke all on all functions in schema evidence_private from public;
grant usage on schema evidence_private to evidence_private_gateway,evidence_private_controller,evidence_private_confirmer;
grant execute on function evidence_private.control(uuid,boolean,int) to evidence_private_controller;
grant execute on function evidence_private.stage(uuid,uuid,uuid,text),
 evidence_private.reserve_intent(uuid,uuid,uuid,text),
 evidence_private.mark_uncertain(uuid,uuid) to evidence_private_gateway;
grant execute on function evidence_private.record_ack(uuid,uuid,text,text),
 evidence_private.inspect_intent(uuid,text) to evidence_private_confirmer;
-- The private state, receipts, intent attempts and internal guard have no direct gateway/confirmer ACLs.
-- IMPORTANT: record_ack is an audit assertion by a trusted confirmer, NOT proof of external content transfer.
