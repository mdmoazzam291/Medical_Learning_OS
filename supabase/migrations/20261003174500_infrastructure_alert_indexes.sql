-- Cover the foreign keys introduced by infrastructure alert delivery V1.
-- These indexes do not change behavior; they keep FK maintenance and joins cheap.

create index if not exists owner_infrastructure_provider_state_alert_idx
  on public.owner_infrastructure_provider_state(current_alert_id);

create index if not exists owner_infrastructure_notification_intents_alert_idx
  on public.owner_infrastructure_notification_intents(alert_id);

create index if not exists owner_infrastructure_notification_delivery_events_intent_idx
  on public.owner_infrastructure_notification_delivery_events(idempotency_key);
