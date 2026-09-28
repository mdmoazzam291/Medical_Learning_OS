create or replace function public.study_delayed_retrieval_observations_v1(
  p_learner uuid
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $function$
with origins as (
  select
    a.id as origin_attempt_id,
    a.learner_id,
    a.session_id,
    a.event->>'questionVersionId' as question_version_id,
    a.event->>'conceptId' as concept_id,
    (a.event->>'occurredAt')::timestamptz as origin_occurred_at,
    a.recorded_at as origin_recorded_at,
    (a.event->>'correct')::boolean as origin_correct,
    case
      when (a.event->>'durationMs') ~ '^[0-9]+$'
        then (a.event->>'durationMs')::bigint
      else null
    end as origin_duration_ms
  from public.study_attempts a
  where a.learner_id = p_learner
    and a.event->>'type' = 'question.answered'
    and a.event->>'schemaVersion' = '1'
),
contextualized as (
  select
    o.*,
    m.rating as origin_memory_rating,
    m.scale_id as origin_memory_scale_id,
    m.prompt_id as origin_memory_prompt_id,
    rec.recommendation_id,
    rec.recommendation_reason,
    same_item.id as same_item_attempt_id,
    case
      when same_item.id is null then null
      else (same_item.event->>'occurredAt')::timestamptz
    end as same_item_occurred_at,
    case
      when same_item.id is null then null
      else (same_item.event->>'correct')::boolean
    end as same_item_correct,
    case
      when same_item.id is null then null
      when (same_item.event->>'durationMs') ~ '^[0-9]+$'
        then (same_item.event->>'durationMs')::bigint
      else null
    end as same_item_duration_ms,
    transfer.id as transfer_attempt_id,
    case
      when transfer.id is null then null
      else transfer.event->>'questionVersionId'
    end as transfer_question_version_id,
    case
      when transfer.id is null then null
      else (transfer.event->>'occurredAt')::timestamptz
    end as transfer_occurred_at,
    case
      when transfer.id is null then null
      else (transfer.event->>'correct')::boolean
    end as transfer_correct,
    case
      when transfer.id is null then null
      when (transfer.event->>'durationMs') ~ '^[0-9]+$'
        then (transfer.event->>'durationMs')::bigint
      else null
    end as transfer_duration_ms,
    case
      when transfer.id is null then null
      else (
        select count(*)::integer
        from public.study_attempts between_attempt
        where between_attempt.learner_id = o.learner_id
          and between_attempt.event->>'questionVersionId' = o.question_version_id
          and (between_attempt.recorded_at, between_attempt.id) > (o.origin_recorded_at, o.origin_attempt_id)
          and (between_attempt.recorded_at, between_attempt.id) < (transfer.recorded_at, transfer.id)
      )
    end as transfer_intervening_same_item_attempts
  from origins o
  left join public.study_memory_judgments m
    on m.attempt_id = o.origin_attempt_id
   and m.learner_id = o.learner_id
  left join lateral (
    select
      r.id as recommendation_id,
      selected.value->>'reason' as recommendation_reason
    from public.study_recommendation_events r
    cross join lateral pg_catalog.jsonb_array_elements(r.plan->'selected') selected(value)
    where r.learner_id = o.learner_id
      and r.session_id = o.session_id
      and selected.value->>'questionVersionId' = o.question_version_id
    order by r.created_at, r.id
    limit 1
  ) rec on true
  left join lateral (
    select a.*
    from public.study_attempts a
    where a.learner_id = o.learner_id
      and a.event->>'questionVersionId' = o.question_version_id
      and (a.recorded_at, a.id) > (o.origin_recorded_at, o.origin_attempt_id)
    order by a.recorded_at, a.id
    limit 1
  ) same_item on true
  left join lateral (
    select a.*
    from public.study_attempts a
    where a.learner_id = o.learner_id
      and a.event->>'conceptId' = o.concept_id
      and a.event->>'questionVersionId' <> o.question_version_id
      and (a.recorded_at, a.id) > (o.origin_recorded_at, o.origin_attempt_id)
    order by a.recorded_at, a.id
    limit 1
  ) transfer on true
),
rows as (
  select
    c.*,
    case
      when c.same_item_occurred_at is null then null
      else floor(extract(epoch from (c.same_item_occurred_at - c.origin_occurred_at)) * 1000)::bigint
    end as same_item_delay_ms,
    case
      when c.transfer_occurred_at is null then null
      else floor(extract(epoch from (c.transfer_occurred_at - c.origin_occurred_at)) * 1000)::bigint
    end as transfer_delay_ms,
    coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'decisionId', d.id,
          'policyId', d.policy_id,
          'policyVersion', d.policy_version,
          'role', d.role,
          'configVersion', d.config_version,
          'proposedDueAt', d.proposed_due_at,
          'observedOffsetMs', case
            when c.same_item_occurred_at is null then null
            else floor(extract(epoch from (c.same_item_occurred_at - d.proposed_due_at)) * 1000)::bigint
          end,
          'observedAfterProposedDue', case
            when c.same_item_occurred_at is null then null
            else c.same_item_occurred_at >= d.proposed_due_at
          end
        )
        order by d.role, d.policy_id, d.policy_version, d.config_version
      )
      from public.study_schedule_decision_events d
      where d.learner_id = c.learner_id
        and d.attempt_id = c.origin_attempt_id
    ), '[]'::jsonb) as schedule_decisions
  from contextualized c
),
summary as (
  select
    count(*)::integer as origin_attempts,
    count(*) filter (where same_item_attempt_id is not null)::integer as same_item_followups,
    count(*) filter (where same_item_delay_ms >= 86400000)::integer as at_least_1d,
    count(*) filter (where same_item_delay_ms >= 604800000)::integer as at_least_7d,
    count(*) filter (where same_item_delay_ms >= 2592000000)::integer as at_least_30d,
    count(*) filter (where same_item_delay_ms >= 7776000000)::integer as at_least_90d,
    count(*) filter (where same_item_delay_ms >= 15552000000)::integer as at_least_180d,
    count(*) filter (where transfer_attempt_id is not null)::integer as transfer_candidates,
    count(*) filter (
      where transfer_attempt_id is not null
        and transfer_intervening_same_item_attempts = 0
    )::integer as uncontaminated_transfer_candidates,
    count(*) filter (where origin_memory_rating is not null)::integer as rated_origins
  from rows
)
select pg_catalog.jsonb_build_object(
  'contractId', 'study-delayed-retrieval-observations-v1',
  'learnerId', p_learner,
  'scope', 'descriptive-outcome-linkage',
  'inferenceAuthority', false,
  'masteryInferenceEnabled', false,
  'causalEffectClaimed', false,
  'summary', pg_catalog.jsonb_build_object(
    'originAttempts', s.origin_attempts,
    'sameItemFollowups', s.same_item_followups,
    'delayCoverage', pg_catalog.jsonb_build_object(
      'atLeast1Day', s.at_least_1d,
      'atLeast7Days', s.at_least_7d,
      'atLeast30Days', s.at_least_30d,
      'atLeast90Days', s.at_least_90d,
      'atLeast180Days', s.at_least_180d
    ),
    'transferCandidates', s.transfer_candidates,
    'uncontaminatedTransferCandidates', s.uncontaminated_transfer_candidates,
    'ratedOrigins', s.rated_origins
  ),
  'observations', coalesce((
    select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'origin', pg_catalog.jsonb_build_object(
          'attemptId', r.origin_attempt_id,
          'sessionId', r.session_id,
          'questionVersionId', r.question_version_id,
          'conceptId', r.concept_id,
          'occurredAt', r.origin_occurred_at,
          'correct', r.origin_correct,
          'durationMs', r.origin_duration_ms,
          'memoryRating', case
            when r.origin_memory_rating is null then null
            else pg_catalog.jsonb_build_object(
              'rating', r.origin_memory_rating,
              'scaleId', r.origin_memory_scale_id,
              'promptId', r.origin_memory_prompt_id
            )
          end,
          'recommendation', case
            when r.recommendation_id is null then null
            else pg_catalog.jsonb_build_object(
              'recommendationId', r.recommendation_id,
              'reason', r.recommendation_reason
            )
          end
        ),
        'sameItemNextRetrieval', case
          when r.same_item_attempt_id is null then null
          else pg_catalog.jsonb_build_object(
            'attemptId', r.same_item_attempt_id,
            'occurredAt', r.same_item_occurred_at,
            'delayMs', r.same_item_delay_ms,
            'correct', r.same_item_correct,
            'durationMs', r.same_item_duration_ms
          )
        end,
        'transferCandidate', case
          when r.transfer_attempt_id is null then null
          else pg_catalog.jsonb_build_object(
            'attemptId', r.transfer_attempt_id,
            'questionVersionId', r.transfer_question_version_id,
            'occurredAt', r.transfer_occurred_at,
            'delayMs', r.transfer_delay_ms,
            'correct', r.transfer_correct,
            'durationMs', r.transfer_duration_ms,
            'interveningSameItemAttempts', r.transfer_intervening_same_item_attempts,
            'uncontaminatedBySameItemRetrieval',
              r.transfer_intervening_same_item_attempts = 0
          )
        end,
        'scheduleDecisions', r.schedule_decisions
      )
      order by r.origin_occurred_at, r.origin_attempt_id
    )
    from rows r
  ), '[]'::jsonb),
  'limitations', pg_catalog.jsonb_build_array(
    'observed-followup-is-not-a-randomized-retention-probe',
    'same-item-retrieval-measures-retention-of-an-item-not-generalized-transfer',
    'transfer-candidate-is-descriptive-until-item-novelty-and-comparability-are-validated',
    'delay-coverage-is-data-availability-not-proof-of-learning',
    'policy-and-self-selection-can-confound-observed-followup'
  )
)
from summary s;
$function$;

revoke all on function public.study_delayed_retrieval_observations_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.study_delayed_retrieval_observations_v1(uuid)
  to service_role;
