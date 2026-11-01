-- DISPOSABLE LOCAL Auth + PostgREST fixture ONLY; NOT a hosted migration.
-- Session and user IDs originate from a PostgREST-verified signed JWT, never
-- from review request parameters. Direct untrusted SQL claim setters are banned.
create table evidence_internal.local_grant_history(
 event_id bigint generated always as identity primary key,
 grant_event_id uuid not null references evidence_internal.grants,
 transition text not null check(transition in ('granted','revoked')),
 recorded_at timestamptz not null default pg_catalog.clock_timestamp(),
 unique(grant_event_id,transition)
);
create trigger local_grant_history_immutable before update or delete
 on evidence_internal.local_grant_history for each row
 execute function evidence_internal.immutable();
alter table evidence_internal.local_grant_history enable row level security;
revoke all on evidence_internal.local_grant_history
 from public,anon,authenticated,service_role,evidence_internal_gateway;

create function evidence_internal.assert_live_gotrue_local_user()
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid;sid uuid;
begin
 actor:=auth.uid();sid:=nullif(auth.jwt()->>'session_id','')::uuid;
 if actor is null or sid is null or
  auth.jwt()->>'role' is distinct from 'authenticated'
 then raise exception 'internal_review_session_denied';end if;
 -- Actual GoTrue-owned session row; signout DELETE must wait for this share
 -- lock until this transaction either commits or rolls back.
 perform 1 from auth.sessions s
 where s.id=sid and s.user_id=actor and
  (s.not_after is null or s.not_after>pg_catalog.clock_timestamp())
 for share;
 if not found then raise exception 'internal_review_session_denied';end if;
 return actor;
exception when invalid_text_representation then
 raise exception 'internal_review_session_denied';
end;$$;

create function evidence_internal.local_grant_for_review(p_actor uuid,q jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare grant_id uuid;n integer;
begin
 select count(*) into n from evidence_internal.grants g
 where g.reviewer_id=p_actor and g.package_id=(q->>'packageId')::uuid
  and g.version=(q->>'packageVersion')::integer
  and g.digest=q->>'packageDigest' and g.case_id=q->>'caseId';
 if n<>1 then raise exception 'internal_review_grant_denied';end if;
 select g.grant_event_id into grant_id from evidence_internal.grants g
 where g.reviewer_id=p_actor and g.package_id=(q->>'packageId')::uuid
  and g.version=(q->>'packageVersion')::integer
  and g.digest=q->>'packageDigest' and g.case_id=q->>'caseId'
 for update;
 if not found or (select h.transition from evidence_internal.local_grant_history h
  where h.grant_event_id=grant_id order by h.event_id desc limit 1)
  is distinct from 'granted'
 then raise exception 'internal_review_grant_denied';end if;
 return grant_id;
exception when invalid_text_representation or numeric_value_out_of_range then
 raise exception 'internal_review_grant_denied';
end;$$;

-- The local CLI exposes public schema. This endpoint is fixture-only and
-- restricted to authenticated, signed-JWT PostgREST requests.
create function public.mlos_internal_source_review_local_v1(q jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;gid uuid;
begin
 actor:=evidence_internal.assert_live_gotrue_local_user();
 gid:=evidence_internal.local_grant_for_review(actor,q);
 -- Deterministic race barrier for one synthetic request only; never deploy.
 if q->>'requestId'='88888888-8888-4888-8888-888888888888'
 then perform pg_catalog.pg_sleep(1.7);end if;
 return evidence_internal.record_review(actor,q,gid);
end;$$;

create function public.mlos_internal_source_read_local_v1(p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid;prior evidence_internal.decisions;gid uuid;
begin
 actor:=evidence_internal.assert_live_gotrue_local_user();
 select * into prior from evidence_internal.decisions d
 where d.reviewer_id=actor and d.request_id=p_request;
 if not found then raise exception 'internal_review_denied';end if;
 gid:=evidence_internal.local_grant_for_review(actor,prior.request_payload);
 if gid<>prior.grant_event_id then raise exception 'internal_review_denied';end if;
 return evidence_internal.read_review(actor,p_request);
end;$$;

revoke all on function evidence_internal.assert_live_gotrue_local_user(),
 evidence_internal.local_grant_for_review(uuid,jsonb)
 from public,anon,authenticated,service_role,evidence_internal_gateway;
revoke all on function public.mlos_internal_source_review_local_v1(jsonb),
 public.mlos_internal_source_read_local_v1(uuid)
 from public,anon,service_role,evidence_internal_gateway;
grant execute on function public.mlos_internal_source_review_local_v1(jsonb),
 public.mlos_internal_source_read_local_v1(uuid) to authenticated;
