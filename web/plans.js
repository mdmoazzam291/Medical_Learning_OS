import { proposedConsumerPrice } from '/src/domain/consumer-entitlements.js';
const periods = Object.freeze({ month: ' /month', quarter: ' /3 months', year: ' /year' });
function render(interval) {
  if (!Object.hasOwn(periods, interval)) return;
  for (const plan of ['free', 'pro', 'ai_pro']) {
    const price = proposedConsumerPrice(plan, interval);
    const amount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price.amountMinor / 100);
    document.querySelector('[data-price-for="' + plan + '"]').textContent = amount;
    document.querySelector('[data-price-period="' + plan + '"]').textContent = plan === 'free' ? ' forever' : periods[interval];
  }
}
const options = document.querySelector('.plans-interval');
options?.addEventListener('change', event => {
  if (event.target instanceof HTMLInputElement && event.target.name === 'interval') render(event.target.value);
});
render(options?.querySelector('input:checked')?.value || 'year');
// Display-only: no checkout, pricing API request, payment callback or browser entitlement writes.
