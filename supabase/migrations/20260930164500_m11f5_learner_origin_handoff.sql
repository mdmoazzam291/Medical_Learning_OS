-- M11f5: learner-controlled prospective origin handoff for the retention feasibility pilot.
-- Opening the retention page remains read-only. An ordinary one-question study session
-- is created only after an explicit learner start action. No attempt/research response
-- is fabricated; the ordinary canonical answer path must record the actual response.

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
  from public.study_attempts a
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

revoke all on function public.study_retention_probe_origin_readiness_v1(uuid,timestamptz)
  from public, anon, authenticated;
grant execute on function public.study_retention_probe_origin_readiness_v1(uuid,timestamptz)
  to service_role;

create or replace function public.study_open_retention_probe_origin_session_v1(
  p_learner uuid,
  p_session uuid,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_readiness jsonb;
  v_origin_version text;
  v_existing public.study_sessions%rowtype;
  v_started jsonb;
  v_started_id uuid;
begin
  if p_learner is null or p_session is null then
    raise exception using errcode='22023', message='retention_probe_origin_session_identity_required';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_learner::text,0));

  v_readiness:=public.study_retention_probe_origin_readiness_v1(p_learner,p_now);
  v_origin_version:=v_readiness->>'originQuestionVersionId';

  select * into v_existing
  from public.study_sessions s
  where s.id=p_session and s.learner_id=p_learner
  limit 1;

  if v_existing.id is not null then
    if v_origin_version is not null
       and v_existing.question_version_ids=pg_catalog.jsonb_build_array(v_origin_version)
       and v_existing.closed=false then
      return pg_catalog.jsonb_build_object(
        'contractId','retention-probe-origin-session-receipt-v1',
        'sessionId',v_existing.id,
        'state','origin_started',
        'originQuestionVersionId',v_origin_version,
        'originAttemptRecorded',false,
        'idempotentReplay',true,
        'ordinaryStudySession',true,
        'automaticExecutionEnabled',false,
        'studyNowAuthority',false,
        'masteryInferenceAuthority',false
      );
    end if;
    raise exception using errcode='40900', message='retention_probe_origin_session_collision';
  end if;

  if coalesce(v_readiness->>'state','')<>'origin_available' or v_origin_version is null then
    raise exception using
      errcode='55000',
      message='retention_probe_origin_not_ready',
      detail=v_readiness::text;
  end if;

  v_started:=public.study_start_session(
    p_learner,
    p_session,
    pg_catalog.jsonb_build_array(v_origin_version),
    p_now
  );
  v_started_id:=(v_started->>'id')::uuid;

  if v_started_id<>p_session then
    raise exception using errcode='55000', message='ordinary_study_session_takes_priority';
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','retention-probe-origin-session-receipt-v1',
    'sessionId',v_started_id,
    'state','origin_started',
    'originQuestionVersionId',v_origin_version,
    'originAttemptRecorded',false,
    'idempotentReplay',false,
    'ordinaryStudySession',true,
    'automaticExecutionEnabled',false,
    'studyNowAuthority',false,
    'masteryInferenceAuthority',false
  );
end;
$function$;

revoke all on function public.study_open_retention_probe_origin_session_v1(uuid,uuid,timestamptz)
  from public, anon, authenticated;
grant execute on function public.study_open_retention_probe_origin_session_v1(uuid,uuid,timestamptz)
  to service_role;
