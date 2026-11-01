-- ISOLATED LOCAL GOTRUE + POSTGREST FIXTURE. NEVER HOST OR MIGRATE.
-- Demonstrates MLOS-OWNED session gate and grant serialization WITHOUT any
-- auth.sessions SELECT/UPDATE/row lock. This is NOT a provider logout proof.
-- Requires the disposable evidence_internal schema from internal-review.sql.

create table evidence_internal.owned_reviewer_sessions (
 reviewer_id uuid not null,
 session_id uuid not null,
 active boolean not null default true,
 primary key(reviewer_id,session_id)
);
create table evidence_internal.owned_reviewer_session_revocations (
 event_id bigint generated always as identity primary key,
 reviewer_id uuid not null,
 session_id uuid not null,
 revoked_at timestamptz not null default pg_catalog.clock_timestamp(),
 foreign key(reviewer_id,session_id)
  references evidence_internal.owned_reviewer_sessions(reviewer_id,session_id),
 unique(reviewer_id,session_id)
);
create table evidence_internal.owned_reviewer_grant_history (
 event_id bigint generated always as identity primary key,
 grant_event_id uuid not null references evidence_internal.grants,
 transition text not null check(transition in ('granted','revoked')),
 recorded_at timestamptz not null default pg_catalog.clock_timestamp(),
 unique(grant_event_id,transition)
);

create trigger owned_session_revocations_immutable before update or delete
 on evidence_internal.owned_reviewer_session_revocations for each row
 execute function evidence_internal.immutable();
create trigger owned_grant_history_immutable before update or delete
 on evidence_internal.owned_reviewer_grant_history for each row
 execute function evidence_internal.immutable();

create function evidence_internal.owned_session_revocation_only()
returns trigger language plpgsql set search_path='' as $$
begin
 if old.active is not true or new.active is not false or
    old.reviewer_id<>new.reviewer_id or old.session_id<>new.session_id
 then raise exception 'owned_review_session_reactivation_denied';end if;
 return new;
end;$$;
create trigger owned_session_revocation_only before update
 on evidence_internal.owned_reviewer_sessions for each row
 execute function evidence_internal.owned_session_revocation_only();

-- This test-only SQL is invoked as a privileged fixture administrator.
-- No exposed review client has a grant to issue/revoke its own authority.
create function evidence_internal.revoke_owned_reviewer_session(p_reviewer uuid,p_session uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 update evidence_internal.owned_reviewer_sessions
 set active=false where reviewer_id=p_reviewer and session_id=p_session and active=true;
 if not found then raise exception 'owned_review_session_not_active';end if;
 insert into evidence_internal.owned_reviewer_session_revocations(reviewer_id,session_id)
 values(p_reviewer,p_session);
end;$$;

-- Order for all source-grant writers: package -> exact grant.
create function evidence_internal.revoke_owned_reviewer_grant(
 p_package uuid,p_version integer,p_digest text,p_grant uuid
) returns void language plpgsql security definer set search_path='' as $$
declare g evidence_internal.grants;
begin
 perform 1 from evidence_internal.packages
 where package_id=p_package and version=p_version and digest=p_digest for update;
 if not found then raise exception 'owned_review_grant_denied';end if;
 select * into g from evidence_internal.grants
 where grant_event_id=p_grant and package_id=p_package and
 version=p_version and digest=p_digest for update;
 if not found or (select transition from evidence_internal.owned_reviewer_grant_history
  where grant_event_id=p_grant order by event_id desc limit 1) is distinct from 'granted'
 then raise exception 'owned_review_grant_denied';end if;
 insert into evidence_internal.owned_reviewer_grant_history(grant_event_id,transition)
 values(p_grant,'revoked');
end;$$;

-- JWT signature/issuer/audience are checked by disposable PostgREST.
-- This proves only a matching application-owned row, NOT current provider
-- session existence. Provider-initiated signout can leave a valid access JWT.
create function evidence_internal.assert_owned_reviewer_session()
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid;sid uuid;ok boolean;
begin
 actor:=auth.uid();
 sid:=nullif(auth.jwt()->>'session_id','')::uuid;
 if actor is null or sid is null or
  auth.jwt()->>'role' is distinct from 'authenticated'
 then raise exception 'owned_review_session_denied';end if;
 select s.active into ok from evidence_internal.owned_reviewer_sessions s
 where s.reviewer_id=actor and s.session_id=sid for update;
 if not found or ok is not true
 then raise exception 'owned_review_session_denied';end if;
 return actor;
exception when invalid_text_representation then
 raise exception 'owned_review_session_denied';
end;$$;

create function evidence_internal.owned_scoped_grant(actor uuid,q jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare gid uuid;n integer;
begin
 perform 1 from evidence_internal.packages p
 where p.package_id=(q->>'packageId')::uuid and
  p.version=(q->>'packageVersion')::integer and
  p.digest=q->>'packageDigest' for update;
 if not found then raise exception 'owned_review_grant_denied';end if;
 select count(*) into n from evidence_internal.grants g
 where g.reviewer_id=actor and g.package_id=(q->>'packageId')::uuid
  and g.version=(q->>'packageVersion')::integer and
  g.digest=q->>'packageDigest' and g.case_id=q->>'caseId';
 if n<>1 then raise exception 'owned_review_grant_denied';end if;
 select g.grant_event_id into gid from evidence_internal.grants g
 where g.reviewer_id=actor and g.package_id=(q->>'packageId')::uuid
  and g.version=(q->>'packageVersion')::integer and
  g.digest=q->>'packageDigest' and g.case_id=q->>'caseId' for update;
 if not found or (select transition from evidence_internal.owned_reviewer_grant_history
  where grant_event_id=gid order by event_id desc limit 1) is distinct from 'granted'
 then raise exception 'owned_review_grant_denied';end if;
 return gid;
exception when invalid_text_representation or numeric_value_out_of_range then
 raise exception 'owned_review_grant_denied';
end;$$;

create function public.mlos_owned_source_review_local_v1(q jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;gid uuid;
begin
 actor:=evidence_internal.assert_owned_reviewer_session();
 gid:=evidence_internal.owned_scoped_grant(actor,q);
 -- One request sleep is LOCAL ONLY, to observe actual PostgreSQL lock races.
 if q->>'requestId'='66666666-6666-4666-8666-666666666666'
 then perform pg_catalog.pg_sleep(1.4);end if;
 return evidence_internal.record_review(actor,q,gid);
end;$$;

create function public.mlos_owned_source_read_local_v1(p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;prior evidence_internal.decisions;gid uuid;
begin
 actor:=evidence_internal.assert_owned_reviewer_session();
 select * into prior from evidence_internal.decisions d
 where d.reviewer_id=actor and d.request_id=p_request;
 if not found then raise exception 'owned_review_read_denied';end if;
 gid:=evidence_internal.owned_scoped_grant(actor,prior.request_payload);
 if gid<>prior.grant_event_id then raise exception 'owned_review_read_denied';end if;
 return evidence_internal.read_review(actor,p_request);
end;$$;

do $$declare t text;begin
 foreach t in array array['owned_reviewer_sessions',
  'owned_reviewer_session_revocations','owned_reviewer_grant_history']
 loop
  execute format('alter table evidence_internal.%I enable row level security',t);
  execute format('revoke all on evidence_internal.%I from public,anon,authenticated,service_role,evidence_internal_gateway',t);
 end loop;
end;$$;
revoke all on function evidence_internal.owned_session_revocation_only(),
 evidence_internal.revoke_owned_reviewer_session(uuid,uuid),
 evidence_internal.revoke_owned_reviewer_grant(uuid,integer,text,uuid),
 evidence_internal.assert_owned_reviewer_session(),
 evidence_internal.owned_scoped_grant(uuid,jsonb)
 from public,anon,authenticated,service_role,evidence_internal_gateway;
revoke all on function public.mlos_owned_source_review_local_v1(jsonb),
 public.mlos_owned_source_read_local_v1(uuid)
 from public,anon,authenticated,service_role,evidence_internal_gateway;
grant execute on function public.mlos_owned_source_review_local_v1(jsonb),
 public.mlos_owned_source_read_local_v1(uuid) to authenticated;
