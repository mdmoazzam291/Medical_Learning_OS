import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudOwner } from '/src/adapters/cloud-owner.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';

const app = document.querySelector('#admin-app');
const notice = document.querySelector('#notice');
const auth = createSupabaseAuth({ ...cloudConfig });
const owner = createCloudOwner({ ...cloudConfig, auth });
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let loading = false;
let lastDashboard = null;

function announce(message) {
  if (!notice) return;
  notice.textContent = message;
  notice.hidden = false;
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat().format(n) : '—';
}

function dateTime(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function bytes(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

function metric(label, value, detail = '') {
  return `<div class="owner-metric"><span>${escape(label)}</span><strong>${escape(value)}</strong>${detail ? `<small>${escape(detail)}</small>` : ''}</div>`;
}

function statusPills(map) {
  const entries = Object.entries(map || {});
  if (!entries.length) return '<span class="badge">No data</span>';
  return entries.map(([key, value]) => `<span class="badge">${escape(key.replaceAll('_', ' '))}: ${number(value)}</span>`).join(' ');
}

function recentUsers(users) {
  if (!Array.isArray(users) || !users.length) return '<p class="muted">No learner identities yet.</p>';
  return `<div class="owner-table-wrap"><table class="owner-table"><thead><tr><th>Learner</th><th>Created</th><th>Last sign-in</th><th>Providers</th></tr></thead><tbody>${users.map(user => `<tr><td><strong>${escape(user.email || 'No email')}</strong><small>${escape(user.id || '')}</small></td><td>${escape(dateTime(user.createdAt))}</td><td>${escape(dateTime(user.lastSignInAt))}</td><td>${escape(Array.isArray(user.providers) ? user.providers.join(', ') : '—')}</td></tr>`).join('')}</tbody></table></div>`;
}

function reviewGrantRows(reviewAuthority) {
  const grants = Array.isArray(reviewAuthority?.grants) ? reviewAuthority.grants : [];
  if (!grants.length) return '<p class="muted">No human-review grants are currently recorded for the owner account.</p>';
  return `<div class="owner-grants">${grants.map(grant => `<div class="owner-grant"><div><strong>${escape(grant.reviewKind)}</strong><span class="badge">${grant.active === true ? 'ACTIVE TEMPORARY' : 'EXPIRED'}</span></div><p>Granted ${escape(dateTime(grant.grantedAt))}<br>Expires ${escape(dateTime(grant.expiresAt))}</p></div>`).join('')}</div>`;
}

function infrastructureRows(infra) {
  const storage = infra?.supabaseStorage || {};
  return `<div class="owner-health-grid">
    <article><span class="owner-health-dot good"></span><div><strong>Supabase database</strong><small>${escape(infra?.database || 'unknown')} · ${escape(bytes(infra?.databaseBytes))}</small></div></article>
    <article><span class="owner-health-dot ${infra?.ownerApi?.status === 'healthy' ? 'good' : 'warn'}"></span><div><strong>Owner API</strong><small>${escape(infra?.ownerApi?.status || 'unknown')} · ${escape(infra?.ownerApi?.version || '—')}</small></div></article>
    <article><span class="owner-health-dot ${storage.status === 'healthy' ? 'good' : 'warn'}"></span><div><strong>Supabase Storage</strong><small>${escape(storage.status || 'unknown')} · ${number(storage.bucketCount)} buckets</small></div></article>
    <article><span class="owner-health-dot warn"></span><div><strong>Management-plane telemetry</strong><small>${escape(infra?.managementPlaneTelemetry || 'not connected')} · Cloudflare/R2/Sentry/Resend remain external</small></div></article>
  </div>`;
}

function dashboardMarkup(data) {
  const users = data?.users || {};
  const learning = data?.learning || {};
  const content = data?.content || {};
  const ai = data?.ai || {};
  const infra = data?.infrastructure || {};
  const temporary = data?.reviewAuthority?.temporary === true;

  return `<section id="owner-console" class="owner-console" aria-label="MLOS owner console">
    <section id="owner-overview" class="panel owner-hero">
      <div class="section-heading"><div><span class="eyebrow">SINGLETON MLOS OWNER</span><h2>Platform control tower</h2><p>Operational visibility for learners, learning activity, content, AI telemetry and infrastructure. Authorization is server-side.</p></div><span class="badge">OWNER ONLY</span></div>
      <div class="owner-metrics">${metric('Learners', number(users.total), `${number(users.new7d)} new · 7d`)}${metric('Active learners', number(learning.activeLearners7d), 'attempt evidence · 7d')}${metric('Study attempts', number(learning.attempts7d), `${number(learning.attempts24h)} · last 24h`)}${metric('Questions', number(content.questions), `catalog v${number(content.catalogVersion)}`)}${metric('Open rights', number(content.unresolvedRights), 'sources without rights event')}${metric('Database', bytes(infra.databaseBytes), `${number(infra.publicTableCount)} public tables`)}</div>
      <p class="muted">Snapshot ${escape(dateTime(data?.generatedAt))} · owner ${escape(data?.owner?.email || 'authenticated singleton')}</p>
    </section>

    <section id="owner-users" class="panel">
      <div class="section-heading"><div><span class="eyebrow">USERS</span><h2>Learner identities</h2><p>Identity visibility only. This console does not silently change learner access or learning state.</p></div><span class="badge">${number(users.total)} total</span></div>
      <div class="owner-metrics">${metric('New · 7d', number(users.new7d))}${metric('Signed in · 7d', number(users.signedIn7d))}${metric('Signed in · 30d', number(users.signedIn30d))}</div>
      <form id="owner-learner-search-form" class="owner-search"><label for="owner-learner-query">Find learner by email or exact user ID</label><div><input id="owner-learner-query" name="q" type="search" minlength="2" maxlength="160" autocomplete="off" placeholder="email or user UUID" required><button class="secondary" type="submit">Search</button></div></form>
      <div id="owner-learner-results" aria-live="polite"></div>
      <h3>Recently created</h3>${recentUsers(users.recent)}
    </section>

    <section id="owner-learning" class="panel">
      <div class="section-heading"><div><span class="eyebrow">LEARNING ANALYTICS</span><h2>Evidence, not engagement theatre</h2><p>These are raw platform activity counts. They are not presented as mastery.</p></div><span class="badge">7-DAY WINDOW</span></div>
      <div class="owner-metrics">${metric('Attempts', number(learning.attempts7d), `${number(learning.attemptsTotal)} lifetime`)}${metric('Sessions', number(learning.sessions7d), `${number(learning.openSessions)} open now`)}${metric('Exam runs', number(learning.examRuns7d), `${number(learning.examRunsTotal)} lifetime`)}${metric('Completed exams', number(learning.examCompletedTotal))}</div>
      <p class="muted">Latest recorded study attempt: ${escape(dateTime(learning.latestAttemptAt))}.</p>
    </section>

    <section id="owner-content" class="panel">
      <div class="section-heading"><div><span class="eyebrow">CONTENT SYSTEM</span><h2>Canonical content + review pipeline</h2><p>One operational view over concepts, questions, sources, NeuralVault notes and learner reports.</p></div><a class="primary action-link" href="/web/review.html">Open Content Review →</a></div>
      <div class="owner-metrics">${metric('Concepts', number(content.concepts))}${metric('Sources', number(content.sources))}${metric('Questions', number(content.questions))}${metric('Review evidence', number(content.reviewEvidence))}${metric('Learner reports', number(content.openLearnerReports), 'open')}${metric('Unresolved rights', number(content.unresolvedRights))}</div>
      <div class="owner-status-block"><strong>Question lifecycle</strong><p>${statusPills(content.questionStatus)}</p></div>
      <div class="owner-status-block"><strong>Canonical notes</strong><p>${statusPills(content.canonicalNoteStatus)}</p></div>
      <div class="owner-status-block"><strong>Pending human review</strong><p>${statusPills(content.pendingReview)}</p></div>
      <p class="muted">Catalog last updated ${escape(dateTime(content.catalogUpdatedAt))}.</p>
    </section>

    <section id="owner-review-authority" class="panel">
      <div class="section-heading"><div><span class="eyebrow">HUMAN REVIEW AUTHORITY</span><h2>${temporary ? 'Temporary by design' : 'Authority state'}</h2><p>Owner status is permanent. Medical, References and Rights review permissions remain separate time-bounded grants.</p></div><span class="badge">${temporary ? 'TEMPORARY GRANTS' : 'CHECK POLICY'}</span></div>
      ${reviewGrantRows(data?.reviewAuthority)}
    </section>

    <section id="owner-ai" class="panel">
      <div class="section-heading"><div><span class="eyebrow">AI USAGE</span><h2>${ai.telemetryAvailable === true ? 'Canonical AI telemetry online' : 'Telemetry foundation not wired yet'}</h2><p>${escape(ai.message || '')}</p></div><span class="badge">${ai.telemetryAvailable === true ? 'LIVE' : 'NO FALSE NUMBERS'}</span></div>
      ${ai.telemetryAvailable === true ? '<p>AI run and cost ledgers are available for aggregation.</p>' : `<div class="review-packet"><strong>Required canonical ledgers</strong><p>${escape(Array.isArray(ai.requiredTelemetry) ? ai.requiredTelemetry.join(' + ') : 'ai_runs + ai_cost_ledger')}</p><p class="muted">Until calls are instrumented, the console intentionally shows no token or cost estimate.</p></div>`}
    </section>

    <section id="owner-infrastructure" class="panel">
      <div class="section-heading"><div><span class="eyebrow">INFRASTRUCTURE</span><h2>Runtime health</h2><p>Only observed signals are marked healthy. External management planes stay visibly unconnected until telemetry exists.</p></div><span class="badge">FAIL HONESTLY</span></div>
      ${infrastructureRows(infra)}
      <p class="muted">Catalog freshness checkpoint: ${escape(dateTime(infra.catalogFreshnessAt))}.</p>
    </section>
  </section>`;
}

function installOwnerNavigation() {
  const nav = app?.querySelector('.sidebar nav');
  if (!nav || nav.querySelector('[data-owner-nav]')) return;
  const links = [
    ['#owner-overview', 'Owner Overview'],
    ['#owner-users', 'Users'],
    ['#owner-learning', 'Analytics'],
    ['#owner-content', 'Content'],
    ['#owner-ai', 'AI Usage'],
    ['#owner-infrastructure', 'Infrastructure']
  ];
  for (const [href, label] of links) {
    const anchor = document.createElement('a');
    anchor.href = href;
    anchor.dataset.ownerNav = 'true';
    anchor.innerHTML = `${escape(label)}<span>↓</span>`;
    nav.append(anchor);
  }
}

function ownerHeading() {
  const heading = app?.querySelector('.workspace main#main > .page-heading');
  if (!heading) return;
  const eyebrow = heading.querySelector('.eyebrow');
  const title = heading.querySelector('h1');
  if (eyebrow) eyebrow.textContent = 'SINGLE MLOS OWNER';
  if (title) title.textContent = 'Operate the learning system without exposing owner controls to learners.';
}

function mountDashboard(data) {
  const main = app?.querySelector('.workspace main#main');
  if (!main || main.querySelector('#owner-console')) return;
  const heading = main.querySelector(':scope > .page-heading');
  if (!heading) return;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = dashboardMarkup(data);
  heading.insertAdjacentElement('afterend', wrapper.firstElementChild);
  ownerHeading();
  installOwnerNavigation();
}

async function enhance() {
  if (loading || app?.querySelector('#owner-console')) return;
  const main = app?.querySelector('.workspace main#main');
  if (!main) return;
  loading = true;
  try {
    const session = await auth.getSession();
    if (!session?.user) return;
    const dashboard = await owner.dashboard();
    if (dashboard?.contractId !== 'owner-admin-dashboard-v1' || dashboard?.owner?.singleton !== true) return;
    lastDashboard = dashboard;
    mountDashboard(dashboard);
  } catch (error) {
    if (Number(error?.status || 0) === 401 || Number(error?.status || 0) === 403) return;
    errorMonitor.capture(error, { component: 'owner-console', operation: 'load_dashboard', code: error?.code || null });
  } finally {
    loading = false;
  }
}

app?.addEventListener('submit', event => {
  const form = event.target.closest('#owner-learner-search-form');
  if (!form) return;
  event.preventDefault();
  const results = app.querySelector('#owner-learner-results');
  const query = String(new FormData(form).get('q') || '').trim();
  if (query.length < 2) return;
  if (results) results.innerHTML = '<p class="muted">Searching…</p>';
  (async () => {
    try {
      const payload = await owner.searchLearners(query);
      const learners = Array.isArray(payload?.learners) ? payload.learners : [];
      if (!results) return;
      results.innerHTML = learners.length
        ? `<div class="owner-search-results">${learners.map(learner => `<article><div><strong>${escape(learner.email || 'No email')}</strong>${learner.isAdmin === true ? '<span class="badge">OWNER</span>' : ''}</div><p>${escape(learner.id || '')}</p><small>Created ${escape(dateTime(learner.createdAt))} · last sign-in ${escape(dateTime(learner.lastSignInAt))}</small></article>`).join('')}</div>`
        : '<p class="muted">No matching learner identity.</p>';
    } catch (error) {
      if (results) results.innerHTML = '<p class="muted">Learner search unavailable.</p>';
      if (Number(error?.status || 0) >= 500) errorMonitor.capture(error, { component: 'owner-console', operation: 'search_learners', code: error?.code || null });
      announce('Learner search could not be completed.');
    }
  })();
});

if (app) {
  const observer = new MutationObserver(() => queueMicrotask(enhance));
  observer.observe(app, { childList: true, subtree: true });
  enhance();
}

export { dashboardMarkup, recentUsers, reviewGrantRows, infrastructureRows };
