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
const auth = createSupabaseAuth({ ...cloudConfig, storage: localStorage });
const cloud = createCloudStudy({ ...cloudConfig, auth });
const review = createCloudReview({ ...cloudConfig, auth });

let state = {
  user: auth.currentUser(),
  progress: null,
  questions: [],
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
  const due = state.revision?.dueCount ?? 0;
  const unseen = state.revision?.unseenCount ?? 0;
  const published = state.questions.length;
  const ready = state.exam?.eligibleUniqueQuestions ?? 0;
  const required = state.exam?.requiredUniqueQuestions ?? 180;
  const nextDue = state.revision?.nextDueAt ? new Date(state.revision.nextDueAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : null;
  const loading = state.loading ? '<section class="panel"><p>Loading your learner state…</p></section>' : '';
  const error = state.error ? '<section class="panel"><h2>Some beta data is unavailable.</h2><p>' + escape(state.error) + '</p><button class="secondary" data-action="reload">Retry</button></section>' : '';

  return '<div class="shell"><aside class="sidebar"><a class="brand" href="/"><span class="brand-mark">m.</span><span>Medical<span>Learning OS</span></span></a><span class="nav-caption">WORKSPACE</span><nav aria-label="Main navigation">' + nav() + '</nav><div class="sidebar-note"><span class="status-dot">Authenticated beta</span><p>Less navigation.<br>More useful retrieval.</p></div></aside><div class="workspace"><header><span>MEDICAL LEARNING OS <span class="header-divider">/</span> Home</span><span>' + escape(state.user?.email || '') + '</span></header><main id="main" tabindex="-1"><div class="page-heading"><div><span class="eyebrow">PREPARATION COMMAND CENTER</span><h1>What should you study next?</h1><p>Your beta home now prioritizes action instead of demo navigation.</p></div><span class="badge">BETA</span></div><section class="hero"><div><span class="eyebrow">STUDY NOW</span><h2>' + (due ? due + ' due review' + (due === 1 ? '' : 's') + ' are waiting.' : unseen ? 'New reviewed material is available.' : 'Continue your medical learning loop.') + '</h2><p>Choose the uninterrupted time you have. Study Now uses the current deterministic policy and does not claim a precise mastery score.</p><div class="button-row"><a class="primary action-link" href="/web/medical.html?studyNow=20">Start 20 min →</a><a class="secondary action-link" href="/web/medical.html?studyNow=10">10 min</a><a class="secondary action-link" href="/web/medical.html?studyNow=30">30 min</a><a class="secondary action-link" href="/web/medical.html?studyNow=60">60 min</a></div><small>Due work is not pulled early merely to fill time.</small></div><div class="session-card"><span class="eyebrow">CURRENT SIGNALS</span><ol><li><span>01</span> ' + due + ' due now</li><li><span>02</span> ' + unseen + ' unseen reviewed questions</li><li><span>03</span> ' + (p.attempts ?? 0) + ' recorded attempts</li></ol><p>' + (nextDue ? 'Next scheduled review: ' + escape(nextDue) : 'No future review currently scheduled.') + '</p></div></section>' + loading + error + '<section class="panel"><div class="metrics"><div><strong>' + due + '</strong><span>Due reviews</span></div><div><strong>' + published + '</strong><span>Published questions</span></div><div><strong>' + ready + '<small> / ' + required + '</small></strong><span>Full-mock content gate</span></div></div></section><div class="two-column"><section class="panel"><span class="eyebrow">STUDY</span><h2>Reviewed medical QBank</h2><p>Server-scored questions, explanations, revision and Study Now in one learning path.</p><a class="secondary action-link" href="/web/medical.html">Open Study →</a></section><section class="panel"><span class="eyebrow">NEURALVAULT</span><h2>Your connected concept workspace</h2><p>Keep private notes and corrections attached to canonical concepts instead of creating disconnected notebooks.</p><a class="secondary action-link" href="/web/vault.html">Open Vault →</a></section></div></main><footer>Medical Learning OS · authenticated beta</footer></div></div>';
}

function render() {
  app.innerHTML = state.user ? home() : signedOut();
}

async function loadHome() {
  const session = await auth.getSession();
  if (!session?.user) {
    state = { ...state, user: null, loading: false };
    render();
    return;
  }
  state = { ...state, user: auth.currentUser() || session.user, loading: true, error: null };
  render();
  try {
    const [progress, questions] = await Promise.all([cloud.progress(), cloud.questions('all')]);
    let revision = null;
    let exam = null;
    try { revision = await cloud.due(15); } catch (error) { reportUnexpected(error, 'load_revision'); }
    try { exam = await cloud.examSimulatorReadiness('neet-pg:2026@1'); } catch (error) { reportUnexpected(error, 'load_exam'); }
    let isAdmin = false;
    try { isAdmin = (await review.me())?.isAdmin === true; } catch (error) {
      if (Number(error?.status || 0) >= 500) reportUnexpected(error, 'load_admin_status');
    }
    state = {
      ...state,
      loading: false,
      progress,
      questions: Array.isArray(questions?.questions) ? questions.questions : [],
      revision,
      exam,
      isAdmin,
      error: null
    };
  } catch (error) {
    reportUnexpected(error, 'load_home');
    state = { ...state, loading: false, error: error.code || error.message || 'beta_home_unavailable' };
  }
  render();
}

app.addEventListener('click', event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  event.preventDefault();
  if (target.dataset.action === 'reload') loadHome();
});

render();
loadHome().catch(error => {
  reportUnexpected(error, 'bootstrap');
  state = { ...state, loading: false, error: error.code || error.message || 'beta_home_unavailable' };
  render();
  announce('The beta workspace could not be loaded.');
});