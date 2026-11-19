-- ADR-142: two-factor sign-in for every account, and the owner learner funnel.
--
-- 1. learner_runtime_access_v1 now also denies a session that is still aal1
--    when the user has a verified two-factor factor ('mfa_required'). Every edge
--    function already calls this gate, so learners and admins are both covered.
--    Users without a verified factor are unaffected.
-- 2. owner_learner_funnel_v1 returns aggregate counts only (no ids, no emails).
--    Activity counts are not mastery and not retention evidence.

create or replace function public.learner_runtime_access_v1(p_user uuid, p_session uuid)
returns jsonb
language sql
stable
security definer
set search_path=''
as $function$
  with u as (
    select id,banned_until,deleted_at
    from auth.users
    where id=p_user
  ), s as (
    select
      exists(select 1 from auth.sessions where id=p_session and user_id=p_user) as session_active,
      coalesce((select aal::text from auth.sessions where id=p_session and user_id=p_user),'aal1') as session_aal
  ), f as (
    select exists(
      select 1 from auth.mfa_factors
      where user_id=p_user and status='verified'
    ) as has_verified_factor
  )
  select jsonb_build_object(
    'contractId','learner-runtime-access-v1',
    'allowed', case
      when not exists(select 1 from u where deleted_at is null) then false
      when coalesce((select banned_until > now() from u),false) then false
      when not coalesce((select session_active from s),false) then false
      when (select has_verified_factor from f) and (select session_aal from s) <> 'aal2' then false
      else true
    end,
    'reason', case
      when not exists(select 1 from u where deleted_at is null) then 'account_unavailable'
      when coalesce((select banned_until > now() from u),false) then 'account_suspended'
      when not coalesce((select session_active from s),false) then 'session_inactive'
      when (select has_verified_factor from f) and (select session_aal from s) <> 'aal2' then 'mfa_required'
      else 'allowed'
    end,
    'sessionActive',coalesce((select session_active from s),false),
    'suspendedUntil',(select banned_until from u)
  );
$function$;

revoke all on function public.learner_runtime_access_v1(uuid,uuid) from public,anon,authenticated;
grant execute on function public.learner_runtime_access_v1(uuid,uuid) to service_role;
comment on function public.learner_runtime_access_v1(uuid,uuid) is 'Server-only request gate: live auth.sessions row, not suspended, and aal2 when the user has a verified two-factor factor.';

create or replace function public.owner_learner_funnel_v1()
returns jsonb
language sql
stable
security definer
set search_path=''
as $function$
  with admins as (
    select admin_user_id as id from public.content_admin_account
  ), learners as (
    select u.id, u.created_at, u.email_confirmed_at
    from auth.users u
    where u.deleted_at is null and u.id not in (select id from admins)
  ), days as (
    select a.learner_id, (a.recorded_at at time zone 'Asia/Kolkata')::date as day, min(a.recorded_at) as first_at
    from public.study_attempts a
    join learners l on l.id=a.learner_id
    group by 1,2
  ), per_learner as (
    select learner_id, min(day) as first_day, max(day) as last_day, count(*) as active_days
    from days group by 1
  )
  select jsonb_build_object(
    'contractId','owner-learner-funnel-v1',
    'generatedAt',now(),
    'excludesAdminAccounts',true,
    'accounts',(select count(*) from learners),
    'emailConfirmed',(select count(*) from learners where email_confirmed_at is not null),
    'signups7d',(select count(*) from learners where created_at >= now() - interval '7 days'),
    'signups30d',(select count(*) from learners where created_at >= now() - interval '30 days'),
    'studiedOnce',(select count(*) from per_learner),
    'studiedOnTwoOrMoreDays',(select count(*) from per_learner where active_days >= 2),
    'studiedAgain7DaysAfterFirst',(select count(*) from per_learner where last_day >= first_day + 7),
    'eligibleFor7DayReturn',(select count(*) from per_learner where first_day <= (now() at time zone 'Asia/Kolkata')::date - 7),
    'activeLearners7d',(select count(distinct learner_id) from days where day >= (now() at time zone 'Asia/Kolkata')::date - 6),
    'activeLearners30d',(select count(distinct learner_id) from days where day >= (now() at time zone 'Asia/Kolkata')::date - 29),
    'twoFactorEnabled',(select count(distinct f.user_id) from auth.mfa_factors f join learners l on l.id=f.user_id where f.status='verified'),
    'weeklySignups',coalesce((
      select jsonb_agg(jsonb_build_object('weekStart',w,'signups',n) order by w)
      from (
        select date_trunc('week', created_at at time zone 'Asia/Kolkata')::date as w, count(*) as n
        from learners where created_at >= now() - interval '12 weeks' group by 1
      ) x
    ),'[]'::jsonb)
  );
$function$;

revoke all on function public.owner_learner_funnel_v1() from public,anon,authenticated;
grant execute on function public.owner_learner_funnel_v1() to service_role;
comment on function public.owner_learner_funnel_v1() is 'Owner-only aggregate learner funnel (no identifiers). Activity, not mastery or retention evidence.';
