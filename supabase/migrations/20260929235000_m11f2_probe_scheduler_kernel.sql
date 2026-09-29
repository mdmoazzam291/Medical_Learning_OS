-- M11f2: dormant, bounded retention-probe scheduler kernel.
-- No cron or learner delivery path is enabled here. The kernel only creates an immutable
-- assignment when every research, consent, content, timing and workload gate is current.

create table if not exists public.study_retention_probe_assignments (
  assignment_id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  protocol_id text not null references public.study_retention_probe_protocols(protocol_id) on delete restrict,
  protocol_sha256 text not null check (protocol_sha256 ~ '^[0-9a-f]{64}$'),
  activation_event_id uuid not null references public.study_retention_probe_activation_events(id) on delete restrict,
  pair_validation_id uuid not null references public.study_transfer_pair_validations(id) on delete restrict,
  pair_validation_sha256 text not null check (pair_validation_sha256 ~ '^[0-9a-f]{64}$'),
  concept_id text not null,
  origin_attempt_id uuid not null references public.study_attempts(id) on delete restrict,
  origin_question_version_id text not null,
  target_question_version_id text not null,
  origin_attempted_at timestamptz not null,
  window_open_at timestamptz not null,
  window_close_at timestamptz not null,
  scheduled_at timestamptz not null default now(),
  assignment_sha256 text not null check (assignment_sha256 ~ '^[0-9a-f]{64}$'),
  constraint study_retention_probe_assignment_versions_distinct
    check (origin_question_version_id <> target_question_version_id),
  constraint study_retention_probe_assignment_window_valid
    check (
      origin_attempted_at < window_open_at
      and window_open_at < window_close_at
      and scheduled_at >= window_open_at
      and scheduled_at <= window_close_at
    ),
  unique (learner_id, protocol_id, origin_attempt_id, target_question_version_id),
  unique (assignment_sha256)
);

create index if not exists study_retention_probe_assignments_learner_scheduled_idx
  on public.study_retention_probe_assignments (learner_id, scheduled_at desc, assignment_id desc);

create index if not exists study_retention_probe_assignments_protocol_scheduled_idx
  on public.study_retention_probe_assignments (protocol_id, scheduled_at, assignment_id);

alter table public.study_retention_probe_assignments enable row level security;
revoke all on table public.study_retention_probe_assignments
  from public, anon, authenticated, service_role;
grant select, insert on table public.study_retention_probe_assignments
  to service_role;

drop trigger if exists study_retention_probe_assignments_append_only
  on public.study_retention_probe_assignments;
create trigger study_retention_probe_assignments_append_only
before update or delete on public.study_retention_probe_assignments
for each row execute function public.prevent_learner_evidence_mutation();

create or replace function public.study_retention_probe_scheduler_candidates_v1(
  p_now timestamptz default pg_catalog.now()
)
returns table (
  learner_id uuid,
  protocol_id text,
  protocol_sha256 text,
  activation_event_id uuid,
  pair_validation_id uuid,
  pair_validation_sha256 text,
  concept_id text,
  origin_attempt_id uuid,
  origin_question_version_id text,
  target_question_version_id text,
  origin_attempted_at timestamptz,
  window_open_at timestamptz,
  window_close_at timestamptz
)
language sql
stable
security invoker
set search_path=''
as $function$
with protocol as (
  select
    p.protocol_id,
    p.protocol_sha256,
    p.protocol_body,
    (p.protocol_body->'primaryHorizon'->>'windowStartDays')::integer as window_start_days,
    (p.protocol_body->'primaryHorizon'->>'windowEndDays')::integer as window_end_days,
    (p.protocol_body->'assignment'->>'maxTotalAssignments')::integer as protocol_max_total,
    (p.protocol_body->'assignment'->>'maxProbeAssignmentsPerLearnerPer7Days')::integer as max_per_7_days,
    (p.protocol_body->'assignment'->>'maxStudyWindowDaysFromFirstAssignment')::integer as max_study_days
  from public.study_retention_probe_protocols p
  where p.protocol_id='retention-probe-feasibility-v1'
    and p.status='preregistered'
  limit 1
),
latest_activation as (
  select e.*
  from public.study_retention_probe_activation_events e
  join protocol p
    on p.protocol_id=e.protocol_id
   and p.protocol_sha256=e.protocol_sha256
  order by e.recorded_at desc, e.id desc
  limit 1
),
active_authorization as (
  select e.*
  from latest_activation e
  where e.decision='authorize'
    and e.authorization_valid_until > p_now
),
pair as (
  select
    v.*,
    a.id as activation_event_id,
    a.max_total_assignments as authorization_max_total,
    a.max_assignments_per_learner_per_7_days as authorization_max_per_7_days,
    a.recorded_at as authorization_recorded_at
  from active_authorization a
  join public.study_transfer_pair_validations v
    on v.id=a.pair_validation_id
   and v.validation_sha256=a.pair_validation_sha256
  where v.decision='validated'
    and v.transfer_evidence_valid
    and v.retention_probe_comparable
),
current_pair as (
  select p.*
  from pair p
  join lateral (
    select q
    from public.study_catalog c
    cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
    where c.id=1
      and q->>'questionVersionId'=p.question_a_version_id
    limit 1
  ) qa on true
  join lateral (
    select q
    from public.study_catalog c
    cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
    where c.id=1
      and q->>'questionVersionId'=p.question_b_version_id
    limit 1
  ) qb on true
  where qa.q->>'status'='published'
    and qb.q->>'status'='published'
    and public.current_review_target_sha256(p.question_a_version_id,'medical')=p.question_a_medical_sha256
    and public.current_review_target_sha256(p.question_b_version_id,'medical')=p.question_b_medical_sha256
),
latest_consent as (
  select distinct on (e.learner_id)
    e.learner_id,
    e.protocol_id,
    e.protocol_sha256,
    e.decision,
    e.recorded_at
  from public.study_retention_probe_consent_events e
  join protocol p
    on p.protocol_id=e.protocol_id
   and p.protocol_sha256=e.protocol_sha256
  order by e.learner_id, e.recorded_at desc, e.id desc
),
opted_in as (
  select *
  from latest_consent
  where decision='opt_in'
),
protocol_assignment_stats as (
  select
    count(a.assignment_id)::integer as total_assignments,
    min(a.scheduled_at) as first_assignment_at
  from public.study_retention_probe_assignments a
  join protocol p
    on p.protocol_id=a.protocol_id
   and p.protocol_sha256=a.protocol_sha256
),
authorization_assignment_stats as (
  select
    count(a.assignment_id)::integer as total_assignments
  from public.study_retention_probe_assignments a
  join active_authorization auth
    on auth.id=a.activation_event_id
),
origins as (
  select
    a.learner_id,
    pr.protocol_id,
    pr.protocol_sha256,
    cp.activation_event_id,
    cp.id as pair_validation_id,
    cp.validation_sha256 as pair_validation_sha256,
    cp.primary_concept_id as concept_id,
    a.id as origin_attempt_id,
    a.event->>'questionVersionId' as origin_question_version_id,
    case
      when a.event->>'questionVersionId'=cp.question_a_version_id
        then cp.question_b_version_id
      else cp.question_a_version_id
    end as target_question_version_id,
    (a.event->>'occurredAt')::timestamptz as origin_attempted_at,
    oi.recorded_at as consent_recorded_at,
    cp.authorization_recorded_at,
    cp.authorization_max_total,
    cp.authorization_max_per_7_days,
    pr.window_start_days,
    pr.window_end_days,
    pr.protocol_max_total,
    pr.max_per_7_days,
    pr.max_study_days,
    pas.total_assignments as protocol_assignment_count,
    pas.first_assignment_at,
    aas.total_assignments as authorization_assignment_count
  from public.study_attempts a
  cross join protocol pr
  cross join current_pair cp
  join opted_in oi
    on oi.learner_id=a.learner_id
   and oi.protocol_id=pr.protocol_id
   and oi.protocol_sha256=pr.protocol_sha256
  cross join protocol_assignment_stats pas
  cross join authorization_assignment_stats aas
  where a.event->>'type'='question.answered'
    and a.event->>'conceptId'=cp.primary_concept_id
    and a.event->>'questionVersionId' in (
      cp.question_a_version_id,
      cp.question_b_version_id
    )
),
eligible as (
  select
    o.*,
    o.origin_attempted_at + pg_catalog.make_interval(days=>o.window_start_days) as window_open_at,
    o.origin_attempted_at + pg_catalog.make_interval(days=>o.window_end_days) as window_close_at
  from origins o
  where o.consent_recorded_at <= o.origin_attempted_at
    and o.authorization_recorded_at <= o.origin_attempted_at
    and p_now >= o.origin_attempted_at + pg_catalog.make_interval(days=>o.window_start_days)
    and p_now <= o.origin_attempted_at + pg_catalog.make_interval(days=>o.window_end_days)
    and o.protocol_assignment_count < o.protocol_max_total
    and o.authorization_assignment_count < o.authorization_max_total
    and (
      o.first_assignment_at is null
      or p_now <= o.first_assignment_at + pg_catalog.make_interval(days=>o.max_study_days)
    )
    and not exists (
      select 1
      from public.study_attempts target
      where target.learner_id=o.learner_id
        and target.event->>'questionVersionId'=o.target_question_version_id
    )
    and not exists (
      select 1
      from public.study_attempts contamination
      where contamination.learner_id=o.learner_id
        and contamination.id<>o.origin_attempt_id
        and contamination.event->>'conceptId'=o.concept_id
        and (contamination.event->>'occurredAt')::timestamptz > o.origin_attempted_at
        and (contamination.event->>'occurredAt')::timestamptz <= p_now
    )
    and not exists (
      select 1
      from public.study_revision_state r
      where r.learner_id=o.learner_id
        and (
          r.due_at <= p_now
          or r.latest_correct=false
        )
    )
    and not exists (
      select 1
      from public.study_sessions s
      where s.learner_id=o.learner_id
        and s.closed=false
    )
    and not exists (
      select 1
      from public.study_retention_probe_assignments prior
      where prior.learner_id=o.learner_id
        and prior.scheduled_at > p_now - interval '7 days'
    )
    and not exists (
      select 1
      from public.study_retention_probe_assignments prior
      where prior.learner_id=o.learner_id
        and prior.protocol_id=o.protocol_id
        and prior.origin_attempt_id=o.origin_attempt_id
        and prior.target_question_version_id=o.target_question_version_id
    )
)
select
  e.learner_id,
  e.protocol_id,
  e.protocol_sha256,
  e.activation_event_id,
  e.pair_validation_id,
  e.pair_validation_sha256,
  e.concept_id,
  e.origin_attempt_id,
  e.origin_question_version_id,
  e.target_question_version_id,
  e.origin_attempted_at,
  e.window_open_at,
  e.window_close_at
from eligible e
order by e.origin_attempted_at, e.learner_id, e.target_question_version_id;
$function$;

revoke all on function public.study_retention_probe_scheduler_candidates_v1(timestamptz)
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_scheduler_candidates_v1(timestamptz)
  to service_role;

create or replace function public.study_retention_probe_scheduler_readiness_v1(
  p_now timestamptz default pg_catalog.now()
)
returns jsonb
language plpgsql
stable
security invoker
set search_path=''
as $function$
declare
  v_authorization jsonb;
  v_candidate_count integer := 0;
  v_assignment_count integer := 0;
  v_active_authorization boolean := false;
begin
  v_authorization := public.study_retention_probe_activation_authorization_readiness_v1();
  v_active_authorization := coalesce(
    (v_authorization->'readiness'->>'canRevoke')::boolean,
    false
  );

  select count(*)::integer
  into v_candidate_count
  from public.study_retention_probe_scheduler_candidates_v1(p_now);

  select count(*)::integer
  into v_assignment_count
  from public.study_retention_probe_assignments a
  where a.protocol_id='retention-probe-feasibility-v1';

  return pg_catalog.jsonb_build_object(
    'contractId','study-retention-probe-scheduler-readiness-v1',
    'evaluatedAt',p_now,
    'activeAuthorization',v_active_authorization,
    'authorizationReadiness',v_authorization,
    'eligibleCandidateCount',v_candidate_count,
    'assignmentCount',v_assignment_count,
    'schedulerKernelAvailable',true,
    'manualServiceTickAvailable',true,
    'automaticExecutionEnabled',false,
    'learnerDeliveryEnabled',false,
    'canCreateAssignmentNow',v_active_authorization and v_candidate_count > 0,
    'blockingReasons',
      (case when not v_active_authorization
        then '["active-retention-probe-authorization-required"]'::jsonb
        else '[]'::jsonb end)
      ||
      (case when v_active_authorization and v_candidate_count=0
        then '["no-eligible-probe-candidate-now"]'::jsonb
        else '[]'::jsonb end)
      ||
      '["automatic-execution-not-enabled","learner-delivery-not-implemented"]'::jsonb,
    'studyNowAuthority',false,
    'masteryInferenceAuthority',false
  );
end;
$function$;

revoke all on function public.study_retention_probe_scheduler_readiness_v1(timestamptz)
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_scheduler_readiness_v1(timestamptz)
  to service_role;

create or replace function public.study_retention_probe_scheduler_tick_v1(
  p_now timestamptz default pg_catalog.now()
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_candidate record;
  v_rechecked record;
  v_body jsonb;
  v_hash text;
  v_assignment public.study_retention_probe_assignments%rowtype;
begin
  if p_now is null then
    raise exception using errcode='22023', message='retention_probe_scheduler_time_required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('retention-probe-feasibility-v1:scheduler',0)
  );

  select *
  into v_candidate
  from public.study_retention_probe_scheduler_candidates_v1(p_now)
  limit 1;

  if v_candidate.learner_id is null then
    return pg_catalog.jsonb_build_object(
      'contractId','study-retention-probe-scheduler-tick-v1',
      'created',false,
      'reason','no-eligible-probe-candidate-now',
      'automaticExecutionEnabled',false,
      'learnerDeliveryEnabled',false
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_candidate.learner_id::text,0)
  );

  select *
  into v_rechecked
  from public.study_retention_probe_scheduler_candidates_v1(p_now)
  where learner_id=v_candidate.learner_id
    and origin_attempt_id=v_candidate.origin_attempt_id
    and target_question_version_id=v_candidate.target_question_version_id
  limit 1;

  if v_rechecked.learner_id is null then
    return pg_catalog.jsonb_build_object(
      'contractId','study-retention-probe-scheduler-tick-v1',
      'created',false,
      'reason','candidate-became-ineligible',
      'automaticExecutionEnabled',false,
      'learnerDeliveryEnabled',false
    );
  end if;

  v_body := pg_catalog.jsonb_build_object(
    'contractVersion',1,
    'learnerId',v_rechecked.learner_id,
    'protocolId',v_rechecked.protocol_id,
    'protocolSha256',v_rechecked.protocol_sha256,
    'activationEventId',v_rechecked.activation_event_id,
    'pairValidationId',v_rechecked.pair_validation_id,
    'pairValidationSha256',v_rechecked.pair_validation_sha256,
    'conceptId',v_rechecked.concept_id,
    'originAttemptId',v_rechecked.origin_attempt_id,
    'originQuestionVersionId',v_rechecked.origin_question_version_id,
    'targetQuestionVersionId',v_rechecked.target_question_version_id,
    'originAttemptedAt',v_rechecked.origin_attempted_at,
    'windowOpenAt',v_rechecked.window_open_at,
    'windowCloseAt',v_rechecked.window_close_at,
    'scheduledAt',p_now
  );

  v_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_body::text,'UTF8'),'sha256'),
    'hex'
  );

  insert into public.study_retention_probe_assignments (
    learner_id,
    protocol_id,
    protocol_sha256,
    activation_event_id,
    pair_validation_id,
    pair_validation_sha256,
    concept_id,
    origin_attempt_id,
    origin_question_version_id,
    target_question_version_id,
    origin_attempted_at,
    window_open_at,
    window_close_at,
    scheduled_at,
    assignment_sha256
  )
  values (
    v_rechecked.learner_id,
    v_rechecked.protocol_id,
    v_rechecked.protocol_sha256,
    v_rechecked.activation_event_id,
    v_rechecked.pair_validation_id,
    v_rechecked.pair_validation_sha256,
    v_rechecked.concept_id,
    v_rechecked.origin_attempt_id,
    v_rechecked.origin_question_version_id,
    v_rechecked.target_question_version_id,
    v_rechecked.origin_attempted_at,
    v_rechecked.window_open_at,
    v_rechecked.window_close_at,
    p_now,
    v_hash
  )
  returning * into v_assignment;

  return pg_catalog.jsonb_build_object(
    'contractId','study-retention-probe-scheduler-tick-v1',
    'created',true,
    'assignment',pg_catalog.jsonb_build_object(
      'assignmentId',v_assignment.assignment_id,
      'learnerId',v_assignment.learner_id,
      'protocolId',v_assignment.protocol_id,
      'activationEventId',v_assignment.activation_event_id,
      'pairValidationId',v_assignment.pair_validation_id,
      'originAttemptId',v_assignment.origin_attempt_id,
      'originQuestionVersionId',v_assignment.origin_question_version_id,
      'targetQuestionVersionId',v_assignment.target_question_version_id,
      'windowOpenAt',v_assignment.window_open_at,
      'windowCloseAt',v_assignment.window_close_at,
      'scheduledAt',v_assignment.scheduled_at,
      'assignmentSha256',v_assignment.assignment_sha256
    ),
    'automaticExecutionEnabled',false,
    'learnerDeliveryEnabled',false,
    'studyNowAuthority',false,
    'masteryInferenceAuthority',false
  );
end;
$function$;

revoke all on function public.study_retention_probe_scheduler_tick_v1(timestamptz)
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_scheduler_tick_v1(timestamptz)
  to service_role;

create or replace function public.study_retention_probe_delivery_readiness_v1(
  p_assignment_id uuid,
  p_learner uuid,
  p_now timestamptz default pg_catalog.now()
)
returns jsonb
language plpgsql
stable
security invoker
set search_path=''
as $function$
declare
  v_assignment public.study_retention_probe_assignments%rowtype;
  v_latest_consent public.study_retention_probe_consent_events%rowtype;
  v_latest_activation public.study_retention_probe_activation_events%rowtype;
  v_pair public.study_transfer_pair_validations%rowtype;
  v_a jsonb;
  v_b jsonb;
  v_blockers jsonb := '[]'::jsonb;
begin
  select *
  into v_assignment
  from public.study_retention_probe_assignments a
  where a.assignment_id=p_assignment_id
    and a.learner_id=p_learner
  limit 1;

  if v_assignment.assignment_id is null then
    return pg_catalog.jsonb_build_object(
      'contractId','study-retention-probe-delivery-readiness-v1',
      'assignmentFound',false,
      'deliverable',false,
      'blockingReasons','["assignment-not-found"]'::jsonb,
      'learnerDeliveryEnabled',false
    );
  end if;

  select e.*
  into v_latest_consent
  from public.study_retention_probe_consent_events e
  where e.learner_id=p_learner
    and e.protocol_id=v_assignment.protocol_id
    and e.protocol_sha256=v_assignment.protocol_sha256
  order by e.recorded_at desc, e.id desc
  limit 1;

  select e.*
  into v_latest_activation
  from public.study_retention_probe_activation_events e
  where e.protocol_id=v_assignment.protocol_id
    and e.protocol_sha256=v_assignment.protocol_sha256
  order by e.recorded_at desc, e.id desc
  limit 1;

  select *
  into v_pair
  from public.study_transfer_pair_validations v
  where v.id=v_assignment.pair_validation_id
    and v.validation_sha256=v_assignment.pair_validation_sha256
  limit 1;

  if v_pair.id is not null then
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
  end if;

  if v_latest_consent.id is null or v_latest_consent.decision<>'opt_in' then
    v_blockers:=v_blockers||'["learner-not-currently-opted-in"]'::jsonb;
  end if;

  if v_latest_activation.id is null
     or v_latest_activation.id<>v_assignment.activation_event_id
     or v_latest_activation.decision<>'authorize'
     or v_latest_activation.authorization_valid_until<=p_now then
    v_blockers:=v_blockers||'["activation-authorization-not-current"]'::jsonb;
  end if;

  if v_pair.id is null
     or v_pair.decision<>'validated'
     or not v_pair.transfer_evidence_valid
     or not v_pair.retention_probe_comparable
     or v_a is null
     or v_b is null
     or v_a->>'status'<>'published'
     or v_b->>'status'<>'published'
     or public.current_review_target_sha256(v_pair.question_a_version_id,'medical')<>v_pair.question_a_medical_sha256
     or public.current_review_target_sha256(v_pair.question_b_version_id,'medical')<>v_pair.question_b_medical_sha256 then
    v_blockers:=v_blockers||'["pair-or-content-no-longer-current"]'::jsonb;
  end if;

  if p_now < v_assignment.window_open_at or p_now > v_assignment.window_close_at then
    v_blockers:=v_blockers||'["outside-preregistered-delivery-window"]'::jsonb;
  end if;

  if exists (
    select 1
    from public.study_attempts target
    where target.learner_id=p_learner
      and target.event->>'questionVersionId'=v_assignment.target_question_version_id
  ) then
    v_blockers:=v_blockers||'["target-question-already-attempted"]'::jsonb;
  end if;

  if exists (
    select 1
    from public.study_attempts contamination
    where contamination.learner_id=p_learner
      and contamination.id<>v_assignment.origin_attempt_id
      and contamination.event->>'conceptId'=v_assignment.concept_id
      and (contamination.event->>'occurredAt')::timestamptz > v_assignment.origin_attempted_at
      and (contamination.event->>'occurredAt')::timestamptz <= p_now
  ) then
    v_blockers:=v_blockers||'["same-concept-contamination-observed"]'::jsonb;
  end if;

  if exists (
    select 1
    from public.study_revision_state r
    where r.learner_id=p_learner
      and (r.due_at<=p_now or r.latest_correct=false)
  ) then
    v_blockers:=v_blockers||'["due-or-mistake-repair-work-takes-priority"]'::jsonb;
  end if;

  if exists (
    select 1
    from public.study_sessions s
    where s.learner_id=p_learner
      and s.closed=false
  ) then
    v_blockers:=v_blockers||'["open-study-session-takes-priority"]'::jsonb;
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','study-retention-probe-delivery-readiness-v1',
    'assignmentFound',true,
    'assignmentId',v_assignment.assignment_id,
    'targetQuestionVersionId',v_assignment.target_question_version_id,
    'deliverable',pg_catalog.jsonb_array_length(v_blockers)=0,
    'blockingReasons',v_blockers,
    'learnerDeliveryEnabled',false,
    'studyNowAuthority',false,
    'masteryInferenceAuthority',false
  );
end;
$function$;

revoke all on function public.study_retention_probe_delivery_readiness_v1(uuid,uuid,timestamptz)
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_delivery_readiness_v1(uuid,uuid,timestamptz)
  to service_role;


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
  v_scheduler jsonb;
  v_has_pair boolean;
  v_has_protocol boolean;
  v_has_validated_pair boolean;
  v_active_opt_in_count integer;
  v_has_active_authorization boolean;
  v_scheduler_kernel boolean;
  v_automatic_execution boolean;
  v_learner_delivery boolean;
begin
  v_content := public.study_retention_probe_readiness_v1();
  v_protocol := public.study_retention_probe_protocol_v1();
  v_pairs := public.study_transfer_pair_validation_readiness_v1();
  v_authorization := public.study_retention_probe_activation_authorization_readiness_v1();
  v_scheduler := public.study_retention_probe_scheduler_readiness_v1(pg_catalog.now());

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
  v_has_active_authorization := coalesce(
    (v_authorization->'readiness'->>'canRevoke')::boolean,
    false
  );
  v_scheduler_kernel := coalesce(
    (v_scheduler->>'schedulerKernelAvailable')::boolean,
    false
  );
  v_automatic_execution := coalesce(
    (v_scheduler->>'automaticExecutionEnabled')::boolean,
    false
  );
  v_learner_delivery := coalesce(
    (v_scheduler->>'learnerDeliveryEnabled')::boolean,
    false
  );

  return pg_catalog.jsonb_build_object(
    'contractId','study-retention-probe-activation-readiness-v1',
    'contentReadiness',v_content,
    'protocol',v_protocol,
    'pairValidationReadiness',v_pairs,
    'activationAuthorizationReadiness',v_authorization,
    'schedulerReadiness',v_scheduler,
    'readiness',pg_catalog.jsonb_build_object(
      'hasPublishedAlternateItemPair',v_has_pair,
      'protocolPreregistered',v_has_protocol,
      'validatedPairMetadataAvailable',v_has_validated_pair,
      'learnerOptInPathAvailable',true,
      'activeOptedInLearners',v_active_opt_in_count,
      'activationAuthorizationAvailable',v_has_active_authorization,
      'schedulerKernelAvailable',v_scheduler_kernel,
      'automaticSchedulerExecutionEnabled',v_automatic_execution,
      'learnerDeliveryEnabled',v_learner_delivery,
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
        (case when not v_scheduler_kernel
          then '["retention-probe-scheduler-kernel-unavailable"]'::jsonb
          else '[]'::jsonb end)
        ||
        (case when not v_automatic_execution
          then '["automatic-scheduler-execution-not-enabled"]'::jsonb
          else '[]'::jsonb end)
        ||
        (case when not v_learner_delivery
          then '["learner-delivery-not-implemented"]'::jsonb
          else '[]'::jsonb end)
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
