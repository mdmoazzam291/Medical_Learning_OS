-- DISPOSABLE NATIVE POSTGRES OVERLAY ONLY. Apply after private-authority.sql.
-- Never run on any hosted or production database. Separate credentials from the subject gateway,
-- confirmer and MLOS subject controller. Trust ownership remains unproven.
create role evidence_private_key_controller login noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
create role evidence_private_key_reader login noinherit nosuperuser nocreatedb nocreaterole nobypassrls;
set role evidence_private_owner;
create table evidence_private.provider_signing_trust(
 provider_id text not null,
 recipient_id text not null,
 key_sha256 text not null check(key_sha256 ~ '^[a-f0-9]{64}$'),
 epoch bigint not null check(epoch between 1 and 9007199254740991),
 enabled boolean not null,
 updated_at timestamptz not null default pg_catalog.clock_timestamp(),
 primary key(provider_id,recipient_id)
);
-- Prevent a previously revoked/rotated key from being silently re-enabled.
create table evidence_private.retired_signing_keys(
 provider_id text not null,
 recipient_id text not null,
 key_sha256 text not null check(key_sha256 ~ '^[a-f0-9]{64}$'),
 retired_at timestamptz not null default pg_catalog.clock_timestamp(),
 primary key(provider_id,recipient_id,key_sha256)
);
create function evidence_private.key_valid(p_provider text,p_recipient text,p_key text)
returns boolean language sql immutable security invoker set search_path='' as $$
 select p_provider is not null and p_recipient is not null
 and p_provider ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$'
 and p_recipient ~ '^[A-Za-z0-9][A-Za-z0-9._:/-]{0,159}$'
 and p_key is not null and p_key ~ '^[a-f0-9]{64}$'
$$;
-- Privileged, explicit enrollment or rotation. Never silently re-enable an old key.
create function evidence_private.key_enroll(p_provider text,p_recipient text,p_key text)
returns bigint language plpgsql security definer set search_path='' as $$
declare old evidence_private.provider_signing_trust;v bigint;
begin
 if not evidence_private.key_valid(p_provider,p_recipient,p_key) then
  raise exception 'private_invalid';end if;
 select * into old from evidence_private.provider_signing_trust
 where provider_id=p_provider and recipient_id=p_recipient for update;
 if found then
  if old.key_sha256=p_key or old.epoch>=9007199254740990 then
   raise exception 'private_conflict';end if;
  if exists(select 1 from evidence_private.retired_signing_keys
   where provider_id=p_provider and recipient_id=p_recipient and key_sha256=p_key)
  then raise exception 'private_conflict';end if;
  insert into evidence_private.retired_signing_keys(provider_id,recipient_id,key_sha256)
  values(p_provider,p_recipient,old.key_sha256) on conflict do nothing;
  update evidence_private.provider_signing_trust
   set key_sha256=p_key,epoch=old.epoch+1,enabled=true,
    updated_at=pg_catalog.clock_timestamp()
   where provider_id=p_provider and recipient_id=p_recipient
   returning epoch into v;
 else
  insert into evidence_private.provider_signing_trust(
   provider_id,recipient_id,key_sha256,epoch,enabled)
  values(p_provider,p_recipient,p_key,1,true)
  returning epoch into v;
 end if;
 return v;
end;$$;
-- Idempotent disable; no new key or authorization is generated.
create function evidence_private.key_revoke(p_provider text,p_recipient text)
returns bigint language plpgsql security definer set search_path='' as $$
declare old evidence_private.provider_signing_trust;v bigint;
begin
 if not evidence_private.key_valid(p_provider,p_recipient,repeat('a',64))
 then raise exception 'private_invalid';end if;
 select * into old from evidence_private.provider_signing_trust
 where provider_id=p_provider and recipient_id=p_recipient for update;
 if not found then raise exception 'private_denied';end if;
 if old.enabled then
  if old.epoch>=9007199254740990 then raise exception 'private_conflict';end if;
  update evidence_private.provider_signing_trust
  set enabled=false,epoch=old.epoch+1,updated_at=pg_catalog.clock_timestamp()
  where provider_id=p_provider and recipient_id=p_recipient returning epoch into v;
 else v:=old.epoch;end if;
 return v;
end;$$;
-- A single read-only statement from a separate narrow login. FOR SHARE
-- serializes this read with a concurrent key writer for the statement ONLY;
-- it cannot make the network lookup+SQL acknowledgement atomic.
create function evidence_private.key_state(p_provider text,p_recipient text,p_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old evidence_private.provider_signing_trust;
begin
 if not evidence_private.key_valid(p_provider,p_recipient,p_key)
 then raise exception 'private_invalid';end if;
 select * into old from evidence_private.provider_signing_trust
 where provider_id=p_provider and recipient_id=p_recipient for share;
 if not found or old.key_sha256<>p_key then return null;end if;
 return pg_catalog.jsonb_build_object(
  'providerId',old.provider_id,'recipientId',old.recipient_id,
  'keySha256',old.key_sha256,'epoch',old.epoch,'enabled',old.enabled
 );
end;$$;
reset role;
revoke all on table evidence_private.provider_signing_trust,evidence_private.retired_signing_keys from public;
revoke all on function evidence_private.key_valid(text,text,text),
 evidence_private.key_enroll(text,text,text),
 evidence_private.key_revoke(text,text),
 evidence_private.key_state(text,text,text) from public;
grant usage on schema evidence_private to evidence_private_key_controller,evidence_private_key_reader;
grant execute on function evidence_private.key_enroll(text,text,text),
 evidence_private.key_revoke(text,text) to evidence_private_key_controller;
grant execute on function evidence_private.key_state(text,text,text) to evidence_private_key_reader;
-- No table SELECT/UPDATE/DELETE/INSERT to either login, the gateway, or confirmer.
