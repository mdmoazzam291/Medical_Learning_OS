import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { evaluateVerifiedConsumerTerm } from '../src/domain/consumer-billing-eligibility.js';
import { resolveConsumerAccess } from '../src/domain/consumer-entitlements.js';
import { CONSUMER_PAYMENT_PROVIDER_POLICY } from '../src/domain/consumer-payment-providers.js';

const valid = () => ({
  subjectId: 'learner-1',
  at: '2026-10-16T08:00:00Z',
  offer: {
    offer_id: 'pro-month-2026', plan: 'pro', status: 'approved',
    merchant_approval_ref: 'owner-price-v1', amount_minor: 49900, currency: 'INR'
  },
  subscription: {
    subscription_id: 'db-sub-1', provider: 'cashfree', environment: 'production',
    subject_id: 'learner-1', offer_id: 'pro-month-2026',
    provider_subscription_id: 'cf-sub-1', lifecycle_status: 'active',
    authorization_status: 'active', cancelled_at: null,
    starts_at: '2026-10-01T00:00:00Z', current_period_end: '2026-11-01T00:00:00Z'
  },
  payment: {
    payment_id: 'db-pay-1', provider_payment_id: 'cf-pay-1',
    environment: 'production', subscription_id: 'db-sub-1',
    payment_status: 'success', amount_minor: 49900, currency: 'INR',
    provider_verified_at: '2026-10-16T07:59:00Z', reversed_at: null
  },
  providerObservation: {
    source: 'server_fetched_cashfree', environment: 'production',
    provider_subscription_id: 'cf-sub-1', provider_payment_id: 'cf-pay-1',
    payment_status: 'SUCCESS', amount_minor: 49900, currency: 'INR',
    fetched_at: '2026-10-16T07:59:00Z'
  }
});
test('pure reconciler preflight requires a matching, recent production payment observation',()=>{
  const record = evaluateVerifiedConsumerTerm(valid());
  assert.deepEqual(record, {
    eligible: true, plan: 'pro', subjectId: 'learner-1', paymentId: 'db-pay-1',
    startsAt: '2026-10-01T00:00:00Z', endsAt: '2026-11-01T00:00:00Z'
  });
  assert.equal(Object.isFrozen(record),true);
  // Domain receipt does not write a server grant or enable premium release.
  assert.equal(resolveConsumerAccess().plan, 'free');
  assert.equal(CONSUMER_PAYMENT_PROVIDER_POLICY.productionCheckoutEnabled,false);
});
test('deny all cases without a valid and matching paid term',()=>{
 const baseline=valid();
 const denials=[
  { subjectId:'different' },
  { subscription:{...baseline.subscription,environment:'sandbox'} },
  { payment:{...baseline.payment,environment:'sandbox'} },
  { providerObservation:{...baseline.providerObservation,environment:'sandbox'} },
  { offer:{...baseline.offer,status:'draft'} },
  { offer:{...baseline.offer,merchant_approval_ref:null} },
  { offer:{...baseline.offer,plan:'institution'} },
  { offer:{...baseline.offer,currency:'USD'} },
  { subscription:{...baseline.subscription,subject_id:'other'} },
  { subscription:{...baseline.subscription,offer_id:'another'} },
  { subscription:{...baseline.subscription,provider_subscription_id:'fake'} },
  { subscription:{...baseline.subscription,provider:'phonepe'} },
  { subscription:{...baseline.subscription,lifecycle_status:'on_hold'} },
  { subscription:{...baseline.subscription,authorization_status:'pending'} },
  { subscription:{...baseline.subscription,cancelled_at:'2026-10-10T00:00:00Z'} },
  { payment:{...baseline.payment,subscription_id:'other'} },
  { payment:{...baseline.payment,payment_status:'pending'} },
  { payment:{...baseline.payment,payment_status:'refunded'} },
  { payment:{...baseline.payment,amount_minor:1} },
  { payment:{...baseline.payment,provider_payment_id:'other'} },
  { payment:{...baseline.payment,provider_verified_at:null} },
  { payment:{...baseline.payment,reversed_at:'2026-10-16T06:00:00Z'} },
  { providerObservation:{...baseline.providerObservation,source:'browser_redirect'} },
  { providerObservation:{...baseline.providerObservation,provider_subscription_id:'other'} },
  { providerObservation:{...baseline.providerObservation,provider_payment_id:'other'} },
  { providerObservation:{...baseline.providerObservation,payment_status:'PENDING'} },
  { providerObservation:{...baseline.providerObservation,amount_minor:49901} },
  { providerObservation:{...baseline.providerObservation,fetched_at:'2026-10-14T07:00:00Z'} },
  { subscription:{...baseline.subscription,current_period_end:'2026-10-16T08:00:00Z'} },
  { at:'invalid-time' }
 ];
 for(const changes of denials) {
   const result=evaluateVerifiedConsumerTerm({...baseline,...changes});
   assert.equal(result.eligible,false,JSON.stringify(changes));
 }
});
test('private schema stays deny-by-default; cannot create plans or paid grants as browser user', async()=>{
 const sql=await readFile(new URL('../supabase/migrations/20261016120000_consumer_billing_foundation.sql',import.meta.url),'utf8');
 const tables=['consumer_billing_offers','consumer_billing_subscriptions','consumer_billing_payments','consumer_billing_webhook_inbox','consumer_billing_grants'];
 for(const name of tables) {
   assert.match(sql,new RegExp('create table if not exists public\\.'+name));
   assert.match(sql,new RegExp('alter table public\\.'+name+' enable row level security'));
   assert.match(sql,new RegExp('revoke all on public\\.'+name+' from public, anon, authenticated'));
   assert.doesNotMatch(sql,new RegExp('create policy .*'+name,'i'));
 }
 assert.match(sql,/status text not null default 'draft'/);
 assert.match(sql,/unique \(environment, provider_payment_id\)/);
 assert.match(sql,/unique \(environment, provider_subscription_id\)/);
 assert.match(sql,/foreign key \(subscription_id, environment\)/);
 assert.match(sql,/foreign key \(subscription_id, environment, subject_id\)/);
 assert.match(sql,/foreign key \(payment_id, environment, subscription_id\)/);
 assert.doesNotMatch(sql,/insert into public\.consumer_billing_/i);
 assert.doesNotMatch(sql,/grant (select|insert|update|delete) on .* to (anon|authenticated)/i);
});
