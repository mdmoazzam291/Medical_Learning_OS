import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudRetentionProbe } from '/src/adapters/cloud-retention-probe.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';

const root = document.querySelector('#retention-origin-app');
const notice = document.querySelector('#notice');
const auth = createSupabaseAuth({ ...cloudConfig });
const probe = createCloudRetentionProbe({ ...cloudConfig, auth });
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

let state = { user:auth.currentUser(), loading:false, busy:false, readiness:null, error:null };

function announce(message) {
  notice.textContent = message;
  notice.hidden = false;
}

function reportUnexpected(error, operation) {
  const status = Number(error?.status || 0);
  if (!status || status >= 500) errorMonitor.capture(error, { component:'retention-origin', operation, code:error?.code || null, status:status || null });
}

function blockedMessage(reasons) {
  const set = new Set(Array.isArray(reasons) ? reasons : []);
  if (set.has('due-or-mistake-repair-work-takes-priority')) return 'Due revision or mistake repair currently has priority. Finish that work first.';
  if (set.has('open-study-session-takes-priority')) return 'An existing study session has priority. Resume or finish it first.';
  if (set.has('alternate-target-already-seen')) return 'This pilot pair is no longer clean for delayed alternate-item measurement.';
  if (set.has('active-authorization-required')) return 'No active bounded pilot authorization is available.';
  if (set.has('learner-not-currently-opted-in')) return 'This learner is not currently opted in to the retention feasibility pilot.';
  return 'The optional setup is not available right now.';
}

function signedOutView() {
  return `<main id="main" class="account-page"><a class="text-button" href="/web/retention.html">← Retention</a><div class="page-heading"><div><span class="eyebrow">RETENTION PILOT SETUP</span><h1>Sign in to check pilot setup.</h1><p>No study session is created by opening this page.</p></div></div><section class="panel"><a class="primary action-link" href="/web/account.html">Open account →</a></section></main>`;
}

function loadingView() {
  return '<main id="main" class="account-page"><a class="text-button" href="/web/retention.html">← Retention</a><section class="panel"><p>Checking optional pilot setup…</p></section></main>';
}

function availableView() {
  return `<main id="main" class="account-page"><a class="text-button" href="/web/retention.html">← Retention</a><div class="page-heading"><div><span class="eyebrow">OPTIONAL · 1 QUESTION</span><h1>A pilot setup question is available.</h1><p>Starting is your choice. Opening this page has not created a session, exposed the delayed target, or recorded an attempt.</p></div><span class="badge">READY</span></div><section class="panel"><h2>What happens</h2><p>You will enter the ordinary Study screen with one previously studied question. Your answer is recorded through the normal canonical learning ledger. The fresh delayed target remains hidden.</p><button class="primary" data-action="start-origin" ${state.busy ? 'disabled' : ''}>${state.busy ? 'Opening…' : 'Start setup question →'}</button><p class="muted">Due revision, mistake repair and existing sessions always take priority.</p></section></main>`;
}

function waitingView() {
  const open = state.readiness?.windowOpenAt ? new Date(state.readiness.windowOpenAt).toLocaleString() : null;
  const close = state.readiness?.windowCloseAt ? new Date(state.readiness.windowCloseAt).toLocaleString() : null;
  return `<main id="main" class="account-page"><a class="text-button" href="/web/retention.html">← Retention</a><div class="page-heading"><div><span class="eyebrow">RETENTION PILOT SETUP</span><h1>Setup response recorded.</h1><p>The fresh delayed target is still unseen. No additional setup attempt is needed now.</p></div><span class="badge">WAITING</span></div><section class="panel"><h2>Delayed window</h2>${open ? `<p><strong>Opens:</strong> ${escape(open)}</p>` : ''}${close ? `<p><strong>Closes:</strong> ${escape(close)}</p>` : ''}<p class="muted">This is descriptive feasibility research only. It does not create a mastery or forgetting score.</p><p><a class="primary action-link" href="/">Study Now →</a></p></section></main>`;
}

function blockedView() {
  return `<main id="main" class="account-page"><a class="text-button" href="/web/retention.html">← Retention</a><div class="page-heading"><div><span class="eyebrow">RETENTION PILOT SETUP</span><h1>Setup is not available right now.</h1><p>${escape(blockedMessage(state.readiness?.blockingReasons))}</p></div><span class="badge">NO ACTION</span></div><section class="panel"><p>No research attempt or delayed-target exposure was created by checking this page.</p><p><a class="primary action-link" href="/">Study Now →</a></p></section></main>`;
}

function errorView() {
  return `<main id="main" class="account-page"><a class="text-button" href="/web/retention.html">← Retention</a><div class="page-heading"><div><span class="eyebrow">RETENTION PILOT SETUP</span><h1>Setup check unavailable.</h1><p>${escape(state.error || 'retention_origin_unavailable')}</p></div></div><section class="panel"><button class="secondary" data-action="reload">Retry</button></section></main>`;
}

function render() {
  if (!state.user) root.innerHTML = signedOutView();
  else if (state.error) root.innerHTML = errorView();
  else if (state.loading || !state.readiness) root.innerHTML = loadingView();
  else if (state.readiness.state === 'origin_available') root.innerHTML = availableView();
  else if (state.readiness.state === 'waiting') root.innerHTML = waitingView();
  else root.innerHTML = blockedView();
}

function originSessionId() {
  const key = 'mlos-retention-origin-session-v1';
  let value = sessionStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    sessionStorage.setItem(key, value);
  }
  return value;
}

async function loadReadiness() {
  state = { ...state, loading:true, error:null };
  render();
  try {
    const session = await auth.getSession();
    if (!session?.user) {
      state = { ...state, user:null, loading:false, readiness:null };
      render();
      return;
    }
    const readiness = await probe.origin();
    state = { ...state, user:auth.currentUser() || session.user, loading:false, readiness, error:null };
  } catch (error) {
    reportUnexpected(error, 'load_origin_readiness');
    if (Number(error?.status) === 401) state = { ...state, user:null, loading:false, readiness:null, error:null };
    else state = { ...state, loading:false, error:error?.code || error?.message || 'retention_origin_unavailable' };
  }
  render();
}

async function startOrigin() {
  if (state.readiness?.state !== 'origin_available' || state.busy) return;
  state = { ...state, busy:true };
  render();
  try {
    const receipt = await probe.startOrigin({ sessionId:originSessionId() });
    if (receipt?.state !== 'origin_started' || !receipt?.sessionId) throw new Error('retention_origin_session_not_started');
    location.assign('/web/medical.html?source=retention-origin');
  } catch (error) {
    reportUnexpected(error, 'start_origin');
    state = { ...state, busy:false };
    announce(`Setup question did not start: ${error?.code || error?.message || 'retention_origin_start_failed'}.`);
    await loadReadiness();
  }
}

root.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  event.preventDefault();
  if (target.dataset.action === 'reload') loadReadiness();
  if (target.dataset.action === 'start-origin') startOrigin();
});

render();
loadReadiness();
