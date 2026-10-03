-- Owner Operations V3
-- Q1: strong runtime access validation against auth.sessions + suspension state.
-- Q2: canonical feature entitlements backed by owner-managed audience flags.
-- Q3: persistent infrastructure alerts + cron monitor authorization/scheduling.
-- Human Medical/References/Rights reviewer grants remain separate and unchanged.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table if not exists public.owner_feature_flags (
  feature_key text primary key check (feature_key ~ '^[a-z][a-z0-9_]{2,63}$'),
  audience text not null check (audience in ('all','beta','off')),
  description text not null,
  mapped_surface text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.owner_feature_flag_audit_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  admin_user_id uuid not null,
  feature_key text not null,
  before_audience text not null,
  after_audience text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.owner_infrastructure_alerts (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider ~ '^[a-z0-9_-]{2,40}$'),
  state text not null check (state in ('open','resolved')),
  severity text not null check (severity in ('warning','critical')),
  status text not null,
  evidence jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists owner_infrastructure_one_open_alert_per_provider
  on public.owner_infrastructure_alerts(provider)
  where state='open';

alter table public.owner_feature_flags enable row level security;
alter table public.owner_feature_flag_audit_events enable row level security;
alter table public.owner_infrastructure_alerts enable row level security;

revoke all on public.owner_feature_flags from public, anon, authenticated;
revoke all on public.owner_feature_flag_audit_events from public, anon, authenticated;
revoke all on public.owner_infrastructure_alerts from public, anon, authenticated;

grant all on public.owner_feature_flags to service_role;
grant all on public.owner_feature_flag_audit_events to service_role;
grant all on public.owner_infrastructure_alerts to service_role;

insert into public.owner_feature_flags(feature_key,audience,description,mapped_surface,updated_by)
values(
  'retention_origin_handoff',
  'all',
  'Learner-controlled retention origin handoff. Kept available to all learners at rollout; owner may move it to beta without redeploying.',
  'retention-probe-api:/origin + /origin/start',
  null
)
on conflict(feature_key) do nothing;

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

create or replace function public.learner_feature_entitlements_v1(p_user uuid)
returns jsonb
language sql
stable
security definer
set search_path=''
as $function$
  with access_state as (
    select
      exists(
        select 1 from public.owner_learner_access_state s
        where s.learner_id=p_user and s.beta_access_until > now()
      ) as beta_active,
      exists(
        select 1 from public.content_admin_account a
        where a.singleton=true and a.admin_user_id=p_user
      ) as is_owner
  ), feature_rows as (
    select f.feature_key,f.audience,f.description,f.mapped_surface,
      case
        when f.audience='all' then true
        when f.audience='beta' and ((select beta_active from access_state) or (select is_owner from access_state)) then true
        else false
      end as enabled
    from public.owner_feature_flags f
  )
  select jsonb_build_object(
    'contractId','learner-feature-entitlements-v1',
    'betaActive',(select beta_active from access_state),
    'ownerPreview',(select is_owner from access_state),
    'features',coalesce(
      (select jsonb_object_agg(feature_key,jsonb_build_object(
        'enabled',enabled,
        'audience',audience,
        'description',description,
        'mappedSurface',mapped_surface
      )) from feature_rows),
      '{}'::jsonb
    )
  );
$function$;

create or replace function public.learner_feature_allowed_v1(p_user uuid, p_feature text)
returns boolean
language sql
stable
security definer
set search_path=''
as $function$
  select coalesce(
    (public.learner_feature_entitlements_v1(p_user)->'features'->p_feature->>'enabled')::boolean,
    false
  );
$function$;

create or replace function public.owner_feature_flags_v1()
returns jsonb
language sql
stable
security definer
set search_path=''
as $function$
  select jsonb_build_object(
    'contractId','owner-feature-flags-v1',
    'flags',coalesce(jsonb_agg(jsonb_build_object(
      'featureKey',feature_key,
      'audience',audience,
      'description',description,
      'mappedSurface',mapped_surface,
      'updatedAt',updated_at
    ) order by feature_key),'[]'::jsonb)
  )
  from public.owner_feature_flags;
$function$;

create or replace function public.owner_admin_set_feature_flag_v1(
  p_actor uuid,
  p_feature text,
  p_audience text,
  p_reason text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_before text;
  v_existing public.owner_feature_flag_audit_events%rowtype;
  v_event uuid;
  v_created timestamptz;
begin
  if not exists(select 1 from public.content_admin_account where singleton=true and admin_user_id=p_actor) then
    raise exception 'content_admin_required';
  end if;
  if p_audience not in ('all','beta','off') then raise exception 'owner_feature_audience_invalid'; end if;
  if length(trim(coalesce(p_reason,''))) < 10 or length(p_reason) > 1000 then raise exception 'owner_action_reason_invalid'; end if;

  select * into v_existing from public.owner_feature_flag_audit_events where request_id=p_request_id;
  if found then
    return jsonb_build_object(
      'contractId','owner-feature-flag-receipt-v1','idempotent',true,
      'eventId',v_existing.id,'featureKey',v_existing.feature_key,
      'beforeAudience',v_existing.before_audience,'afterAudience',v_existing.after_audience,
      'createdAt',v_existing.created_at
    );
  end if;

  select audience into v_before from public.owner_feature_flags where feature_key=p_feature for update;
  if not found then raise exception 'owner_feature_not_found'; end if;

  update public.owner_feature_flags
  set audience=p_audience,updated_at=now(),updated_by=p_actor
  where feature_key=p_feature;

  insert into public.owner_feature_flag_audit_events(
    request_id,admin_user_id,feature_key,before_audience,after_audience,reason
  ) values(
    p_request_id,p_actor,p_feature,v_before,p_audience,trim(p_reason)
  ) returning id,created_at into v_event,v_created;

  return jsonb_build_object(
    'contractId','owner-feature-flag-receipt-v1','idempotent',false,
    'eventId',v_event,'featureKey',p_feature,
    'beforeAudience',v_before,'afterAudience',p_audience,'createdAt',v_created
  );
end;
$function$;

create or replace function public.owner_infrastructure_alert_evaluate_v1(
  p_provider text,
  p_status text,
  p_evidence jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_open public.owner_infrastructure_alerts%rowtype;
  v_unhealthy boolean := p_status in ('degraded','unavailable');
  v_severity text := case when p_status='unavailable' then 'critical' else 'warning' end;
begin
  if p_provider !~ '^[a-z0-9_-]{2,40}$' then raise exception 'infra_provider_invalid'; end if;
  if p_status not in ('healthy','degraded','unavailable','configured') then raise exception 'infra_status_invalid'; end if;

  select * into v_open from public.owner_infrastructure_alerts
  where provider=p_provider and state='open'
  for update;

  if v_unhealthy then
    if found then
      update public.owner_infrastructure_alerts
      set severity=v_severity,status=p_status,evidence=coalesce(p_evidence,'{}'::jsonb),last_seen_at=now()
      where id=v_open.id
      returning * into v_open;
    else
      insert into public.owner_infrastructure_alerts(provider,state,severity,status,evidence)
      values(p_provider,'open',v_severity,p_status,coalesce(p_evidence,'{}'::jsonb))
      returning * into v_open;
    end if;
  elsif found then
    update public.owner_infrastructure_alerts
    set state='resolved',status=p_status,evidence=coalesce(p_evidence,'{}'::jsonb),last_seen_at=now(),resolved_at=now()
    where id=v_open.id
    returning * into v_open;
  end if;

  return jsonb_build_object(
    'contractId','owner-infrastructure-alert-evaluation-v1',
    'provider',p_provider,'status',p_status,'unhealthy',v_unhealthy,
    'alert',case when v_open.id is null then null else jsonb_build_object(
      'id',v_open.id,'state',v_open.state,'severity',v_open.severity,
      'firstSeenAt',v_open.first_seen_at,'lastSeenAt',v_open.last_seen_at,'resolvedAt',v_open.resolved_at
    ) end
  );
end;
$function$;

create or replace function public.owner_infrastructure_alerts_v1()
returns jsonb
language sql
stable
security definer
set search_path=''
as $function$
  select jsonb_build_object(
    'contractId','owner-infrastructure-alerts-v1',
    'openCount',(select count(*) from public.owner_infrastructure_alerts where state='open'),
    'alerts',coalesce((select jsonb_agg(jsonb_build_object(
      'id',id,'provider',provider,'state',state,'severity',severity,'status',status,
      'evidence',evidence,'firstSeenAt',first_seen_at,'lastSeenAt',last_seen_at,'resolvedAt',resolved_at
    ) order by case when state='open' then 0 else 1 end, last_seen_at desc)
    from (select * from public.owner_infrastructure_alerts order by last_seen_at desc limit 50) x),'[]'::jsonb)
  );
$function$;

create or replace function public.owner_monitor_provider_secret_v1(p_name text)
returns text
language plpgsql
stable
security definer
set search_path=''
as $function$
declare
  v_secret text;
begin
  if p_name not in ('mlos_infra_monitor_key','mlos_sentry_auth_token','mlos_sentry_org','mlos_sentry_project','mlos_resend_api_key') then
    raise exception 'monitor_secret_name_not_allowed';
  end if;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name=p_name;
  return v_secret;
end;
$function$;

create or replace function public.owner_monitor_cron_authorized_v1(p_key text)
returns boolean
language sql
stable
security definer
set search_path=''
as $function$
  select coalesce(p_key=(select decrypted_secret from vault.decrypted_secrets where name='mlos_infra_monitor_key'),false);
$function$;

create or replace function public.owner_monitor_record_provider_v1(
  p_provider text,
  p_observed_at timestamptz,
  p_status text,
  p_source text,
  p_metrics jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_alert jsonb;
begin
  perform public.owner_infrastructure_snapshot_upsert_v1(p_provider,p_observed_at,p_status,p_source,p_metrics);
  v_alert := public.owner_infrastructure_alert_evaluate_v1(p_provider,p_status,p_metrics);
  return jsonb_build_object('provider',p_provider,'status',p_status,'alert',v_alert);
end;
$function$;

create or replace function public.owner_feature_flag_audit_immutable_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
begin
  raise exception 'owner_feature_flag_audit_immutable';
end;
$function$;

drop trigger if exists owner_feature_flag_audit_immutable on public.owner_feature_flag_audit_events;
create trigger owner_feature_flag_audit_immutable
before update or delete on public.owner_feature_flag_audit_events
for each row execute function public.owner_feature_flag_audit_immutable_v1();

revoke all on function public.learner_runtime_access_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.learner_feature_entitlements_v1(uuid) from public,anon,authenticated;
revoke all on function public.learner_feature_allowed_v1(uuid,text) from public,anon,authenticated;
revoke all on function public.owner_feature_flags_v1() from public,anon,authenticated;
revoke all on function public.owner_admin_set_feature_flag_v1(uuid,text,text,text,uuid) from public,anon,authenticated;
revoke all on function public.owner_infrastructure_alert_evaluate_v1(text,text,jsonb) from public,anon,authenticated;
revoke all on function public.owner_infrastructure_alerts_v1() from public,anon,authenticated;
revoke all on function public.owner_monitor_provider_secret_v1(text) from public,anon,authenticated;
revoke all on function public.owner_monitor_cron_authorized_v1(text) from public,anon,authenticated;
revoke all on function public.owner_monitor_record_provider_v1(text,timestamptz,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.owner_feature_flag_audit_immutable_v1() from public,anon,authenticated;

grant execute on function public.learner_runtime_access_v1(uuid,uuid) to service_role;
grant execute on function public.learner_feature_entitlements_v1(uuid) to service_role;
grant execute on function public.learner_feature_allowed_v1(uuid,text) to service_role;
grant execute on function public.owner_feature_flags_v1() to service_role;
grant execute on function public.owner_admin_set_feature_flag_v1(uuid,text,text,text,uuid) to service_role;
grant execute on function public.owner_infrastructure_alert_evaluate_v1(text,text,jsonb) to service_role;
grant execute on function public.owner_infrastructure_alerts_v1() to service_role;
grant execute on function public.owner_monitor_provider_secret_v1(text) to service_role;
grant execute on function public.owner_monitor_cron_authorized_v1(text) to service_role;
grant execute on function public.owner_monitor_record_provider_v1(text,timestamptz,text,text,jsonb) to service_role;

comment on function public.learner_runtime_access_v1(uuid,uuid) is 'Server-only strong request gate: requires a live auth.sessions row and denies currently suspended accounts.';
comment on function public.learner_feature_allowed_v1(uuid,text) is 'Server-only canonical feature entitlement check. Feature audience and learner beta state remain separate from review authority.';
comment on table public.owner_infrastructure_alerts is 'Automatically opened/resolved provider-health alerts. Dashboard visibility is owner-only through server API.';

-- Generate the scheduler bearer independently of app/admin credentials.
do $block$
begin
  if not exists(select 1 from vault.secrets where name='mlos_infra_monitor_key') then
    perform vault.create_secret(
      replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
      'mlos_infra_monitor_key',
      'Owner Operations V3 cron-to-monitor authentication key'
    );
  end if;
end;
$block$;

-- Upserting a named cron job is idempotent. The publishable key is intentionally public;
-- the actual monitor authorization secret comes from encrypted Supabase Vault.
select cron.schedule(
  'mlos-owner-infrastructure-monitor-v1',
  '*/15 * * * *',
  $cron$
    select net.http_post(
      url:='https://iyapppmeieqhflnzslao.supabase.co/functions/v1/infrastructure-monitor',
      headers:=jsonb_build_object(
        'content-type','application/json',
        'apikey','sb_publishable_Iohyc6yoLk2vWb07YZfEjw_XmJJ3koE',
        'x-mlos-monitor-key',(select decrypted_secret from vault.decrypted_secrets where name='mlos_infra_monitor_key')
      ),
      body:=jsonb_build_object('source','pg_cron','scheduledAt',now()),
      timeout_milliseconds:=12000
    ) as request_id;
  $cron$
);
