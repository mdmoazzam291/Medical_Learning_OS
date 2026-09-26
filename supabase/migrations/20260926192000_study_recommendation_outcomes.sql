-- M05c: rebuildable Study Now outcome projection.
-- Outcomes are descriptive evidence linked to immutable recommendation receipts.
-- They are not mastery estimates and do not imply causal effect.

create or replace function public.study_recommendation_outcomes(
  p_learner uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
with recommendations as (
  select
    r.id as recommendation_id,
    r.learner_id,
    r.session_id,
    r.strategy,
    r.available_minutes,
    r.plan,
    r.created_at,
    s.position as session_position,
    s.closed,
    s.question_version_ids
  from public.study_recommendation_events r
  join public.study_sessions s
    on s.id = r.session_id
   and s.learner_id = r.learner_id
  where r.learner_id = p_learner
),
session_totals as (
  select
    r.recommendation_id,
    count(a.id)::integer as attempted_count,
    count(a.id) filter (
      where coalesce((a.event->>'correct')::boolean, false)
    )::integer as correct_count,
    coalesce(sum(
      case
        when (a.event->>'durationMs') ~ '^[0-9]+$'
          then (a.event->>'durationMs')::bigint
        else 0
      end
    ), 0)::bigint as actual_answer_ms,
    min(a.recorded_at) as first_attempt_at,
    max(a.recorded_at) as last_attempt_at
  from recommendations r
  left join public.study_attempts a
    on a.session_id = r.session_id
   and a.learner_id = r.learner_id
  group by r.recommendation_id
),
item_outcomes as (
  select
    r.recommendation_id,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'questionVersionId', item.value->>'questionVersionId',
          'reason', item.value->>'reason',
          'estimatedMs', case
            when (item.value->>'estimatedMs') ~ '^[0-9]+$'
              then (item.value->>'estimatedMs')::bigint
            else null
          end,
          'attempted', current_attempt.id is not null,
          'correct', case
            when current_attempt.id is null then null
            else (current_attempt.event->>'correct')::boolean
          end,
          'actualAnswerMs', case
            when current_attempt.id is null then null
            when (current_attempt.event->>'durationMs') ~ '^[0-9]+$'
              then (current_attempt.event->>'durationMs')::bigint
            else null
          end,
          'attemptedAt', current_attempt.recorded_at,
          'followup', case
            when followup.id is null then null
            else jsonb_build_object(
              'attemptedAt', followup.recorded_at,
              'correct', (followup.event->>'correct')::boolean,
              'durationMs', case
                when (followup.event->>'durationMs') ~ '^[0-9]+$'
                  then (followup.event->>'durationMs')::bigint
                else null
              end
            )
          end
        )
        order by item.ordinality
      ),
      '[]'::jsonb
    ) as items,
    count(*) filter (
      where item.value->>'reason' = 'mistake-repair'
    )::integer as mistake_repair_count,
    count(*) filter (
      where item.value->>'reason' = 'due-revision'
    )::integer as due_revision_count,
    count(*) filter (
      where item.value->>'reason' = 'new-learning'
    )::integer as new_learning_count,
    count(*) filter (
      where followup.id is not null
    )::integer as followup_observed_count,
    count(*) filter (
      where followup.id is not null
        and (followup.event->>'correct')::boolean
    )::integer as followup_correct_count
  from recommendations r
  cross join lateral jsonb_array_elements(r.plan->'selected')
    with ordinality as item(value, ordinality)
  left join lateral (
    select a.*
    from public.study_attempts a
    where a.learner_id = r.learner_id
      and a.session_id = r.session_id
      and a.event->>'questionVersionId' = item.value->>'questionVersionId'
    order by a.recorded_at asc, a.id asc
    limit 1
  ) current_attempt on true
  left join lateral (
    select a.*
    from public.study_attempts a
    where a.learner_id = r.learner_id
      and a.session_id <> r.session_id
      and a.event->>'questionVersionId' = item.value->>'questionVersionId'
      and a.recorded_at > coalesce(current_attempt.recorded_at, r.created_at)
    order by a.recorded_at asc, a.id asc
    limit 1
  ) followup on true
  group by r.recommendation_id
)
select coalesce(
  jsonb_agg(
    jsonb_build_object(
      'recommendationId', r.recommendation_id,
      'sessionId', r.session_id,
      'strategy', r.strategy,
      'availableMinutes', r.available_minutes,
      'createdAt', r.created_at,
      'sessionClosed', r.closed,
      'sessionPosition', r.session_position,
      'selectedCount', coalesce(
        case
          when (r.plan->>'selectedCount') ~ '^[0-9]+$'
            then (r.plan->>'selectedCount')::integer
          else null
        end,
        jsonb_array_length(r.plan->'selected')
      ),
      'estimatedMs', case
        when (r.plan->>'estimatedMs') ~ '^[0-9]+$'
          then (r.plan->>'estimatedMs')::bigint
        else null
      end,
      'attemptedCount', t.attempted_count,
      'correctCount', t.correct_count,
      'accuracy', case
        when t.attempted_count = 0 then null
        else t.correct_count::double precision / t.attempted_count
      end,
      'actualAnswerMs', t.actual_answer_ms,
      'firstAttemptAt', t.first_attempt_at,
      'lastAttemptAt', t.last_attempt_at,
      'candidateMix', jsonb_build_object(
        'mistakeRepair', coalesce(i.mistake_repair_count, 0),
        'dueRevision', coalesce(i.due_revision_count, 0),
        'newLearning', coalesce(i.new_learning_count, 0)
      ),
      'followupObservedCount', coalesce(i.followup_observed_count, 0),
      'followupCorrectCount', coalesce(i.followup_correct_count, 0),
      'followupAccuracy', case
        when coalesce(i.followup_observed_count, 0) = 0 then null
        else i.followup_correct_count::double precision / i.followup_observed_count
      end,
      'items', coalesce(i.items, '[]'::jsonb)
    )
    order by r.created_at, r.recommendation_id
  ),
  '[]'::jsonb
)
from recommendations r
join session_totals t
  on t.recommendation_id = r.recommendation_id
left join item_outcomes i
  on i.recommendation_id = r.recommendation_id;
$function$;

revoke all on function public.study_recommendation_outcomes(uuid)
  from public, anon, authenticated;
grant execute on function public.study_recommendation_outcomes(uuid)
  to service_role;
