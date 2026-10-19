const root = document.querySelector('#account-app');

const featureCards = [
  ['study', 'Study Now', 'Resume unfinished work and available due reviews.'],
  ['qbank', 'QBank', 'Practise with questions that have been reviewed and published.'],
  ['exam', 'Exams', 'Check practice options and full-mock readiness for the available pool.'],
  ['vault', 'NeuralVault', 'Revisit connected concepts and keep your private notes.'],
  ['progress', 'Progress', 'Review recorded attempts and your revision schedule.']
];

function featureIcon(kind) {
  const icons = {
    study: '<span aria-hidden="true">▣</span>',
    qbank: '<span aria-hidden="true">▥</span>',
    exam: '<span aria-hidden="true">▤</span>',
    vault: '<span aria-hidden="true">✣</span>',
    progress: '<span aria-hidden="true">↗</span>'
  };
  return icons[kind] || '<span aria-hidden="true">•</span>';
}

function getGoogleUrl() {
  return root?.querySelector('a.oauth-google')?.getAttribute('href') || '/web/account.html';
}

function signedOutMarkup(googleUrl) {
  const cards = featureCards.map(([kind, title, description]) => `
    <article class="account-feature account-feature-${kind}">
      <div class="account-feature-icon">${featureIcon(kind)}</div>
      <h3>${title}</h3>
      <p>${description}</p>
    </article>`).join('');

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
            <label class="account-remember"><input name="remember" type="checkbox" checked aria-describedby="remember-help"> Keep me signed in</label>
            <small id="remember-help" class="account-remember-help">Uncheck to use this tab only.</small>
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
          <div class="account-benefits" aria-label="Account benefits">
            <div><span>↻</span><p><strong>Your study history stays synced</strong><small>Pick up where you left off on any device.</small></p></div>
            <div><span>◆</span><p><strong>Secure and private</strong><small>Your learner history stays bound to your authenticated account.</small></p></div>
            <div><span>★</span><p><strong>Access all modules</strong><small>Study Now, QBank, Exams, NeuralVault and Progress in one place.</small></p></div>
            <div><span>▣</span><p><strong>Seamless across devices</strong><small>A consistent experience on web, tablet and mobile.</small></p></div>
          </div>
        </section>
        <section class="account-product-story" aria-labelledby="account-hero-title">
          <div class="account-hero-copy">
            <p class="account-kicker">YOUR MEDICAL LEARNING OPERATING SYSTEM</p>
            <h2 id="account-hero-title" class="account-hero-title">Your intelligent preparation <span>command center.</span></h2>
            <p class="account-hero-lede">Medretica connects study, question practice, revision, private notes and recorded progress. Beta content depends on what has been reviewed and published; some collections may be empty. Current access is free, and paid plans are unavailable. Advanced AI and adaptive features remain in development.</p>
          </div>

          <div class="account-journey" aria-hidden="true">
            <span>Smarter preparation<br>takes you further.</span>
            <div class="account-mountain account-mountain-back"></div>
            <div class="account-mountain account-mountain-front"></div>
            <div class="account-path"></div>
            <div class="account-flag"></div>
          </div>

          <section class="account-feature-grid" aria-label="What Medretica gives you">
            ${cards}
          </section>

          <p class="account-preview-label">Illustrative interface preview — example names, numbers and content; not your learning record or a promise of available content.</p>
          <section class="account-device-stage" aria-label="Illustrative interface preview">
            <div class="account-phone-preview" aria-hidden="true">
              <div class="phone-status"><span>9:41</span><span>•••</span></div>
              <div class="phone-title"><strong>Study Now</strong><span>+</span></div>
              <div class="phone-plan-row"><strong>Today’s Plan</strong><span>3h 20m</span></div>
              <div class="phone-task active"><span class="mini-icon">▶</span><div><strong>Adaptive session</strong><small>Cardiology</small></div></div>
              <div class="phone-task"><span class="mini-icon blue">▥</span><div><strong>QBank practice</strong><small>Heart failure · 30 min</small></div></div>
              <div class="phone-task"><span class="mini-icon purple">✣</span><div><strong>NeuralVault review</strong><small>12 cards due · 20 min</small></div></div>
              <div class="phone-task"><span class="mini-icon orange">▤</span><div><strong>Mock exam</strong><small>Medicine · 40 Qs</small></div></div>
              <div class="phone-primary">Start today’s plan</div>
              <div class="phone-tabs"><span>Home</span><span>QBank</span><span>Exams</span><span>Vault</span><span>Progress</span></div>
            </div>

            <div class="account-laptop-preview" aria-hidden="true">
              <div class="laptop-screen">
                <aside class="preview-sidebar">
                  <div class="preview-brand"><span class="mlos-brand-mark" aria-hidden="true"></span> <span>Medretica</span></div>
                  <strong>⌂ Home</strong><span>▣ Study Now</span><span>▥ QBank</span><span>▤ Exams</span><span>✣ NeuralVault</span><span>↗ Progress</span>
                  <div class="preview-spacer"></div><span>□ Notes</span><span>☆ Bookmarks</span><span>⚙ Settings</span>
                </aside>
                <div class="preview-main">
                  <div class="preview-top"><div class="preview-search">Search questions, topics, or your notes…</div><div class="preview-avatar">JD</div></div>
                  <div class="preview-heading"><div><h2>Good afternoon, Jordan.</h2><p>Here’s your personalized preparation overview.</p></div><div class="exam-countdown"><small>NEXT EXAM</small><strong>339 days</strong><span>NEET-PG 2027</span></div></div>
                  <div class="continue-card"><span class="play-orb">▶</span><div><small>Continue Learning</small><strong>Cardiovascular System</strong><span>Adaptive session · High-yield topics</span></div><button type="button" tabindex="-1">Resume →</button></div>
                  <div class="preview-metrics">
                    <div class="preview-stat revision"><small>Due for Revision</small><strong>48 cards</strong><span>Memory debt</span><b>Review now →</b></div>
                    <div class="preview-stat weak"><small>Weak Areas</small><strong>3 topics</strong><span>Heart failure 42%<br>Arrhythmias 51%<br>Acid-base balance 56%</span><b>Practice weak areas →</b></div>
                    <div class="preview-stat performance"><small>Recent Performance</small><strong>78%</strong><span>Question accuracy · +12%</span><b>View full analytics →</b></div>
                  </div>
                  <div class="preview-modules"><strong>Your Modules</strong><div><span>▣ Study Now</span><span>▥ QBank</span><span>▤ Exams</span><span>✣ NeuralVault</span><span>↗ Progress</span></div></div>
                </div>
              </div>
              <div class="laptop-base"></div>
            </div>
          </section>
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
