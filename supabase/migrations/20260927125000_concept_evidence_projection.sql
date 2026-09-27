-- M07a: rebuildable canonical-concept evidence projection.
-- This exposes observations only. It does not infer mastery, ability, or forgetting.

create or replace function public.study_concept_evidence(
  p_learner uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
with attempts as (
  select
    a.id as attempt_id,
    a.event->>'questionVersionId' as question_version_id,
    a.event->>'conceptId' as concept_id,
    (a.event->>'occurredAt')::timestamptz as occurred_at,
    (a.event->>'correct')::boolean as correct,
    case
      when (a.event->>'durationMs') ~ '^[0-9]+$'
        then (a.event->>'durationMs')::bigint
      else null
    end as duration_ms
  from public.study_attempts a
  where a.learner_id = p_learner
    and coalesce(a.event->>'conceptId','') <> ''
),
ranked as (
  select
    a.*,
    row_number() over (
      partition by a.concept_id
      order by a.occurred_at desc, a.attempt_id desc
    ) as concept_recency_rank
  from attempts a
),
attempt_summary as (
  select
    concept_id,
    count(*)::integer as total_attempts,
    count(distinct question_version_id)::integer as distinct_question_versions,
    count(*) filter (where correct)::integer as correct_count,
    count(*) filter (where not correct)::integer as incorrect_count,
    min(occurred_at) as first_attempt_at,
    max(occurred_at) as last_attempt_at,
    round(avg(duration_ms))::bigint as mean_duration_ms
  from attempts
  group by concept_id
),
latest as (
  select concept_id, correct as latest_correct
  from ranked
  where concept_recency_rank = 1
),
per_question as (
  select concept_id, question_version_id, count(*)::integer as attempt_count
  from attempts
  group by concept_id, question_version_id
),
repeat_summary as (
  select
    concept_id,
    coalesce(sum(greatest(attempt_count - 1, 0)),0)::integer as repeat_attempt_count
  from per_question
  group by concept_id
),
rating_summary as (
  select
    a.concept_id,
    count(j.id)::integer as rated_attempts,
    count(j.id) filter (where j.rating=1)::integer as again_count,
    count(j.id) filter (where j.rating=2)::integer as hard_count,
    count(j.id) filter (where j.rating=3)::integer as good_count,
    count(j.id) filter (where j.rating=4)::integer as easy_count,
    count(j.id) filter (where a.correct and j.rating=1)::integer as correct_again,
    count(j.id) filter (where not a.correct and j.rating>=3)::integer as incorrect_good_or_easy
  from attempts a
  left join public.study_memory_judgments j
    on j.attempt_id=a.attempt_id
   and j.learner_id=p_learner
  group by a.concept_id
)
select jsonb_build_object(
  'contractId','concept-observation-v1',
  'learnerId',p_learner,
  'concepts',coalesce(
    jsonb_agg(
      jsonb_build_object(
        'conceptId',s.concept_id,
        'totalAttempts',s.total_attempts,
        'distinctQuestionVersions',s.distinct_question_versions,
        'correct',s.correct_count,
        'incorrect',s.incorrect_count,
        'latestCorrect',l.latest_correct,
        'firstAttemptAt',s.first_attempt_at,
        'lastAttemptAt',s.last_attempt_at,
        'meanDurationMs',s.mean_duration_ms,
        'repeatAttemptCount',coalesce(r.repeat_attempt_count,0),
        'ratedAttempts',coalesce(m.rated_attempts,0),
        'ratingCoverage',case
          when s.total_attempts=0 then null
          else coalesce(m.rated_attempts,0)::double precision / s.total_attempts
        end,
        'ratingCounts',jsonb_build_object(
          'Again',coalesce(m.again_count,0),
          'Hard',coalesce(m.hard_count,0),
          'Good',coalesce(m.good_count,0),
          'Easy',coalesce(m.easy_count,0)
        ),
        'discordance',jsonb_build_object(
          'correctAgain',coalesce(m.correct_again,0),
          'incorrectGoodOrEasy',coalesce(m.incorrect_good_or_easy,0),
          'total',coalesce(m.correct_again,0)+coalesce(m.incorrect_good_or_easy,0)
        )
      )
      order by s.concept_id
    ),
    '[]'::jsonb
  )
)
from attempt_summary s
join latest l using(concept_id)
left join repeat_summary r using(concept_id)
left join rating_summary m using(concept_id);
$function$;

revoke all on function public.study_concept_evidence(uuid)
  from public, anon, authenticated;
grant execute on function public.study_concept_evidence(uuid)
  to service_role;
