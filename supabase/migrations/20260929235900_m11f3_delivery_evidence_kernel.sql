-- M11f3: retention-probe delivery evidence kernel.
-- Distinguishes assignment, server-served delivery, and answered-response evidence.
-- No learner route or automatic delivery is enabled by this migration.

create table if not exists public.study_retention_probe_served_events (
  served_event_id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  assignment_id uuid not null references public.study_retention_probe_assignments(assignment_id) on delete restrict,
  protocol_id text not null,
  protocol_sha256 text not null check (protocol_sha256 ~ '^[0-9a-f]{64}$'),
  activation_event_id uuid not null references public.study_retention_probe_activation_events(id) on delete restrict,
  pair_validation_id uuid not null references public.study_transfer_pair_validations(id) on delete restrict,
  target_question_version_id text not null,
  target_medical_sha256 text not null check (target_medical_sha256 ~ '^[0-9a-f]{64}$'),
  catalog_version bigint not null check (catalog_version >= 1),
  learner_question jsonb not null check (jsonb_typeof(learner_question)='object'),
  learner_question_sha256 text not null check (learner_question_sha256 ~ '^[0-9a-f]{64}$'),
  request_key text not null check (request_key ~ '^[a-zA-Z0-9:_@.\-]{1,160}$'),
  served_at timestamptz not null,
  served_sha256 text not null check (served_sha256 ~ '^[0-9a-f]{64}$'),
  recorded_at timestamptz not null default now(),
  unique (assignment_id),
  unique (learner_id, request_key),
  unique (served_sha256)
);

create index if not exists study_retention_probe_served_events_learner_idx
  on public.study_retention_probe_served_events (learner_id, served_at desc, served_event_id desc);

alter table public.study_retention_probe_served_events enable row level security;
revoke all on table public.study_retention_probe_served_events
  from public, anon, authenticated, service_role;
grant select, insert on table public.study_retention_probe_served_events
  to service_role;

drop trigger if exists study_retention_probe_served_events_append_only
  on public.study_retention_probe_served_events;
create trigger study_retention_probe_served_events_append_only
before update or delete on public.study_retention_probe_served_events
for each row execute function public.prevent_learner_evidence_mutation();

create table if not exists public.study_retention_probe_response_bindings (
  binding_id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  served_event_id uuid not null references public.study_retention_probe_served_events(served_event_id) on delete restrict,
  assignment_id uuid not null references public.study_retention_probe_assignments(assignment_id) on delete restrict,
  attempt_id uuid not null references public.study_attempts(id) on delete restrict,
  target_question_version_id text not null,
  responded_at timestamptz not null,
  correct boolean not null,
  response_duration_ms bigint check (response_duration_ms is null or response_duration_ms >= 0),
  clean_for_primary_analysis boolean not null,
  contamination_reasons jsonb not null default '[]'::jsonb
    check (jsonb_typeof(contamination_reasons)='array'),
  binding_sha256 text not null check (binding_sha256 ~ '^[0-9a-f]{64}$'),
  bound_at timestamptz not null default now(),
  unique (served_event_id),
  unique (assignment_id),
  unique (attempt_id),
  unique (binding_sha256)
);

create index if not exists study_retention_probe_response_bindings_learner_idx
  on public.study_retention_probe_response_bindings (learner_id, responded_at desc, binding_id desc);

alter table public.study_retention_probe_response_bindings enable row level security;
revoke all on table public.study_retention_probe_response_bindings
  from public, anon, authenticated, service_role;
grant select, insert on table public.study_retention_probe_response_bindings
  to service_role;

drop trigger if exists study_retention_probe_response_bindings_append_only
  on public.study_retention_probe_response_bindings;
create trigger study_retention_probe_response_bindings_append_only
before update or delete on public.study_retention_probe_response_bindings
for each row execute function public.prevent_learner_evidence_mutation();

create or replace function public.study_record_retention_probe_served_v1(
  p_learner uuid,
  p_assignment uuid,
  p_request_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_assignment public.study_retention_probe_assignments%rowtype;
  v_existing public.study_retention_probe_served_events%rowtype;
  v_readiness jsonb;
  v_pair public.study_transfer_pair_validations%rowtype;
  v_catalog_version bigint;
  v_question jsonb;
  v_learner_question jsonb;
  v_target_medical_sha256 text;
  v_question_hash text;
  v_body jsonb;
  v_hash text;
  v_served public.study_retention_probe_served_events%rowtype;
begin
  if p_learner is null or p_assignment is null then
    raise exception using errcode='22023', message='retention_probe_delivery_identity_required';
  end if;

  if p_request_key is null
     or p_request_key !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' then
    raise exception using errcode='22023', message='invalid_retention_probe_delivery_request_key';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_learner::text,0)
  );

  select *
  into v_existing
  from public.study_retention_probe_served_events e
  where e.learner_id=p_learner
    and e.request_key=p_request_key
  limit 1;

  if v_existing.served_event_id is not null then
    if v_existing.assignment_id<>p_assignment then
      raise exception using errcode='40900', message='retention_probe_delivery_request_key_collision';
    end if;

    return pg_catalog.jsonb_build_object(
      'contractId','retention-probe-server-served-receipt-v1',
      'servedEventId',v_existing.served_event_id,
      'assignmentId',v_existing.assignment_id,
      'targetQuestionVersionId',v_existing.target_question_version_id,
      'targetMedicalSha256',v_existing.target_medical_sha256,
      'catalogVersion',v_existing.catalog_version,
      'learnerQuestion',v_existing.learner_question,
      'learnerQuestionSha256',v_existing.learner_question_sha256,
      'servedAt',v_existing.served_at,
      'servedSha256',v_existing.served_sha256,
      'serverServed',true,
      'learnerRenderedConfirmed',false,
      'learnerViewedConfirmed',false,
      'idempotentReplay',true
    );
  end if;

  select *
  into v_assignment
  from public.study_retention_probe_assignments a
  where a.assignment_id=p_assignment
    and a.learner_id=p_learner
  limit 1;

  if v_assignment.assignment_id is null then
    raise exception using errcode='22023', message='retention_probe_assignment_not_found';
  end if;

  v_readiness := public.study_retention_probe_delivery_readiness_v1(
    p_assignment,
    p_learner,
    v_now
  );

  if coalesce((v_readiness->>'deliverable')::boolean,false) is not true then
    raise exception using
      errcode='55000',
      message='retention_probe_delivery_not_ready',
      detail=v_readiness::text;
  end if;

  select *
  into v_pair
  from public.study_transfer_pair_validations v
  where v.id=v_assignment.pair_validation_id
  limit 1;

  select c.version
  into v_catalog_version
  from public.study_catalog c
  where c.id=1
  limit 1;

  if v_pair.id is null or v_catalog_version is null then
    raise exception using errcode='55000', message='retention_probe_delivery_binding_unavailable';
  end if;

  select q
  into v_question
  from public.study_catalog c
  cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
  where c.id=1
    and q->>'questionVersionId'=v_assignment.target_question_version_id
  limit 1;

  if v_question is null or v_question->>'status'<>'published' then
    raise exception using errcode='55000', message='retention_probe_target_question_unavailable';
  end if;

  v_target_medical_sha256 := case
    when v_assignment.target_question_version_id=v_pair.question_a_version_id
      then v_pair.question_a_medical_sha256
    when v_assignment.target_question_version_id=v_pair.question_b_version_id
      then v_pair.question_b_medical_sha256
    else null
  end;

  if v_target_medical_sha256 is null then
    raise exception using errcode='55000', message='retention_probe_target_pair_binding_broken';
  end if;

  v_learner_question := pg_catalog.jsonb_build_object(
    'questionVersionId',v_question->>'questionVersionId',
    'questionId',v_question->>'questionId',
    'version',v_question->'version',
    'conceptId',v_assignment.concept_id,
    'stem',v_question->>'stem',
    'options',v_question->'options'
  );

  v_question_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_learner_question::text,'UTF8'),'sha256'),
    'hex'
  );

  v_body := pg_catalog.jsonb_build_object(
    'contractVersion',1,
    'learnerId',p_learner,
    'assignmentId',v_assignment.assignment_id,
    'protocolId',v_assignment.protocol_id,
    'protocolSha256',v_assignment.protocol_sha256,
    'activationEventId',v_assignment.activation_event_id,
    'pairValidationId',v_assignment.pair_validation_id,
    'targetQuestionVersionId',v_assignment.target_question_version_id,
    'targetMedicalSha256',v_target_medical_sha256,
    'catalogVersion',v_catalog_version,
    'learnerQuestionSha256',v_question_hash,
    'requestKey',p_request_key,
    'servedAt',v_now,
    'semanticClaim','server-served-not-confirmed-seen'
  );

  v_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_body::text,'UTF8'),'sha256'),
    'hex'
  );

  insert into public.study_retention_probe_served_events (
    learner_id,
    assignment_id,
    protocol_id,
    protocol_sha256,
    activation_event_id,
    pair_validation_id,
    target_question_version_id,
    target_medical_sha256,
    catalog_version,
    learner_question,
    learner_question_sha256,
    request_key,
    served_at,
    served_sha256
  )
  values (
    p_learner,
    v_assignment.assignment_id,
    v_assignment.protocol_id,
    v_assignment.protocol_sha256,
    v_assignment.activation_event_id,
    v_assignment.pair_validation_id,
    v_assignment.target_question_version_id,
    v_target_medical_sha256,
    v_catalog_version,
    v_learner_question,
    v_question_hash,
    p_request_key,
    v_now,
    v_hash
  )
  returning * into v_served;

  return pg_catalog.jsonb_build_object(
    'contractId','retention-probe-server-served-receipt-v1',
    'servedEventId',v_served.served_event_id,
    'assignmentId',v_served.assignment_id,
    'targetQuestionVersionId',v_served.target_question_version_id,
    'targetMedicalSha256',v_served.target_medical_sha256,
    'catalogVersion',v_served.catalog_version,
    'learnerQuestion',v_served.learner_question,
    'learnerQuestionSha256',v_served.learner_question_sha256,
    'servedAt',v_served.served_at,
    'servedSha256',v_served.served_sha256,
    'serverServed',true,
    'learnerRenderedConfirmed',false,
    'learnerViewedConfirmed',false,
    'idempotentReplay',false
  );
end;
$function$;

revoke all on function public.study_record_retention_probe_served_v1(uuid,uuid,text)
  from public, anon, authenticated;
grant execute on function public.study_record_retention_probe_served_v1(uuid,uuid,text)
  to service_role;

create or replace function public.study_bind_retention_probe_response_v1(
  p_learner uuid,
  p_served_event uuid,
  p_attempt uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $function$
declare
  v_served public.study_retention_probe_served_events%rowtype;
  v_assignment public.study_retention_probe_assignments%rowtype;
  v_attempt public.study_attempts%rowtype;
  v_existing public.study_retention_probe_response_bindings%rowtype;
  v_responded_at timestamptz;
  v_duration bigint;
  v_correct boolean;
  v_contamination jsonb := '[]'::jsonb;
  v_clean boolean;
  v_body jsonb;
  v_hash text;
  v_binding public.study_retention_probe_response_bindings%rowtype;
begin
  if p_learner is null or p_served_event is null or p_attempt is null then
    raise exception using errcode='22023', message='retention_probe_response_identity_required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_learner::text,0)
  );

  select *
  into v_existing
  from public.study_retention_probe_response_bindings b
  where b.learner_id=p_learner
    and (b.served_event_id=p_served_event or b.attempt_id=p_attempt)
  limit 1;

  if v_existing.binding_id is not null then
    if v_existing.served_event_id<>p_served_event
       or v_existing.attempt_id<>p_attempt then
      raise exception using errcode='40900', message='retention_probe_response_binding_collision';
    end if;

    return pg_catalog.jsonb_build_object(
      'contractId','retention-probe-response-binding-receipt-v1',
      'bindingId',v_existing.binding_id,
      'servedEventId',v_existing.served_event_id,
      'assignmentId',v_existing.assignment_id,
      'attemptId',v_existing.attempt_id,
      'targetQuestionVersionId',v_existing.target_question_version_id,
      'respondedAt',v_existing.responded_at,
      'correct',v_existing.correct,
      'responseDurationMs',v_existing.response_duration_ms,
      'cleanForPrimaryAnalysis',v_existing.clean_for_primary_analysis,
      'contaminationReasons',v_existing.contamination_reasons,
      'bindingSha256',v_existing.binding_sha256,
      'idempotentReplay',true
    );
  end if;

  select *
  into v_served
  from public.study_retention_probe_served_events e
  where e.served_event_id=p_served_event
    and e.learner_id=p_learner
  limit 1;

  if v_served.served_event_id is null then
    raise exception using errcode='22023', message='retention_probe_served_event_not_found';
  end if;

  select *
  into v_assignment
  from public.study_retention_probe_assignments a
  where a.assignment_id=v_served.assignment_id
    and a.learner_id=p_learner
  limit 1;

  if v_assignment.assignment_id is null then
    raise exception using errcode='55000', message='retention_probe_assignment_binding_broken';
  end if;

  select *
  into v_attempt
  from public.study_attempts a
  where a.id=p_attempt
    and a.learner_id=p_learner
  limit 1;

  if v_attempt.id is null then
    raise exception using errcode='22023', message='retention_probe_response_attempt_not_found';
  end if;

  if v_attempt.event->>'questionVersionId' is distinct from v_served.target_question_version_id then
    raise exception using errcode='22023', message='retention_probe_response_target_mismatch';
  end if;

  if v_attempt.event->>'type' is distinct from 'question.answered'
     or v_attempt.event->>'schemaVersion' is distinct from '1' then
    raise exception using errcode='22023', message='retention_probe_response_event_invalid';
  end if;

  v_responded_at := (v_attempt.event->>'occurredAt')::timestamptz;
  if v_responded_at < v_served.served_at then
    raise exception using errcode='22023', message='retention_probe_response_precedes_server_delivery';
  end if;

  if v_responded_at > v_assignment.window_close_at then
    v_contamination:=v_contamination||'["response-after-preregistered-window"]'::jsonb;
  end if;

  if exists (
    select 1
    from public.study_attempts other_attempt
    where other_attempt.learner_id=p_learner
      and other_attempt.id not in (v_assignment.origin_attempt_id, v_attempt.id)
      and other_attempt.event->>'conceptId'=v_assignment.concept_id
      and (other_attempt.event->>'occurredAt')::timestamptz > v_served.served_at
      and (other_attempt.event->>'occurredAt')::timestamptz < v_responded_at
  ) then
    v_contamination:=v_contamination||'["same-concept-attempt-between-serve-and-response"]'::jsonb;
  end if;

  v_clean := pg_catalog.jsonb_array_length(v_contamination)=0;
  v_correct := (v_attempt.event->>'correct')::boolean;
  v_duration := case
    when (v_attempt.event->>'durationMs') ~ '^[0-9]+$'
      then (v_attempt.event->>'durationMs')::bigint
    else null
  end;

  v_body := pg_catalog.jsonb_build_object(
    'contractVersion',1,
    'learnerId',p_learner,
    'servedEventId',v_served.served_event_id,
    'assignmentId',v_assignment.assignment_id,
    'attemptId',v_attempt.id,
    'targetQuestionVersionId',v_served.target_question_version_id,
    'respondedAt',v_responded_at,
    'correct',v_correct,
    'responseDurationMs',v_duration,
    'cleanForPrimaryAnalysis',v_clean,
    'contaminationReasons',v_contamination
  );

  v_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_body::text,'UTF8'),'sha256'),
    'hex'
  );

  insert into public.study_retention_probe_response_bindings (
    learner_id,
    served_event_id,
    assignment_id,
    attempt_id,
    target_question_version_id,
    responded_at,
    correct,
    response_duration_ms,
    clean_for_primary_analysis,
    contamination_reasons,
    binding_sha256
  )
  values (
    p_learner,
    v_served.served_event_id,
    v_assignment.assignment_id,
    v_attempt.id,
    v_served.target_question_version_id,
    v_responded_at,
    v_correct,
    v_duration,
    v_clean,
    v_contamination,
    v_hash
  )
  returning * into v_binding;

  return pg_catalog.jsonb_build_object(
    'contractId','retention-probe-response-binding-receipt-v1',
    'bindingId',v_binding.binding_id,
    'servedEventId',v_binding.served_event_id,
    'assignmentId',v_binding.assignment_id,
    'attemptId',v_binding.attempt_id,
    'targetQuestionVersionId',v_binding.target_question_version_id,
    'respondedAt',v_binding.responded_at,
    'correct',v_binding.correct,
    'responseDurationMs',v_binding.response_duration_ms,
    'cleanForPrimaryAnalysis',v_binding.clean_for_primary_analysis,
    'contaminationReasons',v_binding.contamination_reasons,
    'bindingSha256',v_binding.binding_sha256,
    'idempotentReplay',false
  );
end;
$function$;

revoke all on function public.study_bind_retention_probe_response_v1(uuid,uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.study_bind_retention_probe_response_v1(uuid,uuid,uuid)
  to service_role;

create or replace function public.study_retention_probe_evidence_readiness_v1()
returns jsonb
language sql
stable
security invoker
set search_path=''
as $function$
select pg_catalog.jsonb_build_object(
  'contractId','study-retention-probe-evidence-readiness-v1',
  'assignmentCount',(select count(*)::integer from public.study_retention_probe_assignments),
  'serverServedCount',(select count(*)::integer from public.study_retention_probe_served_events),
  'responseBindingCount',(select count(*)::integer from public.study_retention_probe_response_bindings),
  'servedWithoutResponseCount',(
    select count(*)::integer
    from public.study_retention_probe_served_events s
    left join public.study_retention_probe_response_bindings b
      on b.served_event_id=s.served_event_id
    where b.binding_id is null
  ),
  'deliveryEvidenceKernelAvailable',true,
  'serverServedMeansLearnerSeen',false,
  'learnerRouteEnabled',false,
  'renderAcknowledgementImplemented',false,
  'automaticExecutionEnabled',false,
  'studyNowAuthority',false,
  'masteryInferenceAuthority',false
);
$function$;

revoke all on function public.study_retention_probe_evidence_readiness_v1()
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_evidence_readiness_v1()
  to service_role;

create or replace function public.study_learning_event_stream_v2(
  p_learner uuid,
  p_limit integer default 500,
  p_after_recorded_at timestamptz default null,
  p_after_event_key text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path=''
as $function$
declare
  v_events jsonb;
  v_count integer;
  v_has_more boolean;
  v_last_recorded_at timestamptz;
  v_last_event_key text;
begin
  if p_learner is null then
    raise exception using errcode='22023', message='learning_event_stream_learner_required';
  end if;

  if p_limit is null or p_limit<1 or p_limit>5000 then
    raise exception using errcode='22023', message='learning_event_stream_limit_invalid';
  end if;

  if (p_after_recorded_at is null) <> (p_after_event_key is null) then
    raise exception using errcode='22023', message='learning_event_stream_cursor_invalid';
  end if;

  with all_events as (
    select
      'attempt:'||a.id::text as event_key,
      1::integer as schema_version,
      'question.answered'::text as family,
      'observation'::text as event_class,
      (a.event->>'occurredAt')::timestamptz as occurred_at,
      a.recorded_at,
      a.event->>'conceptId' as concept_id,
      a.event->>'questionVersionId' as question_version_id,
      a.session_id,
      'study_attempts'::text as source_table,
      a.id::text as source_id,
      a.event as payload
    from public.study_attempts a
    where a.learner_id=p_learner
      and a.event->>'type'='question.answered'
      and a.event->>'schemaVersion'='1'

    union all

    select
      'memory:'||m.id::text,
      1,
      'memory.rating',
      'self_report',
      m.recorded_at,
      m.recorded_at,
      a.event->>'conceptId',
      m.question_version_id,
      a.session_id,
      'study_memory_judgments',
      m.id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion',1,
        'type','memory.rating',
        'eventId',m.id,
        'attemptId',m.attempt_id,
        'questionVersionId',m.question_version_id,
        'conceptId',a.event->>'conceptId',
        'rating',m.rating,
        'ratingLabel',case m.rating when 1 then 'Again' when 2 then 'Hard' when 3 then 'Good' when 4 then 'Easy' end,
        'scaleId',m.scale_id,
        'promptId',m.prompt_id,
        'occurredAt',m.recorded_at
      )
    from public.study_memory_judgments m
    join public.study_attempts a
      on a.id=m.attempt_id and a.learner_id=m.learner_id
    where m.learner_id=p_learner

    union all

    select
      'recommendation:'||r.id::text,
      1,
      'study.recommendation_generated',
      'policy_decision',
      r.created_at,
      r.created_at,
      null::text,
      null::text,
      r.session_id,
      'study_recommendation_events',
      r.id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion',1,
        'type','study.recommendation_generated',
        'eventId',r.id,
        'sessionId',r.session_id,
        'strategy',r.strategy,
        'availableMinutes',r.available_minutes,
        'plan',r.plan,
        'occurredAt',r.created_at
      )
    from public.study_recommendation_events r
    where r.learner_id=p_learner

    union all

    select
      'retention-assignment:'||a.assignment_id::text,
      1,
      'research.retention_probe_assigned',
      'research_policy_decision',
      a.scheduled_at,
      a.scheduled_at,
      a.concept_id,
      a.target_question_version_id,
      null::uuid,
      'study_retention_probe_assignments',
      a.assignment_id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion',1,
        'type','research.retention_probe_assigned',
        'assignmentId',a.assignment_id,
        'protocolId',a.protocol_id,
        'activationEventId',a.activation_event_id,
        'pairValidationId',a.pair_validation_id,
        'originAttemptId',a.origin_attempt_id,
        'originQuestionVersionId',a.origin_question_version_id,
        'targetQuestionVersionId',a.target_question_version_id,
        'windowOpenAt',a.window_open_at,
        'windowCloseAt',a.window_close_at,
        'occurredAt',a.scheduled_at
      )
    from public.study_retention_probe_assignments a
    where a.learner_id=p_learner

    union all

    select
      'retention-served:'||s.served_event_id::text,
      1,
      'research.retention_probe_server_served',
      'delivery_observation',
      s.served_at,
      s.recorded_at,
      a.concept_id,
      s.target_question_version_id,
      null::uuid,
      'study_retention_probe_served_events',
      s.served_event_id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion',1,
        'type','research.retention_probe_server_served',
        'servedEventId',s.served_event_id,
        'assignmentId',s.assignment_id,
        'targetQuestionVersionId',s.target_question_version_id,
        'targetMedicalSha256',s.target_medical_sha256,
        'catalogVersion',s.catalog_version,
        'learnerQuestionSha256',s.learner_question_sha256,
        'serverServed',true,
        'learnerRenderedConfirmed',false,
        'learnerViewedConfirmed',false,
        'occurredAt',s.served_at
      )
    from public.study_retention_probe_served_events s
    join public.study_retention_probe_assignments a
      on a.assignment_id=s.assignment_id
    where s.learner_id=p_learner

    union all

    select
      'retention-response-binding:'||b.binding_id::text,
      1,
      'research.retention_probe_response_bound',
      'evidence_link',
      b.responded_at,
      b.bound_at,
      a.concept_id,
      b.target_question_version_id,
      at.session_id,
      'study_retention_probe_response_bindings',
      b.binding_id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion',1,
        'type','research.retention_probe_response_bound',
        'bindingId',b.binding_id,
        'servedEventId',b.served_event_id,
        'assignmentId',b.assignment_id,
        'attemptId',b.attempt_id,
        'targetQuestionVersionId',b.target_question_version_id,
        'correct',b.correct,
        'responseDurationMs',b.response_duration_ms,
        'cleanForPrimaryAnalysis',b.clean_for_primary_analysis,
        'contaminationReasons',b.contamination_reasons,
        'occurredAt',b.responded_at
      )
    from public.study_retention_probe_response_bindings b
    join public.study_retention_probe_assignments a
      on a.assignment_id=b.assignment_id
    join public.study_attempts at
      on at.id=b.attempt_id
    where b.learner_id=p_learner
  ),
  after_cursor as (
    select *
    from all_events
    where p_after_recorded_at is null
       or (recorded_at,event_key)>(p_after_recorded_at,p_after_event_key)
  ),
  ranked as (
    select *
    from after_cursor
    order by recorded_at,event_key
    limit p_limit+1
  ),
  page as (
    select *
    from ranked
    order by recorded_at,event_key
    limit p_limit
  ),
  last_row as (
    select recorded_at,event_key
    from page
    order by recorded_at desc,event_key desc
    limit 1
  )
  select
    coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'eventKey',event_key,
          'schemaVersion',schema_version,
          'family',family,
          'eventClass',event_class,
          'occurredAt',occurred_at,
          'recordedAt',recorded_at,
          'conceptId',concept_id,
          'questionVersionId',question_version_id,
          'sessionId',session_id,
          'source',pg_catalog.jsonb_build_object(
            'table',source_table,
            'id',source_id
          ),
          'payload',payload
        )
        order by recorded_at,event_key
      ),
      '[]'::jsonb
    ),
    count(*)::integer,
    (select count(*)>p_limit from ranked),
    (select recorded_at from last_row),
    (select event_key from last_row)
  into
    v_events,
    v_count,
    v_has_more,
    v_last_recorded_at,
    v_last_event_key
  from page;

  return pg_catalog.jsonb_build_object(
    'contractId','study-learning-event-stream-v2',
    'learnerId',p_learner,
    'ordering','recordedAt,eventKey',
    'eventCount',v_count,
    'hasMore',coalesce(v_has_more,false),
    'nextCursor',case
      when coalesce(v_has_more,false) and v_last_recorded_at is not null then
        pg_catalog.jsonb_build_object(
          'recordedAt',v_last_recorded_at,
          'eventKey',v_last_event_key
        )
      else null
    end,
    'includedFamilies',pg_catalog.jsonb_build_array(
      'question.answered',
      'memory.rating',
      'study.recommendation_generated',
      'research.retention_probe_assigned',
      'research.retention_probe_server_served',
      'research.retention_probe_response_bound'
    ),
    'serverServedMeansLearnerSeen',false,
    'inferenceAuthority',false,
    'masteryInferenceEnabled',false,
    'events',v_events
  );
end;
$function$;

revoke all on function public.study_learning_event_stream_v2(uuid,integer,timestamptz,text)
  from public, anon, authenticated;
grant execute on function public.study_learning_event_stream_v2(uuid,integer,timestamptz,text)
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
  v_evidence jsonb;
  v_has_pair boolean;
  v_has_protocol boolean;
  v_has_validated_pair boolean;
  v_active_opt_in_count integer;
  v_has_active_authorization boolean;
  v_scheduler_kernel boolean;
  v_automatic_execution boolean;
  v_delivery_evidence_kernel boolean;
  v_learner_route boolean;
begin
  v_content := public.study_retention_probe_readiness_v1();
  v_protocol := public.study_retention_probe_protocol_v1();
  v_pairs := public.study_transfer_pair_validation_readiness_v1();
  v_authorization := public.study_retention_probe_activation_authorization_readiness_v1();
  v_scheduler := public.study_retention_probe_scheduler_readiness_v1(pg_catalog.now());
  v_evidence := public.study_retention_probe_evidence_readiness_v1();

  v_has_pair := coalesce((v_content->'readiness'->>'hasAnyPublishedAlternateItemPair')::boolean,false);
  v_has_protocol := v_protocol is not null;
  v_has_validated_pair := coalesce((v_pairs->'readiness'->>'validatedRetentionProbePairMetadataAvailable')::boolean,false);
  v_active_opt_in_count := coalesce((v_authorization->>'activeOptedInLearners')::integer,0);
  v_has_active_authorization := coalesce((v_authorization->'readiness'->>'canRevoke')::boolean,false);
  v_scheduler_kernel := coalesce((v_scheduler->>'schedulerKernelAvailable')::boolean,false);
  v_automatic_execution := coalesce((v_scheduler->>'automaticExecutionEnabled')::boolean,false);
  v_delivery_evidence_kernel := coalesce((v_evidence->>'deliveryEvidenceKernelAvailable')::boolean,false);
  v_learner_route := coalesce((v_evidence->>'learnerRouteEnabled')::boolean,false);

  return pg_catalog.jsonb_build_object(
    'contractId','study-retention-probe-activation-readiness-v1',
    'contentReadiness',v_content,
    'protocol',v_protocol,
    'pairValidationReadiness',v_pairs,
    'activationAuthorizationReadiness',v_authorization,
    'schedulerReadiness',v_scheduler,
    'evidenceReadiness',v_evidence,
    'readiness',pg_catalog.jsonb_build_object(
      'hasPublishedAlternateItemPair',v_has_pair,
      'protocolPreregistered',v_has_protocol,
      'validatedPairMetadataAvailable',v_has_validated_pair,
      'learnerOptInPathAvailable',true,
      'activeOptedInLearners',v_active_opt_in_count,
      'activationAuthorizationAvailable',v_has_active_authorization,
      'schedulerKernelAvailable',v_scheduler_kernel,
      'automaticSchedulerExecutionEnabled',v_automatic_execution,
      'deliveryEvidenceKernelAvailable',v_delivery_evidence_kernel,
      'learnerDeliveryRouteEnabled',v_learner_route,
      'canActivate',false,
      'blockingReasons',
        (case when not v_has_pair then '["no-published-alternate-item-pair"]'::jsonb else '[]'::jsonb end)
        ||
        (case when not v_has_protocol then '["retention-probe-protocol-not-preregistered"]'::jsonb else '[]'::jsonb end)
        ||
        (case when not v_has_validated_pair then '["validated-alternate-pair-metadata-not-yet-available"]'::jsonb else '[]'::jsonb end)
        ||
        (case when v_active_opt_in_count < 1 then '["at-least-one-currently-opted-in-learner-required"]'::jsonb else '[]'::jsonb end)
        ||
        (case when not v_has_active_authorization then '["separate-activation-authorization-required"]'::jsonb else '[]'::jsonb end)
        ||
        (case when not v_scheduler_kernel then '["retention-probe-scheduler-kernel-unavailable"]'::jsonb else '[]'::jsonb end)
        ||
        (case when not v_delivery_evidence_kernel then '["retention-probe-delivery-evidence-kernel-unavailable"]'::jsonb else '[]'::jsonb end)
        ||
        (case when not v_automatic_execution then '["automatic-scheduler-execution-not-enabled"]'::jsonb else '[]'::jsonb end)
        ||
        (case when not v_learner_route then '["learner-delivery-route-not-enabled"]'::jsonb else '[]'::jsonb end)
    ),
    'activationAuthority',v_has_active_authorization,
    'probeSchedulingEnabled',false,
    'learnerDeliveryEnabled',v_learner_route,
    'studyNowAuthority',false,
    'masteryInferenceAuthority',false
  );
end;
$function$;

revoke all on function public.study_retention_probe_activation_readiness_v1()
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_activation_readiness_v1()
  to service_role;
