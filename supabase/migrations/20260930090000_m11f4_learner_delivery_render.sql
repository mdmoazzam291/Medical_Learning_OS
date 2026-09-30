-- M11f4: learner-controlled retention-probe delivery + browser-render acknowledgement.
-- Automatic scheduling remains disabled. The learner can only open an already-created,
-- currently eligible assignment after the existing consent, authorization, timing, content
-- and workload gates have allowed the server-served payload.

create table if not exists public.study_retention_probe_client_events (
  client_event_id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  served_event_id uuid not null references public.study_retention_probe_served_events(served_event_id) on delete restrict,
  assignment_id uuid not null references public.study_retention_probe_assignments(assignment_id) on delete restrict,
  session_id uuid not null references public.study_sessions(id) on delete restrict,
  event_type text not null check (event_type in ('session_opened','browser_rendered')),
  learner_question_sha256 text not null check (learner_question_sha256 ~ '^[0-9a-f]{64}$'),
  request_key text not null check (request_key ~ '^[a-zA-Z0-9:_@.\-]{1,160}$'),
  occurred_at timestamptz not null,
  event_sha256 text not null check (event_sha256 ~ '^[0-9a-f]{64}$'),
  recorded_at timestamptz not null default now(),
  unique (served_event_id,event_type),
  unique (learner_id,request_key),
  unique (event_sha256)
);

create index if not exists study_retention_probe_client_events_learner_idx
  on public.study_retention_probe_client_events (learner_id,occurred_at desc,client_event_id desc);

create index if not exists study_retention_probe_client_events_session_idx
  on public.study_retention_probe_client_events (session_id,event_type);

alter table public.study_retention_probe_client_events enable row level security;
revoke all on table public.study_retention_probe_client_events
  from public,anon,authenticated,service_role;
grant select,insert on table public.study_retention_probe_client_events
  to service_role;

drop trigger if exists study_retention_probe_client_events_append_only
  on public.study_retention_probe_client_events;
create trigger study_retention_probe_client_events_append_only
before update or delete on public.study_retention_probe_client_events
for each row execute function public.prevent_learner_evidence_mutation();

create or replace function public.study_open_ordinary_session_id_v1(
  p_learner uuid
)
returns uuid
language sql
stable
security invoker
set search_path=''
as $function$
  select s.id
  from public.study_sessions s
  where s.learner_id=p_learner
    and s.closed=false
    and not exists (
      select 1
      from public.study_retention_probe_client_events e
      where e.learner_id=p_learner
        and e.session_id=s.id
        and e.event_type='session_opened'
    )
  order by s.created_at,s.id
  limit 1;
$function$;

revoke all on function public.study_open_ordinary_session_id_v1(uuid)
  from public,anon,authenticated;
grant execute on function public.study_open_ordinary_session_id_v1(uuid)
  to service_role;

-- Preserve the ordinary session contract while ensuring a research-probe session can never
-- become the learner's ordinary Study Now / QBank resume target.
create or replace function public.study_start_session(
  p_learner uuid,
  p_id uuid,
  p_ids jsonb,
  p_started timestamptz
)
returns jsonb
language plpgsql
set search_path=''
as $function$
declare
  v_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_learner::text,0));

  select public.study_open_ordinary_session_id_v1(p_learner)
  into v_id;

  if v_id is null then
    insert into public.study_sessions (id,learner_id,question_version_ids,question_started_at)
    values (p_id,p_learner,p_ids,p_started);
    v_id:=p_id;
  end if;

  return pg_catalog.jsonb_build_object('id',v_id);
end;
$function$;

revoke all on function public.study_start_session(uuid,uuid,jsonb,timestamptz)
  from public,anon,authenticated;
grant execute on function public.study_start_session(uuid,uuid,jsonb,timestamptz)
  to service_role;

create or replace function public.study_retention_probe_learner_inbox_v1(
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
  v_served public.study_retention_probe_served_events%rowtype;
  v_assignment public.study_retention_probe_assignments%rowtype;
  v_session_event public.study_retention_probe_client_events%rowtype;
  v_render_event public.study_retention_probe_client_events%rowtype;
  v_readiness jsonb;
begin
  if p_learner is null then
    raise exception using errcode='22023',message='retention_probe_learner_required';
  end if;

  -- Resume the exact immutable served payload. This is a read only projection and never
  -- reconstructs or re-serves the question.
  select e.*
  into v_served
  from public.study_retention_probe_served_events e
  where e.learner_id=p_learner
    and not exists (
      select 1
      from public.study_retention_probe_response_bindings b
      where b.learner_id=p_learner
        and b.served_event_id=e.served_event_id
    )
  order by e.served_at,e.served_event_id
  limit 1;

  if v_served.served_event_id is not null then
    select e.* into v_session_event
    from public.study_retention_probe_client_events e
    where e.learner_id=p_learner
      and e.served_event_id=v_served.served_event_id
      and e.event_type='session_opened'
    limit 1;

    select e.* into v_render_event
    from public.study_retention_probe_client_events e
    where e.learner_id=p_learner
      and e.served_event_id=v_served.served_event_id
      and e.event_type='browser_rendered'
    limit 1;

    return pg_catalog.jsonb_build_object(
      'contractId','retention-probe-learner-inbox-v1',
      'state','in_progress',
      'assignmentId',v_served.assignment_id,
      'servedEventId',v_served.served_event_id,
      'sessionId',v_session_event.session_id,
      'learnerQuestion',v_served.learner_question,
      'learnerQuestionSha256',v_served.learner_question_sha256,
      'servedAt',v_served.served_at,
      'browserRenderedConfirmed',v_render_event.client_event_id is not null,
      'learnerViewedConfirmed',false,
      'automaticExecutionEnabled',false,
      'studyNowAuthority',false,
      'masteryInferenceAuthority',false
    );
  end if;

  select a.*
  into v_assignment
  from public.study_retention_probe_assignments a
  where a.learner_id=p_learner
    and not exists (
      select 1
      from public.study_retention_probe_served_events e
      where e.learner_id=p_learner
        and e.assignment_id=a.assignment_id
    )
  order by a.scheduled_at,a.assignment_id
  limit 1;

  if v_assignment.assignment_id is null then
    return pg_catalog.jsonb_build_object(
      'contractId','retention-probe-learner-inbox-v1',
      'state','none',
      'automaticExecutionEnabled',false,
      'studyNowAuthority',false,
      'masteryInferenceAuthority',false
    );
  end if;

  v_readiness:=public.study_retention_probe_delivery_readiness_v1(
    v_assignment.assignment_id,
    p_learner,
    p_now
  );

  if coalesce((v_readiness->>'deliverable')::boolean,false) is not true then
    return pg_catalog.jsonb_build_object(
      'contractId','retention-probe-learner-inbox-v1',
      'state','blocked',
      'assignmentId',v_assignment.assignment_id,
      'windowCloseAt',v_assignment.window_close_at,
      'blockingReasons',coalesce(v_readiness->'blockingReasons','[]'::jsonb),
      'automaticExecutionEnabled',false,
      'studyNowAuthority',false,
      'masteryInferenceAuthority',false
    );
  end if;

  -- Do not expose target question identity/content before explicit learner start.
  return pg_catalog.jsonb_build_object(
    'contractId','retention-probe-learner-inbox-v1',
    'state','available',
    'assignmentId',v_assignment.assignment_id,
    'windowCloseAt',v_assignment.window_close_at,
    'automaticExecutionEnabled',false,
    'studyNowAuthority',false,
    'masteryInferenceAuthority',false
  );
end;
$function$;

revoke all on function public.study_retention_probe_learner_inbox_v1(uuid,timestamptz)
  from public,anon,authenticated;
grant execute on function public.study_retention_probe_learner_inbox_v1(uuid,timestamptz)
  to service_role;

create or replace function public.study_open_retention_probe_session_v1(
  p_learner uuid,
  p_served_event uuid,
  p_session uuid,
  p_request_key text
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions,pg_temp
as $function$
declare
  v_now timestamptz:=pg_catalog.clock_timestamp();
  v_served public.study_retention_probe_served_events%rowtype;
  v_existing public.study_retention_probe_client_events%rowtype;
  v_body jsonb;
  v_hash text;
  v_event public.study_retention_probe_client_events%rowtype;
begin
  if p_learner is null or p_served_event is null or p_session is null then
    raise exception using errcode='22023',message='retention_probe_session_identity_required';
  end if;
  if p_request_key is null
     or p_request_key !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' then
    raise exception using errcode='22023',message='invalid_retention_probe_session_request_key';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_learner::text,0));

  select e.* into v_existing
  from public.study_retention_probe_client_events e
  where e.learner_id=p_learner
    and (e.served_event_id=p_served_event or e.request_key=p_request_key)
    and e.event_type='session_opened'
  limit 1;

  if v_existing.client_event_id is not null then
    if v_existing.served_event_id<>p_served_event then
      raise exception using errcode='40900',message='retention_probe_session_request_collision';
    end if;
    return pg_catalog.jsonb_build_object(
      'contractId','retention-probe-session-open-receipt-v1',
      'clientEventId',v_existing.client_event_id,
      'servedEventId',v_existing.served_event_id,
      'assignmentId',v_existing.assignment_id,
      'sessionId',v_existing.session_id,
      'openedAt',v_existing.occurred_at,
      'eventSha256',v_existing.event_sha256,
      'idempotentReplay',true
    );
  end if;

  select * into v_served
  from public.study_retention_probe_served_events e
  where e.served_event_id=p_served_event
    and e.learner_id=p_learner
  limit 1;

  if v_served.served_event_id is null then
    raise exception using errcode='22023',message='retention_probe_served_event_not_found';
  end if;

  if exists (
    select 1 from public.study_retention_probe_response_bindings b
    where b.learner_id=p_learner and b.served_event_id=p_served_event
  ) then
    raise exception using errcode='55000',message='retention_probe_already_answered';
  end if;

  if exists (
    select 1
    from public.study_sessions s
    where s.learner_id=p_learner
      and s.closed=false
      and not exists (
        select 1
        from public.study_retention_probe_client_events e
        where e.learner_id=p_learner
          and e.session_id=s.id
          and e.event_type='session_opened'
      )
  ) then
    raise exception using errcode='55000',message='ordinary_study_session_takes_priority';
  end if;

  insert into public.study_sessions (
    id,learner_id,question_version_ids,question_started_at
  ) values (
    p_session,
    p_learner,
    pg_catalog.jsonb_build_array(v_served.target_question_version_id),
    v_now
  );

  v_body:=pg_catalog.jsonb_build_object(
    'contractVersion',1,
    'learnerId',p_learner,
    'servedEventId',v_served.served_event_id,
    'assignmentId',v_served.assignment_id,
    'sessionId',p_session,
    'learnerQuestionSha256',v_served.learner_question_sha256,
    'requestKey',p_request_key,
    'openedAt',v_now,
    'semanticClaim','probe-session-opened'
  );

  v_hash:=pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_body::text,'UTF8'),'sha256'),
    'hex'
  );

  insert into public.study_retention_probe_client_events (
    learner_id,served_event_id,assignment_id,session_id,event_type,
    learner_question_sha256,request_key,occurred_at,event_sha256
  ) values (
    p_learner,v_served.served_event_id,v_served.assignment_id,p_session,'session_opened',
    v_served.learner_question_sha256,p_request_key,v_now,v_hash
  )
  returning * into v_event;

  return pg_catalog.jsonb_build_object(
    'contractId','retention-probe-session-open-receipt-v1',
    'clientEventId',v_event.client_event_id,
    'servedEventId',v_event.served_event_id,
    'assignmentId',v_event.assignment_id,
    'sessionId',v_event.session_id,
    'openedAt',v_event.occurred_at,
    'eventSha256',v_event.event_sha256,
    'idempotentReplay',false
  );
end;
$function$;

revoke all on function public.study_open_retention_probe_session_v1(uuid,uuid,uuid,text)
  from public,anon,authenticated;
grant execute on function public.study_open_retention_probe_session_v1(uuid,uuid,uuid,text)
  to service_role;

create or replace function public.study_record_retention_probe_rendered_v1(
  p_learner uuid,
  p_served_event uuid,
  p_request_key text,
  p_learner_question_sha256 text
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions,pg_temp
as $function$
declare
  v_now timestamptz:=pg_catalog.clock_timestamp();
  v_served public.study_retention_probe_served_events%rowtype;
  v_session_event public.study_retention_probe_client_events%rowtype;
  v_existing public.study_retention_probe_client_events%rowtype;
  v_body jsonb;
  v_hash text;
  v_event public.study_retention_probe_client_events%rowtype;
begin
  if p_learner is null or p_served_event is null then
    raise exception using errcode='22023',message='retention_probe_render_identity_required';
  end if;
  if p_request_key is null
     or p_request_key !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' then
    raise exception using errcode='22023',message='invalid_retention_probe_render_request_key';
  end if;
  if p_learner_question_sha256 is null
     or p_learner_question_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='invalid_retention_probe_question_sha256';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_learner::text,0));

  select e.* into v_existing
  from public.study_retention_probe_client_events e
  where e.learner_id=p_learner
    and (e.served_event_id=p_served_event or e.request_key=p_request_key)
    and e.event_type='browser_rendered'
  limit 1;

  if v_existing.client_event_id is not null then
    if v_existing.served_event_id<>p_served_event
       or v_existing.learner_question_sha256<>p_learner_question_sha256 then
      raise exception using errcode='40900',message='retention_probe_render_request_collision';
    end if;
    return pg_catalog.jsonb_build_object(
      'contractId','retention-probe-browser-render-receipt-v1',
      'clientEventId',v_existing.client_event_id,
      'servedEventId',v_existing.served_event_id,
      'assignmentId',v_existing.assignment_id,
      'sessionId',v_existing.session_id,
      'learnerQuestionSha256',v_existing.learner_question_sha256,
      'renderedAt',v_existing.occurred_at,
      'eventSha256',v_existing.event_sha256,
      'browserRenderedConfirmed',true,
      'learnerViewedConfirmed',false,
      'idempotentReplay',true
    );
  end if;

  select * into v_served
  from public.study_retention_probe_served_events e
  where e.served_event_id=p_served_event
    and e.learner_id=p_learner
  limit 1;
  if v_served.served_event_id is null then
    raise exception using errcode='22023',message='retention_probe_served_event_not_found';
  end if;
  if v_served.learner_question_sha256<>p_learner_question_sha256 then
    raise exception using errcode='22023',message='retention_probe_render_question_mismatch';
  end if;

  select e.* into v_session_event
  from public.study_retention_probe_client_events e
  where e.learner_id=p_learner
    and e.served_event_id=p_served_event
    and e.event_type='session_opened'
  limit 1;
  if v_session_event.client_event_id is null then
    raise exception using errcode='55000',message='retention_probe_session_not_open';
  end if;

  v_body:=pg_catalog.jsonb_build_object(
    'contractVersion',1,
    'learnerId',p_learner,
    'servedEventId',v_served.served_event_id,
    'assignmentId',v_served.assignment_id,
    'sessionId',v_session_event.session_id,
    'learnerQuestionSha256',v_served.learner_question_sha256,
    'requestKey',p_request_key,
    'renderedAt',v_now,
    'semanticClaim','browser-rendered-not-confirmed-viewed'
  );

  v_hash:=pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_body::text,'UTF8'),'sha256'),
    'hex'
  );

  insert into public.study_retention_probe_client_events (
    learner_id,served_event_id,assignment_id,session_id,event_type,
    learner_question_sha256,request_key,occurred_at,event_sha256
  ) values (
    p_learner,v_served.served_event_id,v_served.assignment_id,v_session_event.session_id,
    'browser_rendered',v_served.learner_question_sha256,p_request_key,v_now,v_hash
  )
  returning * into v_event;

  return pg_catalog.jsonb_build_object(
    'contractId','retention-probe-browser-render-receipt-v1',
    'clientEventId',v_event.client_event_id,
    'servedEventId',v_event.served_event_id,
    'assignmentId',v_event.assignment_id,
    'sessionId',v_event.session_id,
    'learnerQuestionSha256',v_event.learner_question_sha256,
    'renderedAt',v_event.occurred_at,
    'eventSha256',v_event.event_sha256,
    'browserRenderedConfirmed',true,
    'learnerViewedConfirmed',false,
    'idempotentReplay',false
  );
end;
$function$;

revoke all on function public.study_record_retention_probe_rendered_v1(uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.study_record_retention_probe_rendered_v1(uuid,uuid,text,text)
  to service_role;

-- The learner delivery surface now exists. Scheduler execution is still service-only/manual;
-- no cron, automatic assignment creation, Study Now authority or inference authority is added.
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
  v_candidate_count integer:=0;
  v_assignment_count integer:=0;
  v_active_authorization boolean:=false;
begin
  v_authorization:=public.study_retention_probe_activation_authorization_readiness_v1();
  v_active_authorization:=coalesce((v_authorization->'readiness'->>'canRevoke')::boolean,false);

  select count(*)::integer into v_candidate_count
  from public.study_retention_probe_scheduler_candidates_v1(p_now);

  select count(*)::integer into v_assignment_count
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
    'learnerDeliveryEnabled',true,
    'browserRenderEvidenceAvailable',true,
    'canCreateAssignmentNow',v_active_authorization and v_candidate_count>0,
    'blockingReasons',
      (case when not v_active_authorization
        then '["active-retention-probe-authorization-required"]'::jsonb
        else '[]'::jsonb end)
      ||
      (case when v_active_authorization and v_candidate_count=0
        then '["no-eligible-probe-candidate-now"]'::jsonb
        else '[]'::jsonb end)
      ||
      '["automatic-execution-not-enabled"]'::jsonb,
    'studyNowAuthority',false,
    'masteryInferenceAuthority',false
  );
end;
$function$;

revoke all on function public.study_retention_probe_scheduler_readiness_v1(timestamptz)
  from public,anon,authenticated;
grant execute on function public.study_retention_probe_scheduler_readiness_v1(timestamptz)
  to service_role;
