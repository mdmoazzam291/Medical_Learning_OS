-- Disposable local GoTrue->source review session writer integration ONLY.
-- This accepts p_actor and p_session on privileged test SQL. Authentication
-- is demonstrated by the local SDK /user check, NOT independently by SQL.
-- NEVER ship or expose this function or grant it to a browser role.
create function evidence_internal.record_local_gotrue_review(
 p_actor uuid,p_session uuid,q jsonb,p_grant uuid
) returns jsonb language plpgsql security definer set search_path='' as $$
declare observed uuid;
begin
 if p_actor is null or p_session is null or p_grant is null
 then raise exception 'internal_review_session_denied';end if;
 -- Lock the real provider-owned session row until decision commit. Local
 -- signOut DELETE must serialize behind this lock, rather than revoking
 -- after the check but before a durable review event is written.
 select s.user_id into observed from auth.sessions s
 where s.id=p_session and s.user_id=p_actor and
  (s.not_after is null or s.not_after>pg_catalog.clock_timestamp())
 for share;
 if not found or observed<>p_actor
 then raise exception 'internal_review_session_denied';end if;
 return evidence_internal.record_review(p_actor,q,p_grant);
end;$$;
revoke all on function evidence_internal.record_local_gotrue_review(uuid,uuid,jsonb,uuid)
 from public,anon,authenticated,service_role,evidence_internal_gateway;
