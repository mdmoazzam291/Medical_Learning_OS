-- M07b: rebuildable observed mistake evidence.
-- This classifies observable error patterns only. It does not infer psychological causes.

create or replace function public.study_mistake_evidence(
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
    a.option_id as selected_option_id,
    a.receipt->>'answerOptionId' as answer_option_id,
    a.event->>'questionVersionId' as question_version_id,
    a.event->>'conceptId' as concept_id,
    (a.event->>'occurredAt')::timestamptz as occurred_at,
    a.recorded_at,
    (a.event->>'correct')::boolean as correct,
    case
      when (a.event->>'durationMs') ~ '^[0-9]+$'
        then (a.event->>'durationMs')::bigint
      else null
    end as duration_ms
  from public.study_attempts a
  where a.learner_id = p_learner
    and coalesce(a.event->>'questionVersionId','') <> ''
    and coalesce(a.event->>'conceptId','') <> ''
),
errors as (
  select *
  from attempts
  where correct = false
),
episodes as (
  select
    e.*,
    j.rating as memory_rating,
    case j.rating
      when 1 then 'Again'
      when 2 then 'Hard'
      when 3 then 'Good'
      when 4 then 'Easy'
      else null
    end as memory_rating_label,
    (
      select count(*)::integer
      from errors prior
      where prior.question_version_id=e.question_version_id
        and (
          prior.recorded_at < e.recorded_at
          or (prior.recorded_at=e.recorded_at and prior.attempt_id < e.attempt_id)
        )
    ) as prior_error_count,
    (
      select count(*)::integer
      from errors prior
      where prior.question_version_id=e.question_version_id
        and prior.selected_option_id=e.selected_option_id
        and (
          prior.recorded_at < e.recorded_at
          or (prior.recorded_at=e.recorded_at and prior.attempt_id < e.attempt_id)
        )
    ) as prior_same_distractor_count,
    next_attempt.attempt_id as next_attempt_id,
    next_attempt.occurred_at as next_attempt_at,
    next_attempt.correct as next_correct,
    next_attempt.duration_ms as next_duration_ms
  from errors e
  left join public.study_memory_judgments j
    on j.attempt_id=e.attempt_id
   and j.learner_id=p_learner
  left join lateral (
    select a.*
    from attempts a
    where a.question_version_id=e.question_version_id
      and (
        a.recorded_at > e.recorded_at
        or (a.recorded_at=e.recorded_at and a.attempt_id > e.attempt_id)
      )
    order by a.recorded_at asc, a.attempt_id asc
    limit 1
  ) next_attempt on true
),
episode_json as (
  select
    concept_id,
    jsonb_agg(
      jsonb_build_object(
        'attemptId',attempt_id,
        'questionVersionId',question_version_id,
        'occurredAt',occurred_at,
        'selectedOptionId',selected_option_id,
        'answerOptionId',answer_option_id,
        'durationMs',duration_ms,
        'memoryRating',memory_rating,
        'memoryRatingLabel',memory_rating_label,
        'priorErrorCount',prior_error_count,
        'priorSameDistractorCount',prior_same_distractor_count,
        'signals',
          jsonb_build_array('incorrect-response')
          || case when prior_error_count > 0
            then '["repeat-error-same-question"]'::jsonb else '[]'::jsonb end
          || case when prior_same_distractor_count > 0
            then '["repeat-same-distractor"]'::jsonb else '[]'::jsonb end
          || case when memory_rating >= 3
            then '["incorrect-with-good-easy-recall"]'::jsonb else '[]'::jsonb end,
        'nextRetrieval',case
          when next_attempt_id is null then null
          else jsonb_build_object(
            'attemptId',next_attempt_id,
            'occurredAt',next_attempt_at,
            'correct',next_correct,
            'durationMs',next_duration_ms,
            'intervalMs',greatest(
              0,
              floor(extract(epoch from (next_attempt_at-occurred_at))*1000)::bigint
            )
          )
        end,
        'resolution',case
          when next_attempt_id is null then 'awaiting-retest'
          when next_correct then 'recovered-next-retrieval'
          else 'repeated-error-next-retrieval'
        end
      )
      order by occurred_at, attempt_id
    ) as episodes
  from episodes
  group by concept_id
),
summary as (
  select
    concept_id,
    count(*)::integer as incorrect_attempts,
    count(distinct question_version_id)::integer as affected_question_versions,
    count(*) filter (where prior_error_count > 0)::integer as repeated_question_errors,
    count(*) filter (where prior_same_distractor_count > 0)::integer as repeated_same_distractor,
    count(*) filter (where memory_rating >= 3)::integer as incorrect_good_easy_recall,
    count(*) filter (where next_attempt_id is not null and next_correct)::integer as recovered_next_retrieval,
    count(*) filter (where next_attempt_id is not null and not next_correct)::integer as repeated_error_next_retrieval,
    count(*) filter (where next_attempt_id is null)::integer as awaiting_retest,
    min(occurred_at) as first_error_at,
    max(occurred_at) as last_error_at
  from episodes
  group by concept_id
)
select jsonb_build_object(
  'contractId','mistake-observation-v1',
  'learnerId',p_learner,
  'fingerprints',coalesce(
    jsonb_agg(
      jsonb_build_object(
        'conceptId',s.concept_id,
        'incorrectAttempts',s.incorrect_attempts,
        'affectedQuestionVersions',s.affected_question_versions,
        'firstErrorAt',s.first_error_at,
        'lastErrorAt',s.last_error_at,
        'patternCounts',jsonb_build_object(
          'repeatedQuestionErrors',s.repeated_question_errors,
          'repeatedSameDistractor',s.repeated_same_distractor,
          'incorrectGoodEasyRecall',s.incorrect_good_easy_recall,
          'recoveredNextRetrieval',s.recovered_next_retrieval,
          'repeatedErrorNextRetrieval',s.repeated_error_next_retrieval,
          'awaitingRetest',s.awaiting_retest
        ),
        'episodes',e.episodes
      )
      order by s.concept_id
    ),
    '[]'::jsonb
  )
)
from summary s
join episode_json e using(concept_id);
$function$;

revoke all on function public.study_mistake_evidence(uuid)
  from public, anon, authenticated;
grant execute on function public.study_mistake_evidence(uuid)
  to service_role;
