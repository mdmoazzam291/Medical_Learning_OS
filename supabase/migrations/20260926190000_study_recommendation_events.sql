-- M05c: immutable Study Now recommendation receipts.
-- Bind each newly created Study Now session to the exact plan that selected it.

create table if not exists public.study_recommendation_events (
  id uuid primary key,
  learner_id uuid not null,
  session_id uuid not null unique,
  strategy text not null,
  available_minutes integer not null check (available_minutes between 5 and 120),
  plan jsonb not null,
  created_at timestamptz not null default now(),
  constraint study_recommendation_events_session_fkey
    foreign key (session_id) references public.study_sessions(id)
);

create index if not exists study_recommendation_events_learner_created
  on public.study_recommendation_events (learner_id, created_at, id);

alter table public.study_recommendation_events enable row level security;

drop policy if exists study_recommendation_events_read_own
  on public.study_recommendation_events;
create policy study_recommendation_events_read_own
  on public.study_recommendation_events
  for select
  to authenticated
  using ((select auth.uid()) = learner_id);

revoke all on table public.study_recommendation_events
  from public, anon, authenticated;
grant select on table public.study_recommendation_events
  to authenticated;

create or replace function public.study_start_recommendation_session(
  p_learner uuid,
  p_id uuid,
  p_ids jsonb,
  p_started timestamptz,
  p_available_minutes integer,
  p_plan jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_existing uuid;
  v_recommendation uuid := gen_random_uuid();
  v_selected_ids jsonb;
begin
  if p_learner is null or p_id is null then
    raise exception using errcode = '22023', message = 'study_now_identity_required';
  end if;
  if p_available_minutes < 5 or p_available_minutes > 120 then
    raise exception using errcode = '22023', message = 'study_now_invalid_minutes';
  end if;
  if jsonb_typeof(p_ids) <> 'array' or jsonb_array_length(p_ids) < 1 then
    raise exception using errcode = '22023', message = 'study_now_empty_selection';
  end if;
  if jsonb_typeof(p_plan) <> 'object'
     or coalesce(p_plan->>'strategy', '') = ''
     or jsonb_typeof(p_plan->'selected') <> 'array' then
    raise exception using errcode = '22023', message = 'study_now_invalid_plan';
  end if;

  select coalesce(jsonb_agg(to_jsonb(x.question_version_id) order by x.ord), '[]'::jsonb)
    into v_selected_ids
  from (
    select
      item->>'questionVersionId' as question_version_id,
      ord
    from jsonb_array_elements(p_plan->'selected') with ordinality as t(item, ord)
  ) x;

  if v_selected_ids <> p_ids then
    raise exception using errcode = '22023', message = 'study_now_plan_session_mismatch';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_learner::text, 0)
  );

  select id
    into v_existing
  from public.study_sessions
  where learner_id = p_learner
    and closed = false
  limit 1;

  if v_existing is not null then
    return jsonb_build_object(
      'id', v_existing,
      'resumed', true,
      'recommendationId', null
    );
  end if;

  insert into public.study_sessions (
    id,
    learner_id,
    question_version_ids,
    question_started_at
  ) values (
    p_id,
    p_learner,
    p_ids,
    p_started
  );

  insert into public.study_recommendation_events (
    id,
    learner_id,
    session_id,
    strategy,
    available_minutes,
    plan,
    created_at
  ) values (
    v_recommendation,
    p_learner,
    p_id,
    p_plan->>'strategy',
    p_available_minutes,
    p_plan,
    p_started
  );

  return jsonb_build_object(
    'id', p_id,
    'resumed', false,
    'recommendationId', v_recommendation
  );
end;
$function$;

revoke all on function public.study_start_recommendation_session(
  uuid, uuid, jsonb, timestamptz, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.study_start_recommendation_session(
  uuid, uuid, jsonb, timestamptz, integer, jsonb
) to service_role;
