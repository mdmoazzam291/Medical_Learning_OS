-- M11f1: immutable activation authorization for the preregistered retention-feasibility protocol.
-- This is governance evidence only. It does not schedule probes, assign content, alter Study Now,
-- or enable mastery/forgetting inference.

create table if not exists public.study_retention_probe_activation_events (
  id uuid primary key default gen_random_uuid(),
  protocol_id text not null references public.study_retention_probe_protocols(protocol_id) on delete restrict,
  protocol_sha256 text not null check (protocol_sha256 ~ '^[0-9a-f]{64}$'),
  pair_validation_id uuid not null references public.study_transfer_pair_validations(id) on delete restrict,
  pair_validation_sha256 text not null check (pair_validation_sha256 ~ '^[0-9a-f]{64}$'),
  decision text not null check (decision in ('authorize','revoke')),
  authorizer_id uuid not null references auth.users(id) on delete restrict,
  max_total_assignments integer,
  max_assignments_per_learner_per_7_days integer,
  authorization_valid_until timestamptz,
  rationale text not null check (char_length(btrim(rationale)) between 20 and 4000),
  attestation_version text not null check (
    attestation_version='retention-probe-activation-authorization-v1'
  ),
  event_sha256 text not null check (event_sha256 ~ '^[0-9a-f]{64}$'),
  recorded_at timestamptz not null default now(),
  constraint study_retention_probe_activation_event_semantics check (
    (
      decision='authorize'
      and max_total_assignments is not null
      and max_total_assignments between 1 and 20
      and max_assignments_per_learner_per_7_days is not null
      and max_assignments_per_learner_per_7_days between 1 and 1
      and authorization_valid_until is not null
    )
    or
    (
      decision='revoke'
      and max_total_assignments is null
      and max_assignments_per_learner_per_7_days is null
      and authorization_valid_until is null
    )
  ),
  unique (event_sha256)
);

create index if not exists study_retention_probe_activation_events_scope_idx
  on public.study_retention_probe_activation_events
  (protocol_id, pair_validation_id, recorded_at desc, id desc);

alter table public.study_retention_probe_activation_events enable row level security;
revoke all on table public.study_retention_probe_activation_events
  from public, anon, authenticated, service_role;
grant select, insert on table public.study_retention_probe_activation_events
  to service_role;

create or replace function public.block_retention_probe_activation_event_mutation()
returns trigger
language plpgsql
set search_path=''
as $function$
begin
  raise exception using
    errcode='55000',
    message='retention_probe_activation_event_is_immutable';
end;
$function$;

revoke all on function public.block_retention_probe_activation_event_mutation()
  from public, anon, authenticated, service_role;

drop trigger if exists study_retention_probe_activation_events_append_only
  on public.study_retention_probe_activation_events;
create trigger study_retention_probe_activation_events_append_only
before update or delete on public.study_retention_probe_activation_events
for each row execute function public.block_retention_probe_activation_event_mutation();

create or replace function public.study_retention_probe_current_opt_in_population_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $function$
with protocol as (
  select p.protocol_id, p.protocol_sha256
  from public.study_retention_probe_protocols p
  where p.protocol_id='retention-probe-feasibility-v1'
    and p.status='preregistered'
  limit 1
),
latest as (
  select distinct on (e.learner_id)
    e.learner_id,
    e.decision
  from public.study_retention_probe_consent_events e
  join protocol p
    on p.protocol_id=e.protocol_id
   and p.protocol_sha256=e.protocol_sha256
  order by e.learner_id, e.recorded_at desc, e.id desc
)
select pg_catalog.jsonb_build_object(
  'contractId','study-retention-probe-current-opt-in-population-v1',
  'activeOptedInLearners',count(*) filter (where decision='opt_in')::integer,
  'schedulerAuthority',false,
  'activationAuthority',false
)
from latest;
$function$;

revoke all on function public.study_retention_probe_current_opt_in_population_v1()
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_current_opt_in_population_v1()
  to service_role;

create or replace function public.study_retention_probe_activation_authorization_readiness_v1()
returns jsonb
language plpgsql
stable
security invoker
set search_path=''
as $function$
declare
  v_protocol public.study_retention_probe_protocols%rowtype;
  v_opt_in_count integer := 0;
  v_current_pair_count integer := 0;
  v_current_pair_ids jsonb := '[]'::jsonb;
  v_active_authorization public.study_retention_probe_activation_events%rowtype;
begin
  select *
  into v_protocol
  from public.study_retention_probe_protocols p
  where p.protocol_id='retention-probe-feasibility-v1'
    and p.status='preregistered'
  limit 1;

  select coalesce(
    (public.study_retention_probe_current_opt_in_population_v1()
      ->>'activeOptedInLearners')::integer,
    0
  )
  into v_opt_in_count;

  select
    count(*)::integer,
    coalesce(pg_catalog.jsonb_agg(v.id order by v.validated_at, v.id), '[]'::jsonb)
  into v_current_pair_count, v_current_pair_ids
  from public.study_transfer_pair_validations v
  join lateral (
    select q
    from public.study_catalog c
    cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
    where c.id=1 and q->>'questionVersionId'=v.question_a_version_id
    limit 1
  ) qa on true
  join lateral (
    select q
    from public.study_catalog c
    cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
    where c.id=1 and q->>'questionVersionId'=v.question_b_version_id
    limit 1
  ) qb on true
  where v.decision='validated'
    and v.transfer_evidence_valid
    and v.retention_probe_comparable
    and qa.q->>'status'='published'
    and qb.q->>'status'='published'
    and public.current_review_target_sha256(v.question_a_version_id,'medical')=v.question_a_medical_sha256
    and public.current_review_target_sha256(v.question_b_version_id,'medical')=v.question_b_medical_sha256;

  select e.*
  into v_active_authorization
  from public.study_retention_probe_activation_events e
  where v_protocol.protocol_id is not null
    and e.protocol_id=v_protocol.protocol_id
    and e.protocol_sha256=v_protocol.protocol_sha256
  order by e.recorded_at desc, e.id desc
  limit 1;

  return pg_catalog.jsonb_build_object(
    'contractId','study-retention-probe-activation-authorization-readiness-v1',
    'protocolAvailable',v_protocol.protocol_id is not null,
    'currentRetentionComparablePairs',v_current_pair_count,
    'eligiblePairValidationIds',v_current_pair_ids,
    'recommendedPairValidationId',case
      when v_current_pair_count=1 then v_current_pair_ids->>0
      else null
    end,
    'activeOptedInLearners',v_opt_in_count,
    'currentAuthorization',case
      when v_active_authorization.id is null then null
      else pg_catalog.jsonb_build_object(
        'activationEventId',v_active_authorization.id,
        'decision',v_active_authorization.decision,
        'pairValidationId',v_active_authorization.pair_validation_id,
        'maxTotalAssignments',v_active_authorization.max_total_assignments,
        'maxAssignmentsPerLearnerPer7Days',v_active_authorization.max_assignments_per_learner_per_7_days,
        'authorizationValidUntil',v_active_authorization.authorization_valid_until,
        'recordedAt',v_active_authorization.recorded_at
      )
    end,
    'readiness',pg_catalog.jsonb_build_object(
      'canAuthorize',
        v_protocol.protocol_id is not null
        and v_current_pair_count > 0
        and v_opt_in_count > 0
        and not (
          v_active_authorization.id is not null
          and v_active_authorization.decision='authorize'
          and v_active_authorization.authorization_valid_until > pg_catalog.now()
        ),
      'canRevoke',
        v_active_authorization.id is not null
        and v_active_authorization.decision='authorize'
        and v_active_authorization.authorization_valid_until > pg_catalog.now(),
      'blockingReasons',
        (case when v_protocol.protocol_id is null
          then '["retention-probe-protocol-not-preregistered"]'::jsonb
          else '[]'::jsonb end)
        ||
        (case when v_current_pair_count = 0
          then '["validated-retention-comparable-pair-required"]'::jsonb
          else '[]'::jsonb end)
        ||
        (case when v_opt_in_count = 0
          then '["at-least-one-currently-opted-in-learner-required"]'::jsonb
          else '[]'::jsonb end)
    ),
    'authority',pg_catalog.jsonb_build_object(
      'authorizationRecordMayBeIssued',true,
      'probeSchedulingEnabled',false,
      'studyNowAuthority',false,
      'masteryInferenceAuthority',false
    )
  );
end;
$function$;

revoke all on function public.study_retention_probe_activation_authorization_readiness_v1()
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_activation_authorization_readiness_v1()
  to service_role;

create or replace function public.record_retention_probe_activation_authorization_v1(
  p_authorizer uuid,
  p_decision text,
  p_pair_validation_id uuid,
  p_protocol_sha256 text,
  p_max_total_assignments integer,
  p_max_assignments_per_learner_per_7_days integer,
  p_authorization_valid_until timestamptz,
  p_rationale text,
  p_attestation_version text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_protocol public.study_retention_probe_protocols%rowtype;
  v_pair public.study_transfer_pair_validations%rowtype;
  v_latest public.study_retention_probe_activation_events%rowtype;
  v_event public.study_retention_probe_activation_events%rowtype;
  v_opt_in_count integer := 0;
  v_protocol_max_total integer;
  v_protocol_max_per_7_days integer;
  v_body jsonb;
  v_hash text;
  v_a jsonb;
  v_b jsonb;
begin
  if not public.is_content_admin(p_authorizer) then
    raise exception using errcode='42501', message='content_admin_required';
  end if;

  if p_decision not in ('authorize','revoke') then
    raise exception using errcode='22023', message='invalid_retention_probe_activation_decision';
  end if;

  if p_attestation_version <> 'retention-probe-activation-authorization-v1' then
    raise exception using errcode='22023', message='retention_probe_activation_attestation_required';
  end if;

  if char_length(btrim(coalesce(p_rationale,''))) not between 20 and 4000 then
    raise exception using errcode='22023', message='invalid_retention_probe_activation_rationale';
  end if;

  select *
  into v_protocol
  from public.study_retention_probe_protocols p
  where p.protocol_id='retention-probe-feasibility-v1'
    and p.status='preregistered'
  limit 1;

  if v_protocol.protocol_id is null then
    raise exception using errcode='55000', message='retention_probe_protocol_unavailable';
  end if;

  if p_protocol_sha256 <> v_protocol.protocol_sha256 then
    raise exception using errcode='55000', message='retention_probe_protocol_changed';
  end if;

  select *
  into v_pair
  from public.study_transfer_pair_validations v
  where v.id=p_pair_validation_id
  limit 1;

  if v_pair.id is null then
    raise exception using errcode='22023', message='retention_probe_pair_validation_not_found';
  end if;

  select q into v_a
  from public.study_catalog c
  cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
  where c.id=1 and q->>'questionVersionId'=v_pair.question_a_version_id
  limit 1;

  select q into v_b
  from public.study_catalog c
  cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
  where c.id=1 and q->>'questionVersionId'=v_pair.question_b_version_id
  limit 1;

  select coalesce(
    (public.study_retention_probe_current_opt_in_population_v1()
      ->>'activeOptedInLearners')::integer,
    0
  )
  into v_opt_in_count;

  select e.*
  into v_latest
  from public.study_retention_probe_activation_events e
  where e.protocol_id=v_protocol.protocol_id
    and e.protocol_sha256=v_protocol.protocol_sha256
  order by e.recorded_at desc, e.id desc
  limit 1;

  if p_decision='authorize' then
    if v_pair.decision<>'validated'
       or not v_pair.transfer_evidence_valid
       or not v_pair.retention_probe_comparable
       or v_a is null
       or v_b is null
       or v_a->>'status'<>'published'
       or v_b->>'status'<>'published'
       or public.current_review_target_sha256(v_pair.question_a_version_id,'medical')<>v_pair.question_a_medical_sha256
       or public.current_review_target_sha256(v_pair.question_b_version_id,'medical')<>v_pair.question_b_medical_sha256 then
      raise exception using errcode='55000', message='current_retention_comparable_pair_required';
    end if;

    if v_opt_in_count < 1 then
      raise exception using errcode='55000', message='current_opted_in_learner_required';
    end if;

    if v_latest.id is not null
       and v_latest.decision='authorize'
       and v_latest.authorization_valid_until > pg_catalog.now() then
      raise exception using errcode='55000', message='retention_probe_already_authorized';
    end if;

    v_protocol_max_total := (v_protocol.protocol_body->'assignment'->>'maxTotalAssignments')::integer;
    v_protocol_max_per_7_days :=
      (v_protocol.protocol_body->'assignment'->>'maxProbeAssignmentsPerLearnerPer7Days')::integer;

    if p_max_total_assignments is null
       or p_max_total_assignments < 1
       or p_max_total_assignments > v_protocol_max_total then
      raise exception using errcode='22023', message='retention_probe_assignment_cap_invalid';
    end if;

    if p_max_assignments_per_learner_per_7_days is null
       or p_max_assignments_per_learner_per_7_days < 1
       or p_max_assignments_per_learner_per_7_days > v_protocol_max_per_7_days then
      raise exception using errcode='22023', message='retention_probe_per_learner_cap_invalid';
    end if;

    if p_authorization_valid_until is null
       or p_authorization_valid_until <= pg_catalog.now()
       or p_authorization_valid_until > pg_catalog.now() + interval '56 days' then
      raise exception using errcode='22023', message='retention_probe_authorization_window_invalid';
    end if;
  else
    if v_latest.id is null
       or v_latest.decision<>'authorize'
       or v_latest.authorization_valid_until <= pg_catalog.now() then
      raise exception using errcode='55000', message='no_active_retention_probe_authorization';
    end if;

    if v_latest.pair_validation_id<>v_pair.id then
      raise exception using errcode='55000', message='retention_probe_authorization_pair_changed';
    end if;
  end if;

  v_body := pg_catalog.jsonb_build_object(
    'contractVersion',1,
    'protocolId',v_protocol.protocol_id,
    'protocolSha256',v_protocol.protocol_sha256,
    'pairValidationId',v_pair.id,
    'pairValidationSha256',v_pair.validation_sha256,
    'decision',p_decision,
    'authorizerId',p_authorizer,
    'maxTotalAssignments',case when p_decision='authorize' then p_max_total_assignments else null end,
    'maxAssignmentsPerLearnerPer7Days',
      case when p_decision='authorize' then p_max_assignments_per_learner_per_7_days else null end,
    'authorizationValidUntil',
      case when p_decision='authorize' then p_authorization_valid_until else null end,
    'rationale',btrim(p_rationale),
    'attestationVersion',p_attestation_version
  );

  v_hash := encode(
    extensions.digest(pg_catalog.convert_to(v_body::text,'UTF8'),'sha256'),
    'hex'
  );

  insert into public.study_retention_probe_activation_events (
    protocol_id,
    protocol_sha256,
    pair_validation_id,
    pair_validation_sha256,
    decision,
    authorizer_id,
    max_total_assignments,
    max_assignments_per_learner_per_7_days,
    authorization_valid_until,
    rationale,
    attestation_version,
    event_sha256
  )
  values (
    v_protocol.protocol_id,
    v_protocol.protocol_sha256,
    v_pair.id,
    v_pair.validation_sha256,
    p_decision,
    p_authorizer,
    case when p_decision='authorize' then p_max_total_assignments else null end,
    case when p_decision='authorize' then p_max_assignments_per_learner_per_7_days else null end,
    case when p_decision='authorize' then p_authorization_valid_until else null end,
    btrim(p_rationale),
    p_attestation_version,
    v_hash
  )
  returning * into v_event;

  return pg_catalog.jsonb_build_object(
    'contractId','retention-probe-activation-authorization-receipt-v1',
    'activationEventId',v_event.id,
    'decision',v_event.decision,
    'protocolId',v_event.protocol_id,
    'protocolSha256',v_event.protocol_sha256,
    'pairValidationId',v_event.pair_validation_id,
    'pairValidationSha256',v_event.pair_validation_sha256,
    'maxTotalAssignments',v_event.max_total_assignments,
    'maxAssignmentsPerLearnerPer7Days',v_event.max_assignments_per_learner_per_7_days,
    'authorizationValidUntil',v_event.authorization_valid_until,
    'recordedAt',v_event.recorded_at,
    'eventSha256',v_event.event_sha256,
    'probeSchedulingEnabled',false,
    'studyNowAuthority',false,
    'masteryInferenceAuthority',false
  );
end;
$function$;

revoke all on function public.record_retention_probe_activation_authorization_v1(
  uuid,text,uuid,text,integer,integer,timestamptz,text,text
) from public, anon, authenticated;
grant execute on function public.record_retention_probe_activation_authorization_v1(
  uuid,text,uuid,text,integer,integer,timestamptz,text,text
) to service_role;

create or replace function public.study_retention_probe_activation_readiness_v1()
returns jsonb
language plpgsql
stable
security invoker
set search_path=''
as $function$
declare
  v_content jsonb;
  v_protocol jsonb;
  v_pairs jsonb;
  v_authorization jsonb;
  v_has_pair boolean;
  v_has_protocol boolean;
  v_has_validated_pair boolean;
  v_active_opt_in_count integer;
  v_current_authorization jsonb;
  v_has_active_authorization boolean;
begin
  v_content := public.study_retention_probe_readiness_v1();
  v_protocol := public.study_retention_probe_protocol_v1();
  v_pairs := public.study_transfer_pair_validation_readiness_v1();
  v_authorization := public.study_retention_probe_activation_authorization_readiness_v1();

  v_has_pair := coalesce(
    (v_content->'readiness'->>'hasAnyPublishedAlternateItemPair')::boolean,
    false
  );
  v_has_protocol := v_protocol is not null;
  v_has_validated_pair := coalesce(
    (v_pairs->'readiness'->>'validatedRetentionProbePairMetadataAvailable')::boolean,
    false
  );
  v_active_opt_in_count := coalesce(
    (v_authorization->>'activeOptedInLearners')::integer,
    0
  );
  v_current_authorization := v_authorization->'currentAuthorization';
  v_has_active_authorization := coalesce(
    (v_authorization->'readiness'->>'canRevoke')::boolean,
    false
  );

  return pg_catalog.jsonb_build_object(
    'contractId','study-retention-probe-activation-readiness-v1',
    'contentReadiness',v_content,
    'protocol',v_protocol,
    'pairValidationReadiness',v_pairs,
    'activationAuthorizationReadiness',v_authorization,
    'readiness',pg_catalog.jsonb_build_object(
      'hasPublishedAlternateItemPair',v_has_pair,
      'protocolPreregistered',v_has_protocol,
      'validatedPairMetadataAvailable',v_has_validated_pair,
      'learnerOptInPathAvailable',true,
      'activeOptedInLearners',v_active_opt_in_count,
      'activationAuthorizationAvailable',v_has_active_authorization,
      'canActivate',false,
      'blockingReasons',
        (case when not v_has_pair
          then '["no-published-alternate-item-pair"]'::jsonb
          else '[]'::jsonb end)
        ||
        (case when not v_has_protocol
          then '["retention-probe-protocol-not-preregistered"]'::jsonb
          else '[]'::jsonb end)
        ||
        (case when not v_has_validated_pair
          then '["validated-alternate-pair-metadata-not-yet-available"]'::jsonb
          else '[]'::jsonb end)
        ||
        (case when v_active_opt_in_count < 1
          then '["at-least-one-currently-opted-in-learner-required"]'::jsonb
          else '[]'::jsonb end)
        ||
        (case when not v_has_active_authorization
          then '["separate-activation-authorization-required"]'::jsonb
          else '[]'::jsonb end)
        ||
        '["bounded-probe-scheduler-not-implemented"]'::jsonb
    ),
    'activationAuthority',v_has_active_authorization,
    'probeSchedulingEnabled',false,
    'studyNowAuthority',false,
    'masteryInferenceAuthority',false
  );
end;
$function$;

revoke all on function public.study_retention_probe_activation_readiness_v1()
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_activation_readiness_v1()
  to service_role;
