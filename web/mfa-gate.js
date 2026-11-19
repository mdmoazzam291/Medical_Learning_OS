// Sign-in code prompt for accounts with two-factor turned on (ADR-142).
// Loaded on every signed-in app page. The server is the real gate:
// learner_runtime_access_v1 makes every edge function answer 401 mfa_required for
// an aal1 session of an account with a verified factor. This module watches for
// that answer and asks for the code, so it costs no extra request otherwise.
import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { cloudConfig } from '/web/cloud-config.js';
import { verifiedTotpFactors } from '/src/domain/admin-assurance.js';
import { signInCodePromptMarkup } from '/web/two-factor-view.js';

let open = false;

export async function isMfaRequiredResponse(response, url) {
  if (!response || response.status !== 401 || !/\/functions\/v1\//.test(String(url || ''))) return false;
  try { return (await response.clone().json())?.error === 'mfa_required'; } catch { return false; }
}

async function prompt() {
  if (open || /\/web\/admin(\.html)?$/.test(location.pathname)) return; // Admin has its own code step.
  open = true;
  const auth = createSupabaseAuth({ ...cloudConfig });
  let factors = [];
  try { factors = verifiedTotpFactors((await auth.mfaStatus()).factors); } catch { /* shown below */ }
  const overlay = document.createElement('div');
  overlay.className = 'mfa-gate';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'mfa-gate-title');
  let busy = false, message = factors.length ? '' : 'Could not load your two-factor device. Check your connection, or sign out and sign in again.';
  const paint = () => { overlay.innerHTML = signInCodePromptMarkup({ factors, busy, message }); overlay.querySelector('input[name="code"]')?.focus(); };
  paint();
  document.body.append(overlay);
  document.documentElement.classList.add('mfa-gate-open');

  overlay.addEventListener('click', event => {
    if (!event.target.closest('[data-mfa-gate-signout]')) return;
    (async () => { try { await auth.signOut(); } finally { location.href = '/web/account.html'; } })();
  });
  overlay.addEventListener('submit', event => {
    const form = event.target.closest('[data-mfa-gate-form]');
    if (!form || busy) return;
    event.preventDefault();
    const data = new FormData(form);
    busy = true; message = ''; paint();
    (async () => {
      try {
        await auth.mfaVerify(String(data.get('factorId') || ''), String(data.get('code') || ''));
        location.reload();
      } catch (error) {
        busy = false;
        message = error?.code === 'invalid_mfa_code' || Number(error?.status) === 422 || error?.code === 'mfa_verification_failed'
          ? 'That code did not work. Wait for a fresh code and try again.'
          : 'Could not verify the code right now. Check your connection and try again.';
        paint();
      }
    })();
  });
}

if (typeof globalThis.fetch === 'function' && !globalThis.__mlosMfaGate) {
  globalThis.__mlosMfaGate = true;
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = async (input, init) => {
    const response = await original(input, init);
    const url = typeof input === 'string' ? input : input?.url;
    if (response.status === 401) isMfaRequiredResponse(response, url).then(required => { if (required) prompt(); });
    return response;
  };
}
