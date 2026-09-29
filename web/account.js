import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudStudy } from '/src/adapters/cloud-study.js';
import { createCloudReview } from '/src/adapters/cloud-review.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';

const root = document.querySelector('#account-app');
const notice = document.querySelector('#notice');
const escape = text => String(text).replace(/[&<>\"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[c]));
const auth = createSupabaseAuth({ ...cloudConfig, storage: localStorage });
const cloud = createCloudStudy({ ...cloudConfig, auth });
const review = createCloudReview({ ...cloudConfig, auth });
let state = { user: auth.currentUser(), loading: false, progress: null, questions: null, retentionConsent: null, retentionSaving: false, isAdmin: false, reviewKinds: [], error: null };

function announce(message) { notice.textContent = message; notice.hidden = false; }
function reportUnexpected(error, operation) {
  const status = Number(error?.status || 0);
  if (!status || status >= 500) errorMonitor.capture(error, { component: 'account', operation, code: error?.code || null, status: status || null });
}

function signedOut() {
  const redirectTo = new URL('/web/account.html', window.location.origin).href;
  const googleUrl = auth.oauthAuthorizeUrl('google', { redirectTo });
  return `<main id="main" class="account-page"><a class="text-button" href="/">← Back to app</a><div class="page-heading"><div><span class="eyebrow">ACCOUNT</span><h1>Sign in to Medical Learning OS.</h1><p>Your authenticated identity connects Study Now, reviewed medical questions, exams and NeuralVault across sessions.</p></div><span class="badge">BETA</span></div><section class="panel"><span class="eyebrow">ONE EMAIL · ONE LEARNER ACCOUNT</span><h2>Use Google or a password. Your learner history stays attached to the same verified email.</h2><p>If Google and email/password use the same verified email address, Supabase links them to one user instead of creating a second learner profile.</p></section><div class="two-column"><section class="panel"><h2>Sign in</h2><a class="primary action-link oauth-google" href="${escape(googleUrl)}">Continue with Google</a><p class="auth-divider"><span>or use email</span></p><form id="signin-form"><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="8" maxlength="128" required></label><button class="secondary" type="submit">Sign in with email</button></form></section><section class="panel"><h2>Create learner account</h2><p>New email? Create it with a password. Already used Google with this email? Continue with Google first, then add password sign-in from Account. This avoids creating or guessing a second account.</p><form id="signup-form"><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label><button class="secondary" type="submit">Create email account</button></form></section></div><section class="panel"><span class="eyebrow">SECURITY</span><h2>Admin authority is never carried by learner-facing credentials or browser metadata.</h2><p>Content approval is checked server-side against the single beta content-admin account. Learner accounts can study, annotate and report issues, but cannot approve or publish content.</p></section></main>`;
}

function retentionPilotPanel() {
  const consent = state.retentionConsent;
  if (!consent) {
    return '<section class="panel"><span class="eyebrow">OPTIONAL LEARNING-MEASUREMENT PILOT</span><h2>Retention feasibility</h2><p class="muted">Consent status is unavailable right now. No probe can be scheduled from this screen.</p></section>';
  }

  const protocol = consent.protocol || {};
  const targetDays = Number(protocol.targetDays ?? 7);
  const windowStart = Number(protocol.windowStartDays ?? 6);
  const windowEnd = Number(protocol.windowEndDays ?? 8);
  const maxWeekly = Number(protocol.maxProbeAssignmentsPerLearnerPer7Days ?? 1);
  const maxTotal = Number(protocol.maxTotalAssignments ?? 20);
  const current = consent.optedIn === true;

  if (current) {
    return `<section class="panel"><div class="section-heading"><div><span class="eyebrow">OPTIONAL LEARNING-MEASUREMENT PILOT</span><h2>Retention feasibility: opted in</h2></div><span class="badge">OPTED IN</span></div><p>The preregistered feasibility protocol may later offer a different published question around day ${targetDays} (accepted window: day ${windowStart}–${windowEnd}) after eligible learning evidence.</p><p>Limits: at most ${maxWeekly} probe assignment per learner in any 7 days and at most ${maxTotal} assignments across this feasibility protocol. Probe work may not displace due revision or mistake-repair work.</p><p class="muted">Opt-in does not activate scheduling, change your score, or change mastery estimates. You can withdraw from future assignments.</p><button class="secondary" data-action="withdraw-retention" ${state.retentionSaving ? 'disabled' : ''}>${state.retentionSaving ? 'Saving…' : 'Withdraw from future retention probes'}</button></section>`;
  }

  return `<section class="panel"><div class="section-heading"><div><span class="eyebrow">OPTIONAL LEARNING-MEASUREMENT PILOT</span><h2>Help test whether learning survives delay.</h2></div><span class="badge">OPTIONAL</span></div><p>If you opt in, the preregistered feasibility protocol may later offer a different published question around day ${targetDays} (accepted window: day ${windowStart}–${windowEnd}) after eligible learning evidence.</p><p>Limits: at most ${maxWeekly} probe assignment per learner in any 7 days and at most ${maxTotal} assignments across this feasibility protocol. Probe work may not displace due revision or mistake-repair work.</p><p class="muted">This is an infrastructure feasibility pilot, not a mastery score or treatment-effect study. Opting in does not activate a probe by itself, and you may withdraw from future assignments.</p><form id="retention-optin-form"><label class="review-attestation"><input type="checkbox" name="attested" required> I choose to opt in to this optional retention-feasibility pilot under the protocol described above.</label><button class="secondary" type="submit" ${state.retentionSaving ? 'disabled' : ''}>${state.retentionSaving ? 'Saving…' : 'Opt in to retention feasibility'}</button></form></section>`;
}

function signInMethodsPanel() {
  const providers = new Set(Array.isArray(state.user?.providers) ? state.user.providers : []);
  const hasGoogle = providers.has('google');
  const hasPassword = providers.has('email');

  const badges = [
    hasGoogle ? '<span class="badge">Google connected</span>' : '<span class="badge">Google not yet used</span>',
    hasPassword ? '<span class="badge">Email + password connected</span>' : '<span class="badge">Password not set</span>'
  ].join(' ');

  if (hasGoogle && hasPassword) {
    return `<section class="panel"><div class="section-heading"><div><span class="eyebrow">SIGN-IN METHODS</span><h2>One learner account, two ways in.</h2></div><div>${badges}</div></div><p>You can sign in with Google or with this account's email and password. Both open the same learner ID, history, NeuralVault, revision state and exam evidence.</p></section>`;
  }

  if (hasGoogle && !hasPassword) {
    return `<section class="panel"><div class="section-heading"><div><span class="eyebrow">SIGN-IN METHODS</span><h2>Add password sign-in to this Google account.</h2></div><div>${badges}</div></div><p>This does not create another account. It adds email/password authentication to the same verified learner identity.</p><form id="add-password-form"><label>New password<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label><label>Confirm password<input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" maxlength="128" required></label><button class="secondary" type="submit">Add password sign-in</button></form></section>`;
  }

  if (hasPassword && !hasGoogle) {
    return `<section class="panel"><div class="section-heading"><div><span class="eyebrow">SIGN-IN METHODS</span><h2>Email + password is connected.</h2></div><div>${badges}</div></div><p>If you later choose Continue with Google using this same verified email, Supabase automatically links Google to this same learner account. No learner data needs to be copied or merged.</p></section>`;
  }

  return `<section class="panel"><span class="eyebrow">SIGN-IN METHODS</span><h2>Identity details are refreshing.</h2><p>Your learner data remains bound to your authenticated Supabase user ID.</p></section>`;
}

function signedIn() {
  const p = state.progress;
  const count = state.questions?.length ?? 0;
  const body = state.loading
    ? '<p>Loading your learning account…</p>'
    : state.error
      ? `<p>Account data unavailable: <strong>${escape(state.error)}</strong></p>`
      : `<div class="metrics"><div><strong>${p?.attempts ?? 0}</strong><span>Recorded attempts</span></div><div><strong>${p?.correct ?? 0}</strong><span>Correct</span></div><div><strong>${count}</strong><span>Published questions</span></div></div>`;
  const admin = state.isAdmin
    ? `<section class="panel reviewer-access"><div><span class="eyebrow">ADMIN</span><h2>Content Admin Console</h2><p>This account is the beta content authority for Medical, References and Rights review. Learners do not receive these controls.</p></div><a class="secondary action-link" href="/web/admin.html">Open Admin Console →</a></section>`
    : '';
  return `<main id="main" class="account-page"><a class="text-button" href="/">← Back to app</a><div class="page-heading"><div><span class="eyebrow">ACCOUNT</span><h1>Your Medical Learning OS account.</h1><p>${escape(state.user?.email || 'Authenticated learner')}</p></div><button class="secondary" data-action="signout">Sign out</button></div><section class="panel"><div class="section-heading"><h2>Learning record</h2><button class="text-button" data-action="refresh" ${state.loading ? 'disabled' : ''}>${state.loading ? 'Refreshing…' : 'Refresh session'}</button></div>${body}<p><a class="primary action-link" href="/">Home →</a> <a class="secondary action-link" href="/web/medical.html">Study →</a> <a class="secondary action-link" href="/web/vault.html">NeuralVault →</a></p><p class="muted">Only published, reviewed question versions enter the learner path.</p></section>${signInMethodsPanel()}${retentionPilotPanel()}${admin}<section class="panel"><span class="eyebrow">CONTENT GOVERNANCE</span><h2>Learner and admin responsibilities are separate.</h2><p>Learners may report suspected errors. Only the server-authorized content admin can approve Medical, References, Rights, or research pair-validation evidence.</p></section></main>`;
}

function render() { root.innerHTML = state.user ? signedIn() : signedOut(); }

async function loadReviewerAccess() {
  try {
    const me = await review.me();
    state = {
      ...state,
      isAdmin: me?.isAdmin === true,
      reviewKinds: me?.isAdmin === true && Array.isArray(me?.reviewKinds) ? me.reviewKinds : []
    };
  } catch (error) {
    state = { ...state, isAdmin: false, reviewKinds: [] };
    if (Number(error?.status || 0) >= 500) reportUnexpected(error, 'load_admin_access');
  }
}

async function loadCloud({ forceRefresh = false } = {}) {
  let session;
  try {
    session = await auth.getSession({ forceRefresh });
  } catch (error) {
    reportUnexpected(error, 'refresh_session');
    state = { user: null, loading: false, progress: null, questions: null, retentionConsent: null, retentionSaving: false, isAdmin: false, reviewKinds: [], error: null };
    render();
    announce(`Session refresh failed: ${error.code || error.message || 'authentication_failed'}. Please sign in again.`);
    return;
  }
  if (!session?.user) { state = { user: null, loading: false, progress: null, questions: null, retentionConsent: null, retentionSaving: false, isAdmin: false, reviewKinds: [], error: null }; render(); return; }
  state = { ...state, user: session.user, loading: true, error: null }; render();
  try {
    let enrichedUser = auth.currentUser() || session.user;
    if (!Array.isArray(enrichedUser?.providers) || enrichedUser.providers.length === 0) {
      try { enrichedUser = await auth.refreshUser(); }
      catch (error) {
        if (Number(error?.status || 0) >= 500) reportUnexpected(error, 'refresh_identity_methods');
      }
    }
    const [progress, result, retentionConsent] = await Promise.all([
      cloud.progress(),
      cloud.questions('all'),
      cloud.retentionProbeConsent()
    ]);
    state = {
      ...state,
      user: enrichedUser || auth.currentUser() || session.user,
      loading: false,
      progress,
      questions: result.questions || [],
      retentionConsent,
      error: null
    };
    await loadReviewerAccess();
    if (forceRefresh) announce('Session refresh verified in this browser. Cloud data reloaded.');
  } catch (error) {
    reportUnexpected(error, 'load_cloud');
    state = { ...state, loading: false, error: error.code || error.message || 'cloud_unavailable' };
  }
  render();
}

root.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  event.preventDefault();
  if (target.dataset.action === 'refresh') loadCloud({ forceRefresh: true });
  if (target.dataset.action === 'withdraw-retention') {
    (async () => {
      if (!state.retentionConsent?.protocol?.protocolSha256 || state.retentionSaving) return;
      state = { ...state, retentionSaving: true };
      render();
      try {
        await cloud.setRetentionProbeConsent({
          decision: 'withdraw',
          protocolSha256: state.retentionConsent.protocol.protocolSha256,
          attested: true
        });
        state = { ...state, retentionSaving: false, retentionConsent: await cloud.retentionProbeConsent() };
        announce('Withdrawn. Future retention-probe assignments remain disabled for this learner unless you opt in again.');
      } catch (error) {
        reportUnexpected(error, 'withdraw_retention_probe');
        state = { ...state, retentionSaving: false };
        announce(`Withdrawal was not recorded: ${error.code || error.message || 'retention_probe_consent_failed'}.`);
      }
      render();
    })();
  }
  if (target.dataset.action === 'signout') {
    (async () => { try { await auth.signOut(); } catch (error) { reportUnexpected(error, 'sign_out'); } state = { user: null, loading: false, progress: null, questions: null, retentionConsent: null, retentionSaving: false, isAdmin: false, reviewKinds: [], error: null }; announce('Signed out.'); render(); })();
  }
});

root.addEventListener('submit', event => {
  event.preventDefault();
  const form = event.target;
  const data = new FormData(form);
  if (form.id === 'signin-form') {
    (async () => {
      try { await auth.signIn(data.get('email'), data.get('password')); state.user = auth.currentUser(); await loadCloud(); announce('Signed in to your cloud learner account.'); }
      catch (error) { reportUnexpected(error, 'sign_in'); announce(`Sign in failed: ${error.code || error.message || 'authentication_failed'}.`); }
    })();
  }
  if (form.id === 'retention-optin-form') {
    (async () => {
      if (!state.retentionConsent?.protocol?.protocolSha256 || state.retentionSaving) return;
      if (data.get('attested') !== 'on') {
        announce('Explicit opt-in confirmation is required.');
        return;
      }
      state = { ...state, retentionSaving: true };
      render();
      try {
        await cloud.setRetentionProbeConsent({
          decision: 'opt_in',
          protocolSha256: state.retentionConsent.protocol.protocolSha256,
          attested: true
        });
        state = { ...state, retentionSaving: false, retentionConsent: await cloud.retentionProbeConsent() };
        announce('Opt-in recorded. No probe has been scheduled or activated.');
      } catch (error) {
        reportUnexpected(error, 'opt_in_retention_probe');
        state = { ...state, retentionSaving: false };
        announce(`Opt-in was not recorded: ${error.code || error.message || 'retention_probe_consent_failed'}.`);
      }
      render();
    })();
  }
  if (form.id === 'add-password-form') {
    (async () => {
      const password = String(data.get('password') || '');
      const confirmPassword = String(data.get('confirmPassword') || '');
      if (password !== confirmPassword) {
        announce('Passwords do not match.');
        return;
      }
      try {
        const user = await auth.setPassword(password);
        state = { ...state, user };
        render();
        announce('Password sign-in added to this same learner account. You can now use Google or email/password.');
      } catch (error) {
        reportUnexpected(error, 'add_password_identity');
        const message = error.code === 'reauthentication_needed'
          ? 'Sign in again to refresh authentication, then add the password.'
          : (error.code || error.message || 'password_update_failed');
        announce(`Password sign-in was not added: ${message}.`);
      }
    })();
  }
  if (form.id === 'signup-form') {
    (async () => {
      try {
        const emailRedirectTo = new URL('/web/account.html', window.location.origin).href;
        const result = await auth.signUp(data.get('email'), data.get('password'), { emailRedirectTo });
        state.user = auth.currentUser();
        if (result.session) { await loadCloud(); announce('Account created and signed in.'); }
        else announce('If this is a new email, check your inbox to confirm it. If you previously used Google with this email, sign in with Google instead and add password sign-in from Account.');
      } catch (error) { reportUnexpected(error, 'sign_up'); announce(`Account creation failed: ${error.code || error.message || 'authentication_failed'}.`); }
    })();
  }
});

async function bootstrap() {
  try {
    const callback = await auth.consumeImplicitRedirect(window.location.href);
    if (callback.handled) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      state.user = auth.currentUser();
      announce('Signed in. Your cloud learner session is connected.');
    }
  } catch (error) {
    reportUnexpected(error, 'confirmation_callback');
    if (window.location.hash) history.replaceState(null, '', window.location.pathname + window.location.search);
    announce(`Email confirmation failed: ${error.code || error.message || 'authentication_failed'}.`);
  }
  if (state.user) await loadCloud();
  else render();
}

render();
bootstrap();
