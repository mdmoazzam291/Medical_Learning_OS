-- Fix the scheduler's current-pair resolution using one canonical catalog expansion.
-- The prior two correlated lateral lookups can eliminate a valid pair at the second
-- member. Eligibility/timing/contamination/priority/cap rules remain unchanged.

create or replace function public.study_retention_probe_scheduler_candidates_v1(
  p_now timestamptz default now()
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
set search_path to ''
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
catalog_questions as (
  select q
  from public.study_catalog c
  cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
  where c.id=1
),
current_pair as (
  select p.*
  from pair p
  join catalog_questions qa
    on qa.q->>'questionVersionId'=p.question_a_version_id
  join catalog_questions qb
    on qb.q->>'questionVersionId'=p.question_b_version_id
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
  select count(a.assignment_id)::integer as total_assignments
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
        and (r.due_at <= p_now or r.latest_correct=false)
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
