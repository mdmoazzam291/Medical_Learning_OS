// Account → Sign-in & Security: two-factor on/off for every account (ADR-142).
// Mounts into #account-two-factor whenever account.js renders it.
import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';
import { verifiedTotpFactors } from '/src/domain/admin-assurance.js';
import { accountTwoFactorMarkup } from '/web/two-factor-view.js';

const root = document.querySelector('#account-app');
const notice = document.querySelector('#notice');
const auth = createSupabaseAuth({ ...cloudConfig });
let state = { loading: true, error: null, aal: null, factors: [], enrollment: null, busy: false, loadedFor: null };

const announce = text => { if (notice) { notice.textContent = text; notice.hidden = false; } };
const slot = () => root?.querySelector('#account-two-factor');
const painted = new WeakMap(); // compare with what we wrote, not the browser-normalized innerHTML
function paint() {
  const target = slot();
  if (!target) return;
  const html = accountTwoFactorMarkup({ ...state, isAdmin: globalThis.mlosNavigationAdmin === true });
  if (painted.get(target) !== html) { painted.set(target, html); target.innerHTML = html; }
}

async function load() {
  const user = auth.currentUser();
  if (!user) return;
  state = { ...state, loading: true, error: null, loadedFor: user.id };
  paint();
  try {
    const status = await auth.mfaStatus();
    state = { ...state, loading: false, aal: status.aal, factors: status.factors };
  } catch (error) {
    state = { ...state, loading: false, error: error?.code || 'mfa_status_unavailable' };
    if (!error?.status || Number(error.status) >= 500) errorMonitor.capture(error, { component: 'account-two-factor', operation: 'status' });
  }
  paint();
}

function failed(error, operation) {
  if (!error?.status || Number(error.status) >= 500) errorMonitor.capture(error, { component: 'account-two-factor', operation, code: error?.code || null });
  const code = error?.code || 'two_factor_failed';
  announce(code === 'invalid_mfa_code' || Number(error?.status) === 422 || code === 'mfa_verification_failed'
    ? 'That code did not work. Wait for a fresh code and try again.'
    : code === 'insufficient_aal' ? 'Sign in again with your code, then retry.' : 'Two-factor change failed: ' + code + '.');
}

async function startEnrollment(name) {
  for (const factor of state.factors.filter(f => f.status !== 'verified')) {
    try { await auth.mfaUnenroll(factor.id); } catch { /* an unverified factor grants nothing */ }
  }
  const enrollment = await auth.mfaEnrollTotp(String(name || 'Phone').trim() + ' · ' + new Date().toISOString().slice(0, 10));
  state = { ...state, enrollment };
}

root?.addEventListener('click', event => {
  const action = event.target.closest('[data-two-factor]')?.dataset.twoFactor;
  if (!action || state.busy) return;
  if (action === 'reload') { load(); return; }
  if (action === 'cancel') {
    const pending = state.enrollment?.factorId;
    state = { ...state, enrollment: null, busy: true }; paint();
    (async () => { if (pending) { try { await auth.mfaUnenroll(pending); } catch { /* ignored */ } } state.busy = false; await load(); })();
    return;
  }
  if (action === 'add') {
    state = { ...state, busy: true }; paint();
    (async () => { try { await startEnrollment('Second device'); } catch (error) { failed(error, 'add_device'); } state.busy = false; paint(); })();
  }
});

root?.addEventListener('submit', event => {
  const form = event.target.closest('[data-two-factor-form]');
  if (!form) return;
  event.preventDefault();
  if (state.busy) return;
  const kind = form.dataset.twoFactorForm, data = new FormData(form);
  state = { ...state, busy: true }; paint();
  (async () => {
    try {
      if (kind === 'start') await startEnrollment(data.get('friendlyName'));
      if (kind === 'verify-enrollment') {
        await auth.mfaVerify(String(data.get('factorId') || ''), String(data.get('code') || ''));
        state = { ...state, enrollment: null };
        announce('Two-factor sign-in is on. Next time you sign in, Medretica will ask for a code.');
        state.busy = false; await load(); return;
      }
      if (kind === 'disable') {
        if (globalThis.mlosNavigationAdmin === true) throw Object.assign(new Error('admin_two_factor_required'), { code: 'admin_two_factor_required' });
        for (const factor of verifiedTotpFactors(state.factors)) await auth.mfaUnenroll(factor.id);
        announce('Two-factor sign-in is off.');
        state.busy = false; await load(); return;
      }
    } catch (error) { failed(error, kind); }
    state.busy = false; paint();
  })();
});

if (root) {
  new MutationObserver(() => {
    if (!slot()) return;
    const user = auth.currentUser();
    if (user && state.loadedFor !== user.id) load(); else paint();
  }).observe(root, { childList: true, subtree: true });
  if (slot()) load();
}
