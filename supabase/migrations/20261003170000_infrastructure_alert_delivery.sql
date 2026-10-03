-- Infrastructure alert delivery V1.
-- Extends the canonical Owner Operations V3 alert lifecycle with persistence,
-- anti-spam streaks/cooldown, delivery intents, and immutable delivery evidence.

create table if not exists public.owner_infrastructure_provider_state (
  provider text primary key check (provider ~ '^[a-z0-9_-]{2,40}$'),
  last_status text not null default 'configured'
    check (last_status in ('healthy','degraded','unavailable','configured')),
  consecutive_unhealthy integer not null default 0 check (consecutive_unhealthy >= 0),
  consecutive_healthy integer not null default 0 check (consecutive_healthy >= 0),
  current_alert_id uuid references public.owner_infrastructure_alerts(id),
  last_notification_at timestamptz,
  last_notification_severity text check (last_notification_severity is null or last_notification_severity in ('warning','critical')),
  last_notification_kind text check (last_notification_kind is null or last_notification_kind in ('opened','repeat','escalation','recovery')),
  updated_at timestamptz not null default now()
);

create table if not exists public.owner_infrastructure_notification_intents (
  idempotency_key text primary key,
  alert_id uuid not null references public.owner_infrastructure_alerts(id),
  provider text not null check (provider ~ '^[a-z0-9_-]{2,40}$'),
  notification_kind text not null check (notification_kind in ('opened','repeat','escalation','recovery')),
  severity text not null check (severity in ('warning','critical')),
  provider_status text not null check (provider_status in ('healthy','degraded','unavailable')),
  payload jsonb not null default '{}'::jsonb,
  delivery_state text not null default 'pending' check (delivery_state in ('pending','sent','failed')),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  created_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  sent_at timestamptz
);

create index if not exists owner_infrastructure_notification_intents_provider_created
  on public.owner_infrastructure_notification_intents(provider,created_at desc);

create table if not exists public.owner_infrastructure_notification_delivery_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null references public.owner_infrastructure_notification_intents(idempotency_key),
  outcome text not null check (outcome in ('sent','failed')),
  provider_message_id text,
  error_code text,
  recorded_at timestamptz not null default now(),
  check ((outcome='sent' and error_code is null) or outcome='failed')
);

alter table public.owner_infrastructure_provider_state enable row level security;
alter table public.owner_infrastructure_notification_intents enable row level security;
alter table public.owner_infrastructure_notification_delivery_events enable row level security;

revoke all on public.owner_infrastructure_provider_state from public,anon,authenticated;
revoke all on public.owner_infrastructure_notification_intents from public,anon,authenticated;
revoke all on public.owner_infrastructure_notification_delivery_events from public,anon,authenticated;

grant all on public.owner_infrastructure_provider_state to service_role;
grant all on public.owner_infrastructure_notification_intents to service_role;
grant all on public.owner_infrastructure_notification_delivery_events to service_role;

create or replace function public.owner_infrastructure_delivery_event_immutable_v1()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
begin
  raise exception 'owner_infrastructure_delivery_event_immutable';
end;
$function$;

drop trigger if exists owner_infrastructure_notification_delivery_events_immutable
  on public.owner_infrastructure_notification_delivery_events;
create trigger owner_infrastructure_notification_delivery_events_immutable
before update or delete on public.owner_infrastructure_notification_delivery_events
for each row execute function public.owner_infrastructure_delivery_event_immutable_v1();

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
  v_now timestamptz := now();
  v_state public.owner_infrastructure_provider_state%rowtype;
  v_open public.owner_infrastructure_alerts%rowtype;
  v_intent public.owner_infrastructure_notification_intents%rowtype;
  v_unhealthy boolean := p_status in ('degraded','unavailable');
  v_observed_severity text := case when p_status='unavailable' then 'critical' else 'warning' end;
  v_effective_severity text;
  v_notification_kind text;
  v_idempotency_key text;
  v_created_intent boolean := false;
begin
  if p_provider !~ '^[a-z0-9_-]{2,40}$' then raise exception 'infra_provider_invalid'; end if;
  if p_status not in ('healthy','degraded','unavailable','configured') then raise exception 'infra_status_invalid'; end if;

  insert into public.owner_infrastructure_provider_state(provider,last_status)
  values(p_provider,p_status)
  on conflict(provider) do nothing;

  select * into v_state
  from public.owner_infrastructure_provider_state
  where provider=p_provider
  for update;

  select * into v_open
  from public.owner_infrastructure_alerts
  where provider=p_provider and state='open'
  for update;

  -- Missing read telemetry is neutral. A configured provider neither advances nor
  -- resets unhealthy/healthy streaks and cannot open/resolve an alert by itself.
  if p_status='configured' then
    update public.owner_infrastructure_provider_state
    set last_status=p_status,updated_at=v_now
    where provider=p_provider
    returning * into v_state;

  elsif v_unhealthy then
    v_state.consecutive_unhealthy := v_state.consecutive_unhealthy + 1;
    v_state.consecutive_healthy := 0;

    if v_state.consecutive_unhealthy >= 2 then
      if v_open.id is null then
        insert into public.owner_infrastructure_alerts(
          provider,state,severity,status,evidence,first_seen_at,last_seen_at
        ) values(
          p_provider,'open',v_observed_severity,p_status,coalesce(p_evidence,'{}'::jsonb),v_now,v_now
        ) returning * into v_open;
        v_notification_kind := 'opened';
        v_state.current_alert_id := v_open.id;
      else
        v_effective_severity := case
          when v_open.severity='critical' or v_observed_severity='critical' then 'critical'
          else 'warning'
        end;

        if v_open.severity='warning' and v_observed_severity='critical' then
          v_notification_kind := 'escalation';
        elsif v_state.last_notification_at is null
           or v_state.last_notification_at <= v_now - interval '6 hours' then
          v_notification_kind := 'repeat';
        end if;

        update public.owner_infrastructure_alerts
        set severity=v_effective_severity,
            status=p_status,
            evidence=coalesce(p_evidence,'{}'::jsonb),
            last_seen_at=v_now
        where id=v_open.id
        returning * into v_open;
        v_state.current_alert_id := v_open.id;
      end if;
    end if;

    update public.owner_infrastructure_provider_state
    set last_status=p_status,
        consecutive_unhealthy=v_state.consecutive_unhealthy,
        consecutive_healthy=0,
        current_alert_id=v_state.current_alert_id,
        updated_at=v_now
    where provider=p_provider
    returning * into v_state;

  elsif p_status='healthy' then
    v_state.consecutive_healthy := v_state.consecutive_healthy + 1;
    v_state.consecutive_unhealthy := 0;

    if v_open.id is not null and v_state.consecutive_healthy >= 2 then
      update public.owner_infrastructure_alerts
      set state='resolved',
          status='healthy',
          evidence=coalesce(p_evidence,'{}'::jsonb),
          last_seen_at=v_now,
          resolved_at=v_now
      where id=v_open.id
      returning * into v_open;
      v_notification_kind := 'recovery';
      v_state.current_alert_id := null;
    end if;

    update public.owner_infrastructure_provider_state
    set last_status=p_status,
        consecutive_unhealthy=0,
        consecutive_healthy=v_state.consecutive_healthy,
        current_alert_id=v_state.current_alert_id,
        updated_at=v_now
    where provider=p_provider
    returning * into v_state;
  end if;

  if v_notification_kind is not null and v_open.id is not null then
    v_idempotency_key := case v_notification_kind
      when 'opened' then 'infra:'||v_open.id::text||':opened'
      when 'escalation' then 'infra:'||v_open.id::text||':critical'
      when 'recovery' then 'infra:'||v_open.id::text||':recovery'
      else 'infra:'||v_open.id::text||':repeat:'||floor(extract(epoch from v_now)/21600)::bigint::text
    end;

    insert into public.owner_infrastructure_notification_intents(
      idempotency_key,alert_id,provider,notification_kind,severity,provider_status,payload
    ) values(
      v_idempotency_key,
      v_open.id,
      p_provider,
      v_notification_kind,
      v_open.severity,
      p_status,
      jsonb_build_object(
        'contractId','owner-infrastructure-notification-intent-v1',
        'provider',p_provider,
        'notificationKind',v_notification_kind,
        'severity',v_open.severity,
        'status',p_status,
        'observedAt',v_now
      )
    )
    on conflict(idempotency_key) do nothing
    returning * into v_intent;

    v_created_intent := v_intent.idempotency_key is not null;
    if not v_created_intent then
      select * into v_intent
      from public.owner_infrastructure_notification_intents
      where idempotency_key=v_idempotency_key;
    end if;

    if v_created_intent then
      update public.owner_infrastructure_provider_state
      set last_notification_at=v_now,
          last_notification_severity=v_open.severity,
          last_notification_kind=v_notification_kind,
          updated_at=v_now
      where provider=p_provider
      returning * into v_state;
    end if;
  end if;

  -- A failed/pending delivery remains retryable with the same external
  -- idempotency key. This does not create a new alert notification.
  if v_intent.idempotency_key is null then
    select * into v_intent
    from public.owner_infrastructure_notification_intents
    where provider=p_provider
      and delivery_state in ('pending','failed')
    order by created_at desc
    limit 1;
  end if;

  return jsonb_build_object(
    'contractId','owner-infrastructure-alert-evaluation-v2',
    'provider',p_provider,
    'status',p_status,
    'unhealthy',v_unhealthy,
    'consecutiveUnhealthy',v_state.consecutive_unhealthy,
    'consecutiveHealthy',v_state.consecutive_healthy,
    'alert',case when v_open.id is null then null else jsonb_build_object(
      'id',v_open.id,
      'state',v_open.state,
      'severity',v_open.severity,
      'status',v_open.status,
      'firstSeenAt',v_open.first_seen_at,
      'lastSeenAt',v_open.last_seen_at,
      'resolvedAt',v_open.resolved_at
    ) end,
    'deliveryIntent',case when v_intent.idempotency_key is null then null else jsonb_build_object(
      'idempotencyKey',v_intent.idempotency_key,
      'alertId',v_intent.alert_id,
      'provider',v_intent.provider,
      'notificationKind',v_intent.notification_kind,
      'severity',v_intent.severity,
      'providerStatus',v_intent.provider_status,
      'payload',v_intent.payload,
      'deliveryState',v_intent.delivery_state
    ) end
  );
end;
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
  v_evaluation jsonb;
begin
  perform public.owner_infrastructure_snapshot_upsert_v1(
    p_provider,p_observed_at,p_status,p_source,p_metrics
  );
  v_evaluation := public.owner_infrastructure_alert_evaluate_v1(
    p_provider,p_status,p_metrics
  );
  return jsonb_build_object(
    'provider',p_provider,
    'status',p_status,
    'alert',v_evaluation->'alert',
    'deliveryIntent',v_evaluation->'deliveryIntent',
    'evaluation',v_evaluation
  );
end;
$function$;

create or replace function public.owner_monitor_record_notification_delivery_v1(
  p_idempotency_key text,
  p_outcome text,
  p_provider_message_id text,
  p_error_code text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_intent public.owner_infrastructure_notification_intents%rowtype;
  v_event_id uuid;
  v_recorded_at timestamptz;
begin
  if p_outcome not in ('sent','failed') then
    raise exception 'infra_notification_outcome_invalid';
  end if;
  if p_outcome='sent' and p_error_code is not null then
    raise exception 'infra_notification_sent_error_invalid';
  end if;

  select * into v_intent
  from public.owner_infrastructure_notification_intents
  where idempotency_key=p_idempotency_key
  for update;

  if not found then raise exception 'infra_notification_intent_not_found'; end if;

  if v_intent.delivery_state='sent' then
    return jsonb_build_object(
      'contractId','owner-infrastructure-notification-delivery-receipt-v1',
      'idempotencyKey',p_idempotency_key,
      'idempotent',true,
      'deliveryState','sent',
      'sentAt',v_intent.sent_at
    );
  end if;

  insert into public.owner_infrastructure_notification_delivery_events(
    idempotency_key,outcome,provider_message_id,error_code
  ) values(
    p_idempotency_key,
    p_outcome,
    nullif(left(coalesce(p_provider_message_id,''),200),''),
    case when p_outcome='failed' then left(coalesce(nullif(p_error_code,''),'delivery_failed'),120) else null end
  ) returning id,recorded_at into v_event_id,v_recorded_at;

  update public.owner_infrastructure_notification_intents
  set delivery_state=p_outcome,
      attempt_count=attempt_count+1,
      last_attempt_at=v_recorded_at,
      sent_at=case when p_outcome='sent' then v_recorded_at else sent_at end
  where idempotency_key=p_idempotency_key
  returning * into v_intent;

  return jsonb_build_object(
    'contractId','owner-infrastructure-notification-delivery-receipt-v1',
    'eventId',v_event_id,
    'idempotencyKey',p_idempotency_key,
    'idempotent',false,
    'deliveryState',v_intent.delivery_state,
    'attemptCount',v_intent.attempt_count,
    'recordedAt',v_recorded_at
  );
end;
$function$;

revoke all on function public.owner_infrastructure_delivery_event_immutable_v1()
  from public,anon,authenticated;
revoke all on function public.owner_infrastructure_alert_evaluate_v1(text,text,jsonb)
  from public,anon,authenticated;
revoke all on function public.owner_monitor_record_provider_v1(text,timestamptz,text,text,jsonb)
  from public,anon,authenticated;
revoke all on function public.owner_monitor_record_notification_delivery_v1(text,text,text,text)
  from public,anon,authenticated;

grant execute on function public.owner_infrastructure_alert_evaluate_v1(text,text,jsonb)
  to service_role;
grant execute on function public.owner_monitor_record_provider_v1(text,timestamptz,text,text,jsonb)
  to service_role;
grant execute on function public.owner_monitor_record_notification_delivery_v1(text,text,text,text)
  to service_role;

comment on table public.owner_infrastructure_provider_state is
  'Canonical per-provider anti-spam alert state. configured is neutral; two unhealthy opens and two healthy resolves.';
comment on table public.owner_infrastructure_notification_intents is
  'Database-issued operational alert notification intents with stable external idempotency keys.';
comment on table public.owner_infrastructure_notification_delivery_events is
  'Immutable operational evidence for each attempted infrastructure-alert delivery.';
