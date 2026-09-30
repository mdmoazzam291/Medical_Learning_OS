-- M11f4: server-scored retention-probe response path.
-- Final learner responses still enter the canonical study_attempts ledger; this function
-- adds only the research binding and closes the dedicated one-question probe session.

create or replace function public.study_answer_retention_probe_v1(
  p_learner uuid,
  p_served_event uuid,
  p_request_key text,
  p_option text
)
returns jsonb
language plpgsql
security definer
set search_path=public,extensions,pg_temp
as $function$
declare
  v_served public.study_retention_probe_served_events%rowtype;
  v_session_event public.study_retention_probe_client_events%rowtype;
  v_render_event public.study_retention_probe_client_events%rowtype;
  v_session public.study_sessions%rowtype;
  v_catalog_version bigint;
  v_catalog_body jsonb;
  v_question jsonb;
  v_current_learner_question jsonb;
  v_current_question_hash text;
  v_current_medical_sha256 text;
  v_now timestamptz:=pg_catalog.clock_timestamp();
  v_duration_ms bigint;
  v_event_id uuid:=gen_random_uuid();
  v_event jsonb;
  v_sources jsonb:='[]'::jsonb;
  v_receipt jsonb;
  v_attempt_result jsonb;
  v_stored_receipt jsonb;
  v_attempt_id uuid;
  v_binding jsonb;
  v_advance jsonb;
  v_revision public.study_revision_state%rowtype;
  v_schedule jsonb;
  v_schedule_recorded boolean:=false;
begin
  if p_learner is null or p_served_event is null then
    raise exception using errcode='22023',message='retention_probe_answer_identity_required';
  end if;
  if p_request_key is null
     or p_request_key !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' then
    raise exception using errcode='22023',message='invalid_retention_probe_answer_request_key';
  end if;
  if p_option is null
     or p_option !~ '^[a-zA-Z0-9:_@.\-]{1,160}$' then
    raise exception using errcode='22023',message='invalid_retention_probe_option';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_learner::text,0));

  select * into v_served
  from public.study_retention_probe_served_events e
  where e.served_event_id=p_served_event
    and e.learner_id=p_learner
  limit 1;
  if v_served.served_event_id is null then
    raise exception using errcode='22023',message='retention_probe_served_event_not_found';
  end if;

  select e.* into v_session_event
  from public.study_retention_probe_client_events e
  where e.learner_id=p_learner
    and e.served_event_id=p_served_event
    and e.event_type='session_opened'
  limit 1;
  if v_session_event.client_event_id is null then
    raise exception using errcode='55000',message='retention_probe_session_not_open';
  end if;

  select e.* into v_render_event
  from public.study_retention_probe_client_events e
  where e.learner_id=p_learner
    and e.served_event_id=p_served_event
    and e.event_type='browser_rendered'
  limit 1;
  if v_render_event.client_event_id is null then
    raise exception using errcode='55000',message='retention_probe_browser_render_required';
  end if;

  select * into v_session
  from public.study_sessions s
  where s.id=v_session_event.session_id
    and s.learner_id=p_learner
  for update;
  if v_session.id is null then
    raise exception using errcode='55000',message='retention_probe_session_binding_broken';
  end if;

  select c.version,c.body
  into v_catalog_version,v_catalog_body
  from public.study_catalog c
  where c.id=1
  limit 1;
  if v_catalog_version is null or v_catalog_body is null then
    raise exception using errcode='55000',message='retention_probe_catalog_unavailable';
  end if;

  select q into v_question
  from pg_catalog.jsonb_array_elements(v_catalog_body->'questions') q
  where q->>'questionVersionId'=v_served.target_question_version_id
  limit 1;
  if v_question is null or v_question->>'status'<>'published' then
    raise exception using errcode='55000',message='retention_probe_target_question_unavailable';
  end if;

  v_current_learner_question:=pg_catalog.jsonb_build_object(
    'questionVersionId',v_question->>'questionVersionId',
    'questionId',v_question->>'questionId',
    'version',v_question->'version',
    'conceptId',v_served.learner_question->>'conceptId',
    'stem',v_question->>'stem',
    'options',v_question->'options'
  );
  v_current_question_hash:=pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_current_learner_question::text,'UTF8'),'sha256'),
    'hex'
  );
  if v_current_question_hash<>v_served.learner_question_sha256 then
    raise exception using errcode='55000',message='retention_probe_served_question_changed';
  end if;

  select public.current_review_target_sha256(v_served.target_question_version_id,'medical')
  into v_current_medical_sha256;
  if v_current_medical_sha256 is distinct from v_served.target_medical_sha256 then
    raise exception using errcode='55000',message='retention_probe_medical_binding_changed';
  end if;

  if not exists (
    select 1
    from pg_catalog.jsonb_array_elements(v_question->'options') o
    where o->>'optionId'=p_option
  ) then
    raise exception using errcode='22023',message='invalid_retention_probe_option';
  end if;

  if v_session.question_version_ids<>pg_catalog.jsonb_build_array(v_served.target_question_version_id)
     or v_session.position<>0 then
    if not v_session.closed then
      raise exception using errcode='55000',message='retention_probe_session_state_invalid';
    end if;
  end if;

  v_duration_ms:=greatest(
    0,
    least(
      3600000,
      floor(extract(epoch from (v_now-v_session.question_started_at))*1000)::bigint
    )
  );

  v_event:=pg_catalog.jsonb_build_object(
    'schemaVersion',1,
    'type','question.answered',
    'eventId',v_event_id,
    'learnerId',p_learner,
    'questionVersionId',v_served.target_question_version_id,
    'conceptId',v_served.learner_question->>'conceptId',
    'occurredAt',v_now,
    'correct',(v_question->>'answerOptionId')=p_option,
    'durationMs',v_duration_ms
  );

  select coalesce(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'sourceId',s->>'sourceId',
      'title',s->>'title',
      'url',s->'url',
      'version',s->'version'
    ) order by s->>'sourceId'
  ),'[]'::jsonb)
  into v_sources
  from pg_catalog.jsonb_array_elements(coalesce(v_catalog_body->'sources','[]'::jsonb)) s
  where exists (
    select 1
    from pg_catalog.jsonb_array_elements_text(coalesce(v_question->'sourceIds','[]'::jsonb)) source_id(value)
    where source_id.value=s->>'sourceId'
  );

  v_receipt:=pg_catalog.jsonb_build_object(
    'event',v_event,
    'selectedOptionId',p_option,
    'answerOptionId',v_question->>'answerOptionId',
    'explanation',v_question->>'explanation',
    'sources',v_sources,
    'catalogVersion',v_catalog_version,
    'teachingDecision',null,
    'teaching',null
  );

  v_attempt_result:=public.study_record_attempt(
    p_learner,
    v_session.id,
    p_request_key,
    0,
    p_option,
    v_event,
    v_receipt
  );
  if v_attempt_result ? 'error' then
    raise exception using errcode='55000',message='retention_probe_attempt_write_failed',detail=v_attempt_result::text;
  end if;

  v_stored_receipt:=v_attempt_result->'receipt';
  v_attempt_id:=(v_stored_receipt->'event'->>'eventId')::uuid;

  v_binding:=public.study_bind_retention_probe_response_v1(
    p_learner,
    p_served_event,
    v_attempt_id
  );

  -- A probe retrieval is real learner evidence and therefore updates the ordinary revision
  -- projection. It does not create a Study Now recommendation or recommendation-transport event.
  perform public.study_rebuild_revision_state(p_learner,v_served.target_question_version_id);

  select * into v_revision
  from public.study_revision_state r
  where r.learner_id=p_learner
    and r.question_version_id=v_served.target_question_version_id
  limit 1;

  if v_revision.question_version_id is not null
     and v_revision.evidence_last_event_id=v_attempt_id then
    v_schedule:=public.study_record_schedule_decision(
      p_learner,
      v_attempt_id,
      v_revision.policy_id,
      v_revision.policy_version,
      'authoritative',
      v_revision.policy_id||'@'||v_revision.policy_version,
      v_revision.due_at,
      pg_catalog.jsonb_build_object(
        'projectionVersion',v_revision.projection_version,
        'attempts',v_revision.attempts,
        'correct',v_revision.correct,
        'incorrect',v_revision.incorrect,
        'consecutiveCorrect',v_revision.consecutive_correct,
        'latestCorrect',v_revision.latest_correct,
        'evidenceEventCount',v_revision.evidence_event_count,
        'origin','retention-probe-response'
      )
    );
    v_schedule_recorded:=v_schedule is not null and not (v_schedule ? 'error');
  end if;

  v_advance:=public.study_advance_session(p_learner,v_session.id,0,v_now);
  if v_advance ? 'error' then
    raise exception using errcode='55000',message='retention_probe_session_close_failed',detail=v_advance::text;
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','retention-probe-answer-receipt-v1',
    'servedEventId',p_served_event,
    'sessionId',v_session.id,
    'attemptReceipt',v_stored_receipt,
    'responseBinding',v_binding,
    'sessionClosed',true,
    'authoritativeScheduleRecorded',v_schedule_recorded,
    'browserRenderedConfirmed',true,
    'learnerViewedConfirmed',false,
    'studyNowAuthority',false,
    'masteryInferenceAuthority',false,
    'causalInferenceAuthority',false
  );
end;
$function$;

revoke all on function public.study_answer_retention_probe_v1(uuid,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.study_answer_retention_probe_v1(uuid,uuid,text,text)
  to service_role;
