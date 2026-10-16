import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCashfreeProductionHostedSession, fetchCashfreeProductionSubscription } from '../src/adapters/cashfree-production.js';
import { publicFileSet } from '../scripts/public-surface.js';
import { resolveConsumerAccess } from '../src/domain/consumer-entitlements.js';

const offer=()=>({
 offer_id:'pro_month_v1', plan:'pro', price_version:'2026-10-16-v1',
 status:'approved', merchant_approval_ref:'merchant-owner-signoff', amount_minor:49900,
 currency:'INR', billing_interval:'month'
});
const res=()=>({
 lifecycle_status:'created', subject_id:'trusted-learner-uuid',
 offer_id:'pro_month_v1', environment:'production',
 idempotency_key:'f5a9d6e1-e209-4726-9ce4-b838e20c9f49',
 provider_subscription_id:'mlos_live_101',
 terms_version:'2026-10-16-v1', consent_recorded_at:'2026-10-16T00:00:00Z',
 offer_price_version:'2026-10-16-v1', approved_amount_minor:49900
});
const input=(patch={})=>({
 authenticatedSubjectId:'trusted-learner-uuid',
 offer:offer(), reservation:res(),
 customerDetails:{customer_name:'Testing Learner',customer_email:'test@example.invalid',customer_phone:'9999999999'},
 returnUrl:'https://checkout.medical.example/subscription-return',
 ...patch
});
const cfg=(fetchImpl,patch={})=>({
 environment:'production', merchantProductionApproved:true,
 billingLedgerReady:true, liveReadEnabled:true,
 liveCheckoutEnabled:true,productionOffersApproved:true,
 reconciliationReady:true,explicitChargeLaunchApproved:true,
 clientId:'fictional-production-id', clientSecret:'fictional-production-secret',
 allowedReturnOrigin:'https://checkout.medical.example',fetchImpl,...patch
});
test('production hosted checkout builds exact trusted price and fixed destination, without issuing grant',async()=>{
 let calls=0;
 const out=await createCashfreeProductionHostedSession(input(),cfg(async(url,init)=>{
   calls++;
   assert.equal(url,'https://api.cashfree.com/pg/subscriptions');
   assert.equal(init.method,'POST');
   assert.equal(init.redirect,'manual');
   assert.equal(init.headers['x-api-version'],'2025-01-01');
   assert.equal(init.headers['x-idempotency-key'],res().idempotency_key);
   const sent=JSON.parse(init.body);
   assert.equal(sent.subscription_id,'mlos_live_101');
   assert.equal(sent.plan_details.plan_amount,499);
   assert.equal(sent.plan_details.plan_max_amount,499);
   assert.equal(sent.plan_details.plan_intervals,1);
   assert.equal(sent.plan_details.plan_max_cycles,60);
   assert.equal(sent.subscription_meta.return_url,'https://checkout.medical.example/subscription-return');
   assert.equal(sent.authorization_details.payment_methods.includes('upi'),true);
   return {status:200, async json(){return {subscription_id:'mlos_live_101',subscription_session_id:'fictional-session',subscription_status:'INITIALIZED'}}};
 }));
 assert.equal(calls,1);
 assert.deepEqual(out,{provider:'cashfree',environment:'production',subscriptionId:'mlos_live_101',
   subscriptionSessionId:'fictional-session',status:'authorization_pending',entitlementGranted:false});
 assert.equal(resolveConsumerAccess().plan,'free');
});
test('all live permission checks fail closed and issue no POST',async()=>{
 let calls=0;
 const noFetch=()=>{calls++;throw Error('should not call')};
 for(const [flag,v] of [
  ['environment','sandbox'],['merchantProductionApproved',false],['billingLedgerReady',false],
  ['liveReadEnabled',false],['liveCheckoutEnabled',false],['productionOffersApproved',false],
  ['reconciliationReady',false],['explicitChargeLaunchApproved',false],
  ['clientId',''],['clientSecret','']]){
  await assert.rejects(createCashfreeProductionHostedSession(input(),cfg(noFetch,{[flag]:v})));
 }
 assert.equal(calls,0);
});
test('reject unapproved, tampered or unconsented reservation without any network',async()=>{
 let calls=0;
 const transport=()=>{calls++;throw Error('never');};
 const baseline=input();
 const bad=[
  {offer:{...baseline.offer,status:'draft'}},
  {offer:{...baseline.offer,amount_minor:0}},
  {offer:{...baseline.offer,plan:'institution'}},
  {offer:{...baseline.offer,merchant_approval_ref:null}},
  {reservation:{...baseline.reservation,lifecycle_status:'authorization_pending'}},
  {reservation:{...baseline.reservation,environment:'sandbox'}},
  {reservation:{...baseline.reservation,subject_id:'attacker'}},
  {reservation:{...baseline.reservation,offer_id:'ai_pro'}},
  {reservation:{...baseline.reservation,idempotency_key:'bad'}},
  {reservation:{...baseline.reservation,approved_amount_minor:50000}},
  {reservation:{...baseline.reservation,offer_price_version:'old_version'}},
  {reservation:{...baseline.reservation,terms_version:''}},
  {reservation:{...baseline.reservation,consent_recorded_at:null}},
  {returnUrl:'https://attacker.example/return'},
  {returnUrl:'http://checkout.medical.example/return'},
  {customerDetails:{...baseline.customerDetails,customer_email:'not_an_email'}}
 ];
 for(const patch of bad){
  await assert.rejects(createCashfreeProductionHostedSession(input(patch),cfg(transport)),JSON.stringify(patch));
 }
 assert.equal(calls,0);
});
test('redirects, provider errors, and missing session stay inert, no automatic retry',async()=>{
 let calls=0;
 for(const response of [
  {status:302}, {status:401}, {status:500},
  {status:200,async json(){return {subscription_id:'mlos_live_101'}}},
  {status:200,async json(){return {subscription_id:'wrong',subscription_session_id:'xyz'}}}
 ]){
   await assert.rejects(createCashfreeProductionHostedSession(input(),cfg(async()=>{
     calls++;return response;
   })));
 }
 assert.equal(calls,5);
});
test('production GET is read-only and never authorizes access',async()=>{
 const c=cfg(async(url,init)=>{
  assert.equal(url,'https://api.cashfree.com/pg/subscriptions/mlos_live_101');
  assert.equal(init.method,'GET');
  assert.equal(init.redirect,'manual');
  return {status:200,async json(){return {
    subscription_id:'mlos_live_101',subscription_status:'ACTIVE',
    authorization_details:{authorization_status:'ACTIVE'}
  }}};
 },{liveCheckoutEnabled:false,explicitChargeLaunchApproved:false});
 const o=await fetchCashfreeProductionSubscription('mlos_live_101',c);
 assert.equal(o.status,'ACTIVE');
 assert.equal(o.entitlementGranted,false);
 assert.equal(resolveConsumerAccess().plan,'free');
 await assert.rejects(fetchCashfreeProductionSubscription('../escape',c));
});
test('second migration locks consumer reservation and keeps account browser banned',async()=>{
 const sql=await readFile(new URL('../supabase/migrations/20261016130000_consumer_billing_reservations.sql',import.meta.url),'utf8');
 assert.match(sql,/add column if not exists idempotency_key uuid/);
 assert.match(sql,/create unique index if not exists consumer_billing_subscriptions_idempotency/);
 assert.match(sql,/consent_recorded_at timestamptz/);
 assert.match(sql,/approved_amount_minor integer/);
 assert.match(sql,/revoke all on public\.consumer_billing_subscriptions from public, anon, authenticated/);
 assert.doesNotMatch(sql,/create policy|grant .* to authenticated|drop table|truncate/i);
 assert.equal(publicFileSet.has('src/adapters/cashfree-production.js'),false);
 assert.equal(publicFileSet.has('src/adapters/cashfree-test.js'),false);
});
