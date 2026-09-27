-- M08d: durable exam-run projection, append-only transition ledger and immutable completion receipt.

create table if not exists public.exam_runs (
  id uuid primary key,
  learner_id uuid not null references auth.users(id) on delete restrict,
  exam_id text not null,
  rule_set_id text not null,
  engine_id text not null,
  status text not null check (status in ('in_progress', 'completed', 'cancelled')),
  state_revision integer not null default 0 check (state_revision >= 0),
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  started_at timestamptz not null,
  scheduled_end_at timestamptz not null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end_at > started_at),
  check (
    (status = 'in_progress' and completed_at is null)
    or (status = 'completed' and completed_at is not null)
    or (status = 'cancelled')
  )
);

create unique index if not exists exam_runs_one_open_per_learner
  on public.exam_runs (learner_id)
  where status = 'in_progress';

create index if not exists exam_runs_learner_created
  on public.exam_runs (learner_id, created_at desc, id);

alter table public.exam_runs enable row level security;
revoke all on table public.exam_runs from public, anon, authenticated, service_role;
grant select, insert, update on table public.exam_runs to service_role;

create table if not exists public.exam_run_events (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.exam_runs(id) on delete restrict,
  learner_id uuid not null references auth.users(id) on delete restrict,
  request_key text not null check (char_length(btrim(request_key)) between 1 and 200),
  revision_after integer not null check (revision_after >= 0),
  event_type text not null check (
    event_type in (
      'run.created',
      'answer.set',
      'review.set',
      'clock.advanced',
      'run.completed',
      'run.cancelled'
    )
  ),
  event jsonb not null check (jsonb_typeof(event) = 'object'),
  transition_sha256 text not null check (transition_sha256 ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique (run_id, request_key),
  unique (run_id, revision_after)
);

create index if not exists exam_run_events_learner_time
  on public.exam_run_events (learner_id, recorded_at, id);

alter table public.exam_run_events enable row level security;
revoke all on table public.exam_run_events from public, anon, authenticated, service_role;
grant select, insert on table public.exam_run_events to service_role;

create table if not exists public.exam_run_receipts (
  run_id uuid primary key references public.exam_runs(id) on delete restrict,
  learner_id uuid not null references auth.users(id) on delete restrict,
  rule_set_id text not null,
  receipt jsonb not null check (jsonb_typeof(receipt) = 'object'),
  completed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists exam_run_receipts_learner_time
  on public.exam_run_receipts (learner_id, completed_at desc, run_id);

alter table public.exam_run_receipts enable row level security;
revoke all on table public.exam_run_receipts from public, anon, authenticated, service_role;
grant select, insert on table public.exam_run_receipts to service_role;

create or replace function public.prevent_exam_ledger_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception using errcode = '55000', message = 'exam_ledger_is_immutable';
end;
$function$;

drop trigger if exists exam_run_events_no_update_delete on public.exam_run_events;
create trigger exam_run_events_no_update_delete
before update or delete on public.exam_run_events
for each row execute function public.prevent_exam_ledger_mutation();

drop trigger if exists exam_run_receipts_no_update_delete on public.exam_run_receipts;
create trigger exam_run_receipts_no_update_delete
before update or delete on public.exam_run_receipts
for each row execute function public.prevent_exam_ledger_mutation();

create or replace function public.exam_create_run(
  p_learner uuid,
  p_run uuid,
  p_exam_id text,
  p_rule_set_id text,
  p_engine_id text,
  p_state jsonb,
  p_started_at timestamptz,
  p_scheduled_end_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_existing public.exam_runs%rowtype;
  v_hash text;
begin
  if p_learner is null or p_run is null then
    raise exception using errcode = '22023', message = 'exam_run_identity_required';
  end if;
  if char_length(btrim(coalesce(p_exam_id, ''))) < 1
     or char_length(btrim(coalesce(p_rule_set_id, ''))) < 1
     or char_length(btrim(coalesce(p_engine_id, ''))) < 1 then
    raise exception using errcode = '22023', message = 'exam_run_config_required';
  end if;
  if jsonb_typeof(p_state) <> 'object'
     or p_state->>'runId' <> p_run::text
     or p_state->>'ruleSetId' <> p_rule_set_id
     or p_state->>'engineId' <> p_engine_id
     or p_state->>'status' <> 'in_progress'
     or p_state ? 'answerKey' then
    raise exception using errcode = '22023', message = 'invalid_exam_run_state';
  end if;
  if p_scheduled_end_at <= p_started_at then
    raise exception using errcode = '22023', message = 'invalid_exam_run_schedule';
  end if;

  select * into v_existing
  from public.exam_runs
  where id = p_run;

  if v_existing.id is not null then
    if v_existing.learner_id = p_learner
       and v_existing.rule_set_id = p_rule_set_id
       and v_existing.engine_id = p_engine_id then
      return jsonb_build_object(
        'runId', v_existing.id,
        'revision', v_existing.state_revision,
        'status', v_existing.status,
        'state', v_existing.state,
        'idempotent', true
      );
    end if;
    raise exception using errcode = '23505', message = 'exam_run_id_collision';
  end if;

  if exists (
    select 1 from public.exam_runs
    where learner_id = p_learner and status = 'in_progress'
  ) then
    raise exception using errcode = '23505', message = 'exam_run_already_open';
  end if;

  insert into public.exam_runs (
    id, learner_id, exam_id, rule_set_id, engine_id, status,
    state_revision, state, started_at, scheduled_end_at, completed_at,
    created_at, updated_at
  ) values (
    p_run, p_learner, btrim(p_exam_id), btrim(p_rule_set_id), btrim(p_engine_id),
    'in_progress', 0, p_state, p_started_at, p_scheduled_end_at, null,
    p_started_at, p_started_at
  );

  v_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(
        jsonb_build_object(
          'eventType', 'run.created',
          'state', p_state
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.exam_run_events (
    run_id, learner_id, request_key, revision_after,
    event_type, event, transition_sha256, occurred_at
  ) values (
    p_run, p_learner, 'run:create', 0,
    'run.created',
    jsonb_build_object(
      'examId', btrim(p_exam_id),
      'ruleSetId', btrim(p_rule_set_id),
      'engineId', btrim(p_engine_id)
    ),
    v_hash,
    p_started_at
  );

  return jsonb_build_object(
    'runId', p_run,
    'revision', 0,
    'status', 'in_progress',
    'state', p_state,
    'idempotent', false
  );
end;
$function$;

revoke all on function public.exam_create_run(
  uuid, uuid, text, text, text, jsonb, timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.exam_create_run(
  uuid, uuid, text, text, text, jsonb, timestamptz, timestamptz
) to service_role;

create or replace function public.exam_apply_transition(
  p_learner uuid,
  p_run uuid,
  p_request_key text,
  p_expected_revision integer,
  p_event_type text,
  p_event jsonb,
  p_next_state jsonb,
  p_occurred_at timestamptz,
  p_completion_receipt jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_run public.exam_runs%rowtype;
  v_existing public.exam_run_events%rowtype;
  v_hash text;
  v_revision integer;
  v_next_status text;
  v_completed_at timestamptz;
begin
  if p_learner is null or p_run is null then
    raise exception using errcode = '22023', message = 'exam_run_identity_required';
  end if;
  if char_length(btrim(coalesce(p_request_key, ''))) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'invalid_request_key';
  end if;
  if p_expected_revision < 0 then
    raise exception using errcode = '22023', message = 'invalid_expected_revision';
  end if;
  if p_event_type not in (
    'answer.set', 'review.set', 'clock.advanced', 'run.completed', 'run.cancelled'
  ) then
    raise exception using errcode = '22023', message = 'invalid_exam_event_type';
  end if;
  if jsonb_typeof(p_event) <> 'object' or jsonb_typeof(p_next_state) <> 'object' then
    raise exception using errcode = '22023', message = 'invalid_exam_transition_payload';
  end if;

  select * into v_run
  from public.exam_runs
  where id = p_run and learner_id = p_learner
  for update;

  if v_run.id is null then
    raise exception using errcode = '22023', message = 'exam_run_not_found';
  end if;

  if p_next_state->>'runId' <> p_run::text
     or p_next_state->>'ruleSetId' <> v_run.rule_set_id
     or p_next_state->>'engineId' <> v_run.engine_id
     or p_next_state ? 'answerKey' then
    raise exception using errcode = '22023', message = 'invalid_exam_next_state';
  end if;

  v_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(
        jsonb_build_object(
          'eventType', p_event_type,
          'event', p_event,
          'nextState', p_next_state,
          'completionReceipt', p_completion_receipt
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  select * into v_existing
  from public.exam_run_events
  where run_id = p_run and request_key = btrim(p_request_key);

  if v_existing.id is not null then
    if v_existing.transition_sha256 <> v_hash then
      raise exception using errcode = '23505', message = 'exam_request_key_collision';
    end if;
    return jsonb_build_object(
      'runId', v_run.id,
      'revision', v_run.state_revision,
      'status', v_run.status,
      'state', v_run.state,
      'idempotent', true
    );
  end if;

  if v_run.status <> 'in_progress' then
    raise exception using errcode = '22023', message = 'exam_run_not_open';
  end if;
  if v_run.state_revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'exam_revision_conflict';
  end if;
  if p_occurred_at < v_run.started_at then
    raise exception using errcode = '22023', message = 'exam_event_before_start';
  end if;

  v_next_status := p_next_state->>'status';
  if p_event_type = 'run.completed' then
    if v_next_status <> 'completed'
       or jsonb_typeof(p_completion_receipt) <> 'object'
       or p_completion_receipt->>'runId' <> p_run::text
       or p_completion_receipt->>'ruleSetId' <> v_run.rule_set_id then
      raise exception using errcode = '22023', message = 'invalid_exam_completion';
    end if;
    v_completed_at := nullif(p_next_state->>'completedAt', '')::timestamptz;
    if v_completed_at is null then
      raise exception using errcode = '22023', message = 'exam_completion_time_required';
    end if;
  elsif p_event_type = 'run.cancelled' then
    if v_next_status <> 'cancelled' or p_completion_receipt is not null then
      raise exception using errcode = '22023', message = 'invalid_exam_cancellation';
    end if;
    v_completed_at := nullif(p_next_state->>'completedAt', '')::timestamptz;
  else
    if v_next_status <> 'in_progress' or p_completion_receipt is not null then
      raise exception using errcode = '22023', message = 'invalid_exam_intermediate_transition';
    end if;
    v_completed_at := null;
  end if;

  v_revision := v_run.state_revision + 1;

  insert into public.exam_run_events (
    run_id, learner_id, request_key, revision_after,
    event_type, event, transition_sha256, occurred_at
  ) values (
    p_run, p_learner, btrim(p_request_key), v_revision,
    p_event_type, p_event, v_hash, p_occurred_at
  );

  update public.exam_runs
  set state_revision = v_revision,
      state = p_next_state,
      status = v_next_status,
      completed_at = v_completed_at,
      updated_at = p_occurred_at
  where id = p_run;

  if p_event_type = 'run.completed' then
    insert into public.exam_run_receipts (
      run_id, learner_id, rule_set_id, receipt, completed_at
    ) values (
      p_run, p_learner, v_run.rule_set_id, p_completion_receipt, v_completed_at
    );
  end if;

  return jsonb_build_object(
    'runId', p_run,
    'revision', v_revision,
    'status', v_next_status,
    'state', p_next_state,
    'idempotent', false
  );
end;
$function$;

revoke all on function public.exam_apply_transition(
  uuid, uuid, text, integer, text, jsonb, jsonb, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.exam_apply_transition(
  uuid, uuid, text, integer, text, jsonb, jsonb, timestamptz, jsonb
) to service_role;
