create table public.content_review_workflow_measurements (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null unique
    references public.content_review_events(id) on delete restrict,
  reviewer_id uuid not null
    references auth.users(id) on delete restrict,
  question_version_id text not null
    check (question_version_id ~ '^[a-zA-Z0-9:_@.\-]{1,180}$'),
  review_kind text not null
    check (review_kind in ('medical','references','rights')),
  review_target_sha256 text not null
    check (review_target_sha256 ~ '^[0-9a-f]{64}$'),
  workflow_mode text not null
    check (workflow_mode in ('standard','claim_first','source_first')),
  experiment_id text
    check (experiment_id is null or experiment_id ~ '^[a-zA-Z0-9:_@.\-]{1,160}$'),
  client_session_id uuid not null,
  foreground_active_ms bigint not null
    check (foreground_active_ms between 0 and 14400000),
  elapsed_wall_ms bigint not null
    check (elapsed_wall_ms between 0 and 21600000),
  queue_size integer not null
    check (queue_size between 1 and 5000),
  source_ids text[] not null,
  recorded_at timestamptz not null default pg_catalog.now(),
  contract_id text not null default 'content-review-workflow-measurement-v1'
    check (contract_id='content-review-workflow-measurement-v1'),
  check (elapsed_wall_ms >= foreground_active_ms)
);

create index content_review_workflow_measurements_reviewer_time_idx
  on public.content_review_workflow_measurements(reviewer_id, recorded_at);
create index content_review_workflow_measurements_experiment_idx
  on public.content_review_workflow_measurements(experiment_id, review_kind, workflow_mode, recorded_at);

alter table public.content_review_workflow_measurements enable row level security;
revoke all on table public.content_review_workflow_measurements
  from public, anon, authenticated, service_role;
grant select on table public.content_review_workflow_measurements
  to service_role;

create or replace function public.block_content_review_measurement_mutation()
returns trigger
language plpgsql
set search_path=''
as $function$
begin
  raise exception using errcode='55000', message='content_review_measurement_append_only';
end;
$function$;

create trigger content_review_workflow_measurements_immutable
before update or delete on public.content_review_workflow_measurements
for each row execute function public.block_content_review_measurement_mutation();

create or replace function public.record_content_review_workflow_measurement(
  p_review_id uuid,
  p_reviewer uuid,
  p_workflow_mode text,
  p_experiment_id text,
  p_client_session_id uuid,
  p_foreground_active_ms bigint,
  p_elapsed_wall_ms bigint,
  p_queue_size integer
)
returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $function$
declare
  v_review public.content_review_events%rowtype;
  v_source_ids text[];
  v_row public.content_review_workflow_measurements%rowtype;
begin
  if p_review_id is null or p_reviewer is null or p_client_session_id is null then
    raise exception using errcode='22023', message='review_measurement_identity_required';
  end if;
  if p_workflow_mode not in ('standard','claim_first','source_first') then
    raise exception using errcode='22023', message='review_measurement_mode_invalid';
  end if;
  if p_experiment_id is not null
     and p_experiment_id !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' then
    raise exception using errcode='22023', message='review_measurement_experiment_invalid';
  end if;
  if p_foreground_active_ms is null or p_foreground_active_ms < 0 or p_foreground_active_ms > 14400000
     or p_elapsed_wall_ms is null or p_elapsed_wall_ms < p_foreground_active_ms or p_elapsed_wall_ms > 21600000
     or p_queue_size is null or p_queue_size < 1 or p_queue_size > 5000 then
    raise exception using errcode='22023', message='review_measurement_timing_invalid';
  end if;

  select * into v_review
  from public.content_review_events
  where id=p_review_id;

  if not found or v_review.question_version_id is null then
    raise exception using errcode='22023', message='review_measurement_review_unknown';
  end if;
  if v_review.reviewer_id <> p_reviewer then
    raise exception using errcode='42501', message='reviewer_not_authorized';
  end if;
  if p_workflow_mode='claim_first' and v_review.review_kind <> 'references' then
    raise exception using errcode='22023', message='review_measurement_mode_kind_mismatch';
  end if;
  if p_workflow_mode='source_first' and v_review.review_kind <> 'rights' then
    raise exception using errcode='22023', message='review_measurement_mode_kind_mismatch';
  end if;

  select coalesce(array_agg(source_id order by source_id),'{}'::text[])
  into v_source_ids
  from (
    select jsonb_array_elements_text(q->'sourceIds') as source_id
    from public.study_catalog c
    cross join lateral jsonb_array_elements(c.body->'questions') q
    where c.id=1 and q->>'questionVersionId'=v_review.question_version_id
  ) s;

  insert into public.content_review_workflow_measurements(
    review_id,reviewer_id,question_version_id,review_kind,review_target_sha256,
    workflow_mode,experiment_id,client_session_id,foreground_active_ms,
    elapsed_wall_ms,queue_size,source_ids
  ) values (
    v_review.id,v_review.reviewer_id,v_review.question_version_id,v_review.review_kind,
    v_review.target_sha256,p_workflow_mode,p_experiment_id,p_client_session_id,
    p_foreground_active_ms,p_elapsed_wall_ms,p_queue_size,v_source_ids
  )
  on conflict (review_id) do nothing;

  select * into strict v_row
  from public.content_review_workflow_measurements
  where review_id=p_review_id;

  if v_row.reviewer_id <> p_reviewer
     or v_row.workflow_mode <> p_workflow_mode
     or v_row.experiment_id is distinct from p_experiment_id
     or v_row.client_session_id <> p_client_session_id
     or v_row.foreground_active_ms <> p_foreground_active_ms
     or v_row.elapsed_wall_ms <> p_elapsed_wall_ms
     or v_row.queue_size <> p_queue_size then
    raise exception using errcode='22023', message='conflicting_review_measurement_retry';
  end if;

  return jsonb_build_object(
    'contractId',v_row.contract_id,
    'measurementId',v_row.id,
    'reviewId',v_row.review_id,
    'questionVersionId',v_row.question_version_id,
    'reviewKind',v_row.review_kind,
    'workflowMode',v_row.workflow_mode,
    'experimentId',v_row.experiment_id,
    'foregroundActiveMs',v_row.foreground_active_ms,
    'elapsedWallMs',v_row.elapsed_wall_ms,
    'queueSize',v_row.queue_size,
    'recordedAt',v_row.recorded_at,
    'causal',false
  );
end;
$function$;

revoke all on function public.record_content_review_workflow_measurement(
  uuid,uuid,text,text,uuid,bigint,bigint,integer
) from public, anon, authenticated, service_role;
grant execute on function public.record_content_review_workflow_measurement(
  uuid,uuid,text,text,uuid,bigint,bigint,integer
) to service_role;

create or replace function public.content_review_workflow_measurement_summary(
  p_experiment_id text
)
returns jsonb
language plpgsql
stable
security definer
set search_path='public','pg_temp'
as $function$
declare
  v_workflows jsonb;
  v_count integer;
begin
  if p_experiment_id is null
     or p_experiment_id !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' then
    raise exception using errcode='22023', message='review_measurement_experiment_invalid';
  end if;

  with scoped as (
    select m.*, e.decision
    from public.content_review_workflow_measurements m
    join public.content_review_events e on e.id=m.review_id
    where m.experiment_id=p_experiment_id
  ),
  grouped as (
    select
      workflow_mode,
      count(*)::integer decisions,
      count(*) filter (where decision='approved')::integer approved,
      count(*) filter (where decision='rejected')::integer rejected,
      sum(foreground_active_ms)::bigint total_foreground_active_ms,
      round(percentile_cont(0.5) within group (order by foreground_active_ms))::bigint median_foreground_active_ms,
      sum(elapsed_wall_ms)::bigint total_elapsed_wall_ms,
      round(percentile_cont(0.5) within group (order by elapsed_wall_ms))::bigint median_elapsed_wall_ms
    from scoped
    group by workflow_mode
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'workflowMode',workflow_mode,
      'decisions',decisions,
      'approved',approved,
      'rejected',rejected,
      'rejectionRate',case when decisions=0 then null else rejected::numeric/decisions end,
      'totalForegroundActiveMs',total_foreground_active_ms,
      'medianForegroundActiveMs',median_foreground_active_ms,
      'totalElapsedWallMs',total_elapsed_wall_ms,
      'medianElapsedWallMs',median_elapsed_wall_ms
    ) order by workflow_mode),'[]'::jsonb),
    coalesce(sum(decisions),0)::integer
  into v_workflows,v_count
  from grouped;

  return jsonb_build_object(
    'contractId','content-review-workflow-measurement-summary-v1',
    'experimentId',p_experiment_id,
    'decisionCount',v_count,
    'workflows',v_workflows,
    'causal',false,
    'interpretation','descriptive operational measurement; matched clusters are not randomized'
  );
end;
$function$;

revoke all on function public.content_review_workflow_measurement_summary(text)
  from public, anon, authenticated, service_role;
grant execute on function public.content_review_workflow_measurement_summary(text)
  to service_role;
