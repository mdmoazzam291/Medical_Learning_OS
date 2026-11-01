-- DISPOSABLE SQL TEST PROTOTYPE. Do NOT apply as a hosted database migration.
-- Gateway role is an independently authenticated SERVER fixture, not a
-- user session. No SQL function here verifies external identity-provider sessions or real reviewers.
create schema evidence_internal;
revoke all on schema evidence_internal from public,anon,authenticated;
create role evidence_internal_gateway nologin;
grant usage on schema evidence_internal to evidence_internal_gateway;

create table evidence_internal.packages(
 package_id uuid not null,version integer not null,digest text not null,
 author_id uuid not null,staged boolean not null,active boolean not null,
 metadata_rights boolean not null,primary key(package_id,version,digest)
);
create table evidence_internal.cases(
 package_id uuid not null,version integer not null,digest text not null,
 case_id text not null,case_version integer not null,
 case_digest text not null,appearance_evidence_digest text not null,
 source_sha256 text not null,primary key(package_id,version,digest,case_id),
 foreign key(package_id,version,digest) references evidence_internal.packages
);
create table evidence_internal.grants(
 grant_event_id uuid primary key,reviewer_id uuid not null,
 package_id uuid not null,version integer not null,digest text not null,
 case_id text not null,active boolean not null,consent_verified boolean not null,
 qualification_verified boolean not null,independence_verified boolean not null,
 foreign key(package_id,version,digest,case_id)
 references evidence_internal.cases(package_id,version,digest,case_id)
);
create table evidence_internal.decisions(
 decision_id uuid primary key,reviewer_id uuid not null,request_id uuid not null,
 grant_event_id uuid not null,request_payload jsonb not null,
 event_payload jsonb not null, recorded_at timestamptz not null,
 unique(reviewer_id,request_id)
);
create function evidence_internal.immutable() returns trigger language plpgsql
set search_path='' as $$
begin raise exception 'internal_review_immutable';end;$$;
create trigger decision_immutable before update or delete on evidence_internal.decisions
for each row execute function evidence_internal.immutable();

-- A gateway must independently authenticate the user and validate the
-- domain request first. This function enforces *current* authoritative
-- package/grant/case records in a single SQL transaction, not JWT validity.
-- Revocation/withdrawal uses UPDATE and the same locked rows.
create function evidence_internal.guard(p_actor uuid,q jsonb,p_grant uuid)
returns void language plpgsql security definer set search_path='' as $$
declare
 p evidence_internal.packages;
 g evidence_internal.grants;
 c evidence_internal.cases;
 expected text[]:=array[
 'requestId','targetType','packageId','packageVersion','packageDigest',
 'caseId','caseVersion','caseDigest','sourceSha256',
 'appearanceEvidenceDigest','disposition','rationale','attestationVersion'];
 k text;
begin
 if p_actor is null or p_grant is null or jsonb_typeof(q) is distinct from 'object'
 or (select count(*) from jsonb_object_keys(q))<>cardinality(expected)
 or exists(select 1 from jsonb_object_keys(q) x where x<>all(expected))
 then raise exception 'internal_review_invalid';end if;
 foreach k in array expected loop
  if (k in ('packageVersion','caseVersion') and
      jsonb_typeof(q->k) is distinct from 'number') or
     (k not in ('packageVersion','caseVersion') and
      jsonb_typeof(q->k) is distinct from 'string')
  then raise exception 'internal_review_invalid';end if;
 end loop;
 if q->>'targetType'<>'source-row-case' or
    q->>'attestationVersion'<>'source-row-review-v1' or
    q->>'disposition'<>all(array[
     'accept-proposed-interpretation','reject-proposed-interpretation',
     'request-primary-clarification','retain-unresolved']) or
    char_length(q->>'rationale') not between 24 and 4000 or
    q->>'packageDigest' !~ '^[a-f0-9]{64}$' or
    q->>'caseDigest' !~ '^[a-f0-9]{64}$' or
    q->>'appearanceEvidenceDigest' !~ '^[a-f0-9]{64}$' or
    q->>'sourceSha256' !~ '^[a-f0-9]{64}$'
 then raise exception 'internal_review_invalid';end if;
 -- Both identifiers and versions are parsed and range-checked here.
 if (q->>'packageVersion')::numeric <> trunc((q->>'packageVersion')::numeric) or
    (q->>'caseVersion')::numeric <> trunc((q->>'caseVersion')::numeric) or
    (q->>'packageVersion')::numeric not between 1 and 1000000 or
    (q->>'caseVersion')::numeric not between 1 and 1000000
 then raise exception 'internal_review_invalid';end if;
 select * into p from evidence_internal.packages
 where package_id=(q->>'packageId')::uuid and
 version=(q->>'packageVersion')::int and digest=q->>'packageDigest'
 for update;
 if not found or p.active is not true or p.staged is not true or
   p.metadata_rights is not true or p.author_id=p_actor
 then raise exception 'internal_review_denied';end if;
 select * into g from evidence_internal.grants where grant_event_id=p_grant for update;
 if not found or g.active is not true or
   g.consent_verified is not true or g.qualification_verified is not true or
   g.independence_verified is not true or
   g.reviewer_id<>p_actor or g.package_id<>p.package_id or
   g.version<>p.version or g.digest<>p.digest or
   g.case_id<>q->>'caseId'
 then raise exception 'internal_review_denied';end if;
 select * into c from evidence_internal.cases
 where package_id=p.package_id and version=p.version and digest=p.digest
 and case_id=g.case_id;
 if not found or c.case_version<>(q->>'caseVersion')::int or
  c.case_digest<>q->>'caseDigest' or
  c.appearance_evidence_digest<>q->>'appearanceEvidenceDigest' or
  c.source_sha256<>q->>'sourceSha256'
 then raise exception 'internal_review_denied';end if;
end;$$;

create function evidence_internal.record_review(p_actor uuid,q jsonb,p_grant uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old evidence_internal.decisions;
 event_id uuid;event_time timestamptz;payload jsonb;
begin
 perform evidence_internal.guard(p_actor,q,p_grant);
 select * into old from evidence_internal.decisions
 where reviewer_id=p_actor and request_id=(q->>'requestId')::uuid;
 if found then
  if old.request_payload<>q or old.grant_event_id<>p_grant
  then raise exception 'internal_review_conflict';end if;
  return old.event_payload;
 end if;
 event_id:=pg_catalog.gen_random_uuid();event_time:=clock_timestamp();
 payload:=jsonb_build_object(
  'contractId','internal-source-row-decision-event-v1',
  'decisionId',event_id,'reviewerId',p_actor,'grantEventId',p_grant,
  'request',q,'recordedAt',to_char(event_time at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'sourceReviewOnly',true,'clinicalApproved',false,'rightsApproved',false,
  'examScopeApproved',false,'learnerRelease',false
 );
 insert into evidence_internal.decisions(
  decision_id,reviewer_id,request_id,grant_event_id,request_payload,event_payload,recorded_at
 ) values(event_id,p_actor,(q->>'requestId')::uuid,p_grant,q,payload,event_time);
 return payload;
end;$$;

-- Protected readback rechecks *present* grant / rights / withdrawal.
-- A past event remains immutable but is not exposed after revocation.
create function evidence_internal.read_review(p_actor uuid,p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare old evidence_internal.decisions;
begin
 select * into old from evidence_internal.decisions
 where reviewer_id=p_actor and request_id=p_request;
 if not found then raise exception 'internal_review_denied';end if;
 perform evidence_internal.guard(p_actor,old.request_payload,old.grant_event_id);
 return old.event_payload;
end;$$;
do $$declare t text;begin
 foreach t in array array['packages','cases','grants','decisions'] loop
  execute format('revoke all on evidence_internal.%I from public,anon,authenticated,service_role,evidence_internal_gateway',t);
  execute format('alter table evidence_internal.%I enable row level security',t);
 end loop;
end;$$;
revoke all on all functions in schema evidence_internal from public,anon,authenticated,service_role,evidence_internal_gateway;
grant execute on function evidence_internal.record_review(uuid,jsonb,uuid),
 evidence_internal.read_review(uuid,uuid) to evidence_internal_gateway;
-- Deliberately NO gateway execution of guard() or table DML.
