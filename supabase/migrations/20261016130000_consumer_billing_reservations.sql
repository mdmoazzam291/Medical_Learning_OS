-- Follow-up server-only reservation metadata. No billing routes or charges enabled.
-- Private subscription table already has RLS with no learner policies.
alter table public.consumer_billing_subscriptions
  add column if not exists idempotency_key uuid,
  add column if not exists approved_amount_minor integer
    check (approved_amount_minor between 100 and 10000000),
  add column if not exists offer_price_version text,
  add column if not exists terms_version text,
  add column if not exists consent_recorded_at timestamptz;

create unique index if not exists consumer_billing_subscriptions_idempotency
  on public.consumer_billing_subscriptions(environment, idempotency_key)
  where idempotency_key is not null;

-- Never expose the private reservation data via authenticated/anon.
revoke all on public.consumer_billing_subscriptions from public, anon, authenticated;
