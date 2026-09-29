import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';

const RETURN_KEY = 'mlos-oauth-consent-return-v1';
const MAX_RETURN_AGE_MS = 10 * 60 * 1000;
const root = document.querySelector('#oauth-app');
const notice = document.querySelector('#notice');
const auth = createSupabaseAuth({ ...cloudConfig, storage: localStorage });

let state = { authorizationId: null, details: null, loading: true, error: null, deciding: false };

function text(value) { return String(value ?? ''); }
function announce(message) {
  notice.textContent = message;
  notice.hidden = false;
}
function reportUnexpected(error, operation) {
  const status = Number(error?.status || 0);
  if (!status || status >= 500) {
    errorMonitor.capture(error, { component: 'oauth-consent', operation, code: error?.code || null, status: status || null });
  }
}
function validAuthorizationId(value) {
  return /^[A-Za-z0-9_-]{1,200}$/.test(String(value || ''));
}
function saveReturn(id) {
  sessionStorage.setItem(RETURN_KEY, JSON.stringify({
    path: '/oauth/consent?authorization_id=' + encodeURIComponent(id),
    createdAt: Date.now()
  }));
}
function redirectToClient(url) {
  let parsed;
  try { parsed = new URL(String(url)); } catch { throw new Error('invalid_oauth_redirect_url'); }
  const local = ['127.0.0.1', 'localhost'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) throw new Error('invalid_oauth_redirect_url');
  location.assign(parsed.href);
}
function renderScopes(scope) {
  const scopes = text(scope).split(/\s+/).filter(Boolean);
  if (!scopes.length) return '<span class="badge">No profile scope requested</span>';
  return scopes.map(item => '<span class="badge" data-scope></span>').join(' ');
}
function render() {
  if (state.loading) {
    root.innerHTML = '<main id="main" class="account-page"><div class="page-heading"><div><span class="eyebrow">MEDICAL LEARNING OS · AUTHORIZATION</span><h1>Checking connection request…</h1><p>Verifying the requesting application and your current MLOS session.</p></div></div><section class="panel"><p>Loading secure authorization details…</p></section></main>';
    return;
  }
  if (state.error) {
    root.innerHTML = '<main id="main" class="account-page"><div class="page-heading"><div><span class="eyebrow">MEDICAL LEARNING OS · AUTHORIZATION</span><h1>This request cannot be authorized.</h1><p id="oauth-error"></p></div></div><section class="panel"><p>No access was granted. You can close this page or return to Medical Learning OS.</p><a class="secondary action-link" href="/">Return home →</a></section></main>';
    document.querySelector('#oauth-error').textContent = state.error;
    return;
  }

  const d = state.details || {};
  const clientName = d.client?.name || 'External application';
  const account = d.user?.email || auth.currentUser()?.email || 'your MLOS account';
  root.innerHTML = '<main id="main" class="account-page">' +
    '<div class="page-heading"><div><span class="eyebrow">MEDICAL LEARNING OS · AUTHORIZATION</span><h1 id="oauth-client-name"></h1><p>Review exactly what is being requested before connecting.</p></div><span class="badge">OAUTH 2.1</span></div>' +
    '<section class="panel"><span class="eyebrow">REQUESTING APP</span><h2 id="oauth-client"></h2><p>Signed in as <strong id="oauth-account"></strong>.</p><div id="oauth-scopes">' + renderScopes(d.scope) + '</div></section>' +
    '<section class="panel"><span class="eyebrow">AUTHORITY BOUNDARY</span><h2>Connecting does not grant admin powers by itself.</h2><p>The app receives an authenticated MLOS token only for the scopes shown above. Medical Learning OS still checks server-side content-admin and reviewer authority on every admin request. No service-role credential is shared.</p></section>' +
    '<section class="panel"><div class="button-row"><button class="primary" data-action="approve"' + (state.deciding ? ' disabled' : '') + '>Allow connection</button><button class="secondary" data-action="deny"' + (state.deciding ? ' disabled' : '') + '>Deny</button></div><p class="muted">Medical-content approval, Rights decisions, publication, and learner controls remain separate MLOS permissions.</p></section>' +
    '</main>';
  document.querySelector('#oauth-client-name').textContent = 'Connect ' + clientName + '?';
  document.querySelector('#oauth-client').textContent = clientName;
  document.querySelector('#oauth-account').textContent = account;
  document.querySelectorAll('[data-scope]').forEach((node, index) => {
    node.textContent = text(d.scope).split(/\s+/).filter(Boolean)[index] || '';
  });
}

async function bootstrap() {
  const id = new URLSearchParams(location.search).get('authorization_id');
  if (!validAuthorizationId(id)) {
    state = { ...state, loading: false, error: 'The authorization request is missing or malformed.' };
    render();
    return;
  }
  state.authorizationId = id;

  let session = null;
  try { session = await auth.getSession(); }
  catch (error) { reportUnexpected(error, 'refresh_session'); }
  if (!session?.accessToken) {
    saveReturn(id);
    location.replace('/web/account.html');
    return;
  }

  try {
    const details = await auth.oauthAuthorizationDetails(id);
    if (details.redirectUrl) {
      sessionStorage.removeItem(RETURN_KEY);
      redirectToClient(details.redirectUrl);
      return;
    }
    state = { ...state, details, loading: false, error: null };
  } catch (error) {
    if (Number(error?.status || 0) === 401) {
      saveReturn(id);
      location.replace('/web/account.html');
      return;
    }
    reportUnexpected(error, 'load_authorization');
    state = { ...state, loading: false, error: error?.code || error?.message || 'authorization_request_unavailable' };
  }
  render();
}

root.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || state.deciding || !state.authorizationId) return;
  const action = button.dataset.action;
  if (!['approve', 'deny'].includes(action)) return;
  state = { ...state, deciding: true };
  render();
  (async () => {
    try {
      const result = await auth.oauthAuthorizationDecision(state.authorizationId, action);
      sessionStorage.removeItem(RETURN_KEY);
      redirectToClient(result.redirectUrl);
    } catch (error) {
      reportUnexpected(error, 'authorization_decision');
      state = { ...state, deciding: false };
      render();
      announce('Authorization decision failed: ' + (error?.code || error?.message || 'authorization_failed') + '.');
    }
  })();
});

render();
bootstrap().catch(error => {
  reportUnexpected(error, 'bootstrap');
  state = { ...state, loading: false, error: error?.code || error?.message || 'authorization_unavailable' };
  render();
});

// Keep the key format intentionally simple so the Account page can resume only
// this exact, short-lived authorization path after sign-in.
export const oauthConsentReturnPolicy = Object.freeze({ key: RETURN_KEY, maxAgeMs: MAX_RETURN_AGE_MS });
