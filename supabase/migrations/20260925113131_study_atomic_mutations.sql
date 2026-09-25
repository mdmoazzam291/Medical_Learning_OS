-- Server-only atomic transitions. Each RPC runs in one PostgREST transaction.
-- SECURITY INVOKER is intentional: only the server-held service_role can call.
create function public.study_start_session(
  p_learner uuid, p_id uuid, p_ids jsonb, p_started timestamptz
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_learner::text, 0));
  select id into v_id from public.study_sessions
    where learner_id = p_learner and closed = false;
  if v_id is null then
    insert into public.study_sessions (id, learner_id, question_version_ids, question_started_at)
      values (p_id, p_learner, p_ids, p_started);
    v_id := p_id;
  end if;
  return pg_catalog.jsonb_build_object('id', v_id);
end;
$$;

create function public.study_record_attempt(
  p_learner uuid, p_session uuid, p_request_key text, p_position integer,
  p_option text, p_event jsonb, p_receipt jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_session public.study_sessions%rowtype; v_retry public.study_attempts%rowtype;
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
  if p_event->>'learnerId' <> p_learner::text
    or p_event->>'questionVersionId' <> v_session.question_version_ids->>p_position
    or p_event->>'type' <> 'question.answered'
    or p_event->>'schemaVersion' <> '1'
    or p_receipt->'event' <> p_event
    or p_receipt->>'selectedOptionId' <> p_option then
    return '{"error":"invalid_server_event"}'::jsonb;
  end if;
  insert into public.study_attempts
    (id, learner_id, request_key, session_id, position, option_id, event, receipt)
    values ((p_event->>'eventId')::uuid, p_learner, p_request_key,
      p_session, p_position, p_option, p_event, p_receipt);
  return pg_catalog.jsonb_build_object('receipt', p_receipt);
end;
$$;

create function public.study_advance_session(
  p_learner uuid, p_session uuid, p_position integer, p_started timestamptz
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_session public.study_sessions%rowtype; v_next integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_learner::text, 0));
  select * into v_session from public.study_sessions
    where id = p_session and learner_id = p_learner for update;
  if not found then return '{"error":"session_not_found"}'::jsonb; end if;
  if v_session.position = p_position + 1 then
    return pg_catalog.jsonb_build_object('id', p_session);
  end if;
  if v_session.closed or v_session.position <> p_position then
    return '{"error":"stale_session"}'::jsonb;
  end if;
  if not exists (select 1 from public.study_attempts
    where session_id = p_session and position = p_position) then
    return '{"error":"answer_required"}'::jsonb;
  end if;
  v_next := v_session.position + 1;
  update public.study_sessions set position = v_next,
    closed = (v_next = pg_catalog.jsonb_array_length(v_session.question_version_ids)),
    question_started_at = p_started where id = p_session;
  return pg_catalog.jsonb_build_object('id', p_session);
end;
$$;

create function public.study_cancel_session(p_learner uuid, p_session uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_learner::text, 0));
  update public.study_sessions set closed = true
    where id = p_session and learner_id = p_learner;
  if not found then return '{"error":"session_not_found"}'::jsonb; end if;
  return pg_catalog.jsonb_build_object('id', p_session);
end;
$$;

revoke execute on function public.study_start_session(uuid,uuid,jsonb,timestamptz)
  from public, anon, authenticated;
revoke execute on function public.study_record_attempt(uuid,uuid,text,integer,text,jsonb,jsonb)
  from public, anon, authenticated;
revoke execute on function public.study_advance_session(uuid,uuid,integer,timestamptz)
  from public, anon, authenticated;
revoke execute on function public.study_cancel_session(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.study_start_session(uuid,uuid,jsonb,timestamptz) to service_role;
grant execute on function public.study_record_attempt(uuid,uuid,text,integer,text,jsonb,jsonb) to service_role;
grant execute on function public.study_advance_session(uuid,uuid,integer,timestamptz) to service_role;
grant execute on function public.study_cancel_session(uuid,uuid) to service_role;
