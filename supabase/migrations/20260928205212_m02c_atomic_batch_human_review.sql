create table public.content_review_workflow_batch_measurements (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  review_kind text not null check (review_kind='references'),
  experiment_id text not null check (experiment_id='m02c-references-workflow-v2'),
  workflow_mode text not null check (workflow_mode in ('claim_first','standard')),
  source_id text not null,
  client_session_id uuid not null,
  review_ids uuid[] not null,
  question_version_ids text[] not null,
  decisions text[] not null,
  foreground_active_ms bigint not null check (foreground_active_ms between 0 and 14400000),
  elapsed_wall_ms bigint not null check (elapsed_wall_ms between 0 and 21600000),
  queue_size integer not null check (queue_size between 1 and 5000),
  attestation_version text not null check (attestation_version='references-batch-attestation-v1'),
  recorded_at timestamptz not null default now(),
  contract_id text not null default 'content-review-workflow-batch-measurement-v1'
    check (contract_id='content-review-workflow-batch-measurement-v1'),
  check (elapsed_wall_ms >= foreground_active_ms),
  check (cardinality(review_ids)=cardinality(question_version_ids)),
  check (cardinality(decisions)=cardinality(question_version_ids)),
  check (cardinality(question_version_ids)=7),
  unique (reviewer_id, experiment_id, workflow_mode)
);

alter table public.content_review_workflow_batch_measurements enable row level security;
revoke all on table public.content_review_workflow_batch_measurements
  from public, anon, authenticated, service_role;
grant select on table public.content_review_workflow_batch_measurements to service_role;

create or replace function public.block_content_review_batch_measurement_mutation()
returns trigger
language plpgsql
set search_path=''
as $function$
begin
  raise exception using errcode='55000', message='content_review_batch_measurement_append_only';
end;
$function$;

revoke all on function public.block_content_review_batch_measurement_mutation()
  from public, anon, authenticated, service_role;

create trigger content_review_workflow_batch_measurements_immutable
before update or delete on public.content_review_workflow_batch_measurements
for each row execute function public.block_content_review_batch_measurement_mutation();

create or replace function public.record_content_review_batch_with_measurement(
  p_question_version_ids text[],
  p_decisions text[],
  p_notes text[],
  p_reviewer uuid,
  p_experiment_id text,
  p_workflow_mode text,
  p_client_session_id uuid,
  p_foreground_active_ms bigint,
  p_elapsed_wall_ms bigint,
  p_queue_size integer,
  p_attestation_version text,
  p_attested boolean
)
returns jsonb
language plpgsql
security definer
set search_path='public','extensions','pg_temp'
as $function$
declare
  v_expected_source text;
  v_expected_ids text[];
  v_review_ids uuid[] := '{}'::uuid[];
  v_receipts jsonb := '[]'::jsonb;
  v_receipt record;
  v_i integer;
  v_batch_id uuid := gen_random_uuid();
begin
  if p_reviewer is null or p_client_session_id is null then
    raise exception using errcode='22023', message='review_batch_identity_required';
  end if;
  if p_experiment_id <> 'm02c-references-workflow-v2' then
    raise exception using errcode='22023', message='review_batch_experiment_invalid';
  end if;
  if p_workflow_mode='claim_first' then
    v_expected_source := 'cdc:co:clinical-guidance:2024-07-08';
  elsif p_workflow_mode='standard' then
    v_expected_source := 'asa:preop-fasting:2017';
  else
    raise exception using errcode='22023', message='review_batch_workflow_invalid';
  end if;
  if p_attestation_version <> 'references-batch-attestation-v1' or p_attested is distinct from true then
    raise exception using errcode='22023', message='review_batch_attestation_required';
  end if;
  if cardinality(p_question_version_ids) <> 7
     or cardinality(p_decisions) <> 7
     or cardinality(p_notes) <> 7 then
    raise exception using errcode='22023', message='review_batch_size_invalid';
  end if;
  if (select count(distinct x) from unnest(p_question_version_ids) x) <> 7 then
    raise exception using errcode='22023', message='review_batch_duplicate_target';
  end if;
  if exists (select 1 from unnest(p_decisions) x where x not in ('approved','rejected')) then
    raise exception using errcode='22023', message='invalid_review_decision';
  end if;
  if exists (
    select 1 from unnest(p_notes) n
    where char_length(btrim(coalesce(n,''))) not between 1 and 4000
  ) then
    raise exception using errcode='22023', message='invalid_review_notes';
  end if;
  if p_foreground_active_ms is null or p_foreground_active_ms < 0 or p_foreground_active_ms > 14400000
     or p_elapsed_wall_ms is null or p_elapsed_wall_ms < p_foreground_active_ms or p_elapsed_wall_ms > 21600000
     or p_queue_size is null or p_queue_size < 1 or p_queue_size > 5000 then
    raise exception using errcode='22023', message='review_batch_timing_invalid';
  end if;
  if not public.has_active_reviewer_grant(p_reviewer,'references') then
    raise exception using errcode='42501', message='reviewer_not_authorized';
  end if;

  select array_agg(question_version_id order by question_version_id)
  into v_expected_ids
  from (
    select q->>'questionVersionId' as question_version_id
    from public.study_catalog c
    cross join lateral jsonb_array_elements(c.body->'questions') q
    where c.id=1
      and q->>'status'='in_review'
      and q->'sourceIds' ? v_expected_source
      and not exists (
        select 1 from public.content_review_events e
        where e.question_version_id=q->>'questionVersionId'
          and e.review_kind='references'
      )
  ) expected;

  if coalesce(cardinality(v_expected_ids),0) <> 7
     or v_expected_ids is distinct from (
       select array_agg(x order by x) from unnest(p_question_version_ids) x
     ) then
    raise exception using errcode='22023', message='review_batch_targets_changed';
  end if;

  for v_i in 1..7 loop
    select * into strict v_receipt
    from public.record_content_review(
      p_question_version_ids[v_i],
      'references',
      p_reviewer,
      p_decisions[v_i],
      p_notes[v_i]
    );
    v_review_ids := array_append(v_review_ids,v_receipt.review_id);
    v_receipts := v_receipts || jsonb_build_array(jsonb_build_object(
      'reviewId',v_receipt.review_id,
      'questionVersionId',p_question_version_ids[v_i],
      'decision',p_decisions[v_i],
      'targetSha256',v_receipt.target_sha256,
      'reviewedAt',v_receipt.reviewed_at
    ));
  end loop;

  insert into public.content_review_workflow_batch_measurements(
    id,reviewer_id,review_kind,experiment_id,workflow_mode,source_id,
    client_session_id,review_ids,question_version_ids,decisions,
    foreground_active_ms,elapsed_wall_ms,queue_size,attestation_version
  ) values (
    v_batch_id,p_reviewer,'references',p_experiment_id,p_workflow_mode,v_expected_source,
    p_client_session_id,v_review_ids,p_question_version_ids,p_decisions,
    p_foreground_active_ms,p_elapsed_wall_ms,p_queue_size,p_attestation_version
  );

  return jsonb_build_object(
    'contractId','content-review-batch-receipt-v1',
    'batchMeasurementId',v_batch_id,
    'experimentId',p_experiment_id,
    'workflowMode',p_workflow_mode,
    'sourceId',v_expected_source,
    'decisionCount',7,
    'reviews',v_receipts,
    'causal',false
  );
end;
$function$;

revoke all on function public.record_content_review_batch_with_measurement(
  text[],text[],text[],uuid,text,text,uuid,bigint,bigint,integer,text,boolean
) from public, anon, authenticated;
grant execute on function public.record_content_review_batch_with_measurement(
  text[],text[],text[],uuid,text,text,uuid,bigint,bigint,integer,text,boolean
) to service_role;

create or replace function public.content_review_workflow_batch_measurement_summary(
  p_experiment_id text
)
returns jsonb
language sql
stable
security definer
set search_path='public','pg_temp'
as $function$
with scoped as (
  select
    m.workflow_mode,
    m.foreground_active_ms,
    m.elapsed_wall_ms,
    m.recorded_at,
    d.decision
  from public.content_review_workflow_batch_measurements m
  cross join lateral unnest(m.decisions) d(decision)
  where m.experiment_id=p_experiment_id
),
timing as (
  select
    workflow_mode,
    count(distinct recorded_at)::integer as batches,
    max(foreground_active_ms)::bigint as foreground_active_ms,
    max(elapsed_wall_ms)::bigint as elapsed_wall_ms
  from scoped
  group by workflow_mode
),
decisions as (
  select
    workflow_mode,
    count(*)::integer as decisions,
    count(*) filter(where decision='approved')::integer as approved,
    count(*) filter(where decision='rejected')::integer as rejected
  from scoped
  group by workflow_mode
)
select jsonb_build_object(
  'contractId','content-review-workflow-batch-measurement-summary-v1',
  'experimentId',p_experiment_id,
  'workflows',coalesce((
    select jsonb_agg(jsonb_build_object(
      'workflowMode',d.workflow_mode,
      'batches',t.batches,
      'decisions',d.decisions,
      'approved',d.approved,
      'rejected',d.rejected,
      'rejectionRate',case when d.decisions=0 then null else d.rejected::numeric/d.decisions end,
      'foregroundActiveMs',t.foreground_active_ms,
      'elapsedWallMs',t.elapsed_wall_ms
    ) order by d.workflow_mode)
    from decisions d join timing t using(workflow_mode)
  ),'[]'::jsonb),
  'causal',false,
  'interpretation','descriptive two-session human-review comparison; batch submission removes repetitive form overhead but does not automate review judgment'
);
$function$;

revoke all on function public.content_review_workflow_batch_measurement_summary(text)
  from public, anon, authenticated, service_role;
grant execute on function public.content_review_workflow_batch_measurement_summary(text)
  to service_role;
