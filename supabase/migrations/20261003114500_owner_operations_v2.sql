-- Owner Operations V2
-- Controlled learner administration + external infrastructure telemetry snapshots.
-- Medical/References/Rights human-review grants remain separate and temporary.

create table if not exists public.owner_learner_access_state (
  learner_id uuid primary key,
  beta_access_until timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid not null
);

create table if not exists public.owner_admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  admin_user_id uuid not null,
  learner_id uuid not null,
  action text not null check (action in ('grant_beta','revoke_beta','suspend','restore')),
  reason text not null,
  before_state jsonb not null,
  after_state jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.owner_infrastructure_snapshots (
  provider text primary key,
  observed_at timestamptz not null,
  status text not null,
  source text not null,
  metrics jsonb not null default '{}'::jsonb,
  refreshed_at timestamptz not null default now()
);

alter table public.owner_learner_access_state enable row level security;
alter table public.owner_admin_audit_events enable row level security;
alter table public.owner_infrastructure_snapshots enable row level security;

revoke all on public.owner_learner_access_state from anon, authenticated;
revoke all on public.owner_admin_audit_events from anon, authenticated;
revoke all on public.owner_infrastructure_snapshots from anon, authenticated;

grant all on public.owner_learner_access_state to service_role;
grant all on public.owner_admin_audit_events to service_role;
grant all on public.owner_infrastructure_snapshots to service_role;

create or replace function public.owner_admin_learner_detail_v1(p_learner uuid)
returns jsonb
language sql
stable
security definer
set search_path=''
as $function$
  select jsonb_build_object(
    'contractId','owner-admin-learner-detail-v1',
    'learner', jsonb_build_object(
      'id',u.id,
      'email',u.email,
      'createdAt',u.created_at,
      'lastSignInAt',u.last_sign_in_at,
      'emailConfirmedAt',u.email_confirmed_at,
      'providers',coalesce(u.raw_app_meta_data->'providers','[]'::jsonb),
      'bannedUntil',u.banned_until,
      'isSuspended',(u.banned_until is not null and u.banned_until > now()),
      'isAdmin',exists(select 1 from public.content_admin_account a where a.singleton=true and a.admin_user_id=u.id),
      'betaAccessUntil',s.beta_access_until,
      'betaActive',(s.beta_access_until is not null and s.beta_access_until > now())
    ),
    'audit',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',e.id,
        'requestId',e.request_id,
        'action',e.action,
        'reason',e.reason,
        'beforeState',e.before_state,
        'afterState',e.after_state,
        'createdAt',e.created_at
      ) order by e.created_at desc)
      from (
        select * from public.owner_admin_audit_events
        where learner_id=p_learner
        order by created_at desc
        limit 20
      ) e
    ),'[]'::jsonb)
  )
  from auth.users u
  left join public.owner_learner_access_state s on s.learner_id=u.id
  where u.id=p_learner and u.deleted_at is null;
$function$;

create or replace function public.owner_admin_access_summary_v1()
returns jsonb
language sql
stable
security definer
set search_path=''
as $function$
  select jsonb_build_object(
    'contractId','owner-admin-access-summary-v1',
    'activeBetaLearners',(select count(*) from public.owner_learner_access_state where beta_access_until > now()),
    'suspendedLearners',(select count(*) from auth.users where deleted_at is null and banned_until is not null and banned_until > now()),
    'auditEvents',(select count(*) from public.owner_admin_audit_events),
    'latestAuditAt',(select max(created_at) from public.owner_admin_audit_events)
  );
$function$;

create or replace function public.owner_admin_apply_beta_access_v1(
  p_actor uuid,
  p_learner uuid,
  p_action text,
  p_beta_until timestamptz,
  p_reason text,
  p_request_id uuid
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
begin
  if not exists(select 1 from public.content_admin_account where singleton=true and admin_user_id=p_actor) then
    raise exception 'content_admin_required';
  end if;
  if p_actor = p_learner then raise exception 'owner_target_protected'; end if;
  if p_action not in ('grant_beta','revoke_beta') then raise exception 'owner_beta_action_invalid'; end if;
  if length(trim(coalesce(p_reason,''))) < 10 or length(p_reason) > 1000 then raise exception 'owner_action_reason_invalid'; end if;

  select * into v_existing from public.owner_admin_audit_events where request_id=p_request_id;
  if found then
    return jsonb_build_object('contractId','owner-admin-action-receipt-v1','idempotent',true,'eventId',v_existing.id,'action',v_existing.action,'learnerId',v_existing.learner_id,'afterState',v_existing.after_state,'createdAt',v_existing.created_at);
  end if;

  if not exists(select 1 from auth.users where id=p_learner and deleted_at is null) then raise exception 'owner_learner_not_found'; end if;
  if p_action='grant_beta' and (p_beta_until is null or p_beta_until <= now() or p_beta_until > now() + interval '365 days') then raise exception 'owner_beta_expiry_invalid'; end if;
  if p_action='revoke_beta' and p_beta_until is not null then raise exception 'owner_beta_expiry_invalid'; end if;

  v_before := public.owner_admin_learner_detail_v1(p_learner)->'learner';

  insert into public.owner_learner_access_state(learner_id,beta_access_until,updated_at,updated_by)
  values(p_learner, case when p_action='grant_beta' then p_beta_until else null end, now(), p_actor)
  on conflict(learner_id) do update set
    beta_access_until=excluded.beta_access_until,
    updated_at=excluded.updated_at,
    updated_by=excluded.updated_by;

  v_after := public.owner_admin_learner_detail_v1(p_learner)->'learner';

  insert into public.owner_admin_audit_events(request_id,admin_user_id,learner_id,action,reason,before_state,after_state)
  values(p_request_id,p_actor,p_learner,p_action,trim(p_reason),v_before,v_after)
  returning id,created_at into v_existing.id,v_existing.created_at;

  return jsonb_build_object('contractId','owner-admin-action-receipt-v1','idempotent',false,'eventId',v_existing.id,'action',p_action,'learnerId',p_learner,'afterState',v_after,'createdAt',v_existing.created_at);
end;
$function$;

create or replace function public.owner_admin_record_auth_action_v1(
  p_actor uuid,
  p_learner uuid,
  p_action text,
  p_reason text,
  p_request_id uuid,
  p_before jsonb,
  p_after jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_existing public.owner_admin_audit_events%rowtype;
  v_id uuid;
  v_created timestamptz;
begin
  if not exists(select 1 from public.content_admin_account where singleton=true and admin_user_id=p_actor) then raise exception 'content_admin_required'; end if;
  if p_actor=p_learner then raise exception 'owner_target_protected'; end if;
  if p_action not in ('suspend','restore') then raise exception 'owner_auth_action_invalid'; end if;
  if length(trim(coalesce(p_reason,''))) < 10 or length(p_reason) > 1000 then raise exception 'owner_action_reason_invalid'; end if;
  if not exists(select 1 from auth.users where id=p_learner and deleted_at is null) then raise exception 'owner_learner_not_found'; end if;

  select * into v_existing from public.owner_admin_audit_events where request_id=p_request_id;
  if found then
    return jsonb_build_object('contractId','owner-admin-action-receipt-v1','idempotent',true,'eventId',v_existing.id,'action',v_existing.action,'learnerId',v_existing.learner_id,'afterState',v_existing.after_state,'createdAt',v_existing.created_at);
  end if;

  insert into public.owner_admin_audit_events(request_id,admin_user_id,learner_id,action,reason,before_state,after_state)
  values(p_request_id,p_actor,p_learner,p_action,trim(p_reason),coalesce(p_before,'{}'::jsonb),coalesce(p_after,'{}'::jsonb))
  returning id,created_at into v_id,v_created;

  return jsonb_build_object('contractId','owner-admin-action-receipt-v1','idempotent',false,'eventId',v_id,'action',p_action,'learnerId',p_learner,'afterState',p_after,'createdAt',v_created);
end;
$function$;

create or replace function public.owner_infrastructure_snapshot_upsert_v1(
  p_provider text,
  p_observed_at timestamptz,
  p_status text,
  p_source text,
  p_metrics jsonb
)
returns void
language plpgsql
security definer
set search_path=''
as $function$
begin
  if p_provider !~ '^[a-z0-9_-]{2,40}$' then raise exception 'infra_provider_invalid'; end if;
  if p_status not in ('healthy','degraded','unavailable','configured') then raise exception 'infra_status_invalid'; end if;
  insert into public.owner_infrastructure_snapshots(provider,observed_at,status,source,metrics,refreshed_at)
  values(p_provider,p_observed_at,p_status,left(p_source,120),coalesce(p_metrics,'{}'::jsonb),now())
  on conflict(provider) do update set observed_at=excluded.observed_at,status=excluded.status,source=excluded.source,metrics=excluded.metrics,refreshed_at=now();
end;
$function$;

create or replace function public.owner_infrastructure_snapshots_v1()
returns jsonb
language sql
stable
security definer
set search_path=''
as $function$
  select jsonb_build_object(
    'contractId','owner-infrastructure-snapshots-v1',
    'providers',coalesce(jsonb_object_agg(provider,jsonb_build_object('status',status,'source',source,'observedAt',observed_at,'metrics',metrics)),'{}'::jsonb)
  )
  from public.owner_infrastructure_snapshots;
$function$;

revoke all on function public.owner_admin_learner_detail_v1(uuid) from public, anon, authenticated;
revoke all on function public.owner_admin_access_summary_v1() from public, anon, authenticated;
revoke all on function public.owner_admin_apply_beta_access_v1(uuid,uuid,text,timestamptz,text,uuid) from public, anon, authenticated;
revoke all on function public.owner_admin_record_auth_action_v1(uuid,uuid,text,text,uuid,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.owner_infrastructure_snapshot_upsert_v1(text,timestamptz,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.owner_infrastructure_snapshots_v1() from public, anon, authenticated;

grant execute on function public.owner_admin_learner_detail_v1(uuid) to service_role;
grant execute on function public.owner_admin_access_summary_v1() to service_role;
grant execute on function public.owner_admin_apply_beta_access_v1(uuid,uuid,text,timestamptz,text,uuid) to service_role;
grant execute on function public.owner_admin_record_auth_action_v1(uuid,uuid,text,text,uuid,jsonb,jsonb) to service_role;
grant execute on function public.owner_infrastructure_snapshot_upsert_v1(text,timestamptz,text,text,jsonb) to service_role;
grant execute on function public.owner_infrastructure_snapshots_v1() to service_role;

comment on table public.owner_admin_audit_events is 'Immutable owner learner-administration audit evidence. Application code never updates or deletes rows.';
comment on table public.owner_learner_access_state is 'Owner-controlled app access state. Supabase Auth banned_until remains authoritative for suspension.';
comment on function public.owner_admin_apply_beta_access_v1(uuid,uuid,text,timestamptz,text,uuid) is 'Owner-only reversible beta access mutation with immutable audit evidence. Does not alter human review grants.';
