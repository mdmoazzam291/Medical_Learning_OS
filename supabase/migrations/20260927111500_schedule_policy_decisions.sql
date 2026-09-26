-- M05d: immutable scheduling-policy decisions and descriptive outcome projection.
-- A policy proposal is evidence about what the scheduler recommended at a given
-- evidence cutoff. It is not mastery and does not establish causal policy effect.

create table if not exists public.study_schedule_decision_events (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null,
  attempt_id uuid not null,
  question_version_id text not null,
  policy_id text not null,
  policy_version integer not null check (policy_version > 0),
  role text not null check (role in ('authoritative', 'shadow')),
  config_version text not null,
  evidence_cutoff_at timestamptz not null,
  proposed_due_at timestamptz not null,
  decision jsonb not null check (jsonb_typeof(decision) = 'object'),
  created_at timestamptz not null default now(),
  constraint study_schedule_decision_attempt_fkey
    foreign key (attempt_id) references public.study_attempts(id),
  constraint study_schedule_decision_unique
    unique (attempt_id, policy_id, policy_version, config_version)
);

create index if not exists study_schedule_decision_learner_time
  on public.study_schedule_decision_events (learner_id, evidence_cutoff_at, id);

create index if not exists study_schedule_decision_question_time
  on public.study_schedule_decision_events (learner_id, question_version_id, evidence_cutoff_at);

alter table public.study_schedule_decision_events enable row level security;

revoke all on table public.study_schedule_decision_events
  from public, anon, authenticated;

create or replace function public.study_record_schedule_decision(
  p_learner uuid,
  p_attempt uuid,
  p_policy_id text,
  p_policy_version integer,
  p_role text,
  p_config_version text,
  p_proposed_due_at timestamptz,
  p_decision jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_attempt public.study_attempts%rowtype;
  v_existing public.study_schedule_decision_events%rowtype;
  v_row public.study_schedule_decision_events%rowtype;
  v_question_version_id text;
  v_evidence_cutoff_at timestamptz;
begin
  if p_learner is null or p_attempt is null then
    raise exception using errcode = '22023', message = 'schedule_decision_identity_required';
  end if;
  if p_policy_id is null or p_policy_id !~ '^[a-zA-Z0-9:_@.\-]{1,120}$'
     or p_config_version is null or p_config_version !~ '^[a-zA-Z0-9:_@.\-]{1,160}$'
     or p_policy_version is null or p_policy_version <= 0 then
    raise exception using errcode = '22023', message = 'schedule_decision_policy_invalid';
  end if;
  if p_role not in ('authoritative', 'shadow') then
    raise exception using errcode = '22023', message = 'schedule_decision_role_invalid';
  end if;
  if p_proposed_due_at is null
     or p_decision is null
     or pg_catalog.jsonb_typeof(p_decision) <> 'object' then
    raise exception using errcode = '22023', message = 'schedule_decision_payload_invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_learner::text, 0)
  );

  select * into v_attempt
  from public.study_attempts
  where id = p_attempt
    and learner_id = p_learner;

  if not found then
    return pg_catalog.jsonb_build_object('error', 'attempt_not_found');
  end if;

  v_question_version_id := v_attempt.event->>'questionVersionId';
  v_evidence_cutoff_at := (v_attempt.event->>'occurredAt')::timestamptz;

  select * into v_existing
  from public.study_schedule_decision_events
  where attempt_id = p_attempt
    and policy_id = p_policy_id
    and policy_version = p_policy_version
    and config_version = p_config_version;

  if found then
    if v_existing.learner_id <> p_learner
       or v_existing.question_version_id <> v_question_version_id
       or v_existing.role <> p_role
       or v_existing.proposed_due_at <> p_proposed_due_at
       or v_existing.decision <> p_decision then
      return pg_catalog.jsonb_build_object('error', 'conflicting_schedule_decision');
    end if;
    v_row := v_existing;
  else
    insert into public.study_schedule_decision_events (
      learner_id,
      attempt_id,
      question_version_id,
      policy_id,
      policy_version,
      role,
      config_version,
      evidence_cutoff_at,
      proposed_due_at,
      decision
    ) values (
      p_learner,
      p_attempt,
      v_question_version_id,
      p_policy_id,
      p_policy_version,
      p_role,
      p_config_version,
      v_evidence_cutoff_at,
      p_proposed_due_at,
      p_decision
    )
    returning * into v_row;
  end if;

  return pg_catalog.jsonb_build_object(
    'id', v_row.id,
    'attemptId', v_row.attempt_id,
    'questionVersionId', v_row.question_version_id,
    'policyId', v_row.policy_id,
    'policyVersion', v_row.policy_version,
    'role', v_row.role,
    'configVersion', v_row.config_version,
    'evidenceCutoffAt', v_row.evidence_cutoff_at,
    'proposedDueAt', v_row.proposed_due_at,
    'createdAt', v_row.created_at
  );
end;
$function$;

revoke all on function public.study_record_schedule_decision(
  uuid, uuid, text, integer, text, text, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.study_record_schedule_decision(
  uuid, uuid, text, integer, text, text, timestamptz, jsonb
) to service_role;

-- Backfill the currently authoritative bootstrap decision represented by each
-- revision row. This does not invent historical intermediate decisions.
insert into public.study_schedule_decision_events (
  learner_id,
  attempt_id,
  question_version_id,
  policy_id,
  policy_version,
  role,
  config_version,
  evidence_cutoff_at,
  proposed_due_at,
  decision
)
select
  r.learner_id,
  r.evidence_last_event_id,
  r.question_version_id,
  r.policy_id,
  r.policy_version,
  'authoritative',
  r.policy_id || '@' || r.policy_version::text,
  (a.event->>'occurredAt')::timestamptz,
  r.due_at,
  pg_catalog.jsonb_build_object(
    'projectionVersion', r.projection_version,
    'attempts', r.attempts,
    'correct', r.correct,
    'incorrect', r.incorrect,
    'consecutiveCorrect', r.consecutive_correct,
    'latestCorrect', r.latest_correct,
    'evidenceEventCount', r.evidence_event_count
  )
from public.study_revision_state r
join public.study_attempts a
  on a.id = r.evidence_last_event_id
 and a.learner_id = r.learner_id
on conflict (attempt_id, policy_id, policy_version, config_version) do nothing;

create or replace function public.study_schedule_policy_outcomes(
  p_learner uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
with decisions as (
  select
    d.*,
    origin.recorded_at as origin_recorded_at
  from public.study_schedule_decision_events d
  join public.study_attempts origin
    on origin.id = d.attempt_id
   and origin.learner_id = d.learner_id
  where d.learner_id = p_learner
),
linked as (
  select
    d.*,
    next_attempt.id as next_attempt_id,
    next_attempt.recorded_at as next_attempt_recorded_at,
    case
      when next_attempt.id is null then null
      else (next_attempt.event->>'correct')::boolean
    end as next_correct,
    case
      when next_attempt.id is null then null
      when (next_attempt.event->>'durationMs') ~ '^[0-9]+$'
        then (next_attempt.event->>'durationMs')::bigint
      else null
    end as next_duration_ms,
    case
      when next_attempt.id is null then null
      else (next_attempt.event->>'occurredAt')::timestamptz
    end as next_occurred_at
  from decisions d
  left join lateral (
    select a.*
    from public.study_attempts a
    where a.learner_id = d.learner_id
      and a.event->>'questionVersionId' = d.question_version_id
      and (
        a.recorded_at > d.origin_recorded_at
        or (a.recorded_at = d.origin_recorded_at and a.id > d.attempt_id)
      )
    order by a.recorded_at asc, a.id asc
    limit 1
  ) next_attempt on true
)
select coalesce(
  pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'decisionId', id,
      'comparisonGroupId', attempt_id,
      'attemptId', attempt_id,
      'questionVersionId', question_version_id,
      'policyId', policy_id,
      'policyVersion', policy_version,
      'role', role,
      'configVersion', config_version,
      'evidenceCutoffAt', evidence_cutoff_at,
      'proposedDueAt', proposed_due_at,
      'decision', decision,
      'observedNextAttemptId', next_attempt_id,
      'observedNextAttemptAt', next_occurred_at,
      'observedCorrect', next_correct,
      'observedDurationMs', next_duration_ms,
      'retrievalOffsetMs', case
        when next_occurred_at is null then null
        else floor(
          extract(epoch from (next_occurred_at - proposed_due_at)) * 1000
        )::bigint
      end,
      'observedAfterProposedDue', case
        when next_occurred_at is null then null
        else next_occurred_at >= proposed_due_at
      end
    )
    order by evidence_cutoff_at, attempt_id, role, policy_id, config_version
  ),
  '[]'::jsonb
)
from linked;
$function$;

revoke all on function public.study_schedule_policy_outcomes(uuid)
  from public, anon, authenticated;
grant execute on function public.study_schedule_policy_outcomes(uuid)
  to service_role;
