-- Keep the scoring catalog stable until an answer commits. A concurrent
-- retirement/import waits for this transaction, or wins first and rejects it.
create or replace function public.study_record_attempt(
  p_learner uuid, p_session uuid, p_request_key text, p_position integer,
  p_option text, p_event jsonb, p_receipt jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v_session public.study_sessions%rowtype;
  v_retry public.study_attempts%rowtype;
  v_catalog_version bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_learner::text, 0));
  select * into v_session from public.study_sessions
    where id = p_session and learner_id = p_learner for update;
  if not found then return '{"error":"session_not_found"}'::jsonb; end if;

  select * into v_retry from public.study_attempts
    where learner_id = p_learner and request_key = p_request_key;
  if found then
    if v_retry.session_id <> p_session or v_retry.position <> p_position
      or v_retry.option_id <> p_option then
      return '{"error":"conflicting_retry"}'::jsonb;
    end if;
    return pg_catalog.jsonb_build_object('receipt', v_retry.receipt);
  end if;
  if v_session.closed or v_session.position <> p_position then
    return '{"error":"stale_session"}'::jsonb;
  end if;
  if exists (select 1 from public.study_attempts
    where session_id = p_session and position = p_position) then
    return '{"error":"answer_already_recorded"}'::jsonb;
  end if;

  select version into v_catalog_version from public.study_catalog where id = 1 for share;
  if v_catalog_version is distinct from (p_receipt->>'catalogVersion')::bigint then
    return '{"error":"catalog_changed"}'::jsonb;
  end if;
  if p_event->>'learnerId' is distinct from p_learner::text
    or p_event->>'questionVersionId' is distinct from v_session.question_version_ids->>p_position
    or p_event->>'type' is distinct from 'question.answered'
    or p_event->>'schemaVersion' is distinct from '1'
    or p_receipt->'event' is distinct from p_event
    or p_receipt->>'selectedOptionId' is distinct from p_option then
    return '{"error":"invalid_server_event"}'::jsonb;
  end if;
  insert into public.study_attempts
    (id, learner_id, request_key, session_id, position, option_id, event, receipt)
    values ((p_event->>'eventId')::uuid, p_learner, p_request_key,
      p_session, p_position, p_option, p_event, p_receipt);
  return pg_catalog.jsonb_build_object('receipt', p_receipt);
end;
$$;
