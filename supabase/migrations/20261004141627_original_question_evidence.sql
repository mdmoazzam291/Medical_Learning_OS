-- Original-only scored evidence projection. Keep all representations in the canonical ledger.
-- Exposure/intervening-contamination reads must still inspect public.study_attempts.
create view public.study_original_attempt_evidence_v1
with (security_invoker=true) as
select * from public.study_attempts
where presentation->>'representation' = 'original';
revoke all on public.study_original_attempt_evidence_v1 from public,anon,authenticated;
grant select on public.study_original_attempt_evidence_v1 to service_role;


-- Updated from 20260927125000_concept_evidence_projection.sql
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
  from public.study_original_attempt_evidence_v1 a
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

-- Updated from 20260927132000_mistake_evidence_projection.sql
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
  from public.study_original_attempt_evidence_v1 a
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

-- Updated from 20260927103500_fsrs_shadow_question_coverage.sql
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
  from public.study_original_attempt_evidence_v1 a
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

-- Updated from 20260926192000_study_recommendation_outcomes.sql
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
  left join public.study_original_attempt_evidence_v1 a
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
    from public.study_original_attempt_evidence_v1 a
    where a.learner_id = r.learner_id
      and a.session_id = r.session_id
      and a.event->>'questionVersionId' = item.value->>'questionVersionId'
    order by a.recorded_at asc, a.id asc
    limit 1
  ) current_attempt on true
  left join lateral (
    select a.*
    from public.study_original_attempt_evidence_v1 a
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

-- Updated from 20260928192031_m11a_delayed_retrieval_observation_projection.sql
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
  from public.study_original_attempt_evidence_v1 a
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
    from public.study_original_attempt_evidence_v1 a
    where a.learner_id = o.learner_id
      and a.event->>'questionVersionId' = o.question_version_id
      and (a.recorded_at, a.id) > (o.origin_recorded_at, o.origin_attempt_id)
    order by a.recorded_at, a.id
    limit 1
  ) same_item on true
  left join lateral (
    select a.*
    from public.study_original_attempt_evidence_v1 a
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

-- Updated from 20260928112019_m10b_visual_interaction_ledger.sql
create or replace function public.study_learning_event_stream_v1(
  p_learner uuid,
  p_limit integer default 500,
  p_after_recorded_at timestamptz default null,
  p_after_event_key text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $function$
declare
  v_events jsonb;
  v_count integer;
  v_has_more boolean;
  v_last_recorded_at timestamptz;
  v_last_event_key text;
begin
  if p_learner is null then
    raise exception using errcode = '22023', message = 'learning_event_stream_learner_required';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 5000 then
    raise exception using errcode = '22023', message = 'learning_event_stream_limit_invalid';
  end if;

  if (p_after_recorded_at is null) <> (p_after_event_key is null) then
    raise exception using errcode = '22023', message = 'learning_event_stream_cursor_invalid';
  end if;

  with all_events as (
    select
      'attempt:' || a.id::text as event_key,
      1::integer as schema_version,
      'question.answered'::text as family,
      'observation'::text as event_class,
      (a.event->>'occurredAt')::timestamptz as occurred_at,
      a.recorded_at,
      a.event->>'conceptId' as concept_id,
      a.event->>'questionVersionId' as question_version_id,
      a.session_id,
      'study_attempts'::text as source_table,
      a.id::text as source_id,
      a.event as payload
    from public.study_original_attempt_evidence_v1 a
    where a.learner_id = p_learner
      and a.event->>'type' = 'question.answered'
      and a.event->>'schemaVersion' = '1'

    union all

    select
      'memory:' || m.id::text,
      1::integer,
      'memory.rating'::text,
      'self_report'::text,
      m.recorded_at,
      m.recorded_at,
      a.event->>'conceptId',
      m.question_version_id,
      a.session_id,
      'study_memory_judgments'::text,
      m.id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion', 1,
        'type', 'memory.rating',
        'eventId', m.id,
        'attemptId', m.attempt_id,
        'questionVersionId', m.question_version_id,
        'conceptId', a.event->>'conceptId',
        'rating', m.rating,
        'ratingLabel', case m.rating
          when 1 then 'Again'
          when 2 then 'Hard'
          when 3 then 'Good'
          when 4 then 'Easy'
        end,
        'scaleId', m.scale_id,
        'promptId', m.prompt_id,
        'occurredAt', m.recorded_at
      )
    from public.study_memory_judgments m
    join public.study_original_attempt_evidence_v1 a
      on a.id = m.attempt_id
     and a.learner_id = m.learner_id
    where m.learner_id = p_learner

    union all

    select
      'recommendation:' || r.id::text,
      1::integer,
      'study.recommendation_generated'::text,
      'policy_decision'::text,
      r.created_at,
      r.created_at,
      null::text,
      null::text,
      r.session_id,
      'study_recommendation_events'::text,
      r.id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion', 1,
        'type', 'study.recommendation_generated',
        'eventId', r.id,
        'sessionId', r.session_id,
        'strategy', r.strategy,
        'availableMinutes', r.available_minutes,
        'plan', r.plan,
        'occurredAt', r.created_at
      )
    from public.study_recommendation_events r
    where r.learner_id = p_learner

    union all

    select
      'visual:' || v.id::text,
      1::integer,
      'media.interaction.completed'::text,
      'observation'::text,
      v.occurred_at,
      v.recorded_at,
      v.concept_id,
      v.question_version_id,
      v.session_id,
      'study_visual_interaction_events'::text,
      v.id::text,
      v.event
    from public.study_visual_interaction_events v
    where v.learner_id = p_learner
  ),
  after_cursor as (
    select *
    from all_events
    where p_after_recorded_at is null
       or (recorded_at, event_key) > (p_after_recorded_at, p_after_event_key)
  ),
  ranked as (
    select *
    from after_cursor
    order by recorded_at, event_key
    limit p_limit + 1
  ),
  page as (
    select *
    from ranked
    order by recorded_at, event_key
    limit p_limit
  ),
  last_row as (
    select recorded_at, event_key
    from page
    order by recorded_at desc, event_key desc
    limit 1
  )
  select
    coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'eventKey', event_key,
          'schemaVersion', schema_version,
          'family', family,
          'eventClass', event_class,
          'occurredAt', occurred_at,
          'recordedAt', recorded_at,
          'conceptId', concept_id,
          'questionVersionId', question_version_id,
          'sessionId', session_id,
          'source', pg_catalog.jsonb_build_object(
            'table', source_table,
            'id', source_id
          ),
          'payload', payload
        )
        order by recorded_at, event_key
      ),
      '[]'::jsonb
    ),
    count(*)::integer,
    (select count(*) > p_limit from ranked),
    (select recorded_at from last_row),
    (select event_key from last_row)
  into
    v_events,
    v_count,
    v_has_more,
    v_last_recorded_at,
    v_last_event_key
  from page;

  return pg_catalog.jsonb_build_object(
    'contractId', 'study-learning-event-stream-v1',
    'learnerId', p_learner,
    'ordering', 'recordedAt,eventKey',
    'eventCount', v_count,
    'hasMore', coalesce(v_has_more, false),
    'nextCursor', case
      when coalesce(v_has_more, false) and v_last_recorded_at is not null then
        pg_catalog.jsonb_build_object(
          'recordedAt', v_last_recorded_at,
          'eventKey', v_last_event_key
        )
      else null
    end,
    'includedFamilies', pg_catalog.jsonb_build_array(
      'question.answered',
      'memory.rating',
      'study.recommendation_generated',
      'media.interaction.completed'
    ),
    'inferenceAuthority', false,
    'masteryInferenceEnabled', false,
    'events', v_events
  );
end;
$function$;

-- Updated from 20261004135405_question_intelligence.sql
create or replace function public.study_learning_event_stream_v2(
  p_learner uuid,
  p_limit integer default 500,
  p_after_recorded_at timestamptz default null,
  p_after_event_key text default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path=''
as $function$
declare
  v_events jsonb;
  v_count integer;
  v_has_more boolean;
  v_last_recorded_at timestamptz;
  v_last_event_key text;
begin
  if p_learner is null then
    raise exception using errcode='22023', message='learning_event_stream_learner_required';
  end if;

  if p_limit is null or p_limit<1 or p_limit>5000 then
    raise exception using errcode='22023', message='learning_event_stream_limit_invalid';
  end if;

  if (p_after_recorded_at is null) <> (p_after_event_key is null) then
    raise exception using errcode='22023', message='learning_event_stream_cursor_invalid';
  end if;

  with all_events as (
    select
      'attempt:'||a.id::text as event_key,
      1::integer as schema_version,
      'question.answered'::text as family,
      'observation'::text as event_class,
      (a.event->>'occurredAt')::timestamptz as occurred_at,
      a.recorded_at,
      a.event->>'conceptId' as concept_id,
      a.event->>'questionVersionId' as question_version_id,
      a.session_id,
      'study_attempts'::text as source_table,
      a.id::text as source_id,
      a.event || jsonb_build_object('presentation',a.presentation) as payload
    from public.study_attempts a
    where a.learner_id=p_learner
      and a.event->>'type'='question.answered'
      and a.event->>'schemaVersion'='1'

    union all

    select
      'memory:'||m.id::text,
      1,
      'memory.rating',
      'self_report',
      m.recorded_at,
      m.recorded_at,
      a.event->>'conceptId',
      m.question_version_id,
      a.session_id,
      'study_memory_judgments',
      m.id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion',1,
        'type','memory.rating',
        'eventId',m.id,
        'attemptId',m.attempt_id,
        'questionVersionId',m.question_version_id,
        'conceptId',a.event->>'conceptId',
        'rating',m.rating,
        'ratingLabel',case m.rating when 1 then 'Again' when 2 then 'Hard' when 3 then 'Good' when 4 then 'Easy' end,
        'scaleId',m.scale_id,
        'promptId',m.prompt_id,
        'presentation',a.presentation,
        'occurredAt',m.recorded_at
      )
    from public.study_memory_judgments m
    join public.study_attempts a
      on a.id=m.attempt_id and a.learner_id=m.learner_id
    where m.learner_id=p_learner

    union all

    select
      'recommendation:'||r.id::text,
      1,
      'study.recommendation_generated',
      'policy_decision',
      r.created_at,
      r.created_at,
      null::text,
      null::text,
      r.session_id,
      'study_recommendation_events',
      r.id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion',1,
        'type','study.recommendation_generated',
        'eventId',r.id,
        'sessionId',r.session_id,
        'strategy',r.strategy,
        'availableMinutes',r.available_minutes,
        'plan',r.plan,
        'occurredAt',r.created_at
      )
    from public.study_recommendation_events r
    where r.learner_id=p_learner

    union all

    select
      'retention-assignment:'||a.assignment_id::text,
      1,
      'research.retention_probe_assigned',
      'research_policy_decision',
      a.scheduled_at,
      a.scheduled_at,
      a.concept_id,
      a.target_question_version_id,
      null::uuid,
      'study_retention_probe_assignments',
      a.assignment_id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion',1,
        'type','research.retention_probe_assigned',
        'assignmentId',a.assignment_id,
        'protocolId',a.protocol_id,
        'activationEventId',a.activation_event_id,
        'pairValidationId',a.pair_validation_id,
        'originAttemptId',a.origin_attempt_id,
        'originQuestionVersionId',a.origin_question_version_id,
        'targetQuestionVersionId',a.target_question_version_id,
        'windowOpenAt',a.window_open_at,
        'windowCloseAt',a.window_close_at,
        'occurredAt',a.scheduled_at
      )
    from public.study_retention_probe_assignments a
    where a.learner_id=p_learner

    union all

    select
      'retention-served:'||s.served_event_id::text,
      1,
      'research.retention_probe_server_served',
      'delivery_observation',
      s.served_at,
      s.recorded_at,
      a.concept_id,
      s.target_question_version_id,
      null::uuid,
      'study_retention_probe_served_events',
      s.served_event_id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion',1,
        'type','research.retention_probe_server_served',
        'servedEventId',s.served_event_id,
        'assignmentId',s.assignment_id,
        'targetQuestionVersionId',s.target_question_version_id,
        'targetMedicalSha256',s.target_medical_sha256,
        'catalogVersion',s.catalog_version,
        'learnerQuestionSha256',s.learner_question_sha256,
        'serverServed',true,
        'learnerRenderedConfirmed',false,
        'learnerViewedConfirmed',false,
        'occurredAt',s.served_at
      )
    from public.study_retention_probe_served_events s
    join public.study_retention_probe_assignments a
      on a.assignment_id=s.assignment_id
    where s.learner_id=p_learner

    union all

    select
      'retention-response-binding:'||b.binding_id::text,
      1,
      'research.retention_probe_response_bound',
      'evidence_link',
      b.responded_at,
      b.bound_at,
      a.concept_id,
      b.target_question_version_id,
      at.session_id,
      'study_retention_probe_response_bindings',
      b.binding_id::text,
      pg_catalog.jsonb_build_object(
        'schemaVersion',1,
        'type','research.retention_probe_response_bound',
        'bindingId',b.binding_id,
        'servedEventId',b.served_event_id,
        'assignmentId',b.assignment_id,
        'attemptId',b.attempt_id,
        'targetQuestionVersionId',b.target_question_version_id,
        'correct',b.correct,
        'responseDurationMs',b.response_duration_ms,
        'cleanForPrimaryAnalysis',b.clean_for_primary_analysis,
        'contaminationReasons',b.contamination_reasons,
        'occurredAt',b.responded_at
      )
    from public.study_retention_probe_response_bindings b
    join public.study_retention_probe_assignments a
      on a.assignment_id=b.assignment_id
    join public.study_attempts at
      on at.id=b.attempt_id
    where b.learner_id=p_learner
  ),
  after_cursor as (
    select *
    from all_events
    where p_after_recorded_at is null
       or (recorded_at,event_key)>(p_after_recorded_at,p_after_event_key)
  ),
  ranked as (
    select *
    from after_cursor
    order by recorded_at,event_key
    limit p_limit+1
  ),
  page as (
    select *
    from ranked
    order by recorded_at,event_key
    limit p_limit
  ),
  last_row as (
    select recorded_at,event_key
    from page
    order by recorded_at desc,event_key desc
    limit 1
  )
  select
    coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'eventKey',event_key,
          'schemaVersion',schema_version,
          'family',family,
          'eventClass',event_class,
          'occurredAt',occurred_at,
          'recordedAt',recorded_at,
          'conceptId',concept_id,
          'questionVersionId',question_version_id,
          'sessionId',session_id,
          'source',pg_catalog.jsonb_build_object(
            'table',source_table,
            'id',source_id
          ),
          'payload',payload
        )
        order by recorded_at,event_key
      ),
      '[]'::jsonb
    ),
    count(*)::integer,
    (select count(*)>p_limit from ranked),
    (select recorded_at from last_row),
    (select event_key from last_row)
  into
    v_events,
    v_count,
    v_has_more,
    v_last_recorded_at,
    v_last_event_key
  from page;

  return pg_catalog.jsonb_build_object(
    'contractId','study-learning-event-stream-v2',
    'learnerId',p_learner,
    'ordering','recordedAt,eventKey',
    'eventCount',v_count,
    'hasMore',coalesce(v_has_more,false),
    'nextCursor',case
      when coalesce(v_has_more,false) and v_last_recorded_at is not null then
        pg_catalog.jsonb_build_object(
          'recordedAt',v_last_recorded_at,
          'eventKey',v_last_event_key
        )
      else null
    end,
    'includedFamilies',pg_catalog.jsonb_build_array(
      'question.answered',
      'memory.rating',
      'study.recommendation_generated',
      'research.retention_probe_assigned',
      'research.retention_probe_server_served',
      'research.retention_probe_response_bound'
    ),
    'serverServedMeansLearnerSeen',false,
    'inferenceAuthority',false,
    'masteryInferenceEnabled',false,
    'events',v_events
  );
end;
$function$;


-- Updated from 20260927111500_schedule_policy_decisions.sql
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
  join public.study_original_attempt_evidence_v1 origin
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
    from public.study_original_attempt_evidence_v1 a
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

-- Updated from 20260927111500_schedule_policy_decisions.sql
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
  from public.study_original_attempt_evidence_v1
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

-- Updated from 20260929030036_m11c_transfer_pair_validation.sql
create or replace function public.study_validated_transfer_observations_v1(
  p_learner uuid
)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $function$
with origins as (
  select
    a.id as origin_attempt_id,
    a.learner_id,
    a.session_id,
    a.event->>'questionVersionId' as origin_question_version_id,
    a.event->>'conceptId' as concept_id,
    (a.event->>'occurredAt')::timestamptz as origin_occurred_at,
    a.recorded_at as origin_recorded_at,
    (a.event->>'correct')::boolean as origin_correct
  from public.study_original_attempt_evidence_v1 a
  where a.learner_id=p_learner
    and a.event->>'type'='question.answered'
    and a.event->>'schemaVersion'='1'
),
linked as (
  select
    o.*,
    t.transfer_attempt_id,
    t.transfer_question_version_id,
    t.transfer_occurred_at,
    t.transfer_recorded_at,
    t.transfer_correct,
    t.transfer_duration_ms,
    t.pair_validation_id,
    t.validation_sha256,
    t.surface_novelty,
    t.reasoning_alignment,
    t.difficulty_comparability,
    t.cue_overlap_risk,
    t.retention_probe_comparable,
    case
      when t.transfer_attempt_id is null then null
      else floor(extract(epoch from (t.transfer_occurred_at - o.origin_occurred_at)) * 1000)::bigint
    end as transfer_delay_ms,
    case
      when t.transfer_attempt_id is null then null
      else (
        select count(*)::integer
        from public.study_attempts prior_target
        where prior_target.learner_id=o.learner_id
          and prior_target.event->>'type'='question.answered'
          and prior_target.event->>'schemaVersion'='1'
          and prior_target.event->>'questionVersionId'=t.transfer_question_version_id
          and (prior_target.recorded_at, prior_target.id) < (o.origin_recorded_at, o.origin_attempt_id)
      )
    end as prior_target_attempts,
    case
      when t.transfer_attempt_id is null then null
      else (
        select count(*)::integer
        from public.study_attempts between_concept
        where between_concept.learner_id=o.learner_id
          and between_concept.event->>'type'='question.answered'
          and between_concept.event->>'schemaVersion'='1'
          and between_concept.event->>'conceptId'=o.concept_id
          and (between_concept.recorded_at, between_concept.id) > (o.origin_recorded_at, o.origin_attempt_id)
          and (between_concept.recorded_at, between_concept.id) < (t.transfer_recorded_at, t.transfer_attempt_id)
      )
    end as intervening_same_concept_attempts
  from origins o
  left join lateral (
    select
      a.id as transfer_attempt_id,
      a.event->>'questionVersionId' as transfer_question_version_id,
      (a.event->>'occurredAt')::timestamptz as transfer_occurred_at,
      a.recorded_at as transfer_recorded_at,
      (a.event->>'correct')::boolean as transfer_correct,
      case
        when (a.event->>'durationMs') ~ '^[0-9]+$'
          then (a.event->>'durationMs')::bigint
        else null
      end as transfer_duration_ms,
      v.id as pair_validation_id,
      v.validation_sha256,
      v.surface_novelty,
      v.reasoning_alignment,
      v.difficulty_comparability,
      v.cue_overlap_risk,
      v.retention_probe_comparable
    from public.study_original_attempt_evidence_v1 a
    join public.study_transfer_pair_validations v
      on v.decision='validated'
     and v.transfer_evidence_valid
     and v.primary_concept_id=o.concept_id
     and (
       (v.question_a_version_id=o.origin_question_version_id
         and v.question_b_version_id=a.event->>'questionVersionId')
       or
       (v.question_b_version_id=o.origin_question_version_id
         and v.question_a_version_id=a.event->>'questionVersionId')
     )
    where a.learner_id=o.learner_id
      and a.event->>'type'='question.answered'
      and a.event->>'schemaVersion'='1'
      and a.event->>'conceptId'=o.concept_id
      and a.event->>'questionVersionId'<>o.origin_question_version_id
      and (a.recorded_at, a.id) > (o.origin_recorded_at, o.origin_attempt_id)
      and public.current_review_target_sha256(v.question_a_version_id,'medical')=v.question_a_medical_sha256
      and public.current_review_target_sha256(v.question_b_version_id,'medical')=v.question_b_medical_sha256
    order by a.recorded_at, a.id
    limit 1
  ) t on true
),
summary as (
  select
    count(*)::integer as origin_attempts,
    count(*) filter (where transfer_attempt_id is not null)::integer as validated_transfer_followups,
    count(*) filter (
      where transfer_attempt_id is not null
        and prior_target_attempts=0
        and intervening_same_concept_attempts=0
    )::integer as clean_validated_transfer_followups
  from linked
)
select pg_catalog.jsonb_build_object(
  'contractId','study-validated-transfer-observations-v1',
  'learnerId',p_learner,
  'scope','validated-pair-descriptive-transfer-evidence',
  'inferenceAuthority',false,
  'masteryInferenceEnabled',false,
  'causalEffectClaimed',false,
  'summary',pg_catalog.jsonb_build_object(
    'originAttempts',s.origin_attempts,
    'validatedTransferFollowups',s.validated_transfer_followups,
    'cleanValidatedTransferFollowups',s.clean_validated_transfer_followups
  ),
  'observations',coalesce((
    select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'origin',pg_catalog.jsonb_build_object(
          'attemptId',r.origin_attempt_id,
          'sessionId',r.session_id,
          'questionVersionId',r.origin_question_version_id,
          'conceptId',r.concept_id,
          'occurredAt',r.origin_occurred_at,
          'correct',r.origin_correct
        ),
        'validatedTransfer',case
          when r.transfer_attempt_id is null then null
          else pg_catalog.jsonb_build_object(
            'attemptId',r.transfer_attempt_id,
            'questionVersionId',r.transfer_question_version_id,
            'occurredAt',r.transfer_occurred_at,
            'delayMs',r.transfer_delay_ms,
            'correct',r.transfer_correct,
            'durationMs',r.transfer_duration_ms,
            'priorTargetAttempts',r.prior_target_attempts,
            'interveningSameConceptAttempts',r.intervening_same_concept_attempts,
            'cleanObservedTransfer',
              r.prior_target_attempts=0 and r.intervening_same_concept_attempts=0,
            'pairValidation',pg_catalog.jsonb_build_object(
              'validationId',r.pair_validation_id,
              'validationSha256',r.validation_sha256,
              'surfaceNovelty',r.surface_novelty,
              'reasoningAlignment',r.reasoning_alignment,
              'difficultyComparability',r.difficulty_comparability,
              'cueOverlapRisk',r.cue_overlap_risk,
              'retentionProbeComparable',r.retention_probe_comparable
            )
          )
        end
      )
      order by r.origin_occurred_at, r.origin_attempt_id
    )
    from linked r
  ),'[]'::jsonb),
  'limitations',pg_catalog.jsonb_build_array(
    'validated-item-pair-does-not-prove-general-transfer-beyond-the-pair',
    'clean-observed-transfer-can-still-have-unobserved-outside-platform-exposure',
    'descriptive-transfer-evidence-does-not-estimate-mastery-or-causal-effect',
    'item-pair-validation-is-exact-version-and-hash-bound'
  )
)
from summary s;
$function$;

-- Updated from 20260930004500_m05c_study_now_integrity.sql
create or replace function public.study_now_completion_integrity_v1(
  p_learner uuid
)
returns jsonb
language sql
stable
security invoker
set search_path=''
as $function$
with recommendations as (
  select
    r.id as recommendation_id,
    r.session_id,
    r.created_at,
    r.strategy,
    r.available_minutes,
    r.plan,
    s.closed as session_closed,
    s.position as session_position
  from public.study_recommendation_events r
  join public.study_sessions s
    on s.id=r.session_id
   and s.learner_id=r.learner_id
  where r.learner_id=p_learner
),
items as (
  select
    r.*,
    item.ordinality::integer as item_position,
    item.value->>'questionVersionId' as question_version_id,
    item.value->>'reason' as reason
  from recommendations r
  cross join lateral pg_catalog.jsonb_array_elements(r.plan->'selected')
    with ordinality as item(value,ordinality)
),
item_evidence as (
  select
    i.*,
    a.id as attempt_id,
    a.recorded_at as attempt_recorded_at,
    exists (
      select 1
      from public.study_schedule_decision_events d
      where d.learner_id=p_learner
        and d.attempt_id=a.id
        and d.role='authoritative'
    ) as authoritative_schedule_recorded,
    exists (
      select 1
      from public.study_memory_judgments m
      where m.learner_id=p_learner
        and m.attempt_id=a.id
    ) as memory_rating_recorded,
    exists (
      select 1
      from public.study_recommendation_transport_events t
      where t.learner_id=p_learner
        and t.attempt_id=a.id
        and t.transport_kind='hosted-browser-cors'
        and t.event_kind='answer'
    ) as hosted_browser_answer
  from items i
  left join lateral (
    select a.*
    from public.study_original_attempt_evidence_v1 a
    where a.learner_id=p_learner
      and a.session_id=i.session_id
      and a.event->>'questionVersionId'=i.question_version_id
    order by a.recorded_at,a.id
    limit 1
  ) a on true
),
grouped as (
  select
    recommendation_id,
    session_id,
    created_at,
    strategy,
    available_minutes,
    session_closed,
    session_position,
    count(*)::integer as selected_count,
    count(attempt_id)::integer as attempted_count,
    count(*) filter (where authoritative_schedule_recorded)::integer
      as authoritative_schedule_count,
    count(*) filter (where memory_rating_recorded)::integer as memory_rating_count,
    count(*) filter (where hosted_browser_answer)::integer as hosted_browser_answer_count,
    coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'questionVersionId',question_version_id,
          'reason',reason,
          'attemptId',attempt_id,
          'attemptedAt',attempt_recorded_at,
          'authoritativeScheduleRecorded',authoritative_schedule_recorded,
          'memoryRatingRecorded',memory_rating_recorded,
          'hostedBrowserAnswer',hosted_browser_answer
        )
        order by item_position
      ),
      '[]'::jsonb
    ) as items
  from item_evidence
  group by
    recommendation_id,session_id,created_at,strategy,available_minutes,
    session_closed,session_position
),
evaluated as (
  select
    g.*,
    (
      selected_count>0
      and session_closed
      and attempted_count=selected_count
      and authoritative_schedule_count=selected_count
    ) as evidence_chain_complete,
    (
      selected_count>0
      and session_closed
      and attempted_count=selected_count
      and authoritative_schedule_count=selected_count
      and hosted_browser_answer_count>0
    ) as hosted_m05c_gate_satisfied,
    (
      (case when not session_closed
        then '["session-open"]'::jsonb else '[]'::jsonb end)
      ||
      (case when attempted_count<>selected_count
        then '["selected-items-unattempted"]'::jsonb else '[]'::jsonb end)
      ||
      (case when authoritative_schedule_count<>attempted_count
        then '["authoritative-reschedule-evidence-missing"]'::jsonb else '[]'::jsonb end)
      ||
      (case when hosted_browser_answer_count=0
        then '["no-hosted-browser-answer-evidence"]'::jsonb else '[]'::jsonb end)
    ) as blockers
  from grouped g
),
summary as (
  select
    count(*)::integer as recommendation_count,
    count(*) filter (where evidence_chain_complete)::integer as complete_evidence_chain_count,
    count(*) filter (where hosted_m05c_gate_satisfied)::integer as hosted_gate_count,
    count(*) filter (where not session_closed)::integer as open_recommendation_session_count
  from evaluated
),
latest as (
  select *
  from evaluated
  order by created_at desc,recommendation_id desc
  limit 1
)
select pg_catalog.jsonb_build_object(
  'contractId','study-now-completion-integrity-v1',
  'learnerId',p_learner,
  'recommendationCount',s.recommendation_count,
  'completeEvidenceChainCount',s.complete_evidence_chain_count,
  'hostedBrowserGateSatisfied',s.hosted_gate_count>0,
  'openRecommendationSessionCount',s.open_recommendation_session_count,
  'memoryRatingRequiredForCompletion',false,
  'latestRecommendation',case
    when l.recommendation_id is null then null
    else pg_catalog.jsonb_build_object(
      'recommendationId',l.recommendation_id,
      'sessionId',l.session_id,
      'createdAt',l.created_at,
      'strategy',l.strategy,
      'availableMinutes',l.available_minutes,
      'sessionClosed',l.session_closed,
      'sessionPosition',l.session_position,
      'selectedCount',l.selected_count,
      'attemptedCount',l.attempted_count,
      'authoritativeScheduleCount',l.authoritative_schedule_count,
      'memoryRatingCount',l.memory_rating_count,
      'hostedBrowserAnswerCount',l.hosted_browser_answer_count,
      'evidenceChainComplete',l.evidence_chain_complete,
      'hostedM05cGateSatisfied',l.hosted_m05c_gate_satisfied,
      'blockers',l.blockers,
      'items',l.items
    )
  end,
  'recommendations',coalesce((
    select pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'recommendationId',e.recommendation_id,
        'sessionId',e.session_id,
        'createdAt',e.created_at,
        'sessionClosed',e.session_closed,
        'selectedCount',e.selected_count,
        'attemptedCount',e.attempted_count,
        'authoritativeScheduleCount',e.authoritative_schedule_count,
        'memoryRatingCount',e.memory_rating_count,
        'hostedBrowserAnswerCount',e.hosted_browser_answer_count,
        'evidenceChainComplete',e.evidence_chain_complete,
        'hostedM05cGateSatisfied',e.hosted_m05c_gate_satisfied,
        'blockers',e.blockers
      )
      order by e.created_at,e.recommendation_id
    )
    from evaluated e
  ),'[]'::jsonb),
  'interpretation',pg_catalog.jsonb_build_object(
    'scope','acceptance-integrity-not-learning-quality',
    'memoryRatingOptional',true,
    'masteryInferenceAuthority',false,
    'schedulerPolicyPromotionAuthority',false
  )
)
from summary s
left join latest l on true;
$function$;

-- Updated from 20260930010500_m05d_memory_engine_evidence_readiness.sql
create or replace function public.study_memory_engine_evidence_readiness_v1()
returns jsonb
language plpgsql
stable
security invoker
set search_path=''
as $function$
declare
  v_experiment public.study_policy_experiment_specs%rowtype;
  v_experiment_readiness jsonb;
  v_state text;
  v_total_learners integer := 0;
  v_learners_with_attempts integer := 0;
  v_learners_with_ratings integer := 0;
  v_total_attempts integer := 0;
  v_rated_attempts integer := 0;
  v_rated_question_histories integer := 0;
  v_fully_rated_question_histories integer := 0;
  v_rating_lag_mean_ms bigint;
  v_rating_lag_median_ms bigint;
  v_rating_lag_max_ms bigint;
  v_paired_attempts integer := 0;
  v_paired_learners integer := 0;
  v_same_item_followups integer := 0;
  v_delay_1d integer := 0;
  v_delay_7d integer := 0;
  v_delay_30d integer := 0;
  v_delay_90d integer := 0;
  v_delay_180d integer := 0;
  v_rated_origins_with_followup integer := 0;
  v_metric_status text;
  v_blockers jsonb := '[]'::jsonb;
begin
  select *
  into v_experiment
  from public.study_policy_experiment_specs s
  where s.experiment_id='scheduler-bootstrap-vs-fsrs-v1'
    and s.version=1
  limit 1;

  if v_experiment.experiment_id is null then
    raise exception using errcode='55000', message='memory_engine_experiment_spec_missing';
  end if;

  v_experiment_readiness := public.study_policy_experiment_readiness(
    v_experiment.experiment_id,
    v_experiment.version
  );
  v_state := public.study_policy_experiment_current_state(
    v_experiment.experiment_id,
    v_experiment.version
  );
  v_metric_status := coalesce(v_experiment.metric_contract->>'status','unknown');

  select
    count(*)::integer,
    count(*) filter (
      where exists (
        select 1 from public.study_original_attempt_evidence_v1 a where a.learner_id=u.id
      )
    )::integer,
    count(*) filter (
      where exists (
        select 1 from public.study_memory_judgments m
        join public.study_original_attempt_evidence_v1 rated_origin
          on rated_origin.id=m.attempt_id and rated_origin.learner_id=m.learner_id
        where m.learner_id=u.id
      )
    )::integer
  into
    v_total_learners,
    v_learners_with_attempts,
    v_learners_with_ratings
  from auth.users u;

  select
    count(a.id)::integer,
    count(m.id)::integer,
    count(distinct (a.learner_id,a.event->>'questionVersionId'))
      filter (where m.id is not null)::integer,
    round(avg(
      extract(epoch from (m.recorded_at-(a.event->>'occurredAt')::timestamptz))*1000
    ) filter (
      where m.id is not null
        and m.recorded_at >= (a.event->>'occurredAt')::timestamptz
    ))::bigint,
    round(percentile_cont(0.5) within group (
      order by extract(epoch from (m.recorded_at-(a.event->>'occurredAt')::timestamptz))*1000
    ) filter (
      where m.id is not null
        and m.recorded_at >= (a.event->>'occurredAt')::timestamptz
    ))::bigint,
    round(max(
      extract(epoch from (m.recorded_at-(a.event->>'occurredAt')::timestamptz))*1000
    ) filter (
      where m.id is not null
        and m.recorded_at >= (a.event->>'occurredAt')::timestamptz
    ))::bigint
  into
    v_total_attempts,
    v_rated_attempts,
    v_rated_question_histories,
    v_rating_lag_mean_ms,
    v_rating_lag_median_ms,
    v_rating_lag_max_ms
  from public.study_original_attempt_evidence_v1 a
  left join public.study_memory_judgments m
    on m.learner_id=a.learner_id
   and m.attempt_id=a.id;

  select count(*)::integer
  into v_fully_rated_question_histories
  from (
    select
      a.learner_id,
      a.event->>'questionVersionId' as question_version_id
    from public.study_original_attempt_evidence_v1 a
    left join public.study_memory_judgments m
      on m.learner_id=a.learner_id
     and m.attempt_id=a.id
    group by a.learner_id,a.event->>'questionVersionId'
    having count(*)>0 and count(*)=count(m.id)
  ) histories;

  with paired as (
    select a.learner_id,a.attempt_id
    from public.study_schedule_decision_events a
    join public.study_schedule_decision_events s
      on s.learner_id=a.learner_id
     and s.attempt_id=a.attempt_id
    join public.study_original_attempt_evidence_v1 paired_origin
      on paired_origin.id=a.attempt_id and paired_origin.learner_id=a.learner_id
    where a.role='authoritative'
      and a.policy_id='bootstrap-binary-v1'
      and a.policy_version=1
      and a.config_version='bootstrap-binary-v1@1'
      and s.role='shadow'
      and s.policy_id='fsrs-shadow'
      and s.policy_version=1
      and s.config_version='fsrs-shadow-default-v1'
    group by a.learner_id,a.attempt_id
  )
  select count(*)::integer,count(distinct learner_id)::integer
  into v_paired_attempts,v_paired_learners
  from paired;

  with attempts as (
    select
      a.id,
      a.learner_id,
      a.event->>'questionVersionId' as question_version_id,
      (a.event->>'occurredAt')::timestamptz as occurred_at,
      exists (
        select 1
        from public.study_memory_judgments m
        where m.learner_id=a.learner_id
          and m.attempt_id=a.id
      ) as rated
    from public.study_original_attempt_evidence_v1 a
    where a.event->>'type'='question.answered'
  ),
  linked as (
    select
      origin.id as origin_attempt_id,
      origin.rated,
      followup.id as followup_attempt_id,
      case
        when followup.id is null then null
        else extract(epoch from (followup.occurred_at-origin.occurred_at))*1000
      end as delay_ms
    from attempts origin
    left join lateral (
      select next_attempt.*
      from attempts next_attempt
      where next_attempt.learner_id=origin.learner_id
        and next_attempt.question_version_id=origin.question_version_id
        and (
          next_attempt.occurred_at>origin.occurred_at
          or (
            next_attempt.occurred_at=origin.occurred_at
            and next_attempt.id::text>origin.id::text
          )
        )
      order by next_attempt.occurred_at,next_attempt.id
      limit 1
    ) followup on true
  )
  select
    count(*) filter (where followup_attempt_id is not null)::integer,
    count(*) filter (where delay_ms>=86400000)::integer,
    count(*) filter (where delay_ms>=604800000)::integer,
    count(*) filter (where delay_ms>=2592000000)::integer,
    count(*) filter (where delay_ms>=7776000000)::integer,
    count(*) filter (where delay_ms>=15552000000)::integer,
    count(*) filter (where rated and followup_attempt_id is not null)::integer
  into
    v_same_item_followups,
    v_delay_1d,
    v_delay_7d,
    v_delay_30d,
    v_delay_90d,
    v_delay_180d,
    v_rated_origins_with_followup
  from linked;

  if v_experiment.minimum_eligible_learners is null then
    v_blockers:=v_blockers||'["experiment-population-threshold-not-preregistered"]'::jsonb;
  end if;

  if v_metric_status<>'preregistered' then
    v_blockers:=v_blockers||'["experiment-metric-contract-still-draft"]'::jsonb;
  end if;

  v_blockers:=v_blockers||'["rating-timing-eligibility-rule-not-preregistered"]'::jsonb;

  if v_fully_rated_question_histories=0 then
    v_blockers:=v_blockers||'["no-fully-rated-question-history"]'::jsonb;
  end if;

  if v_paired_attempts=0 then
    v_blockers:=v_blockers||'["no-paired-authoritative-shadow-schedule-decision"]'::jsonb;
  end if;

  if v_delay_1d=0 then
    v_blockers:=v_blockers||'["no-same-item-retrieval-at-or-beyond-1-day"]'::jsonb;
  end if;

  if v_delay_7d=0 then
    v_blockers:=v_blockers||'["no-same-item-retrieval-at-or-beyond-7-days"]'::jsonb;
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','study-memory-engine-evidence-readiness-v1',
    'generatedAt',pg_catalog.now(),
    'livePolicy',pg_catalog.jsonb_build_object(
      'policyId','bootstrap-binary-v1',
      'fsrsControlsDueDates',false
    ),
    'candidatePolicy',pg_catalog.jsonb_build_object(
      'policyId','fsrs-shadow',
      'policyVersion',1,
      'configVersion','fsrs-shadow-default-v1',
      'mode','shadow-only'
    ),
    'observedEvidence',pg_catalog.jsonb_build_object(
      'learnerCount',v_total_learners,
      'learnersWithAttempts',v_learners_with_attempts,
      'learnersWithMemoryRatings',v_learners_with_ratings,
      'totalAttempts',v_total_attempts,
      'ratedAttempts',v_rated_attempts,
      'ratingCoverage',case
        when v_total_attempts=0 then null
        else v_rated_attempts::double precision/v_total_attempts
      end,
      'ratedLearnerQuestionHistories',v_rated_question_histories,
      'fullyRatedLearnerQuestionHistories',v_fully_rated_question_histories,
      'ratingLagMs',pg_catalog.jsonb_build_object(
        'mean',v_rating_lag_mean_ms,
        'median',v_rating_lag_median_ms,
        'max',v_rating_lag_max_ms,
        'eligibilityRulePreregistered',false
      ),
      'pairedAuthoritativeShadowAttempts',v_paired_attempts,
      'learnersWithPairedAuthoritativeShadowEvidence',v_paired_learners,
      'sameItemFollowups',v_same_item_followups,
      'ratedOriginsWithSameItemFollowup',v_rated_origins_with_followup,
      'delayCoverage',pg_catalog.jsonb_build_object(
        'atLeast1Day',v_delay_1d,
        'atLeast7Days',v_delay_7d,
        'atLeast30Days',v_delay_30d,
        'atLeast90Days',v_delay_90d,
        'atLeast180Days',v_delay_180d
      )
    ),
    'experiment',pg_catalog.jsonb_build_object(
      'experimentId',v_experiment.experiment_id,
      'version',v_experiment.version,
      'state',v_state,
      'specSha256',v_experiment.spec_sha256,
      'metricContractStatus',v_metric_status,
      'minimumEligibleLearners',v_experiment.minimum_eligible_learners,
      'readiness',v_experiment_readiness
    ),
    'readiness',pg_catalog.jsonb_build_object(
      'evidenceSufficientForExperimentPreregistration',false,
      'canArmCurrentExperiment',
        coalesce((v_experiment_readiness->>'canArm')::boolean,false),
      'canRunCurrentExperiment',false,
      'canPromoteFsrsToProduction',false,
      'blockingReasons',v_blockers
    ),
    'nextEvidenceAction',pg_catalog.jsonb_build_object(
      'kind','collect-prospective-rated-delayed-retrieval-evidence',
      'inventNumericThresholdNow',false,
      'why',
        'Current evidence is descriptive and too sparse to justify an FSRS-vs-bootstrap experiment threshold or production scheduler change.'
    ),
    'authority',pg_catalog.jsonb_build_object(
      'schedulerControl',false,
      'experimentArmAuthority',false,
      'productionPromotionAuthority',false,
      'masteryInferenceAuthority',false
    )
  );
end;
$function$;

-- Updated from 20260930105000_m11f2_fix_scheduler_pair_resolution.sql
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
  from public.study_original_attempt_evidence_v1 a
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

-- Updated from 20260930164500_m11f5_learner_origin_handoff.sql
create or replace function public.study_retention_probe_origin_readiness_v1(
  p_learner uuid,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
stable
set search_path to ''
as $function$
declare
  v_protocol public.study_retention_probe_protocols%rowtype;
  v_activation public.study_retention_probe_activation_events%rowtype;
  v_consent public.study_retention_probe_consent_events%rowtype;
  v_pair public.study_transfer_pair_validations%rowtype;
  v_a jsonb;
  v_b jsonb;
  v_a_attempts integer := 0;
  v_b_attempts integer := 0;
  v_origin_version text;
  v_target_version text;
  v_origin_attempt_id uuid;
  v_origin_attempted_at timestamptz;
  v_window_open_at timestamptz;
  v_window_close_at timestamptz;
  v_open_session uuid;
  v_blockers jsonb := '[]'::jsonb;
  v_concept_id text;
begin
  if p_learner is null then
    raise exception using errcode='22023', message='retention_probe_origin_learner_required';
  end if;

  select * into v_protocol
  from public.study_retention_probe_protocols p
  where p.protocol_id='retention-probe-feasibility-v1'
    and p.status='preregistered'
  limit 1;

  if v_protocol.protocol_id is null then
    return pg_catalog.jsonb_build_object(
      'contractId','study-retention-probe-origin-readiness-v1',
      'state','blocked',
      'blockingReasons','["protocol-unavailable"]'::jsonb,
      'originAttemptRecorded',false,
      'automaticExecutionEnabled',false,
      'studyNowAuthority',false,
      'masteryInferenceAuthority',false
    );
  end if;

  select e.* into v_activation
  from public.study_retention_probe_activation_events e
  where e.protocol_id=v_protocol.protocol_id
    and e.protocol_sha256=v_protocol.protocol_sha256
  order by e.recorded_at desc, e.id desc
  limit 1;

  if v_activation.id is null
     or v_activation.decision<>'authorize'
     or v_activation.authorization_valid_until<=p_now then
    return pg_catalog.jsonb_build_object(
      'contractId','study-retention-probe-origin-readiness-v1',
      'state','blocked',
      'blockingReasons','["active-authorization-required"]'::jsonb,
      'originAttemptRecorded',false,
      'automaticExecutionEnabled',false,
      'studyNowAuthority',false,
      'masteryInferenceAuthority',false
    );
  end if;

  select e.* into v_consent
  from public.study_retention_probe_consent_events e
  where e.learner_id=p_learner
    and e.protocol_id=v_protocol.protocol_id
    and e.protocol_sha256=v_protocol.protocol_sha256
  order by e.recorded_at desc, e.id desc
  limit 1;

  if v_consent.id is null or v_consent.decision<>'opt_in' then
    return pg_catalog.jsonb_build_object(
      'contractId','study-retention-probe-origin-readiness-v1',
      'state','blocked',
      'blockingReasons','["learner-not-currently-opted-in"]'::jsonb,
      'originAttemptRecorded',false,
      'automaticExecutionEnabled',false,
      'studyNowAuthority',false,
      'masteryInferenceAuthority',false
    );
  end if;

  select * into v_pair
  from public.study_transfer_pair_validations v
  where v.id=v_activation.pair_validation_id
    and v.validation_sha256=v_activation.pair_validation_sha256
  limit 1;

  if v_pair.id is null
     or v_pair.decision<>'validated'
     or not v_pair.transfer_evidence_valid
     or not v_pair.retention_probe_comparable then
    return pg_catalog.jsonb_build_object(
      'contractId','study-retention-probe-origin-readiness-v1',
      'state','blocked',
      'blockingReasons','["validated-current-pair-required"]'::jsonb,
      'originAttemptRecorded',false,
      'automaticExecutionEnabled',false,
      'studyNowAuthority',false,
      'masteryInferenceAuthority',false
    );
  end if;

  select q into v_a
  from public.study_catalog c
  cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
  where c.id=1 and q->>'questionVersionId'=v_pair.question_a_version_id
  limit 1;

  select q into v_b
  from public.study_catalog c
  cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
  where c.id=1 and q->>'questionVersionId'=v_pair.question_b_version_id
  limit 1;

  if v_a is null or v_b is null
     or v_a->>'status'<>'published'
     or v_b->>'status'<>'published'
     or public.current_review_target_sha256(v_pair.question_a_version_id,'medical')<>v_pair.question_a_medical_sha256
     or public.current_review_target_sha256(v_pair.question_b_version_id,'medical')<>v_pair.question_b_medical_sha256 then
    return pg_catalog.jsonb_build_object(
      'contractId','study-retention-probe-origin-readiness-v1',
      'state','blocked',
      'blockingReasons','["pair-or-content-no-longer-current"]'::jsonb,
      'originAttemptRecorded',false,
      'automaticExecutionEnabled',false,
      'studyNowAuthority',false,
      'masteryInferenceAuthority',false
    );
  end if;

  v_concept_id := v_pair.primary_concept_id;

  select count(*)::integer into v_a_attempts
  from public.study_attempts a
  where a.learner_id=p_learner
    and a.event->>'type'='question.answered'
    and a.event->>'questionVersionId'=v_pair.question_a_version_id;

  select count(*)::integer into v_b_attempts
  from public.study_attempts a
  where a.learner_id=p_learner
    and a.event->>'type'='question.answered'
    and a.event->>'questionVersionId'=v_pair.question_b_version_id;

  if v_a_attempts>0 and v_b_attempts=0 then
    v_origin_version:=v_pair.question_a_version_id;
    v_target_version:=v_pair.question_b_version_id;
  elsif v_b_attempts>0 and v_a_attempts=0 then
    v_origin_version:=v_pair.question_b_version_id;
    v_target_version:=v_pair.question_a_version_id;
  elsif v_a_attempts=0 and v_b_attempts=0 then
    return pg_catalog.jsonb_build_object(
      'contractId','study-retention-probe-origin-readiness-v1',
      'state','blocked',
      'blockingReasons','["prior-origin-attempt-required"]'::jsonb,
      'originAttemptRecorded',false,
      'automaticExecutionEnabled',false,
      'studyNowAuthority',false,
      'masteryInferenceAuthority',false
    );
  else
    return pg_catalog.jsonb_build_object(
      'contractId','study-retention-probe-origin-readiness-v1',
      'state','blocked',
      'blockingReasons','["alternate-target-already-seen"]'::jsonb,
      'originAttemptRecorded',false,
      'automaticExecutionEnabled',false,
      'studyNowAuthority',false,
      'masteryInferenceAuthority',false
    );
  end if;

  select a.id, (a.event->>'occurredAt')::timestamptz
  into v_origin_attempt_id, v_origin_attempted_at
  from public.study_original_attempt_evidence_v1 a
  where a.learner_id=p_learner
    and a.event->>'type'='question.answered'
    and a.event->>'questionVersionId'=v_origin_version
    and (a.event->>'occurredAt')::timestamptz>=greatest(v_activation.recorded_at,v_consent.recorded_at)
  order by (a.event->>'occurredAt')::timestamptz desc, a.id desc
  limit 1;

  if v_origin_attempt_id is not null and exists (
    select 1
    from public.study_attempts contamination
    where contamination.learner_id=p_learner
      and contamination.id<>v_origin_attempt_id
      and contamination.event->>'type'='question.answered'
      and contamination.event->>'conceptId'=v_concept_id
      and (contamination.event->>'occurredAt')::timestamptz>v_origin_attempted_at
      and (contamination.event->>'occurredAt')::timestamptz<=p_now
  ) then
    v_origin_attempt_id:=null;
    v_origin_attempted_at:=null;
  end if;

  if v_origin_attempt_id is not null then
    v_window_open_at:=v_origin_attempted_at + interval '6 days';
    v_window_close_at:=v_origin_attempted_at + interval '8 days';

    if p_now<=v_window_close_at then
      return pg_catalog.jsonb_build_object(
        'contractId','study-retention-probe-origin-readiness-v1',
        'state','waiting',
        'originAttemptRecorded',true,
        'originAttemptedAt',v_origin_attempted_at,
        'windowOpenAt',v_window_open_at,
        'windowCloseAt',v_window_close_at,
        'targetStillUnseen',true,
        'automaticExecutionEnabled',false,
        'studyNowAuthority',false,
        'masteryInferenceAuthority',false
      );
    end if;
  end if;

  if exists (
    select 1
    from public.study_revision_state r
    where r.learner_id=p_learner
      and (r.due_at<=p_now or r.latest_correct=false)
  ) then
    v_blockers:=v_blockers||'["due-or-mistake-repair-work-takes-priority"]'::jsonb;
  end if;

  select s.id into v_open_session
  from public.study_sessions s
  where s.learner_id=p_learner and s.closed=false
  order by s.question_started_at desc, s.id desc
  limit 1;

  if v_open_session is not null then
    v_blockers:=v_blockers||'["open-study-session-takes-priority"]'::jsonb;
  end if;

  if pg_catalog.jsonb_array_length(v_blockers)>0 then
    return pg_catalog.jsonb_build_object(
      'contractId','study-retention-probe-origin-readiness-v1',
      'state','blocked',
      'blockingReasons',v_blockers,
      'originQuestionVersionId',v_origin_version,
      'originAttemptRecorded',false,
      'targetStillUnseen',true,
      'automaticExecutionEnabled',false,
      'studyNowAuthority',false,
      'masteryInferenceAuthority',false
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','study-retention-probe-origin-readiness-v1',
    'state','origin_available',
    'blockingReasons','[]'::jsonb,
    'originQuestionVersionId',v_origin_version,
    'originAttemptRecorded',false,
    'targetStillUnseen',true,
    'learnerMustStart',true,
    'ordinaryCanonicalAnswerRequired',true,
    'automaticExecutionEnabled',false,
    'studyNowAuthority',false,
    'masteryInferenceAuthority',false
  );
end;
$function$;

-- Updated from 20260929235000_m11f2_probe_scheduler_kernel.sql
create or replace function public.study_retention_probe_delivery_readiness_v1(
  p_assignment_id uuid,
  p_learner uuid,
  p_now timestamptz default pg_catalog.now()
)
returns jsonb
language plpgsql
stable
security invoker
set search_path=''
as $function$
declare
  v_assignment public.study_retention_probe_assignments%rowtype;
  v_latest_consent public.study_retention_probe_consent_events%rowtype;
  v_latest_activation public.study_retention_probe_activation_events%rowtype;
  v_pair public.study_transfer_pair_validations%rowtype;
  v_a jsonb;
  v_b jsonb;
  v_blockers jsonb := '[]'::jsonb;
begin
  select *
  into v_assignment
  from public.study_retention_probe_assignments a
  where a.assignment_id=p_assignment_id
    and a.learner_id=p_learner
  limit 1;

  if v_assignment.assignment_id is null then
    return pg_catalog.jsonb_build_object(
      'contractId','study-retention-probe-delivery-readiness-v1',
      'assignmentFound',false,
      'deliverable',false,
      'blockingReasons','["assignment-not-found"]'::jsonb,
      'learnerDeliveryEnabled',false
    );
  end if;

  -- Even a preexisting assignment must bind an actual original-question origin.
  if not exists (
    select 1 from public.study_original_attempt_evidence_v1 origin
    where origin.id=v_assignment.origin_attempt_id
      and origin.learner_id=p_learner
      and origin.event->>'questionVersionId'=v_assignment.origin_question_version_id
  ) then
    v_blockers:=v_blockers||'["original-origin-required"]'::jsonb;
  end if;

  select e.*
  into v_latest_consent
  from public.study_retention_probe_consent_events e
  where e.learner_id=p_learner
    and e.protocol_id=v_assignment.protocol_id
    and e.protocol_sha256=v_assignment.protocol_sha256
  order by e.recorded_at desc, e.id desc
  limit 1;

  select e.*
  into v_latest_activation
  from public.study_retention_probe_activation_events e
  where e.protocol_id=v_assignment.protocol_id
    and e.protocol_sha256=v_assignment.protocol_sha256
  order by e.recorded_at desc, e.id desc
  limit 1;

  select *
  into v_pair
  from public.study_transfer_pair_validations v
  where v.id=v_assignment.pair_validation_id
    and v.validation_sha256=v_assignment.pair_validation_sha256
  limit 1;

  if v_pair.id is not null then
    select q into v_a
    from public.study_catalog c
    cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
    where c.id=1 and q->>'questionVersionId'=v_pair.question_a_version_id
    limit 1;

    select q into v_b
    from public.study_catalog c
    cross join lateral pg_catalog.jsonb_array_elements(c.body->'questions') q
    where c.id=1 and q->>'questionVersionId'=v_pair.question_b_version_id
    limit 1;
  end if;

  if v_latest_consent.id is null or v_latest_consent.decision<>'opt_in' then
    v_blockers:=v_blockers||'["learner-not-currently-opted-in"]'::jsonb;
  end if;

  if v_latest_activation.id is null
     or v_latest_activation.id<>v_assignment.activation_event_id
     or v_latest_activation.decision<>'authorize'
     or v_latest_activation.authorization_valid_until<=p_now then
    v_blockers:=v_blockers||'["activation-authorization-not-current"]'::jsonb;
  end if;

  if v_pair.id is null
     or v_pair.decision<>'validated'
     or not v_pair.transfer_evidence_valid
     or not v_pair.retention_probe_comparable
     or v_a is null
     or v_b is null
     or v_a->>'status'<>'published'
     or v_b->>'status'<>'published'
     or public.current_review_target_sha256(v_pair.question_a_version_id,'medical')<>v_pair.question_a_medical_sha256
     or public.current_review_target_sha256(v_pair.question_b_version_id,'medical')<>v_pair.question_b_medical_sha256 then
    v_blockers:=v_blockers||'["pair-or-content-no-longer-current"]'::jsonb;
  end if;

  if p_now < v_assignment.window_open_at or p_now > v_assignment.window_close_at then
    v_blockers:=v_blockers||'["outside-preregistered-delivery-window"]'::jsonb;
  end if;

  if exists (
    select 1
    from public.study_attempts target
    where target.learner_id=p_learner
      and target.event->>'questionVersionId'=v_assignment.target_question_version_id
  ) then
    v_blockers:=v_blockers||'["target-question-already-attempted"]'::jsonb;
  end if;

  if exists (
    select 1
    from public.study_attempts contamination
    where contamination.learner_id=p_learner
      and contamination.id<>v_assignment.origin_attempt_id
      and contamination.event->>'conceptId'=v_assignment.concept_id
      and (contamination.event->>'occurredAt')::timestamptz > v_assignment.origin_attempted_at
      and (contamination.event->>'occurredAt')::timestamptz <= p_now
  ) then
    v_blockers:=v_blockers||'["same-concept-contamination-observed"]'::jsonb;
  end if;

  if exists (
    select 1
    from public.study_revision_state r
    where r.learner_id=p_learner
      and (r.due_at<=p_now or r.latest_correct=false)
  ) then
    v_blockers:=v_blockers||'["due-or-mistake-repair-work-takes-priority"]'::jsonb;
  end if;

  if exists (
    select 1
    from public.study_sessions s
    where s.learner_id=p_learner
      and s.closed=false
  ) then
    v_blockers:=v_blockers||'["open-study-session-takes-priority"]'::jsonb;
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','study-retention-probe-delivery-readiness-v1',
    'assignmentFound',true,
    'assignmentId',v_assignment.assignment_id,
    'targetQuestionVersionId',v_assignment.target_question_version_id,
    'deliverable',pg_catalog.jsonb_array_length(v_blockers)=0,
    'blockingReasons',v_blockers,
    'learnerDeliveryEnabled',false,
    'studyNowAuthority',false,
    'masteryInferenceAuthority',false
  );
end;
$function$;
