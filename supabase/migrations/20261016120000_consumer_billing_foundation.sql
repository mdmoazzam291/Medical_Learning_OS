-- Consumer Cashfree subscription ledger, stage 1. THIS MIGRATION DOES NOT ACTIVATE PAYMENTS.
-- Apply only via reviewed schema release. No public endpoints, payments, grants or Cron.
-- Every table is denied to anon/authenticated clients; trusted server reconciler only.
-- Prices are DRAFT by default and must never be offered before merchant approval.

create table if not exists public.consumer_billing_offers (
  offer_id text primary key check (offer_id ~ '^[a-z0-9_-]{4,80}$'),
  plan text not null check (plan in ('pro', 'ai_pro')),
  billing_interval text not null check (billing_interval in ('month', 'quarter', 'year')),
  price_version text not null check (char_length(price_version) between 4 and 80),
  amount_minor integer not null check (amount_minor between 100 and 10000000),
  currency text not null default 'INR' check (currency = 'INR'),
  -- No approved offers inserted in migrations.
  status text not null default 'draft' check (status in ('draft', 'approved', 'retired')),
  merchant_approval_ref text,
  effective_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  unique (plan, billing_interval, price_version),
  check (status <> 'approved' or (merchant_approval_ref is not null and effective_at is not null))
);

create table if not exists public.consumer_billing_subscriptions (
  subscription_id uuid primary key default gen_random_uuid(),
  subject_id uuid not null,
  offer_id text not null references public.consumer_billing_offers(offer_id),
  provider text not null default 'cashfree' check (provider = 'cashfree'),
  provider_subscription_id text unique,
  -- Provider authorization is never the same thing as captured payment.
  authorization_status text not null default 'unknown'
    check (authorization_status in ('unknown', 'pending', 'active', 'failed', 'revoked')),
  lifecycle_status text not null default 'created'
    check (lifecycle_status in ('created', 'authorization_pending', 'authorized', 'payment_pending',
                                 'active', 'on_hold', 'cancelled', 'expired')),
  starts_at timestamptz,
  current_period_end timestamptz,
  cancelled_at timestamptz,
  last_reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_period_end is null or (starts_at is not null and current_period_end > starts_at))
);

create index if not exists consumer_billing_subscriptions_subject
  on public.consumer_billing_subscriptions (subject_id, created_at desc);

create table if not exists public.consumer_billing_payments (
  payment_id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.consumer_billing_subscriptions(subscription_id),
  provider_payment_id text not null unique,
  -- No access can be granted merely from an event that mentions SUCCESS.
  payment_status text not null check (payment_status in ('pending','success','failed','refunded','reversed')),
  amount_minor integer not null check (amount_minor > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  provider_verified_at timestamptz,
  settled_at timestamptz,
  reversed_at timestamptz,
  recorded_at timestamptz not null default now(),
  check (payment_status <> 'success' or provider_verified_at is not null),
  check (payment_status not in ('refunded', 'reversed') or reversed_at is not null)
);

create index if not exists consumer_billing_payments_subscription
  on public.consumer_billing_payments (subscription_id, recorded_at desc);

create table if not exists public.consumer_billing_webhook_inbox (
  webhook_id uuid primary key default gen_random_uuid(),
  provider text not null default 'cashfree' check (provider = 'cashfree'),
  environment text not null check (environment in ('sandbox','production')),
  -- Dedupe a delivery by stable provider event ID if supplied, else hash of exact
  -- raw bytes+timestamp with provider/environment namespace, calculated on server.
  delivery_key text not null unique check (char_length(delivery_key) between 16 and 160),
  raw_body_sha256 text not null check (raw_body_sha256 ~ '^[a-f0-9]{64}$'),
  event_type text not null check (char_length(event_type) between 3 and 120),
  signature_verified_at timestamptz not null,
  processing_status text not null default 'unprocessed'
    check (processing_status in ('unprocessed','reconciled','needs_review','ignored')),
  processed_at timestamptz,
  received_at timestamptz not null default now()
);
create index if not exists consumer_billing_inbox_pending
  on public.consumer_billing_webhook_inbox (received_at)
  where processing_status = 'unprocessed';

create table if not exists public.consumer_billing_grants (
  grant_id uuid primary key default gen_random_uuid(),
  subject_id uuid not null,
  subscription_id uuid not null references public.consumer_billing_subscriptions(subscription_id),
  payment_id uuid not null unique references public.consumer_billing_payments(payment_id),
  plan text not null check (plan in ('pro','ai_pro')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  provider_reconciled_at timestamptz not null,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists consumer_billing_grants_subject
  on public.consumer_billing_grants (subject_id, ends_at desc);

-- Explicit authorization boundary: learner JWT and browser can neither read
-- billing PII nor insert grants. No authenticated RLS policy is installed.
alter table public.consumer_billing_offers enable row level security;
alter table public.consumer_billing_subscriptions enable row level security;
alter table public.consumer_billing_payments enable row level security;
alter table public.consumer_billing_webhook_inbox enable row level security;
alter table public.consumer_billing_grants enable row level security;

revoke all on public.consumer_billing_offers from public, anon, authenticated;
revoke all on public.consumer_billing_subscriptions from public, anon, authenticated;
revoke all on public.consumer_billing_payments from public, anon, authenticated;
revoke all on public.consumer_billing_webhook_inbox from public, anon, authenticated;
revoke all on public.consumer_billing_grants from public, anon, authenticated;

-- No grants or subscriptions are inserted by this migration. Future reconciler
-- must validate subject/offer/payment/FK linkage, matching amounts and expiry
-- transactionally before writing grants; database foreign keys alone do NOT prove this.
