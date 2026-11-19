-- ADR-143: learner access protection.
-- 1. Per-learner request quotas for question and library reads (minute + IST day windows).
-- 2. Owner "throttle" action: a temporary, lower quota for one learner, audited like suspend.
-- 3. Owner access signals: per-learner behaviour metrics for human review. No automatic action.
-- All objects are server-only (service_role). Rows are deleted with the learner (on delete cascade).

alter table public.owner_admin_audit_events drop constraint if exists owner_admin_audit_events_action_check;
alter table public.owner_admin_audit_events add constraint owner_admin_audit_events_action_check
  check (action = any (array['grant_beta','revoke_beta','suspend','restore','throttle','unthrottle']));

create table if not exists public.learner_throttles (
  learner_id uuid primary key references auth.users(id) on delete cascade,
  limit_factor integer not null check (limit_factor between 2 and 100),
  throttled_until timestamptz not null,
  reason text not null check (length(trim(reason)) between 10 and 1000),
  set_by uuid not null,
  set_at timestamptz not null default now()
);

create table if not exists public.learner_request_counters (
  learner_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null check (bucket in ('question','library')),
  window_kind text not null check (window_kind in ('minute','day')),
  window_start timestamptz not null,
  allowed_count integer not null default 0 check (allowed_count >= 0),
  denied_count integer not null default 0 check (denied_count >= 0),
  primary key (learner_id, bucket, window_kind, window_start)
);
create index if not exists learner_request_counters_day_idx on public.learner_request_counters (window_kind, window_start);

alter table public.learner_throttles enable row level security;
alter table public.learner_request_counters enable row level security;
revoke all on public.learner_throttles, public.learner_request_counters from public, anon, authenticated;
grant select, insert, update, delete on public.learner_throttles, public.learner_request_counters to service_role;

-- Quota check and count. Admin accounts are counted but never denied.
create or replace function public.learner_request_quota_v1(p_user uuid, p_bucket text)
returns jsonb
language plpgsql
volatile
security definer
set search_path=''
as $function$
declare
  v_minute timestamptz := date_trunc('minute', now());
  v_day timestamptz := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
  v_limit_minute integer;
  v_limit_day integer;
  v_factor integer;
  v_used_minute integer;
  v_used_day integer;
  v_admin boolean;
  v_retry integer;
begin
  if p_bucket not in ('question','library') then raise exception 'quota_bucket_invalid'; end if;
  v_limit_minute := case p_bucket when 'question' then 90 else 60 end;
  v_limit_day := case p_bucket when 'question' then 3000 else 2000 end;
  select limit_factor into v_factor from public.learner_throttles where learner_id=p_user and throttled_until > now();
  v_factor := coalesce(v_factor, 1);
  v_limit_minute := greatest(1, v_limit_minute / v_factor);
  v_limit_day := greatest(1, v_limit_day / v_factor);
  v_admin := exists(select 1 from public.content_admin_account where admin_user_id=p_user);

  select allowed_count into v_used_minute from public.learner_request_counters
    where learner_id=p_user and bucket=p_bucket and window_kind='minute' and window_start=v_minute;
  select allowed_count into v_used_day from public.learner_request_counters
    where learner_id=p_user and bucket=p_bucket and window_kind='day' and window_start=v_day;
  v_used_minute := coalesce(v_used_minute, 0);
  v_used_day := coalesce(v_used_day, 0);

  if not v_admin and (v_used_minute >= v_limit_minute or v_used_day >= v_limit_day) then
    insert into public.learner_request_counters(learner_id,bucket,window_kind,window_start,denied_count)
      values (p_user,p_bucket,'day',v_day,1)
      on conflict (learner_id,bucket,window_kind,window_start) do update set denied_count = public.learner_request_counters.denied_count + 1;
    v_retry := case
      when v_used_day >= v_limit_day then greatest(60, extract(epoch from (v_day + interval '1 day' - now()))::integer)
      else greatest(1, 60 - extract(second from now())::integer)
    end;
    return jsonb_build_object('allowed',false,'bucket',p_bucket,'throttled',v_factor > 1,'retryAfterSeconds',v_retry);
  end if;

  insert into public.learner_request_counters(learner_id,bucket,window_kind,window_start,allowed_count)
    values (p_user,p_bucket,'minute',v_minute,1),(p_user,p_bucket,'day',v_day,1)
    on conflict (learner_id,bucket,window_kind,window_start) do update set allowed_count = public.learner_request_counters.allowed_count + 1;
  if random() < 0.02 then
    delete from public.learner_request_counters
      where learner_id=p_user and window_kind='minute' and window_start < now() - interval '1 day';
  end if;
  return jsonb_build_object('allowed',true,'bucket',p_bucket,'throttled',v_factor > 1);
end;
$function$;

-- Throttle / unthrottle with an immutable audit row, idempotent on request id.
create or replace function public.owner_admin_apply_throttle_v1(
  p_actor uuid, p_learner uuid, p_action text, p_hours integer, p_factor integer, p_reason text, p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_existing public.owner_admin_audit_events%rowtype;
  v_before jsonb;
  v_after jsonb;
  v_id uuid;
  v_created timestamptz;
begin
  if not exists(select 1 from public.content_admin_account where singleton=true and admin_user_id=p_actor) then raise exception 'content_admin_required'; end if;
  if p_actor=p_learner then raise exception 'owner_target_protected'; end if;
  if p_action not in ('throttle','unthrottle') then raise exception 'owner_throttle_action_invalid'; end if;
  if length(trim(coalesce(p_reason,''))) < 10 or length(p_reason) > 1000 then raise exception 'owner_action_reason_invalid'; end if;
  if not exists(select 1 from auth.users where id=p_learner and deleted_at is null) then raise exception 'owner_learner_not_found'; end if;

  select * into v_existing from public.owner_admin_audit_events where request_id=p_request_id;
  if found then
    return jsonb_build_object('contractId','owner-admin-action-receipt-v1','idempotent',true,'eventId',v_existing.id,'action',v_existing.action,'learnerId',v_existing.learner_id,'afterState',v_existing.after_state,'createdAt',v_existing.created_at);
  end if;

  select jsonb_build_object('throttledUntil',throttled_until,'limitFactor',limit_factor) into v_before
    from public.learner_throttles where learner_id=p_learner and throttled_until > now();
  v_before := coalesce(v_before, jsonb_build_object('throttledUntil',null,'limitFactor',1));

  if p_action='throttle' then
    if p_hours is null or p_hours < 1 or p_hours > 2160 then raise exception 'owner_throttle_duration_invalid'; end if;
    if p_factor is null or p_factor < 2 or p_factor > 100 then raise exception 'owner_throttle_factor_invalid'; end if;
    insert into public.learner_throttles(learner_id,limit_factor,throttled_until,reason,set_by,set_at)
      values (p_learner,p_factor,now() + make_interval(hours => p_hours),trim(p_reason),p_actor,now())
      on conflict (learner_id) do update set limit_factor=excluded.limit_factor, throttled_until=excluded.throttled_until,
        reason=excluded.reason, set_by=excluded.set_by, set_at=excluded.set_at;
    v_after := jsonb_build_object('throttledUntil',now() + make_interval(hours => p_hours),'limitFactor',p_factor);
  else
    delete from public.learner_throttles where learner_id=p_learner;
    v_after := jsonb_build_object('throttledUntil',null,'limitFactor',1);
  end if;

  insert into public.owner_admin_audit_events(request_id,admin_user_id,learner_id,action,reason,before_state,after_state)
    values (p_request_id,p_actor,p_learner,p_action,trim(p_reason),v_before,v_after)
    returning id,created_at into v_id,v_created;
  return jsonb_build_object('contractId','owner-admin-action-receipt-v1','idempotent',false,'eventId',v_id,'action',p_action,'learnerId',p_learner,'afterState',v_after,'createdAt',v_created);
end;
$function$;

-- Per-learner behaviour metrics over the last 7 days (admin accounts excluded).
create or replace function public.owner_access_signals_v1()
returns jsonb
language sql
stable
security definer
set search_path=''
as $function$
  with since as (select now() - interval '7 days' as t),
  admins as (select admin_user_id as id from public.content_admin_account),
  attempts as (
    select learner_id,
      count(*) as attempts,
      count(*) filter (where (event->>'durationMs') ~ '^[0-9]+$' and (event->>'durationMs')::bigint < 3000) as fast_attempts
    from public.study_attempts where recorded_at >= (select t from since) group by 1
  ),
  per_day as (
    select learner_id, (recorded_at at time zone 'Asia/Kolkata')::date as d, count(*) as n,
      count(distinct extract(hour from recorded_at at time zone 'Asia/Kolkata')) as hours
    from public.study_attempts where recorded_at >= (select t from since) group by 1,2
  ),
  day_max as (select learner_id, max(n) as max_attempts_day, max(hours) as max_active_hours_day from per_day group by 1),
  counters as (
    select learner_id,
      coalesce(max(allowed_count) filter (where bucket='library'),0) as library_max_day,
      coalesce(max(allowed_count) filter (where bucket='question'),0) as question_max_day,
      coalesce(sum(allowed_count) filter (where bucket='library'),0) as library_total,
      coalesce(sum(denied_count),0) as denied
    from public.learner_request_counters
    where window_kind='day' and window_start >= (select t from since) group by 1
  ),
  sess as (
    select user_id,
      count(*) as sessions,
      count(distinct host(ip)) as ips,
      count(*) filter (where user_agent ~* '(headless|python|curl|wget|scrapy|selenium|puppeteer|playwright|phantomjs|httpclient|okhttp|go-http|java/|axios|node-fetch|\mbot\M|spider|crawler)') as automation_agents
    from auth.sessions
    where coalesce(updated_at, created_at) >= (select t from since)
    group by 1
  ),
  ids as (
    select learner_id as id from attempts
    union select learner_id from counters
    union select user_id from sess
    union select learner_id from public.learner_throttles where throttled_until > now()
  )
  select jsonb_build_object(
    'contractId','owner-access-signals-v1',
    'generatedAt',now(),
    'windowDays',7,
    'limits',jsonb_build_object('question',jsonb_build_object('perMinute',90,'perDay',3000),'library',jsonb_build_object('perMinute',60,'perDay',2000)),
    'learners',coalesce(jsonb_agg(jsonb_build_object(
      'learnerId',u.id,
      'email',u.email,
      'suspendedUntil',case when u.banned_until > now() then u.banned_until end,
      'throttledUntil',(select throttled_until from public.learner_throttles t where t.learner_id=u.id and t.throttled_until > now()),
      'throttleFactor',(select limit_factor from public.learner_throttles t where t.learner_id=u.id and t.throttled_until > now()),
      'attempts7d',coalesce(a.attempts,0),
      'fastAttempts7d',coalesce(a.fast_attempts,0),
      'maxAttemptsInDay',coalesce(dm.max_attempts_day,0),
      'maxActiveHoursInDay',coalesce(dm.max_active_hours_day,0),
      'libraryReadsMaxDay',coalesce(c.library_max_day,0),
      'libraryReads7d',coalesce(c.library_total,0),
      'questionRequestsMaxDay',coalesce(c.question_max_day,0),
      'deniedRequests7d',coalesce(c.denied,0),
      'liveSessions',coalesce(s.sessions,0),
      'distinctIps',coalesce(s.ips,0),
      'automationUserAgents',coalesce(s.automation_agents,0)
    ) order by u.created_at),'[]'::jsonb)
  )
  from ids
  join auth.users u on u.id=ids.id and u.deleted_at is null
  left join attempts a on a.learner_id=u.id
  left join day_max dm on dm.learner_id=u.id
  left join counters c on c.learner_id=u.id
  left join sess s on s.user_id=u.id
  where u.id not in (select id from admins);
$function$;

revoke all on function public.learner_request_quota_v1(uuid,text) from public,anon,authenticated;
revoke all on function public.owner_admin_apply_throttle_v1(uuid,uuid,text,integer,integer,text,uuid) from public,anon,authenticated;
revoke all on function public.owner_access_signals_v1() from public,anon,authenticated;
grant execute on function public.learner_request_quota_v1(uuid,text) to service_role;
grant execute on function public.owner_admin_apply_throttle_v1(uuid,uuid,text,integer,integer,text,uuid) to service_role;
grant execute on function public.owner_access_signals_v1() to service_role;
