import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudStudy } from '/src/adapters/cloud-study.js';
import { cloudConfig } from '/web/cloud-config.js';

const root = document.querySelector('#account-app');
const notice = document.querySelector('#notice');
const escape = text => String(text).replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
const auth = createSupabaseAuth({ ...cloudConfig, storage: localStorage });
const cloud = createCloudStudy({ ...cloudConfig, auth });
let state = { user: auth.currentUser(), loading: false, progress: null, questions: null, error: null };

function announce(message) { notice.textContent = message; notice.hidden = false; }

function signedOut() {
  return `<main id="main" class="account-page"><a class="text-button" href="/">← Back to local demo</a><div class="page-heading"><div><span class="eyebrow">CLOUD ACCOUNT</span><h1>Connect your learner identity.</h1><p>Supabase Auth owns account identity. Your local software demo stays separate from cloud learning evidence.</p></div><span class="badge">M04b</span></div><div class="two-column"><section class="panel"><h2>Sign in</h2><form id="signin-form"><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="8" maxlength="128" required></label><button class="primary" type="submit">Sign in</button></form></section><section class="panel"><h2>Create account</h2><p>Account creation can require email confirmation. During development, only a pre-authorized Supabase team address can receive the built-in confirmation email; production SMTP remains deferred until a sending domain exists.</p><form id="signup-form"><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label><button class="secondary" type="submit">Create account</button></form></section></div><section class="panel"><span class="eyebrow">SECURITY BOUNDARY</span><h2>No operator credential in the browser.</h2><p>The browser stores only the learner session. Answer keys and trusted scoring stay behind the authenticated study API.</p></section></main>`;
}

function signedIn() {
  const p = state.progress;
  const count = state.questions?.length ?? 0;
  const body = state.loading ? '<p>Checking the authenticated study service…</p>' : state.error ? `<p>Cloud check failed: <strong>${escape(state.error)}</strong></p>` : `<div class="metrics"><div><strong>${p?.attempts ?? 0}</strong><span>Server attempts</span></div><div><strong>${p?.correct ?? 0}</strong><span>Correct</span></div><div><strong>${count}</strong><span>Published questions</span></div></div>`;
  return `<main id="main" class="account-page"><a class="text-button" href="/">← Back to local demo</a><div class="page-heading"><div><span class="eyebrow">CLOUD ACCOUNT</span><h1>Your learner identity is connected.</h1><p>${escape(state.user?.email || 'Authenticated learner')} · Supabase Auth</p></div><button class="secondary" data-action="signout">Sign out</button></div><section class="panel"><div class="section-heading"><h2>Cloud study record</h2><button class="text-button" data-action="refresh" ${state.loading ? 'disabled' : ''}>${state.loading ? 'Refreshing…' : 'Refresh'}</button></div>${body}<p class="muted">Cloud evidence is separate from the three-question local demo. With zero published questions, the medical study loop remains closed instead of serving unreviewed content.</p></section><section class="panel"><span class="eyebrow">CONTENT GATE</span><h2>Account path connected. Medical publishing still waits for review.</h2><p>M04c will add authenticated reviewers and a genuinely reviewed initial medical set before the cloud QBank opens.</p></section></main>`;
}

function render() { root.innerHTML = state.user ? signedIn() : signedOut(); }

async function loadCloud() {
  const session = await auth.getSession();
  if (!session?.user) { state = { user: null, loading: false, progress: null, questions: null, error: null }; render(); return; }
  state = { ...state, user: session.user, loading: true, error: null }; render();
  try {
    const [progress, result] = await Promise.all([cloud.progress(), cloud.questions('all')]);
    state = { user: auth.currentUser() || session.user, loading: false, progress, questions: result.questions || [], error: null };
  } catch (error) {
    state = { ...state, loading: false, error: error.code || error.message || 'cloud_unavailable' };
  }
  render();
}

root.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  event.preventDefault();
  if (target.dataset.action === 'refresh') loadCloud();
  if (target.dataset.action === 'signout') {
    (async () => { try { await auth.signOut(); } catch {} state = { user: null, loading: false, progress: null, questions: null, error: null }; announce('Signed out. Local demo data was not changed.'); render(); })();
  }
});

root.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  if (form.id === 'signin-form') {
    (async () => {
      try { await auth.signIn(data.get('email'), data.get('password')); state.user = auth.currentUser(); await loadCloud(); announce('Signed in to your cloud learner account.'); }
      catch (error) { announce(`Sign in failed: ${error.code || error.message || 'authentication_failed'}.`); }
    })();
  }
  if (form.id === 'signup-form') {
    (async () => {
      try {
        const emailRedirectTo = new URL('/web/account.html', window.location.origin).href;
        const result = await auth.signUp(data.get('email'), data.get('password'), { emailRedirectTo });
        state.user = auth.currentUser();
        if (result.session) { await loadCloud(); announce('Account created and signed in.'); }
        else announce('Account created. Check your email to confirm the address before signing in.');
      } catch (error) { announce(`Account creation failed: ${error.code || error.message || 'authentication_failed'}.`); }
    })();
  }
});

async function bootstrap() {
  try {
    const callback = await auth.consumeImplicitRedirect(window.location.href);
    if (callback.handled) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      state.user = auth.currentUser();
      announce('Email confirmed. Your cloud learner session is connected.');
    }
  } catch (error) {
    if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
    announce(`Email confirmation failed: ${error.code || error.message || 'authentication_failed'}.`);
  }
  if (state.user) await loadCloud();
  else render();
}

render();
bootstrap();
