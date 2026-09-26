-- M05d: learner-scoped FSRS shadow-readiness projection.
-- This function exposes real four-grade review evidence for shadow replay.
-- It does not compute or control production due dates.

create or replace function public.study_fsrs_shadow_evidence(
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
    a.learner_id,
    a.event->>'questionVersionId' as question_version_id,
    a.event->>'conceptId' as concept_id,
    (a.event->>'occurredAt')::timestamptz as reviewed_at,
    (a.event->>'correct')::boolean as correct,
    case
      when (a.event->>'durationMs') ~ '^[0-9]+$'
        then (a.event->>'durationMs')::bigint
      else 0
    end as duration_ms
  from public.study_attempts a
  where a.learner_id = p_learner
),
joined as (
  select
    a.*,
    j.id as judgment_id,
    j.rating,
    j.scale_id,
    j.prompt_id,
    j.recorded_at as rated_at,
    case j.rating
      when 1 then 'Again'
      when 2 then 'Hard'
      when 3 then 'Good'
      when 4 then 'Easy'
      else null
    end as rating_label
  from attempts a
  left join public.study_memory_judgments j
    on j.attempt_id = a.attempt_id
   and j.learner_id = a.learner_id
),
summary as (
  select
    count(*)::integer as total_attempts,
    count(*) filter (where judgment_id is not null)::integer as rated_attempts,
    count(distinct question_version_id) filter (where judgment_id is not null)::integer as rated_question_count,
    count(*) filter (where rating = 1)::integer as again_count,
    count(*) filter (where rating = 2)::integer as hard_count,
    count(*) filter (where rating = 3)::integer as good_count,
    count(*) filter (where rating = 4)::integer as easy_count,
    count(*) filter (where judgment_id is not null and correct and rating = 1)::integer as correct_again,
    count(*) filter (where judgment_id is not null and not correct and rating >= 3)::integer as incorrect_good_or_easy,
    avg(extract(epoch from (rated_at - reviewed_at)) * 1000)
      filter (where judgment_id is not null and rated_at >= reviewed_at) as mean_rating_lag_ms
  from joined
),
question_coverage as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'questionVersionId', question_version_id,
        'totalAttempts', total_attempts,
        'ratedAttempts', rated_attempts,
        'unratedAttempts', total_attempts - rated_attempts,
        'ratingCoverage', case
          when total_attempts = 0 then null
          else rated_attempts::double precision / total_attempts
        end,
        'fullyRated', total_attempts > 0 and total_attempts = rated_attempts
      )
      order by question_version_id
    ),
    '[]'::jsonb
  ) as rows,
  count(*) filter (where total_attempts > 0 and total_attempts = rated_attempts)::integer as fully_rated_question_count
  from (
    select
      question_version_id,
      count(*)::integer as total_attempts,
      count(*) filter (where judgment_id is not null)::integer as rated_attempts
    from joined
    group by question_version_id
  ) x
),
reviews as (
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'attemptId', attempt_id,
        'questionVersionId', question_version_id,
        'conceptId', concept_id,
        'reviewedAt', reviewed_at,
        'ratedAt', rated_at,
        'rating', rating,
        'ratingLabel', rating_label,
        'correct', correct,
        'durationMs', duration_ms,
        'ratingLagMs', greatest(
          0,
          floor(extract(epoch from (rated_at - reviewed_at)) * 1000)::bigint
        )
      )
      order by reviewed_at, attempt_id
    ) filter (where judgment_id is not null),
    '[]'::jsonb
  ) as rows
  from joined
)
select jsonb_build_object(
  'learnerId', p_learner,
  'scaleId', 'fsrs-4-v1',
  'promptId', 'post-answer-recall-v1',
  'livePolicyId', 'bootstrap-binary-v1',
  'fsrsControlsDueDates', false,
  'totalAttempts', s.total_attempts,
  'ratedAttempts', s.rated_attempts,
  'unratedAttempts', s.total_attempts - s.rated_attempts,
  'ratingCoverage', case
    when s.total_attempts = 0 then null
    else s.rated_attempts::double precision / s.total_attempts
  end,
  'ratedQuestionCount', s.rated_question_count,
  'fullyRatedQuestionCount', q.fully_rated_question_count,
  'questionCoverage', q.rows,
  'ratingCounts', jsonb_build_object(
    'Again', s.again_count,
    'Hard', s.hard_count,
    'Good', s.good_count,
    'Easy', s.easy_count
  ),
  'discordance', jsonb_build_object(
    'correctAgain', s.correct_again,
    'incorrectGoodOrEasy', s.incorrect_good_or_easy,
    'total', s.correct_again + s.incorrect_good_or_easy
  ),
  'meanRatingLagMs', case
    when s.mean_rating_lag_ms is null then null
    else round(s.mean_rating_lag_ms)::bigint
  end,
  'hasReplayableEvidence', s.rated_attempts > 0,
  'reviews', r.rows
)
from summary s
cross join question_coverage q
cross join reviews r;
$function$;

revoke all on function public.study_fsrs_shadow_evidence(uuid)
  from public, anon, authenticated;
grant execute on function public.study_fsrs_shadow_evidence(uuid)
  to service_role;
