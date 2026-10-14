// Consumer billing provider selection only. Not an authorization or payment runtime.
// Entire strategy is disabled until authenticated billing and explicit owner go-live.
export const CONSUMER_PAYMENT_PROVIDER_POLICY = Object.freeze({
  version: '2026-10-14-v2',
  primary: 'cashfree',
  alternative: 'phonepe',
  productionCheckoutEnabled: false,
  recurringBillingEnabled: false,
  automaticFailoverEnabled: false,
  providers: Object.freeze({
    cashfree: Object.freeze({ role: 'primary', integration: 'sandbox_adapter_only' }),
    phonepe: Object.freeze({ role: 'alternative', integration: 'design_only' })
  })
});

export function consumerPaymentRoute() {
  // A successful payment or learner-facing route MUST be implemented by a
  // separate trusted service, not by changing this constant or client state.
  return Object.freeze({ enabled: false, provider: null, reason: 'consumer_checkout_not_released' });
}
