// Shared two-factor (TOTP) markup for Account & Security and the sign-in code prompt.
// Pure functions: no I/O. Callers escape nothing; every value is escaped here.
import { verifiedTotpFactors } from '/src/domain/admin-assurance.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function codeField(autofocus = false) {
  return '<label>6-digit code<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9 ]{6,7}" maxlength="7" required' + (autofocus ? ' autofocus' : '') + '></label>';
}

// state: { loading, error, aal, factors, isAdmin, enrollment, busy }
export function accountTwoFactorMarkup(state = {}) {
  const head = (status, badge) => '<div class="section-heading"><div><span class="eyebrow" id="security">SIGN-IN &amp; SECURITY</span><h2>Two-factor sign-in: ' + escape(status) + '</h2>' +
    '<p>After your password or Google sign-in, Medretica also asks for a 6-digit code from an authenticator app on your phone. Someone who learns your password still cannot open your account.</p></div><span class="badge">' + escape(badge) + '</span></div>';
  if (state.loading) return '<section class="panel" id="account-security">' + head('checking…', 'SECURITY') + '</section>';
  if (state.error) return '<section class="panel" id="account-security">' + head('unknown', 'SECURITY') + '<p class="muted">Two-factor status could not be loaded. Nothing was changed.</p><button class="text-button" type="button" data-two-factor="reload">Retry</button></section>';
  const verified = verifiedTotpFactors(state.factors);
  const busy = state.busy ? ' disabled' : '';
  if (state.enrollment) {
    return '<section class="panel" id="account-security">' + head('setting up', 'STEP 2 OF 2') +
      '<p><a class="primary action-link" href="' + escape(state.enrollment.uri) + '">Open in authenticator app</a></p>' +
      '<p>Or type this setup key into the app: <code class="admin-mfa-secret">' + escape(state.enrollment.secret) + '</code></p>' +
      '<form data-two-factor-form="verify-enrollment" autocomplete="off"><input type="hidden" name="factorId" value="' + escape(state.enrollment.factorId) + '">' + codeField(true) +
      '<div class="review-actions"><button class="primary" type="submit"' + busy + '>Verify and turn on</button> <button class="secondary" type="button" data-two-factor="cancel"' + busy + '>Cancel</button></div></form></section>';
  }
  if (!verified.length) {
    return '<section class="panel" id="account-security">' + head('Off', 'OFF') +
      '<form data-two-factor-form="start" autocomplete="off"><label>Device name<input name="friendlyName" maxlength="60" value="Phone" required></label>' +
      '<button class="primary" type="submit"' + busy + '>Turn on two-factor sign-in</button></form>' +
      '<p class="muted">Works with iPhone Passwords, Google Authenticator, Microsoft Authenticator and similar apps.</p></section>';
  }
  const list = '<ul>' + verified.map(f => '<li><strong>' + escape(f.friendlyName || 'Authenticator') + '</strong>' + (f.createdAt ? ' · added ' + escape(new Date(f.createdAt).toLocaleDateString()) : '') + '</li>').join('') + '</ul>';
  const off = state.isAdmin
    ? '<p class="muted">This is an admin account, so two-factor cannot be turned off here. Manage devices in <a href="/web/admin.html#admin-security">Admin Security</a>.</p>'
    : state.aal === 'aal2'
      ? '<form data-two-factor-form="disable"><label class="review-attestation"><input type="checkbox" name="confirm" required> Turn off two-factor sign-in. My password alone will open this account.</label><button class="secondary" type="submit"' + busy + '>Turn off</button></form>'
      : '<p class="muted">To turn it off, sign out and sign in again with your code first.</p>';
  return '<section class="panel" id="account-security">' + head('On', 'ON') + list +
    '<button class="text-button" type="button" data-two-factor="add"' + busy + '>Add another device</button>' + off + '</section>';
}

export function signInCodePromptMarkup({ factors = [], busy = false, message = '' } = {}) {
  const verified = verifiedTotpFactors(factors);
  const choose = verified.length > 1
    ? '<label>Device<select name="factorId">' + verified.map((f, i) => '<option value="' + escape(f.id) + '"' + (i === 0 ? ' selected' : '') + '>' + escape(f.friendlyName || 'Authenticator ' + (i + 1)) + '</option>').join('') + '</select></label>'
    : '<input type="hidden" name="factorId" value="' + escape(verified[0]?.id || '') + '">';
  return '<div class="mfa-gate-card" role="document"><span class="eyebrow">TWO-FACTOR SIGN-IN</span><h2 id="mfa-gate-title">Enter your authenticator code</h2>' +
    '<p>Your account has two-factor sign-in turned on. Enter the 6-digit code from your authenticator app to continue.</p>' +
    '<form data-mfa-gate-form autocomplete="off">' + choose + codeField(true) +
    '<button class="primary" type="submit"' + (busy ? ' disabled' : '') + '>Continue</button></form>' +
    (message ? '<p role="alert">' + escape(message) + '</p>' : '') +
    '<p class="muted">Lost your phone? Sign out, then contact support from the Contact page.</p>' +
    '<button class="text-button" type="button" data-mfa-gate-signout>Sign out</button></div>';
}
