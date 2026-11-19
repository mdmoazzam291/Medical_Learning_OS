// Sign-in code prompt for accounts with two-factor turned on (ADR-142).
// Loaded on every app page. The server is the real gate (learner_runtime_access_v1
// returns mfa_required); this only asks for the code so the session can upgrade.
// Cost: nothing for aal2 sessions; one /auth/v1/user read per aal1 session per tab.
import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { cloudConfig } from '/web/cloud-config.js';
import { tokenAssuranceLevel, verifiedTotpFactors } from '/src/domain/admin-assurance.js';
import { signInCodePromptMarkup } from '/web/two-factor-view.js';

const CACHE_KEY = 'mlos-mfa-gate-v1';

export function sessionIdFromToken(token) {
  try {
    const part = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const id = JSON.parse(atob(part + '='.repeat((4 - (part.length % 4)) % 4)))?.session_id;
    return typeof id === 'string' ? id : null;
  } catch { return null; }
}

function cached(sessionId) {
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null')?.sessionId === sessionId; } catch { return false; }
}
function remember(sessionId) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ sessionId })); } catch { /* optional */ }
}

async function run() {
  // Admin has its own full-page code step.
  if (/\/web\/admin(\.html)?$/.test(location.pathname)) return;
  const auth = createSupabaseAuth({ ...cloudConfig });
  let session;
  try { session = await auth.getSession(); } catch { return; }
  if (!session?.accessToken || tokenAssuranceLevel(session.accessToken) === 'aal2') return;
  const sessionId = sessionIdFromToken(session.accessToken);
  if (sessionId && cached(sessionId)) return;
  let status;
  try { status = await auth.mfaStatus(); } catch { return; }
  const factors = verifiedTotpFactors(status.factors);
  if (!factors.length) { if (sessionId) remember(sessionId); return; }

  const overlay = document.createElement('div');
  overlay.className = 'mfa-gate';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'mfa-gate-title');
  let busy = false, message = '';
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

if (typeof document !== 'undefined' && document.body) run();
else if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', run, { once: true });
