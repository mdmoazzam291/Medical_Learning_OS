const root = document.querySelector('#account-app');

const featureCards = [
  ['study', 'Study Now', 'Personalized learning sessions that adapt to you.'],
  ['qbank', 'QBank', 'High-yield questions with detailed explanations.'],
  ['exam', 'Exams', 'Realistic, timed simulations that build exam confidence.'],
  ['vault', 'NeuralVault', 'Spaced revision that keeps key concepts in memory.'],
  ['progress', 'Progress', 'Actionable analytics to focus your time where it matters.']
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
      <header class="account-landing-nav" aria-label="Medical Learning OS">
        <a class="account-brand" href="/" aria-label="Medical Learning OS home">
          <img src="/web/favicon.svg" alt="" width="34" height="34">
          <span>Medical Learning OS</span>
        </a>
        <nav class="account-nav-links" aria-label="Product">
          <a href="/web/medical.html">Study Now</a>
          <a href="/web/medical.html">QBank</a>
          <a href="/web/exam.html">Exams</a>
          <a href="/web/vault.html">NeuralVault</a>
          <a href="/">Progress</a>
          <span>For Institutions</span>
        </nav>
        <div class="account-nav-actions">
          <a href="#signin-form">Sign in</a>
          <a class="account-create-cta" href="#create-account">Create account</a>
        </div>
      </header>

      <div class="account-landing-grid">
        <section class="account-product-story" aria-labelledby="account-hero-title">
          <div class="account-hero-copy">
            <p class="account-kicker">PLAN · PRACTICE · REVISE · TRACK · SUCCEED</p>
            <h1 id="account-hero-title">Your intelligent preparation <span>command center.</span></h1>
            <p class="account-hero-lede">Medical Learning OS combines adaptive Study Now sessions, a high-yield QBank, realistic Exams, intelligent NeuralVault revision and detailed Progress analytics — all in one integrated system.</p>
          </div>

          <div class="account-journey" aria-hidden="true">
            <span>Smarter preparation<br>takes you further.</span>
            <div class="account-mountain account-mountain-back"></div>
            <div class="account-mountain account-mountain-front"></div>
            <div class="account-path"></div>
            <div class="account-flag"></div>
          </div>

          <section class="account-feature-grid" aria-label="What Medical Learning OS gives you">
            ${cards}
          </section>

          <section class="account-device-stage" aria-label="Product preview">
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
                  <div class="preview-brand">◒ <span>Medical Learning OS</span></div>
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

        <aside class="account-auth-card" aria-labelledby="signin-title">
          <p class="account-kicker">WELCOME BACK</p>
          <h2 id="signin-title">Sign in to<br>Medical Learning OS.</h2>
          <p class="account-auth-intro">Your authenticated identity connects Study Now, QBank, Exams, NeuralVault and Progress across all your sessions and devices.</p>

          <a class="account-google oauth-google" href="${googleUrl}"><span class="google-g">G</span> Continue with Google</a>
          <div class="account-divider"><span>OR USE EMAIL</span></div>

          <form id="signin-form" class="account-auth-form">
            <label>Email<input name="email" type="email" autocomplete="email" placeholder="you@youruniversity.edu" required></label>
            <label>Password<input name="password" type="password" autocomplete="current-password" minlength="8" maxlength="128" placeholder="Enter your password" required></label>
            <div class="account-auth-meta"><label class="account-checkbox"><input type="checkbox" checked disabled> Keep me signed in</label><a href="#password-recovery" data-open-recovery>Forgot password?</a></div>
            <button class="account-signin-button" type="submit" aria-label="Sign in with email">Sign in</button>
          </form>

          <details id="password-recovery" class="account-inline-details">
            <summary>Send password reset link</summary>
            <form id="recovery-request-form" class="account-auth-form account-compact-form">
              <label>Email<input name="email" type="email" autocomplete="email" placeholder="you@youruniversity.edu" required></label>
              <button class="secondary" type="submit">Send password reset link</button>
            </form>
          </details>

          <details id="create-account" class="account-create-panel">
            <summary>
              <span><small>NEW TO MEDICAL LEARNING OS?</small><strong>Create your learner account</strong><em>One verified email keeps everything connected across your devices and learning journey.</em></span>
              <b>Create account →</b>
            </summary>
            <form id="signup-form" class="account-auth-form account-compact-form">
              <label>Email<input name="email" type="email" autocomplete="email" placeholder="you@youruniversity.edu" required></label>
              <label>Password<input name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" placeholder="Create a password" required></label>
              <button class="account-signin-button" type="submit">Create learner account</button>
              <p>Already used Google with this email? Continue with Google instead so your existing learner identity stays intact.</p>
            </form>
          </details>

          <div class="account-benefits" aria-label="Account benefits">
            <div><span>↻</span><p><strong>Your study history stays synced</strong><small>Pick up where you left off on any device.</small></p></div>
            <div><span>◆</span><p><strong>Secure and private</strong><small>Your learner history stays bound to your authenticated account.</small></p></div>
            <div><span>★</span><p><strong>Access all modules</strong><small>Study Now, QBank, Exams, NeuralVault and Progress in one place.</small></p></div>
            <div><span>▣</span><p><strong>Seamless across devices</strong><small>A consistent experience on web, tablet and mobile.</small></p></div>
          </div>
        </aside>
      </div>
    </main>`;
}

function bindSignedOutInteractions() {
  const recovery = root?.querySelector('#password-recovery');
  const recoveryLink = root?.querySelector('[data-open-recovery]');
  recoveryLink?.addEventListener('click', () => {
    if (!recovery) return;
    recovery.open = true;
    queueMicrotask(() => recovery.querySelector('input[name="email"]')?.focus());
  });
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
