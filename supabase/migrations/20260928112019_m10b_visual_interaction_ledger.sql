create table if not exists public.study_visual_interaction_events (
  id uuid primary key,
  learner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  interaction_attempt_id text not null
    check (char_length(btrim(interaction_attempt_id)) between 1 and 240),
  question_version_id text not null
    check (question_version_id ~ '^[a-zA-Z0-9:_@.\\-]{1,180}$'),
  concept_id text not null
    check (concept_id ~ '^[a-zA-Z0-9:_@.\\-]{1,160}$'),
  media_asset_version_id text not null
    references public.content_media_assets(media_asset_version_id) on delete restrict,
  task_type text not null
    check (task_type in ('detection','localization','description','interpretation','discrimination')),
  occurred_at timestamptz not null,
  event jsonb not null
    check (pg_catalog.jsonb_typeof(event) = 'object'),
  recorded_at timestamptz not null default pg_catalog.now(),
  constraint study_visual_interaction_events_session_owner_fkey
    foreign key (session_id, learner_id)
    references public.study_sessions(id, learner_id)
    on delete restrict
);

create index if not exists study_visual_interaction_events_learner_recorded_idx
  on public.study_visual_interaction_events(learner_id, recorded_at, id);

create index if not exists study_visual_interaction_events_question_idx
  on public.study_visual_interaction_events(learner_id, question_version_id, recorded_at);

alter table public.study_visual_interaction_events enable row level security;

revoke all on table public.study_visual_interaction_events
  from public, anon, authenticated, service_role;
grant select on table public.study_visual_interaction_events
  to service_role;

drop trigger if exists study_visual_interaction_events_no_update_delete
  on public.study_visual_interaction_events;
create trigger study_visual_interaction_events_no_update_delete
before update or delete on public.study_visual_interaction_events
for each row execute function public.prevent_learner_evidence_mutation();

create or replace function public.study_record_visual_interaction(
  p_learner uuid,
  p_event jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_event_id uuid;
  v_session_id uuid;
  v_question_version_id text;
  v_concept_id text;
  v_media_asset_version_id text;
  v_task_type text;
  v_attempt_id text;
  v_occurred_at timestamptz;
  v_existing public.study_visual_interaction_events%rowtype;
  v_row public.study_visual_interaction_events%rowtype;
  v_localization_iou numeric;
  v_annotation_version_id text;
begin
  if p_learner is null then
    raise exception using errcode = '22023', message = 'visual_interaction_learner_required';
  end if;

  if p_event is null
     or pg_catalog.jsonb_typeof(p_event) <> 'object'
     or (select count(*) from pg_catalog.jsonb_object_keys(p_event)) <> 16
     or not (p_event ?& array[
       'schemaVersion','eventName','eventId','learnerId','sessionId','attemptId',
       'questionVersionId','conceptId','mediaAssetVersionId','taskType','occurredAt',
       'latencyMs','response','evaluation','helpUsed','interventionRef'
     ]) then
    raise exception using errcode = '22023', message = 'visual_interaction_event_invalid';
  end if;

  if p_event->>'schemaVersion' <> '1'
     or p_event->>'eventName' <> 'media.interaction.completed'
     or p_event->>'learnerId' is distinct from p_learner::text then
    raise exception using errcode = '22023', message = 'visual_interaction_identity_invalid';
  end if;

  if coalesce(p_event->>'eventId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
     or coalesce(p_event->>'sessionId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception using errcode = '22023', message = 'visual_interaction_uuid_invalid';
  end if;

  v_event_id := (p_event->>'eventId')::uuid;
  v_session_id := (p_event->>'sessionId')::uuid;
  v_attempt_id := p_event->>'attemptId';
  v_question_version_id := p_event->>'questionVersionId';
  v_concept_id := p_event->>'conceptId';
  v_media_asset_version_id := p_event->>'mediaAssetVersionId';
  v_task_type := p_event->>'taskType';

  if v_attempt_id is null or char_length(btrim(v_attempt_id)) not between 1 and 240
     or v_question_version_id is null
     or v_question_version_id !~ '^[a-zA-Z0-9:_@.\\-]{1,180}$'
     or v_concept_id is null
     or v_concept_id !~ '^[a-zA-Z0-9:_@.\\-]{1,160}$'
     or v_media_asset_version_id is null
     or v_media_asset_version_id !~ '^[a-zA-Z0-9:_@.\\-]{1,220}$'
     or v_task_type not in ('detection','localization','description','interpretation','discrimination') then
    raise exception using errcode = '22023', message = 'visual_interaction_reference_invalid';
  end if;

  begin
    v_occurred_at := (p_event->>'occurredAt')::timestamptz;
  exception when others then
    raise exception using errcode = '22023', message = 'visual_interaction_timestamp_invalid';
  end;

  if pg_catalog.jsonb_typeof(p_event->'latencyMs') <> 'number'
     or (p_event->>'latencyMs') !~ '^[0-9]+$'
     or (p_event->>'latencyMs')::bigint > 3600000 then
    raise exception using errcode = '22023', message = 'visual_interaction_latency_invalid';
  end if;

  if pg_catalog.jsonb_typeof(p_event->'helpUsed') <> 'boolean'
     or (p_event->'interventionRef' <> 'null'::jsonb
       and (pg_catalog.jsonb_typeof(p_event->'interventionRef') <> 'string'
         or char_length(btrim(p_event->>'interventionRef')) not between 1 and 240)) then
    raise exception using errcode = '22023', message = 'visual_interaction_context_invalid';
  end if;

  if pg_catalog.jsonb_typeof(p_event->'response') <> 'object'
     or (select count(*) from pg_catalog.jsonb_object_keys(p_event->'response')) <> 3
     or not ((p_event->'response') ?& array['selectedConceptId','text','geometry'])
     or pg_catalog.jsonb_typeof(p_event->'evaluation') <> 'object'
     or (select count(*) from pg_catalog.jsonb_object_keys(p_event->'evaluation')) <> 4
     or not ((p_event->'evaluation') ?& array[
       'outcome','targetConceptId','localizationIoU','matchedAnnotationVersionId'
     ]) then
    raise exception using errcode = '22023', message = 'visual_interaction_payload_invalid';
  end if;

  if p_event->'evaluation'->>'outcome' not in ('correct','incorrect','partial','unanswered')
     or p_event->'evaluation'->>'targetConceptId' is distinct from v_concept_id then
    raise exception using errcode = '22023', message = 'visual_interaction_evaluation_invalid';
  end if;

  if v_task_type = 'localization' then
    if p_event->'response'->'geometry' = 'null'::jsonb
       or pg_catalog.jsonb_typeof(p_event->'response'->'geometry') <> 'object' then
      raise exception using errcode = '22023', message = 'visual_localization_geometry_required';
    end if;
  elsif p_event->'evaluation'->'localizationIoU' <> 'null'::jsonb then
    raise exception using errcode = '22023', message = 'visual_localization_iou_task_mismatch';
  end if;

  if p_event->'evaluation'->'localizationIoU' <> 'null'::jsonb then
    if pg_catalog.jsonb_typeof(p_event->'evaluation'->'localizationIoU') <> 'number' then
      raise exception using errcode = '22023', message = 'visual_localization_iou_invalid';
    end if;
    v_localization_iou := (p_event->'evaluation'->>'localizationIoU')::numeric;
    if v_localization_iou < 0 or v_localization_iou > 1 then
      raise exception using errcode = '22023', message = 'visual_localization_iou_invalid';
    end if;
    if p_event->'evaluation'->'matchedAnnotationVersionId' = 'null'::jsonb then
      raise exception using errcode = '22023', message = 'visual_localization_annotation_required';
    end if;
  end if;

  if p_event->'evaluation'->'matchedAnnotationVersionId' <> 'null'::jsonb then
    v_annotation_version_id := p_event->'evaluation'->>'matchedAnnotationVersionId';
    if not exists (
      select 1
      from public.content_media_annotations a
      where a.annotation_version_id = v_annotation_version_id
        and a.media_asset_version_id = v_media_asset_version_id
        and a.concept_id = v_concept_id
    ) then
      raise exception using errcode = '22023', message = 'visual_interaction_annotation_mismatch';
    end if;
  end if;

  if not exists (
    select 1
    from public.study_sessions s
    where s.id = v_session_id
      and s.learner_id = p_learner
      and s.question_version_ids ? v_question_version_id
  ) then
    return pg_catalog.jsonb_build_object('error','visual_session_question_mismatch');
  end if;

  if not exists (
    select 1
    from public.content_question_media_links l
    where l.question_version_id = v_question_version_id
      and l.media_asset_version_id = v_media_asset_version_id
      and l.role = 'prompt'
  ) then
    return pg_catalog.jsonb_build_object('error','visual_question_media_mismatch');
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_learner::text || ':visual:' || v_event_id::text,
      0
    )
  );

  select * into v_existing
  from public.study_visual_interaction_events
  where id = v_event_id;

  if found then
    if v_existing.learner_id <> p_learner
       or v_existing.event <> p_event then
      return pg_catalog.jsonb_build_object('error','conflicting_visual_interaction_retry');
    end if;
    v_row := v_existing;
  else
    insert into public.study_visual_interaction_events (
      id,
      learner_id,
      session_id,
      interaction_attempt_id,
      question_version_id,
      concept_id,
      media_asset_version_id,
      task_type,
      occurred_at,
      event
    ) values (
      v_event_id,
      p_learner,
      v_session_id,
      v_attempt_id,
      v_question_version_id,
      v_concept_id,
      v_media_asset_version_id,
      v_task_type,
      v_occurred_at,
      p_event
    )
    returning * into v_row;
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','study-visual-interaction-receipt-v1',
    'eventId',v_row.id,
    'questionVersionId',v_row.question_version_id,
    'conceptId',v_row.concept_id,
    'mediaAssetVersionId',v_row.media_asset_version_id,
    'taskType',v_row.task_type,
    'recordedAt',v_row.recorded_at
  );
end;
$function$;

revoke all on function public.study_record_visual_interaction(uuid, jsonb)
  from public, anon, authenticated, service_role;
grant execute on function public.study_record_visual_interaction(uuid, jsonb)
  to service_role;

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
    join public.study_attempts a
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

revoke all on function public.study_learning_event_stream_v1(
  uuid, integer, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.study_learning_event_stream_v1(
  uuid, integer, timestamptz, text
) to service_role;

alter table public.learner_privacy_erasure_receipts
  alter column scope_version set default 2;

alter table public.learner_privacy_erasure_receipts
  drop constraint if exists learner_privacy_erasure_receipts_scope_version_check;

alter table public.learner_privacy_erasure_receipts
  add constraint learner_privacy_erasure_receipts_scope_version_check
  check (scope_version in (1,2));

create or replace function public.privacy_learner_scope_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
with expected(table_name) as (
  values
    ('exam_run_events'),
    ('exam_run_receipts'),
    ('exam_runs'),
    ('neural_personal_annotations'),
    ('study_attempts'),
    ('study_bookmarks'),
    ('study_memory_judgments'),
    ('study_policy_experiment_assignments'),
    ('study_recommendation_events'),
    ('study_revision_state'),
    ('study_schedule_decision_events'),
    ('study_sessions'),
    ('study_visual_interaction_events')
),
actual as (
  select c.table_name
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.column_name = 'learner_id'
  group by c.table_name
),
missing as (
  select table_name from expected
  except
  select table_name from actual
),
unmapped as (
  select table_name from actual
  except
  select table_name from expected
)
select pg_catalog.jsonb_build_object(
  'contractId', 'learner-privacy-scope-v2',
  'scopeVersion', 2,
  'complete',
    not exists(select 1 from missing)
    and not exists(select 1 from unmapped),
  'expectedTables', (
    select coalesce(
      pg_catalog.jsonb_agg(table_name order by table_name),
      '[]'::jsonb
    )
    from expected
  ),
  'missingTables', (
    select coalesce(
      pg_catalog.jsonb_agg(table_name order by table_name),
      '[]'::jsonb
    )
    from missing
  ),
  'unmappedLearnerTables', (
    select coalesce(
      pg_catalog.jsonb_agg(table_name order by table_name),
      '[]'::jsonb
    )
    from unmapped
  )
);
$function$;

revoke all on function public.privacy_learner_scope_status()
  from public, anon, authenticated;
grant execute on function public.privacy_learner_scope_status()
  to service_role;

create or replace function public.privacy_learner_erasure_preview(
  p_learner uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  v_scope jsonb;
  v_counts jsonb;
  v_total integer;
begin
  if p_learner is null then
    raise exception using
      errcode = '22023',
      message = 'privacy_learner_required';
  end if;

  v_scope := public.privacy_learner_scope_status();
  if coalesce((v_scope->>'complete')::boolean, false) is not true then
    raise exception using
      errcode = '55000',
      message = 'privacy_scope_requires_update',
      detail = v_scope::text;
  end if;

  v_counts := pg_catalog.jsonb_build_object(
    'exam_run_events',
      (select count(*) from public.exam_run_events where learner_id = p_learner),
    'exam_run_receipts',
      (select count(*) from public.exam_run_receipts where learner_id = p_learner),
    'exam_runs',
      (select count(*) from public.exam_runs where learner_id = p_learner),
    'neural_personal_annotations',
      (select count(*) from public.neural_personal_annotations where learner_id = p_learner),
    'study_attempts',
      (select count(*) from public.study_attempts where learner_id = p_learner),
    'study_bookmarks',
      (select count(*) from public.study_bookmarks where learner_id = p_learner),
    'study_memory_judgments',
      (select count(*) from public.study_memory_judgments where learner_id = p_learner),
    'study_policy_experiment_assignments',
      (select count(*) from public.study_policy_experiment_assignments where learner_id = p_learner),
    'study_recommendation_events',
      (select count(*) from public.study_recommendation_events where learner_id = p_learner),
    'study_revision_state',
      (select count(*) from public.study_revision_state where learner_id = p_learner),
    'study_schedule_decision_events',
      (select count(*) from public.study_schedule_decision_events where learner_id = p_learner),
    'study_sessions',
      (select count(*) from public.study_sessions where learner_id = p_learner),
    'study_visual_interaction_events',
      (select count(*) from public.study_visual_interaction_events where learner_id = p_learner)
  );

  select coalesce(sum(value::integer), 0)
    into v_total
  from pg_catalog.jsonb_each_text(v_counts);

  return pg_catalog.jsonb_build_object(
    'contractId', 'learner-erasure-preview-v1',
    'scopeVersion', 2,
    'authUserPresent',
      exists(select 1 from auth.users where id = p_learner),
    'rowsInScope', v_total,
    'counts', v_counts,
    'scope', v_scope
  );
end;
$function$;

revoke all on function public.privacy_learner_erasure_preview(uuid)
  from public, anon, authenticated;
grant execute on function public.privacy_learner_erasure_preview(uuid)
  to service_role;

create or replace function public.privacy_erase_learner_data(
  p_learner uuid,
  p_confirmation text,
  p_reason_class text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_scope jsonb;
  v_counts jsonb := '{}'::jsonb;
  v_count integer;
  v_total integer := 0;
  v_receipt public.learner_privacy_erasure_receipts%rowtype;
begin
  if p_learner is null then
    raise exception using
      errcode = '22023',
      message = 'privacy_learner_required';
  end if;

  if p_confirmation is distinct from p_learner::text then
    raise exception using
      errcode = '22023',
      message = 'privacy_confirmation_mismatch';
  end if;

  if p_reason_class is null
     or p_reason_class not in (
       'user_request',
       'account_closure',
       'legal_requirement',
       'test_cleanup'
     ) then
    raise exception using
      errcode = '22023',
      message = 'privacy_reason_invalid';
  end if;

  v_scope := public.privacy_learner_scope_status();
  if coalesce((v_scope->>'complete')::boolean, false) is not true then
    raise exception using
      errcode = '55000',
      message = 'privacy_scope_requires_update',
      detail = v_scope::text;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('privacy:' || p_learner::text, 0)
  );

  perform pg_catalog.set_config(
    'mlos.privacy_erasure',
    'learner-erasure-v1',
    true
  );

  delete from public.study_visual_interaction_events
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_visual_interaction_events', v_count
  );
  v_total := v_total + v_count;

  delete from public.study_memory_judgments
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_memory_judgments', v_count
  );
  v_total := v_total + v_count;

  delete from public.study_schedule_decision_events
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_schedule_decision_events', v_count
  );
  v_total := v_total + v_count;

  delete from public.study_policy_experiment_assignments
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_policy_experiment_assignments', v_count
  );
  v_total := v_total + v_count;

  delete from public.study_recommendation_events
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_recommendation_events', v_count
  );
  v_total := v_total + v_count;

  delete from public.study_revision_state
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_revision_state', v_count
  );
  v_total := v_total + v_count;

  delete from public.study_bookmarks
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_bookmarks', v_count
  );
  v_total := v_total + v_count;

  delete from public.neural_personal_annotations
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'neural_personal_annotations', v_count
  );
  v_total := v_total + v_count;

  delete from public.exam_run_receipts
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'exam_run_receipts', v_count
  );
  v_total := v_total + v_count;

  delete from public.exam_run_events
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'exam_run_events', v_count
  );
  v_total := v_total + v_count;

  delete from public.exam_runs
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'exam_runs', v_count
  );
  v_total := v_total + v_count;

  delete from public.study_attempts
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_attempts', v_count
  );
  v_total := v_total + v_count;

  delete from public.study_sessions
  where learner_id = p_learner;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object(
    'study_sessions', v_count
  );
  v_total := v_total + v_count;

  perform pg_catalog.set_config(
    'mlos.privacy_erasure',
    'off',
    true
  );

  if exists (
    select 1 from public.exam_run_events where learner_id = p_learner
    union all
    select 1 from public.exam_run_receipts where learner_id = p_learner
    union all
    select 1 from public.exam_runs where learner_id = p_learner
    union all
    select 1 from public.neural_personal_annotations where learner_id = p_learner
    union all
    select 1 from public.study_attempts where learner_id = p_learner
    union all
    select 1 from public.study_bookmarks where learner_id = p_learner
    union all
    select 1 from public.study_memory_judgments where learner_id = p_learner
    union all
    select 1 from public.study_policy_experiment_assignments where learner_id = p_learner
    union all
    select 1 from public.study_recommendation_events where learner_id = p_learner
    union all
    select 1 from public.study_revision_state where learner_id = p_learner
    union all
    select 1 from public.study_schedule_decision_events where learner_id = p_learner
    union all
    select 1 from public.study_sessions where learner_id = p_learner
    union all
    select 1 from public.study_visual_interaction_events where learner_id = p_learner
  ) then
    raise exception using
      errcode = '55000',
      message = 'privacy_erasure_incomplete';
  end if;

  insert into public.learner_privacy_erasure_receipts (
    reason_class,
    rows_deleted
  ) values (
    p_reason_class,
    v_total
  )
  returning * into v_receipt;

  return pg_catalog.jsonb_build_object(
    'contractId', v_receipt.contract_id,
    'scopeVersion', v_receipt.scope_version,
    'erasureId', v_receipt.erasure_id,
    'reasonClass', v_receipt.reason_class,
    'rowsDeleted', v_receipt.rows_deleted,
    'completedAt', v_receipt.completed_at,
    'counts', v_counts,
    'authUserDeletionIncluded', false,
    'authSessionRevocationIncluded', false
  );
exception
  when others then
    perform pg_catalog.set_config(
      'mlos.privacy_erasure',
      'off',
      true
    );
    raise;
end;
$function$;

revoke all on function public.privacy_erase_learner_data(
  uuid, text, text
) from public, anon, authenticated;
grant execute on function public.privacy_erase_learner_data(
  uuid, text, text
) to service_role;
