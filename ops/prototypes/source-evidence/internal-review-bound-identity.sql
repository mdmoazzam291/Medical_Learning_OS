-- Test-only extension to internal-review.sql, NEVER a hosted migration.
-- A native PostgreSQL login's SESSION_USER is not caller-supplied request data.
-- Dedicated reviewer login fixtures are NOT the intended production Auth design.
create table evidence_internal.reviewer_principals(
 role_name name primary key,reviewer_id uuid not null unique
);
create table evidence_internal.grant_events(
 event_id bigint generated always as identity primary key,
 grant_event_id uuid not null references evidence_internal.grants,
 transition text not null check(transition in ('granted','revoked')),
 recorded_at timestamptz not null default clock_timestamp(),
 unique(grant_event_id,transition)
);
create trigger principal_immutable before update or delete on evidence_internal.reviewer_principals
 for each row execute function evidence_internal.immutable();
create trigger grant_event_immutable before update or delete on evidence_internal.grant_events
 for each row execute function evidence_internal.immutable();
alter table evidence_internal.reviewer_principals enable row level security;
alter table evidence_internal.grant_events enable row level security;
revoke all on evidence_internal.reviewer_principals,evidence_internal.grant_events
 from public,anon,authenticated,service_role,evidence_internal_gateway;

-- Only an independently trusted fixture administrator can call revocation.
-- Both review and revocation lock the same package row before inspecting
-- append-only grant events; no "latest" check is performed before the lock.
create function evidence_internal.revoke_bound_grant(p_grant uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare g evidence_internal.grants;
begin
 select * into g from evidence_internal.grants where grant_event_id=p_grant;
 if not found then raise exception 'internal_review_denied';end if;
 perform 1 from evidence_internal.packages
  where package_id=g.package_id and version=g.version and digest=g.digest for update;
 if not found or (select transition from evidence_internal.grant_events
    where grant_event_id=p_grant order by event_id desc limit 1) is distinct from 'granted'
 then raise exception 'internal_review_denied';end if;
 insert into evidence_internal.grant_events(grant_event_id,transition)
 values(p_grant,'revoked');
end;$$;

create function evidence_internal.bound_reviewer(p_grant uuid,q jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid;g evidence_internal.grants;
begin
 select reviewer_id into actor from evidence_internal.reviewer_principals
 where role_name=session_user;
 if actor is null then raise exception 'internal_review_denied';end if;
 select * into g from evidence_internal.grants where grant_event_id=p_grant;
 if not found or g.reviewer_id<>actor then raise exception 'internal_review_denied';end if;
 -- Serialized after both future grant and package revocation writers. This
 -- MUST be done before reading the current grant history.
 perform 1 from evidence_internal.packages where package_id=g.package_id and
  version=g.version and digest=g.digest for update;
 if not found or (select transition from evidence_internal.grant_events
  where grant_event_id=p_grant order by event_id desc limit 1) is distinct from 'granted'
 then raise exception 'internal_review_denied';end if;
 -- Existing base guard checks the exact case/source/rights and same package
 -- lock again. No caller-supplied actor value ever enters this wrapper.
 return actor;
end;$$;

create function evidence_internal.record_review_bound(q jsonb,p_grant uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=evidence_internal.bound_reviewer(p_grant,q);
 return evidence_internal.record_review(actor,q,p_grant);
end;$$;

create function evidence_internal.read_review_bound(p_request uuid,p_grant uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;old evidence_internal.decisions;
begin
 actor:=evidence_internal.bound_reviewer(p_grant,'{}'::jsonb);
 select * into old from evidence_internal.decisions where
 reviewer_id=actor and request_id=p_request and grant_event_id=p_grant;
 if not found then raise exception 'internal_review_denied';end if;
 return evidence_internal.read_review(actor,p_request);
end;$$;

revoke all on function evidence_internal.revoke_bound_grant(uuid),
 evidence_internal.bound_reviewer(uuid,jsonb),
 evidence_internal.record_review_bound(jsonb,uuid),
 evidence_internal.read_review_bound(uuid,uuid)
 from public,anon,authenticated,service_role,evidence_internal_gateway;
-- The test creates its review_test_* LOGIN roles before installing this file.
grant usage on schema evidence_internal to review_test_a,review_test_b;
grant execute on function evidence_internal.record_review_bound(jsonb,uuid),
 evidence_internal.read_review_bound(uuid,uuid) to review_test_a,review_test_b;
-- No reviewer login gets raw table, old unbound gateway, principal mutation,
-- revoke_grant, grant_events SELECT or row-level history privileges.
