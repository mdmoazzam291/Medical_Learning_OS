-- M05b: persisted, rebuildable learner-scoped revision projection.
-- Scheduling is a projection over immutable attempts, not mastery evidence.

create table if not exists public.study_revision_state (
  learner_id uuid not null,
  question_version_id text not null,
  concept_id text not null,
  attempts integer not null check (attempts >= 1),
  correct integer not null check (correct >= 0),
  incorrect integer not null check (incorrect >= 0),
  consecutive_correct integer not null check (consecutive_correct >= 0),
  latest_correct boolean not null,
  first_attempt_at timestamptz not null,
  last_attempt_at timestamptz not null,
  last_duration_ms bigint not null check (last_duration_ms >= 0),
  policy_id text not null,
  policy_version integer not null check (policy_version >= 1),
  due_at timestamptz not null,
  projection_version integer not null default 1 check (projection_version >= 1),
  evidence_event_count integer not null check (evidence_event_count >= 1),
  evidence_last_event_id uuid not null,
  projected_at timestamptz not null default now(),
  primary key (learner_id, question_version_id),
  check (correct + incorrect = attempts),
  check (correct <= attempts),
  check (consecutive_correct <= attempts),
  check (first_attempt_at <= last_attempt_at)
);

create index if not exists study_revision_state_learner_due
  on public.study_revision_state (learner_id, due_at, question_version_id);

alter table public.study_revision_state enable row level security;

drop policy if exists study_revision_state_read_own on public.study_revision_state;
create policy study_revision_state_read_own
  on public.study_revision_state
  for select
  to authenticated
  using ((select auth.uid()) = learner_id);

revoke all on table public.study_revision_state from public, anon, authenticated;
grant select on table public.study_revision_state to authenticated;

create or replace function public.study_rebuild_revision_state(
  p_learner uuid,
  p_question_version_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_projected integer := 0;
begin
  if p_learner is null then
    raise exception using errcode = '22023', message = 'learner_required';
  end if;
  if p_question_version_id is not null
     and p_question_version_id !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' then
    raise exception using errcode = '22023', message = 'invalid_question_version_id';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_learner::text, 0)
  );

  if exists (
    select 1
    from public.study_attempts a
    where a.learner_id = p_learner
      and (p_question_version_id is null
        or a.event->>'questionVersionId' = p_question_version_id)
    group by a.event->>'questionVersionId'
    having pg_catalog.count(distinct a.event->>'conceptId') <> 1
  ) then
    raise exception using errcode = '22023', message = 'revision_evidence_concept_conflict';
  end if;

  if p_question_version_id is null then
    delete from public.study_revision_state
    where learner_id = p_learner;
  else
    delete from public.study_revision_state
    where learner_id = p_learner
      and question_version_id = p_question_version_id;
  end if;

  with evidence as (
    select
      a.id as event_id,
      a.event->>'questionVersionId' as question_version_id,
      a.event->>'conceptId' as concept_id,
      (a.event->>'occurredAt')::timestamptz as occurred_at,
      (a.event->>'correct')::boolean as correct,
      (a.event->>'durationMs')::bigint as duration_ms
    from public.study_attempts a
    where a.learner_id = p_learner
      and (p_question_version_id is null
        or a.event->>'questionVersionId' = p_question_version_id)
  ),
  ordered as (
    select
      e.*,
      pg_catalog.row_number() over (
        partition by e.question_version_id
        order by e.occurred_at desc, e.event_id desc
      ) as reverse_position
    from evidence e
  ),
  aggregated as (
    select
      o.question_version_id,
      pg_catalog.min(o.concept_id) as concept_id,
      pg_catalog.count(*)::integer as attempts,
      pg_catalog.count(*) filter (where o.correct)::integer as correct_count,
      pg_catalog.count(*) filter (where not o.correct)::integer as incorrect_count,
      (pg_catalog.array_agg(o.correct order by o.occurred_at desc, o.event_id desc))[1] as latest_correct,
      pg_catalog.min(o.occurred_at) as first_attempt_at,
      pg_catalog.max(o.occurred_at) as last_attempt_at,
      (pg_catalog.array_agg(o.duration_ms order by o.occurred_at desc, o.event_id desc))[1] as last_duration_ms,
      (pg_catalog.array_agg(o.event_id order by o.occurred_at desc, o.event_id desc))[1] as evidence_last_event_id,
      pg_catalog.min(o.reverse_position) filter (where not o.correct) as first_recent_incorrect_position
    from ordered o
    group by o.question_version_id
  ),
  projected as (
    select
      a.*,
      case
        when not a.latest_correct then 0
        when a.first_recent_incorrect_position is null then a.attempts
        else (a.first_recent_incorrect_position - 1)::integer
      end as consecutive_correct
    from aggregated a
  )
  insert into public.study_revision_state (
    learner_id,
    question_version_id,
    concept_id,
    attempts,
    correct,
    incorrect,
    consecutive_correct,
    latest_correct,
    first_attempt_at,
    last_attempt_at,
    last_duration_ms,
    policy_id,
    policy_version,
    due_at,
    projection_version,
    evidence_event_count,
    evidence_last_event_id,
    projected_at
  )
  select
    p_learner,
    p.question_version_id,
    p.concept_id,
    p.attempts,
    p.correct_count,
    p.incorrect_count,
    p.consecutive_correct,
    p.latest_correct,
    p.first_attempt_at,
    p.last_attempt_at,
    p.last_duration_ms,
    'bootstrap-binary-v1',
    1,
    p.last_attempt_at +
      case
        when not p.latest_correct then interval '10 minutes'
        when p.consecutive_correct <= 1 then interval '1 day'
        when p.consecutive_correct = 2 then interval '3 days'
        when p.consecutive_correct = 3 then interval '7 days'
        when p.consecutive_correct = 4 then interval '14 days'
        else interval '30 days'
      end,
    1,
    p.attempts,
    p.evidence_last_event_id,
    pg_catalog.now()
  from projected p;

  get diagnostics v_projected = row_count;

  return pg_catalog.jsonb_build_object(
    'learnerId', p_learner,
    'questionVersionId', p_question_version_id,
    'projected', v_projected,
    'policyId', 'bootstrap-binary-v1',
    'policyVersion', 1,
    'projectionVersion', 1
  );
end;
$function$;

revoke all on function public.study_rebuild_revision_state(uuid, text)
  from public, anon, authenticated;
grant execute on function public.study_rebuild_revision_state(uuid, text)
  to service_role;
