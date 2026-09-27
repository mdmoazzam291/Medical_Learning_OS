-- Canonical learner-history replay surface for ADR-044.
-- This is a read-only adapter over existing evidence stores, not a replacement ledger.
-- It does not infer mastery, forgetting, confidence, ability, or intervention effect.

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
    from public.study_attempts a
    where a.learner_id = p_learner
      and a.event->>'type' = 'question.answered'
      and a.event->>'schemaVersion' = '1'

    union all

    select
      'memory:' || m.id::text as event_key,
      1::integer as schema_version,
      'memory.rating'::text as family,
      'self_report'::text as event_class,
      m.recorded_at as occurred_at,
      m.recorded_at,
      a.event->>'conceptId' as concept_id,
      m.question_version_id,
      a.session_id,
      'study_memory_judgments'::text as source_table,
      m.id::text as source_id,
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
      ) as payload
    from public.study_memory_judgments m
    join public.study_attempts a
      on a.id = m.attempt_id
     and a.learner_id = m.learner_id
    where m.learner_id = p_learner

    union all

    select
      'recommendation:' || r.id::text as event_key,
      1::integer as schema_version,
      'study.recommendation_generated'::text as family,
      'policy_decision'::text as event_class,
      r.created_at as occurred_at,
      r.created_at as recorded_at,
      null::text as concept_id,
      null::text as question_version_id,
      r.session_id,
      'study_recommendation_events'::text as source_table,
      r.id::text as source_id,
      pg_catalog.jsonb_build_object(
        'schemaVersion', 1,
        'type', 'study.recommendation_generated',
        'eventId', r.id,
        'sessionId', r.session_id,
        'strategy', r.strategy,
        'availableMinutes', r.available_minutes,
        'plan', r.plan,
        'occurredAt', r.created_at
      ) as payload
    from public.study_recommendation_events r
    where r.learner_id = p_learner
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
      'study.recommendation_generated'
    ),
    'inferenceAuthority', false,
    'masteryInferenceEnabled', false,
    'events', v_events
  );
end;
$function$;

revoke all on function public.study_learning_event_stream_v1(
  uuid, integer, timestamptz, text
) from public, anon, authenticated;

grant execute on function public.study_learning_event_stream_v1(
  uuid, integer, timestamptz, text
) to service_role;
