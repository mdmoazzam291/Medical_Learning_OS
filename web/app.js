const authFragment = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : '');
if (['access_token', 'refresh_token', 'error', 'error_code', 'error_description'].some(key => authFragment.has(key))) {
  location.replace('/web/account.html' + location.hash);
}

import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudStudy } from '/src/adapters/cloud-study.js';
import { createCloudReview } from '/src/adapters/cloud-review.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';

const app = document.querySelector('#app');
const notice = document.querySelector('#notice');
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const auth = createSupabaseAuth({ ...cloudConfig });
const cloud = createCloudStudy({ ...cloudConfig, auth });
const review = createCloudReview({ ...cloudConfig, auth });

let studyMinutes = 20;
try {
  const savedMinutes = Number(localStorage.getItem('mlos-study-duration-v1'));
  if ([10, 20, 30, 60].includes(savedMinutes)) studyMinutes = savedMinutes;
} catch { /* A preference-storage outage never blocks learning. */ }

let state = {
  user: auth.currentUser(),
  progress: null,
  questions: null,
  revision: null,
  exam: null,
  isAdmin: false,
  loading: false,
  error: null
};

function announce(message) {
  notice.textContent = message;
  notice.hidden = false;
}

function reportUnexpected(error, operation) {
  const status = Number(error?.status || 0);
  if (!status || status >= 500) {
    errorMonitor.capture(error, { component: 'beta-home', operation, code: error?.code || null, status: status || null });
  }
}

function signedOut() {
  return '<main id="main" class="account-page"><div class="page-heading"><div><span class="eyebrow">MEDICAL LEARNING OS · BETA</span><h1>Your study workspace starts after sign-in.</h1><p>The public demo has been retired. Beta learning uses authenticated, reviewed medical content and server-owned learner evidence.</p></div><span class="badge">BETA</span></div><section class="hero"><div><span class="eyebrow">ONE LEARNING SYSTEM</span><h2>Study, revise, test, and keep your medical knowledge connected.</h2><p>Sign in to continue your learner state across Study Now, QBank, Exams and NeuralVault.</p><a class="primary action-link" href="/web/account.html">Sign in / create account →</a></div><div class="session-card"><span class="eyebrow">CORE LOOP</span><ol><li><span>01</span> Study Now chooses a useful action</li><li><span>02</span> You answer reviewed medical content</li><li><span>03</span> Evidence updates future revision</li></ol><p>Observed evidence stays separate from inferred mastery.</p></div></section></main>';
}

function nav() {
  const items = [
    ['/', 'Home'],
    ['/web/medical.html', 'Study'],
    ['/web/exam.html', 'Exams'],
    ['/web/vault.html', 'Vault'],
    ['/web/account.html', 'Account']
  ];
  if (state.isAdmin) items.push(['/web/admin.html', 'Admin']);
  return items.map(([href, label]) => '<a href="' + href + '"' + (href === '/' ? ' aria-current="page"' : '') + '>' + label + '<span aria-hidden="true">↗</span></a>').join('');
}

function home() {
  const p = state.progress || {};
  const revision = state.revision;
  const due = revision?.dueCount;
  const unseen = revision?.unseenCount;
  const nextDue = revision?.nextDueAt ? new Date(revision.nextDueAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : null;
  const hasWork = Boolean(due || unseen);
  const heading = state.loading ? 'Finding your next step…'
    : !revision ? 'Check your next step in Study.'
      : due ? due + ' review' + (due === 1 ? ' is' : 's are') + ' ready.'
        : unseen ? 'Build on something new.' : 'Your scheduled reviews are up to date.';
  const reason = state.loading ? 'Reading your saved progress and review schedule.'
    : !revision ? 'Your revision schedule is temporarily unavailable. You can still open the reviewed QBank.'
      : due ? 'Return to what is due, then work through the next recommended questions.'
        : unseen ? 'Reviewed questions are available for your next study session.'
          : nextDue ? 'Your next scheduled review is ' + nextDue + '. You can browse the QBank in the meantime.' : 'Browse reviewed questions or revisit a concept in your Vault.';
  const durations = hasWork && !state.loading ? '<fieldset class="duration-picker"><legend>How much time do you have?</legend><div class="duration-options">' + [10, 20, 30, 60].map(minutes => '<button type="button" data-action="duration" data-minutes="' + minutes + '" aria-pressed="' + (studyMinutes === minutes) + '">' + minutes + ' min</button>').join('') + '</div></fieldset>' : '';
  const action = state.loading ? '<p role="status">Loading your learner state…</p>'
    : '<a class="primary action-link study-start" data-study-start href="' + (hasWork ? '/web/medical.html?studyNow=' + studyMinutes : '/web/medical.html') + '">' + (hasWork ? 'Start ' + studyMinutes + ' min →' : 'Open Study →') + '</a>';
  const error = state.error ? '<section class="panel" role="status"><h2>Some study information is unavailable.</h2><p>Your saved answers are unaffected. Try loading this page again.</p><button class="secondary" data-action="reload">Retry</button></section>' : '';
  const exam = state.exam;
  return '<div class="shell home-shell"><aside class="sidebar"><a class="brand" href="/"><span class="brand-mark">m.</span><span>Medical<span>Learning OS</span></span></a><span class="nav-caption">WORKSPACE</span><nav aria-label="Main navigation">' + nav() + '</nav><div class="sidebar-note"><span class="status-dot">Your learning workspace</span><p>One next step.<br>Keep your knowledge connected.</p></div></aside><div class="workspace"><header><span>MEDICAL LEARNING OS <span class="header-divider">/</span> Home</span><a href="/web/account.html" aria-label="Open your account">Account</a></header><main id="main" tabindex="-1"><div class="page-heading"><div><span class="eyebrow">YOUR LEARNING WORKSPACE</span><h1>What should you study next?</h1><p>A clear next step, at your pace.</p></div></div><section class="hero study-next" id="study-next" aria-labelledby="study-next-title"><div><span class="eyebrow">STUDY NOW</span><h2 id="study-next-title">' + escape(heading) + '</h2><p>' + escape(reason) + '</p>' + durations + action + '<small>Study Now resumes unfinished work when available. Future reviews stay on their schedule.</small></div><aside class="session-card"><span class="eyebrow">YOUR REVIEW SCHEDULE</span><div class="schedule-count">' + (due ?? '—') + '<span>due now</span></div><p>' + (state.loading ? 'Checking your schedule…' : !revision ? 'Schedule unavailable. Try again later.' : nextDue ? 'Next scheduled review: ' + escape(nextDue) : 'No future review is currently scheduled.') + '</p></aside></section>' + error + '<section class="panel learning-snapshot" aria-label="Learning snapshot"><div class="metrics"><div><strong>' + (due ?? '—') + '</strong><span>Due reviews</span></div><div><strong>' + (state.progress ? (p.attempts ?? 0) : '—') + '</strong><span>Saved attempts</span></div><div><strong>' + (state.questions?.length ?? '—') + '</strong><span>Reviewed questions</span></div></div></section><div class="two-column"><section class="panel"><span class="eyebrow">NEURALVAULT</span><h2>Connect the concepts.</h2><p>Revisit a concept and keep your private notes alongside reviewed knowledge.</p><a class="secondary action-link" href="/web/vault.html">Open Vault →</a></section><section class="panel"><span class="eyebrow">EXAMS</span><h2>Practice the exam flow.</h2><p>' + (exam ? exam.ready ? 'Your reviewed question pool is ready for a full mock.' : 'Check available practice and full-mock readiness in Exams.' : 'Open Exams to check available practice.') + '</p><a class="secondary action-link" href="/web/exam.html">Open Exams →</a></section></div><p class="muted">Saved attempts describe your practice. They are not a mastery score.</p></main><footer>Medical Learning OS</footer></div></div>';
}

function render() {
  const recovery = auth.currentUser()
    ? 'Your saved login is kept. Retry when the connection is available.'
    : 'This session is no longer available. Sign in again or retry.';
  app.innerHTML = state.user ? home() : signedOut() + (state.error ? '<section class="panel" role="status"><h2>Your workspace could not be loaded.</h2><p>' + recovery + '</p><button class="secondary" data-action="reload">Retry</button></section>' : '');
}

async function loadHome() {
  if (state.loading) return;
  state = { ...state, user: null, loading: true, progress: null, questions: null, revision: null, exam: null, isAdmin: false, error: null };
  try {
    const session = await auth.getSession();
    if (!session?.user) {
      state = { ...state, user: null, loading: false };
      render();
      return;
    }
    state = { ...state, user: auth.currentUser() || session.user, loading: true, progress: null, questions: null, revision: null, exam: null, isAdmin: false, error: null };
    render();
    const reads = await Promise.allSettled([cloud.progress(), cloud.questions('all'), cloud.due(15), cloud.examSimulatorReadiness('neet-pg:2026@1'), review.me()]);
    const operations = ['load_progress', 'load_questions', 'load_revision', 'load_exam', 'load_admin_status'];
    reads.forEach((result, index) => {
      if (result.status === 'rejected') reportUnexpected(result.reason, operations[index]);
    });
    const [progress, questions, revision, exam, admin] = reads.map(result => result.status === 'fulfilled' ? result.value : null);
    const isAdmin = admin?.isAdmin === true;
    state = {
      ...state,
      loading: false,
      progress,
      questions: Array.isArray(questions?.questions) ? questions.questions : null,
      revision,
      exam,
      isAdmin,
      error: reads.slice(0, 4).some(result => result.status === 'rejected') ? 'home_projection_unavailable' : null
    };
  } catch (error) {
    reportUnexpected(error, 'load_home');
    state = { ...state, user: null, progress: null, questions: null, revision: null, exam: null, isAdmin: false, loading: false, error: error.code || error.message || 'beta_home_unavailable' };
  }
  render();
}

app.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  event.preventDefault();
  if (target.dataset.action === 'duration') {
    const minutes = Number(target.dataset.minutes);
    if (![10, 20, 30, 60].includes(minutes)) return;
    studyMinutes = minutes;
    try { localStorage.setItem('mlos-study-duration-v1', String(minutes)); } catch { /* Optional UI preference. */ }
    app.querySelectorAll('[data-action="duration"]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.minutes) === minutes)));
    const start = app.querySelector('[data-study-start]');
    if (start) {
      start.href = '/web/medical.html?studyNow=' + minutes;
      start.textContent = 'Start ' + minutes + ' min →';
    }
  }
  if (target.dataset.action === 'reload') loadHome();
});

if (!['access_token', 'refresh_token', 'error', 'error_code', 'error_description'].some(key => authFragment.has(key))) loadHome();
