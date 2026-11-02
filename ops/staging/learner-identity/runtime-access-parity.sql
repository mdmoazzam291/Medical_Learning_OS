-- STAGING ONLY: restore the EXACT existing production runtime-access function.
-- Source: read-only pg_get_functiondef() from medical_learning_os production,
-- observed 2026-11-02. Production is NOT being changed by this file.
-- Do NOT include in supabase/migrations: production already has this RPC,
-- and staging has a separate managed migration ledger.
--
-- Security: function evaluates the real Auth user and real Auth session.
-- Missing, deleted, suspended or nonmatching session denies access.
-- Only service_role can execute; user-supplied credentials cannot authorize it.
CREATE OR REPLACE FUNCTION public.learner_runtime_access_v1(p_user uuid, p_session uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with u as (
    select id,banned_until,deleted_at
    from auth.users
    where id=p_user
  ), s as (
    select exists(
      select 1 from auth.sessions
      where id=p_session and user_id=p_user
    ) as session_active
  )
  select jsonb_build_object(
    'contractId','learner-runtime-access-v1',
    'allowed', case
      when not exists(select 1 from u where deleted_at is null) then false
      when coalesce((select banned_until > now() from u),false) then false
      when not coalesce((select session_active from s),false) then false
      else true
    end,
    'reason', case
      when not exists(select 1 from u where deleted_at is null) then 'account_unavailable'
      when coalesce((select banned_until > now() from u),false) then 'account_suspended'
      when not coalesce((select session_active from s),false) then 'session_inactive'
      else 'allowed'
    end,
    'sessionActive',coalesce((select session_active from s),false),
    'suspendedUntil',(select banned_until from u)
  );
$function$;
-- Explicit revocation is mandatory for SECURITY DEFINER RPCs in public.
REVOKE ALL ON FUNCTION public.learner_runtime_access_v1(uuid,uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.learner_runtime_access_v1(uuid,uuid)
  TO service_role;
