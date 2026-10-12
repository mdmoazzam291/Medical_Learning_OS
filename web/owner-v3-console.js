import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';

const app = document.querySelector('#admin-app');
const auth = createSupabaseAuth({ ...cloudConfig });
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function request(path, { method = 'GET', body } = {}) {
  const session = await auth.getSession();
  if (!session?.accessToken) throw Object.assign(new Error('not_authenticated'), { status: 401 });
  const response = await fetch(`${cloudConfig.projectUrl}/functions/v1/owner-api${path}`, {
    method,
    headers: {
      apikey: cloudConfig.publishableKey,
      Authorization: `Bearer ${session.accessToken}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  let payload = null;
  try { payload = await response.json(); } catch {}
  if (!response.ok) throw Object.assign(new Error(payload?.error || 'owner_v3_request_failed'), { status: response.status, code: payload?.error });
  return payload;
}

function dateTime(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function flagsMarkup(payload) {
  const flags = Array.isArray(payload?.flags) ? payload.flags : [];
  if (!flags.length) return '<p class="muted">No feature gates are registered.</p>';
  return `<div class="owner-v3-flags">${flags.map(flag => `<form class="owner-action-form owner-v3-feature-form" data-owner-v3-feature-form>
    <div><strong>${escape(flag.featureKey)}</strong><span class="badge">${escape(String(flag.audience || '').toUpperCase())}</span></div>
    <p class="muted">${escape(flag.description || '')}<br>${escape(flag.mappedSurface || '')}</p>
    <input type="hidden" name="featureKey" value="${escape(flag.featureKey)}">
    <label>Audience<select name="audience" required>
      <option value="all" ${flag.audience === 'all' ? 'selected' : ''}>All learners</option>
      <option value="beta" ${flag.audience === 'beta' ? 'selected' : ''}>Beta learners only</option>
      <option value="off" ${flag.audience === 'off' ? 'selected' : ''}>Off</option>
    </select></label>
    <label>Reason<textarea name="reason" minlength="10" maxlength="1000" required placeholder="Why should this audience change?"></textarea></label>
    <label>Type <strong>SET FEATURE AUDIENCE</strong> to confirm<input name="confirmation" autocomplete="off" required></label>
    <button class="secondary" type="submit">Apply audience</button>
  </form>`).join('')}</div>`;
}

function alertsMarkup(payload) {
  const alerts = Array.isArray(payload?.alerts) ? payload.alerts.filter(item => item?.state === 'open') : [];
  if (!alerts.length) return '<p class="muted">No open infrastructure alerts.</p>';
  return `<div class="owner-v3-alerts">${alerts.map(item => `<article class="review-packet">
    <div><span class="badge">${escape(String(item.severity || 'warning').toUpperCase())}</span> <strong>${escape(item.provider || 'provider')}</strong></div>
    <p>${escape(item.status || 'unknown')}</p>
    <small class="muted">First seen ${escape(dateTime(item.firstSeenAt))} · last seen ${escape(dateTime(item.lastSeenAt))}</small>
  </article>`).join('')}</div>`;
}

// These are independent Admin destinations. A problem with one owner API
// must not hide the other destination or turn unknown status into "No alerts".
async function mount() {
  const container = app?.querySelector('#owner-console');
  if (!container) return;
  const ai = app.querySelector('#owner-ai');
  const infra = app.querySelector('#owner-infrastructure');
  if (!ai || !infra || app.querySelector('#owner-features') ||
    app.querySelector('#owner-infrastructure-alerts')) return;
  // A stable DOM guard prevents duplicate loads, but a later admin re-render
  // replaces these nodes, so new panels must be allowed to mount again.

  const featureSection = document.createElement('section');
  featureSection.id = 'owner-features';
  featureSection.className = 'panel';
  featureSection.innerHTML = '<div class="section-heading"><div><span class="eyebrow">FEATURE ENTITLEMENTS</span><h2>Controlled beta exposure</h2><p>Server-enforced audiences: all learners, active beta learners only, or off. Beta access never grants content-review authority.</p></div><span class="badge">SERVER GATED</span></div><div id="owner-features-state" aria-live="polite"><p class="muted">Loading feature gates…</p></div>';
  ai.before(featureSection);

  const alertBlock = document.createElement('div');
  alertBlock.className = 'owner-status-block';
  alertBlock.id = 'owner-infrastructure-alerts';
  alertBlock.innerHTML = '<strong>Open infrastructure alerts</strong><div id="owner-alerts-state" aria-live="polite"><p class="muted">Loading infrastructure alerts…</p></div>';
  infra.append(alertBlock);

  // Hash routes must exist even during an outage.
  window.dispatchEvent(new CustomEvent('mlos:admin-ready'));

  const [features, alerts] = await Promise.allSettled([
    request('/feature-flags'),
    request('/infrastructure-alerts')
  ]);
  if (app.querySelector('#owner-console') !== container) return;

  if (features.status === 'fulfilled' && Array.isArray(features.value?.flags)) {
    featureSection.querySelector('#owner-features-state').innerHTML = flagsMarkup(features.value);
  } else {
    featureSection.querySelector('#owner-features-state').innerHTML =
      '<p class="muted" role="status">Feature gates unavailable. Current audiences were not verified; no changes can be applied here. Reload to retry.</p>';
    const error = features.status === 'rejected' ? features.reason : new Error('owner_feature_flags_invalid_payload');
    if (![401, 403].includes(Number(error?.status || 0))) {
      errorMonitor.capture(error, { component: 'owner-v3-console', operation: 'load_feature_flags', code: error?.code || null });
    }
  }

  if (alerts.status === 'fulfilled' && Array.isArray(alerts.value?.alerts)) {
    alertBlock.querySelector('#owner-alerts-state').innerHTML = alertsMarkup(alerts.value);
  } else {
    alertBlock.querySelector('#owner-alerts-state').innerHTML =
      '<p class="muted" role="status">Infrastructure alerts unavailable. This is not evidence of zero open alerts. Reload to retry.</p>';
    const error = alerts.status === 'rejected' ? alerts.reason : new Error('owner_infrastructure_alerts_invalid_payload');
    if (![401, 403].includes(Number(error?.status || 0))) {
      errorMonitor.capture(error, { component: 'owner-v3-console', operation: 'load_infrastructure_alerts', code: error?.code || null });
    }
  }
  window.dispatchEvent(new CustomEvent('mlos:owner-alerts', {
    detail: { alerts: alerts.status === 'fulfilled' && Array.isArray(alerts.value?.alerts) ? alerts.value.alerts : null }
  }));
  window.dispatchEvent(new CustomEvent('mlos:admin-ready', { detail: { layoutChanged: true } }));
}

app?.addEventListener('submit', event => {
  const form = event.target.closest('[data-owner-v3-feature-form]');
  if (!form) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form).entries());
  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  (async () => {
    try {
      await request('/feature-flags', {
        method: 'POST',
        body: {
          featureKey: String(values.featureKey || ''),
          audience: String(values.audience || ''),
          reason: String(values.reason || ''),
          confirmation: String(values.confirmation || ''),
          requestId: crypto.randomUUID()
        }
      });
      location.reload();
    } catch (error) {
      const notice = document.querySelector('#notice');
      if (notice) {
        notice.textContent = 'Feature audience change was not applied. Check the reason and exact confirmation phrase.';
        notice.hidden = false;
      }
      if (Number(error?.status || 0) >= 500) errorMonitor.capture(error, { component: 'owner-v3-console', operation: 'set_feature_flag', code: error?.code || null });
      if (button) button.disabled = false;
    }
  })();
});

if (app) {
  const observer = new MutationObserver(() => queueMicrotask(mount));
  observer.observe(app, { childList: true, subtree: true });
  mount();
}
