const root = document.querySelector('#account-app');

function getGoogleUrl() {
  return root?.querySelector('a.oauth-google')?.getAttribute('href') || '/web/account.html';
}

function signedOutMarkup(googleUrl) {
  return `
    <main id="main" class="account-landing-page" data-account-landing-enhanced="true">
      <div class="account-landing-grid">
        <section class="account-auth-card" aria-labelledby="signin-title">
          <h1 id="signin-title">Sign in to Medretica.</h1>
          <p class="account-auth-intro">Continue your learning across devices.</p>
          <a class="account-google oauth-google" href="${googleUrl}"><span class="google-g" aria-hidden="true">G</span> Continue with Google</a>
          <div class="account-divider"><span>OR USE EMAIL</span></div>
          <form id="signin-form" class="account-auth-form">
            <label>Email<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required></label>
            <label>Password<input name="password" type="password" autocomplete="current-password" minlength="8" maxlength="128" placeholder="Enter your password" required></label>
            <button class="account-signin-button" type="submit">Sign in with email</button>
          </form>
          <details id="password-recovery" class="account-inline-details">
            <summary>Forgot password?</summary>
            <form id="recovery-request-form" class="account-auth-form account-compact-form">
              <label>Email<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required></label>
              <button class="secondary" type="submit">Send password reset link</button>
            </form>
          </details>
          <details id="create-account" class="account-create-panel">
            <summary>New here? Create account</summary>
            <form id="signup-form" class="account-auth-form account-compact-form">
              <label>Email<input name="email" type="email" autocomplete="email" placeholder="you@example.com" required></label>
              <label>Password<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" placeholder="Create a password" required></label>
              <button class="account-signin-button" type="submit">Create account</button>
              <p>Already use Google with this email? Continue with Google above.</p>
            </form>
          </details>
        </section>
      </div>
    </main>`;
}

function bindSignedOutInteractions() {
  for (const id of ['create-account', 'password-recovery']) {
    const panel = root?.querySelector('#' + id);
    panel?.addEventListener('toggle', () => {
      if (panel.open) panel.querySelector('input[name="email"]')?.focus();
    });
  }
  const registration = root?.querySelector('#create-account');
  if (registration && (new URLSearchParams(location.search).get('mode') === 'create' || location.hash === '#create-account')) registration.open = true;
  const recovery = root?.querySelector('#password-recovery');
  if (recovery && location.hash === '#password-recovery') recovery.open = true;
}

function enhanceSignedOutPage() {
  if (!root) return;
  const signInForm = root.querySelector('#signin-form');
  const googleLink = root.querySelector('a.oauth-google');
  const alreadyEnhanced = root.querySelector('[data-account-landing-enhanced="true"]');

  if (signInForm && googleLink && !alreadyEnhanced) {
    const googleUrl = getGoogleUrl();
    root.innerHTML = signedOutMarkup(googleUrl);
    document.body.classList.add('account-landing-active');
    bindSignedOutInteractions();
    return;
  }

  if (!root.querySelector('[data-account-landing-enhanced="true"]')) {
    document.body.classList.remove('account-landing-active');
  }
}

if (root) {
  const observer = new MutationObserver(() => queueMicrotask(enhanceSignedOutPage));
  observer.observe(root, { childList: true, subtree: false });
  enhanceSignedOutPage();
}
