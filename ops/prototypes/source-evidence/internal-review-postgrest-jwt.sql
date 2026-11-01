-- ISOLATED NATIVE POSTGREST/JWT BOUNDARY TEST ONLY. NOT A HOSTED MIGRATION.
-- auth.uid and auth.session_id below decode PostgREST's already-verified
-- transaction claims; arbitrary SQL clients can forge set_config claims.
-- NEVER expose a direct SQL connection, service-role actor RPC or this fixture.
create schema auth;
create function auth.uid() returns uuid language sql stable set search_path='' as $$
 select (nullif(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid
$$;
create function auth.session_id() returns uuid language sql stable set search_path='' as $$
 select (nullif(pg_catalog.current_setting('request.jwt.claims',true),'')::jsonb->>'session_id')::uuid
$$;

create schema evidence_api;
revoke all on schema evidence_api from public;
grant usage on schema evidence_api to authenticated;

-- Synthetic *current* session state. Real hosted Auth/session validity and
-- token verification must be proven independently before production use.
create table evidence_internal.sessions(
 session_id uuid primary key, reviewer_id uuid not null,
 active boolean not null default true
);
create table evidence_internal.grant_history(
 event_id bigint generated always as identity primary key,
 grant_event_id uuid not null references evidence_internal.grants,
 transition text not null check(transition in ('granted','revoked')),
 recorded_at timestamptz not null default pg_catalog.clock_timestamp(),
 unique(grant_event_id,transition)
);
create trigger grant_history_immutable before update or delete
 on evidence_internal.grant_history for each row
 execute function evidence_internal.immutable();

alter table evidence_internal.sessions enable row level security;
alter table evidence_internal.grant_history enable row level security;
revoke all on evidence_internal.sessions,evidence_internal.grant_history
 from public,anon,authenticated,service_role,evidence_internal_gateway;

create function evidence_internal.assert_user_session()
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid;sid uuid;s evidence_internal.sessions;
begin
 actor:=auth.uid();sid:=auth.session_id();
 if actor is null or sid is null then
  raise exception 'internal_review_session_denied';end if;
 select * into s from evidence_internal.sessions where session_id=sid for update;
 if not found or s.active is not true or s.reviewer_id<>actor then
  raise exception 'internal_review_session_denied';end if;
 return actor;
end;$$;

create function evidence_internal.current_case_grant(p_actor uuid,q jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare p evidence_internal.packages;g evidence_internal.grants;
begin
 -- Caller of this helper must first hold a locked current sessions row.
 select * into p from evidence_internal.packages
 where package_id=(q->>'packageId')::uuid and
  version=(q->>'packageVersion')::integer and digest=q->>'packageDigest'
 for update;
 if not found or p.active is not true or p.staged is not true
   or p.metadata_rights is not true or p.author_id=p_actor
 then raise exception 'internal_review_denied';end if;
 select * into g from evidence_internal.grants
 where reviewer_id=p_actor and package_id=p.package_id
  and version=p.version and digest=p.digest and case_id=q->>'caseId'
 order by grant_event_id limit 1 for update;
 if not found or g.active is not true or g.consent_verified is not true
   or g.qualification_verified is not true or
   g.independence_verified is not true
 then raise exception 'internal_review_denied';end if;
 if (select transition from evidence_internal.grant_history
    where grant_event_id=g.grant_event_id order by event_id desc limit 1)
    is distinct from 'granted'
 then raise exception 'internal_review_denied';end if;
 return g.grant_event_id;
end;$$;

-- Publicly addressable only through an authenticated, JWT-verifying API
-- gateway. Function has NO p_actor/p_reviewer/p_grant argument. All security
-- decisions and immutable event insert are one SQL transaction.
create function evidence_api.record_source_review(q jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;gid uuid;
begin
 actor:=evidence_internal.assert_user_session();
 gid:=evidence_internal.current_case_grant(actor,q);
 return evidence_internal.record_review(actor,q,gid);
end;$$;

create function evidence_api.read_source_review(p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;previous evidence_internal.decisions;gid uuid;
begin
 actor:=evidence_internal.assert_user_session();
 select * into previous from evidence_internal.decisions
  where reviewer_id=actor and request_id=p_request;
 if not found then raise exception 'internal_review_denied';end if;
 gid:=evidence_internal.current_case_grant(actor,previous.request_payload);
 if gid<>previous.grant_event_id then raise exception 'internal_review_denied';end if;
 return evidence_internal.read_review(actor,p_request);
end;$$;

-- These are privileged fixture admin functions, never exposed to HTTP.
-- All grant/status revocation writers must lock session/package/grant in a
-- compatible order with record_source_review; this test uses the same rows.
revoke all on function evidence_internal.assert_user_session(),
 evidence_internal.current_case_grant(uuid,jsonb)
 from public,anon,authenticated,service_role,evidence_internal_gateway;
revoke all on function evidence_api.record_source_review(jsonb),
 evidence_api.read_source_review(uuid)
 from public,anon,service_role,evidence_internal_gateway;
grant execute on function evidence_api.record_source_review(jsonb),
 evidence_api.read_source_review(uuid) to authenticated;
