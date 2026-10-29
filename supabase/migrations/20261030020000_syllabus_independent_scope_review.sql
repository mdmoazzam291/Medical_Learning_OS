-- Scoped reviewer authorization and immutable source/scope decisions.
-- Neither a decision nor a grant activates a preparation registry or publishes learner content.
create table public.content_syllabus_reviewer_grant_events (
 event_id bigint generated always as identity primary key,
 request_id uuid not null unique,
 baseline_id uuid not null,
 reviewer_id uuid not null,
 action text not null check(action in ('grant','revoke')),
 reason text not null check(char_length(reason) between 15 and 2000),
 actor_id uuid not null,
 recorded_at timestamptz not null default now(),
 request_fingerprint text not null
);
create index content_syllabus_reviewer_grants_lookup on public.content_syllabus_reviewer_grant_events(baseline_id,reviewer_id,event_id desc);
alter table public.content_syllabus_reviewer_grant_events enable row level security;
revoke all on public.content_syllabus_reviewer_grant_events from public,anon,authenticated,service_role;
grant select,insert on public.content_syllabus_reviewer_grant_events to service_role;
create trigger content_syllabus_review_grants_immutable before update or delete on public.content_syllabus_reviewer_grant_events
 for each row execute function public.concept_draft_immutable_v1();

create table public.content_syllabus_scope_decisions(
 decision_id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 baseline_id uuid not null,
 revision integer not null,
 draft_digest text not null,
 catalog_version bigint not null,
 registry_version text not null,
 source_version text not null,
 source_evidence_locator text not null,
 source_evidence_sha256 text not null,
 decision text not null check(decision in ('scope-reviewed','changes-required')),
 review_note text not null,
 reviewer_id uuid not null,
 grant_event_id bigint not null references public.content_syllabus_reviewer_grant_events(event_id),
 request_fingerprint text not null,
 receipt_digest text not null,
 recorded_at timestamptz not null default now(),
 unique(baseline_id,revision)
);
alter table public.content_syllabus_scope_decisions enable row level security;
revoke all on public.content_syllabus_scope_decisions from public,anon,authenticated,service_role;
grant select,insert on public.content_syllabus_scope_decisions to service_role;
create trigger content_syllabus_scope_decisions_immutable before update or delete on public.content_syllabus_scope_decisions
 for each row execute function public.concept_draft_immutable_v1();

create function public.syllabus_scope_reviewer_grant_v1(p_actor uuid,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_request uuid;v_baseline uuid;v_reviewer uuid;v_action text;v_reason text;v_fingerprint text;
 v_old public.content_syllabus_reviewer_grant_events;v_new public.content_syllabus_reviewer_grant_events;
 v_latest text;v_author uuid;v_keys text[];
begin
 if public.is_content_admin(p_actor) is not true then raise exception 'content_admin_required';end if;
 if jsonb_typeof(p_input) is distinct from 'object' or pg_column_size(p_input)>5000 then raise exception 'syllabus_scope_grant_invalid';end if;
 select array_agg(k order by k) into v_keys from jsonb_object_keys(p_input) k;
 if v_keys is distinct from array['action','baselineId','reason','requestId','reviewerUserId']
  or jsonb_typeof(p_input->'requestId')<>'string'
  or jsonb_typeof(p_input->'baselineId')<>'string'
  or jsonb_typeof(p_input->'reviewerUserId')<>'string'
  or jsonb_typeof(p_input->'action')<>'string'
  or jsonb_typeof(p_input->'reason')<>'string'
 then raise exception 'syllabus_scope_grant_invalid';end if;
 begin
  v_request:=(p_input->>'requestId')::uuid;v_baseline:=(p_input->>'baselineId')::uuid;
  v_reviewer:=(p_input->>'reviewerUserId')::uuid;
 exception when others then raise exception 'syllabus_scope_grant_invalid';end;
 v_action:=p_input->>'action';v_reason:=btrim(p_input->>'reason');
 if v_action not in('grant','revoke') or char_length(v_reason) not between 15 and 2000
  or v_reviewer=p_actor then raise exception 'syllabus_scope_grant_invalid';end if;
 v_fingerprint:=encode(extensions.digest(convert_to(p_input::text,'UTF8'),'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('syllabus-scope-grant-request:'||v_request::text,0));
 select * into v_old from public.content_syllabus_reviewer_grant_events where request_id=v_request;
 if found then
  if v_old.actor_id<>p_actor or v_old.request_fingerprint<>v_fingerprint
   then raise exception 'syllabus_scope_grant_request_conflict';end if;
  v_new:=v_old;
 else
  perform pg_advisory_xact_lock(hashtextextended('syllabus-scope-grant:'||v_baseline::text||':'||v_reviewer::text,0));
  select submitted_by into v_author from public.content_syllabus_baseline_draft_versions
   where baseline_id=v_baseline order by revision asc limit 1;
  if not found then raise exception 'syllabus_baseline_not_found';end if;
  if v_author=v_reviewer then raise exception 'syllabus_scope_self_review_blocked';end if;
  -- Supabase Auth user existence is checked by the trusted Owner API with\n  -- auth.admin.getUserById before this service-only RPC. Do not grant\n  -- service_role direct SELECT on auth.users (not available in production).
  select action into v_latest from public.content_syllabus_reviewer_grant_events
   where baseline_id=v_baseline and reviewer_id=v_reviewer order by event_id desc limit 1;
  if v_action='grant' and v_latest='grant' or v_action='revoke' and v_latest is distinct from 'grant'
  then raise exception 'syllabus_scope_grant_state_conflict';end if;
  insert into public.content_syllabus_reviewer_grant_events(request_id,baseline_id,reviewer_id,action,reason,actor_id,request_fingerprint)
   values(v_request,v_baseline,v_reviewer,v_action,v_reason,p_actor,v_fingerprint) returning * into v_new;
 end if;
 return jsonb_build_object('contractId','syllabus-scope-grant-event-v1','eventId',v_new.event_id,
  'baselineId',v_new.baseline_id,'reviewerUserId',v_new.reviewer_id,'action',v_new.action,
  'recordedAt',v_new.recorded_at,'learnerRelease',false);
end; $$;
revoke all on function public.syllabus_scope_reviewer_grant_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.syllabus_scope_reviewer_grant_v1(uuid,jsonb) to service_role;

create function public.syllabus_scope_review_inspect_v1(p_reviewer uuid,p_baseline_id uuid,p_revision integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_event public.content_syllabus_reviewer_grant_events;v_draft public.content_syllabus_baseline_draft_versions;
 v_author uuid;v_latest int;v_decision public.content_syllabus_scope_decisions;
 v_catalog_version bigint;v_catalog jsonb;v_private jsonb;v_private_valid boolean;
begin
 if p_reviewer is null or p_baseline_id is null or p_revision not between 1 and 10000
 then raise exception 'syllabus_scope_review_invalid';end if;
 select * into v_event from public.content_syllabus_reviewer_grant_events
  where baseline_id=p_baseline_id and reviewer_id=p_reviewer order by event_id desc limit 1;
 if not found or v_event.action<>'grant' then raise exception 'syllabus_scope_reviewer_not_authorized';end if;
 select * into v_draft from public.content_syllabus_baseline_draft_versions
  where baseline_id=p_baseline_id and revision=p_revision;
 if not found then raise exception 'syllabus_baseline_not_found';end if;
 if v_draft.submitted_by=p_reviewer then raise exception 'syllabus_scope_self_review_blocked';end if;
 select max(revision) into v_latest from public.content_syllabus_baseline_draft_versions where baseline_id=p_baseline_id;
 select body,version into v_catalog,v_catalog_version from public.study_catalog where id=1;
 if v_catalog is null or jsonb_typeof(v_catalog->'concepts') is distinct from 'array'
 then raise exception 'syllabus_scope_review_stale';end if;
 -- A reviewer may evaluate only exact, immutable identities in this baseline:
 -- canonical IDs must be present in the shared catalog; private IDs must have
 -- an exact frozen binding to an accepted (but learner-unpublished) identity.
 select not exists(
  select 1 from jsonb_array_elements_text(v_draft.document->'conceptIds') requested(concept_id)
  where not exists(select 1 from jsonb_array_elements(v_catalog->'concepts') catalog(concept)
                   where catalog.concept->>'conceptId'=requested.concept_id)
    and not exists(
      select 1 from jsonb_array_elements(coalesce(v_draft.private_identity_bindings,'[]'::jsonb)) pinned(value)
      join public.content_concept_acceptances accepted
        on accepted.concept_id=pinned.value->>'conceptId'
       and accepted.accepted_identity_digest=pinned.value->>'identityDigest'
       and accepted.accepted_document->>'conceptId'=accepted.concept_id
      where accepted.concept_id=requested.concept_id)
 ) and not exists(
  select 1 from jsonb_array_elements(coalesce(v_draft.private_identity_bindings,'[]'::jsonb)) pinned(value)
  where not exists(select 1 from jsonb_array_elements_text(v_draft.document->'conceptIds') requested(value)
                   where requested.value=pinned.value->>'conceptId')
     or not exists(select 1 from public.content_concept_acceptances accepted
                   where accepted.concept_id=pinned.value->>'conceptId'
                     and accepted.accepted_identity_digest=pinned.value->>'identityDigest'
                     and accepted.accepted_document->>'conceptId'=accepted.concept_id)
 ) into v_private_valid;
 -- Only scoped, grant-authorized reviewer can receive frozen private identities.
 select coalesce(jsonb_agg(jsonb_build_object('conceptId',accepted.concept_id,
  'identityDigest',accepted.accepted_identity_digest,
  'identity',accepted.accepted_document) order by accepted.concept_id),'[]'::jsonb)
 into v_private
 from jsonb_array_elements(coalesce(v_draft.private_identity_bindings,'[]'::jsonb)) pinned(value)
 join public.content_concept_acceptances accepted
   on accepted.concept_id=pinned.value->>'conceptId'
  and accepted.accepted_identity_digest=pinned.value->>'identityDigest';
 select * into v_decision from public.content_syllabus_scope_decisions where baseline_id=p_baseline_id and revision=p_revision;
 return jsonb_build_object('contractId','syllabus-scope-review-target-v1','baselineId',v_draft.baseline_id,
  'revision',v_draft.revision,'digest',v_draft.digest,'authorId',v_draft.submitted_by,
  'registryVersion',v_draft.registry_version,'catalogVersion',v_draft.catalog_version,
  'currentCatalogVersion',v_catalog_version,'isLatest',v_latest=v_draft.revision,
  'pathwayVersionId',v_draft.pathway_version_id,'document',v_draft.document,'reviewerId',p_reviewer,
  'privateIdentities',v_private,'privateIdentityVerified',v_private_valid,
  'canReview',v_latest=v_draft.revision and v_draft.catalog_version=v_catalog_version
    and v_private_valid and v_decision.decision_id is null,
  'existingDecision',case when v_decision.decision_id is null then null else jsonb_build_object(
   'decisionId',v_decision.decision_id,'decision',v_decision.decision,'receiptDigest',v_decision.receipt_digest,
   'recordedAt',v_decision.recorded_at) end,
  'officialSyllabusCertified',false,'learnerRelease',false,'curriculumActivated',false);
end; $$;
revoke all on function public.syllabus_scope_review_inspect_v1(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.syllabus_scope_review_inspect_v1(uuid,uuid,integer) to service_role;

create function public.syllabus_scope_review_decide_v1(p_reviewer uuid,p_registry_version text,p_input jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_request uuid;v_baseline uuid;v_revision integer;v_keys text[];v_fingerprint text;
 v_draft public.content_syllabus_baseline_draft_versions;v_saved public.content_syllabus_scope_decisions;
 v_grant public.content_syllabus_reviewer_grant_events;v_catalog_version bigint;
 v_catalog jsonb;v_private_valid boolean;v_latest integer;v_receipt text;
begin
 if jsonb_typeof(p_input) is distinct from 'object' or pg_column_size(p_input)>12000 then raise exception 'syllabus_scope_review_invalid';end if;
 select array_agg(k order by k) into v_keys from jsonb_object_keys(p_input) k;
 if v_keys is distinct from array['attestationVersion','baselineId','decision','digest','evidenceLocator','evidenceSha256','note','requestId','revision']
  or jsonb_typeof(p_input->'requestId')<>'string'
  or jsonb_typeof(p_input->'baselineId')<>'string'
  or jsonb_typeof(p_input->'revision')<>'number'
  or jsonb_typeof(p_input->'digest')<>'string'
  or jsonb_typeof(p_input->'evidenceLocator')<>'string'
  or jsonb_typeof(p_input->'evidenceSha256')<>'string'
  or jsonb_typeof(p_input->'note')<>'string'
  or jsonb_typeof(p_input->'decision')<>'string'
  or p_input->>'attestationVersion' is distinct from 'independent-syllabus-scope-review-v1'
 then raise exception 'syllabus_scope_review_invalid';end if;
 begin v_request:=(p_input->>'requestId')::uuid;v_baseline:=(p_input->>'baselineId')::uuid;
  v_revision:=(p_input->>'revision')::integer;
 exception when others then raise exception 'syllabus_scope_review_invalid';end;
 if v_revision not between 1 and 10000 or p_input->>'digest' !~ '^[0-9a-f]{64}$'
  or p_input->>'evidenceSha256' !~ '^[0-9a-f]{64}$'
  or char_length(btrim(p_input->>'evidenceLocator')) not between 8 and 2000
  or char_length(btrim(p_input->>'note')) not between 24 and 2000
  or p_input->>'decision' not in ('scope-reviewed','changes-required')
 then raise exception 'syllabus_scope_review_invalid';end if;
 v_fingerprint:=encode(extensions.digest(convert_to(p_input::text,'UTF8'),'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('syllabus-scope-review-request:'||v_request::text,0));
 select * into v_saved from public.content_syllabus_scope_decisions where request_id=v_request;
 if found then
  if v_saved.reviewer_id<>p_reviewer or v_saved.request_fingerprint<>v_fingerprint then
   raise exception 'syllabus_scope_review_request_conflict';end if;
 else
  perform pg_advisory_xact_lock(hashtextextended('syllabus-scope-decision:'||v_baseline::text||':'||v_revision::text,0));
  -- Serialize new decisions with concurrent grant/revoke events for this same
  -- reviewer and baseline; a completed revocation cannot race an approval.
  perform pg_advisory_xact_lock(hashtextextended(
    'syllabus-scope-grant:'||v_baseline::text||':'||p_reviewer::text,0));
  select * into v_grant from public.content_syllabus_reviewer_grant_events
    where baseline_id=v_baseline and reviewer_id=p_reviewer order by event_id desc limit 1;
  if not found or v_grant.action<>'grant' then raise exception 'syllabus_scope_reviewer_not_authorized';end if;
  select * into v_draft from public.content_syllabus_baseline_draft_versions
   where baseline_id=v_baseline and revision=v_revision;
  if not found then raise exception 'syllabus_baseline_not_found';end if;
  if v_draft.submitted_by=p_reviewer then raise exception 'syllabus_scope_self_review_blocked';end if;
  select max(revision) into v_latest from public.content_syllabus_baseline_draft_versions where baseline_id=v_baseline;
  perform pg_advisory_xact_lock(hashtextextended('content-library-publication',0));
  select body,version into v_catalog,v_catalog_version from public.study_catalog where id=1;
  if v_catalog is null or jsonb_typeof(v_catalog->'concepts') is distinct from 'array'
  then raise exception 'syllabus_scope_review_stale';end if;
 -- A reviewer may evaluate only exact, immutable identities in this baseline:
 -- canonical IDs must be present in the shared catalog; private IDs must have
 -- an exact frozen binding to an accepted (but learner-unpublished) identity.
 select not exists(
  select 1 from jsonb_array_elements_text(v_draft.document->'conceptIds') requested(concept_id)
  where not exists(select 1 from jsonb_array_elements(v_catalog->'concepts') catalog(concept)
                   where catalog.concept->>'conceptId'=requested.concept_id)
    and not exists(
      select 1 from jsonb_array_elements(coalesce(v_draft.private_identity_bindings,'[]'::jsonb)) pinned(value)
      join public.content_concept_acceptances accepted
        on accepted.concept_id=pinned.value->>'conceptId'
       and accepted.accepted_identity_digest=pinned.value->>'identityDigest'
       and accepted.accepted_document->>'conceptId'=accepted.concept_id
      where accepted.concept_id=requested.concept_id)
 ) and not exists(
  select 1 from jsonb_array_elements(coalesce(v_draft.private_identity_bindings,'[]'::jsonb)) pinned(value)
  where not exists(select 1 from jsonb_array_elements_text(v_draft.document->'conceptIds') requested(value)
                   where requested.value=pinned.value->>'conceptId')
     or not exists(select 1 from public.content_concept_acceptances accepted
                   where accepted.concept_id=pinned.value->>'conceptId'
                     and accepted.accepted_identity_digest=pinned.value->>'identityDigest'
                     and accepted.accepted_document->>'conceptId'=accepted.concept_id)
 ) into v_private_valid;
  if v_latest<>v_revision or v_draft.digest<>p_input->>'digest'
     or v_catalog_version is distinct from v_draft.catalog_version
     or v_draft.registry_version is distinct from p_registry_version
  then raise exception 'syllabus_scope_review_stale';end if;
  if jsonb_array_length(v_draft.document->'conceptIds')=0 and p_input->>'decision'='scope-reviewed'
  then raise exception 'syllabus_scope_review_empty';end if;
  if p_input->>'decision'='scope-reviewed' and not v_private_valid
  then raise exception 'syllabus_scope_private_identity_unverified';end if;
  if exists(select 1 from public.content_syllabus_scope_decisions
   where baseline_id=v_baseline and revision=v_revision)
  then raise exception 'syllabus_scope_review_already_recorded';end if;
  v_receipt:=encode(extensions.digest(convert_to(jsonb_build_object('baselineId',v_baseline,
   'revision',v_revision,'draftDigest',v_draft.digest,'registryVersion',v_draft.registry_version,
   'reviewerId',p_reviewer,'decision',p_input->>'decision','evidenceLocator',p_input->>'evidenceLocator',
   'evidenceSha256',p_input->>'evidenceSha256','note',p_input->>'note')::text,'UTF8'),'sha256'),'hex');
  insert into public.content_syllabus_scope_decisions(request_id,baseline_id,revision,draft_digest,catalog_version,
   registry_version,source_version,source_evidence_locator,source_evidence_sha256,decision,review_note,
   reviewer_id,grant_event_id,request_fingerprint,receipt_digest)
  values(v_request,v_baseline,v_revision,v_draft.digest,v_catalog_version,v_draft.registry_version,
   v_draft.document->>'sourceVersion',p_input->>'evidenceLocator',p_input->>'evidenceSha256',
   p_input->>'decision',p_input->>'note',p_reviewer,v_grant.event_id,v_fingerprint,v_receipt)
  returning * into v_saved;
 end if;
 return jsonb_build_object('contractId','syllabus-scope-review-receipt-v1','decisionId',v_saved.decision_id,
  'baselineId',v_saved.baseline_id,'revision',v_saved.revision,'draftDigest',v_saved.draft_digest,
  'decision',v_saved.decision,'receiptDigest',v_saved.receipt_digest,'reviewerId',v_saved.reviewer_id,
  'recordedAt',v_saved.recorded_at,'scopeReviewOnly',true,'officialSyllabusCertified',false,
  'curriculumActivated',false,'learnerRelease',false);
end; $$;
revoke all on function public.syllabus_scope_review_decide_v1(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.syllabus_scope_review_decide_v1(uuid,text,jsonb) to service_role;
