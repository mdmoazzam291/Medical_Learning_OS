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

function providerStatusClass(status) {
  return status === 'healthy' ? 'good' : status === 'configured' ? 'info' : 'warn';
}

function infraCard(name, provider, detail) {
  const status = provider?.status || 'unavailable';
  return `<article><span class="owner-health-dot ${providerStatusClass(status)}"></span><div><strong>${escape(name)}</strong><small>${escape(status)}${detail ? ` · ${escape(detail)}` : ''}</small></div></article>`;
}

function infrastructureRows(infra) {
  const storage = infra?.supabaseStorage || {};
  const edge = infra?.cloudflare || {};
  const r2 = infra?.r2 || {};
  const resend = infra?.resend || {};
  const sentry = infra?.sentry || {};
  const resendMetrics = resend.metrics || {};
  const r2Detail = r2.backup?.updatedAt ? `backup ${dateTime(r2.backup.updatedAt)}` : 'backup workflow unavailable';
  const resendDetail = resend.observedAt ? `${number(resendMetrics.monthlyUsed)} / ${number(resendMetrics.monthlyLimit)} monthly · observed ${dateTime(resend.observedAt)}` : 'no recent connector snapshot';
  const sentryDetail = sentry.metrics?.readTelemetryConnected === true ? 'read telemetry connected' : sentry.metrics?.clientSdkConfigured === true ? 'SDK configured · read token not connected' : 'not connected';
  return `<div class="owner-health-grid">
    ${infraCard('Supabase database', { status: infra?.database === 'healthy' ? 'healthy' : 'degraded' }, `${bytes(infra?.databaseBytes)} · ${number(infra?.publicTableCount)} public tables`)}
    ${infraCard('Owner API', infra?.ownerApi || {}, infra?.ownerApi?.version || '—')}
    ${infraCard('Supabase Storage', storage, `${number(storage.bucketCount)} buckets`)}
    ${infraCard('Cloudflare edge', edge, edge.latencyMs != null ? `${number(edge.latencyMs)} ms probe` : 'live health probe')}
    ${infraCard('R2 backup system', r2, r2Detail)}
    ${infraCard('Resend', resend, resendDetail)}
    ${infraCard('Sentry', sentry, sentryDetail)}
  </div>`;
}

function learnerSearchResults(learners) {
  if (!learners.length) return '<p class="muted">No matching learner identity.</p>';
  return `<div class="owner-search-results">${learners.map(learner => `<article><div><strong>${escape(learner.email || 'No email')}</strong>${learner.isAdmin === true ? '<span class="badge">OWNER</span>' : ''}${learner.betaActive === true ? '<span class="badge">BETA</span>' : ''}${learner.isSuspended === true ? '<span class="badge">SUSPENDED</span>' : ''}</div><p>${escape(learner.id || '')}</p><small>Created ${escape(dateTime(learner.createdAt))} · last sign-in ${escape(dateTime(learner.lastSignInAt))}</small><p><button class="secondary" type="button" data-owner-learner-id="${escape(learner.id || '')}">Manage learner</button></p></article>`).join('')}</div>`;
}

function actionForm(action, title, confirmation, extra = '') {
  return `<form class="owner-action-form" data-action="${escape(action)}"><h4>${escape(title)}</h4>${extra}<label>Reason<textarea name="reason" minlength="10" maxlength="1000" required placeholder="Why is this change necessary?"></textarea></label><label>Type <strong>${escape(confirmation)}</strong> to confirm<input name="confirmation" autocomplete="off" required></label><button class="${action === 'suspend' || action === 'revoke_beta' ? 'secondary' : 'primary'}" type="submit">${escape(title)}</button></form>`;
}

function learnerDetailMarkup(payload) {
  const learner = payload?.learner || {};
  const audit = Array.isArray(payload?.audit) ? payload.audit : [];
  const ownerProtected = learner.isAdmin === true;
  const betaExtra = '<label>Beta access until<input name="betaAccessUntil" type="datetime-local" required></label>';
  const suspendExtra = '<label>Suspension duration<select name="suspensionHours" required><option value="24">24 hours</option><option value="168">7 days</option><option value="720">30 days</option><option value="8760">1 year</option></select></label>';
  const actions = ownerProtected
    ? '<div class="review-packet"><strong>Owner account protected</strong><p class="muted">The singleton owner cannot be beta-mutated, suspended, or restored through learner administration.</p></div>'
    : `<div class="owner-action-grid">${actionForm('grant_beta','Grant beta access','GRANT BETA',betaExtra)}${actionForm('revoke_beta','Revoke beta access','REVOKE BETA')}${actionForm('suspend','Suspend account','SUSPEND',suspendExtra)}${actionForm('restore','Restore account','RESTORE')}</div>`;
  const history = audit.length
    ? `<div class="owner-audit-list">${audit.map(event => `<article><div><strong>${escape(event.action || '')}</strong><span>${escape(dateTime(event.createdAt))}</span></div><p>${escape(event.reason || '')}</p></article>`).join('')}</div>`
    : '<p class="muted">No owner administration events for this learner.</p>';
  return `<div class="owner-learner-detail" data-learner-id="${escape(learner.id || '')}"><div class="section-heading"><div><span class="eyebrow">LEARNER ADMINISTRATION</span><h3>${escape(learner.email || learner.id || 'Learner')}</h3><p>${escape(learner.id || '')}</p></div><div>${learner.betaActive === true ? '<span class="badge">BETA ACTIVE</span>' : '<span class="badge">STANDARD ACCESS</span>'} ${learner.isSuspended === true ? '<span class="badge">SUSPENDED</span>' : '<span class="badge">AUTH ACTIVE</span>'}</div></div><div class="owner-metrics">${metric('Beta until', learner.betaActive ? dateTime(learner.betaAccessUntil) : 'None')}${metric('Suspended until', learner.isSuspended ? dateTime(learner.bannedUntil) : 'No')}${metric('Last sign-in', dateTime(learner.lastSignInAt))}</div>${actions}<h4>Immutable audit history</h4>${history}</div>`;
}

function dashboardMarkup(data) {
  const users = data?.users || {};
  const learning = data?.learning || {};
  const content = data?.content || {};
  const ai = data?.ai || {};
  const infra = data?.infrastructure || {};
  const learnerAdmin = data?.learnerAdministration || {};
  const temporary = data?.reviewAuthority?.temporary === true;

  return `<section id="owner-console" class="owner-console" aria-label="MLOS owner console">
    <section id="owner-overview" class="panel owner-hero">
      <div class="section-heading"><div><span class="eyebrow">SINGLETON MLOS OWNER</span><h2>Platform control tower</h2><p>Operational visibility and controlled owner actions. Authorization is server-side; every learner mutation is audited.</p></div><span class="badge">OWNER ONLY</span></div>
      <div class="owner-metrics">${metric('Learners', number(users.total), `${number(users.new7d)} new · 7d`)}${metric('Active learners', number(learning.activeLearners7d), 'attempt evidence · 7d')}${metric('Beta learners', number(learnerAdmin.activeBetaLearners), 'active access grants')}${metric('Suspended', number(learnerAdmin.suspendedLearners), 'auth bans active')}${metric('Questions', number(content.questions), `catalog v${number(content.catalogVersion)}`)}${metric('Database', bytes(infra.databaseBytes), `${number(infra.publicTableCount)} public tables`)}</div>
      <p class="muted">Snapshot ${escape(dateTime(data?.generatedAt))} · owner ${escape(data?.owner?.email || 'authenticated singleton')} · ${number(learnerAdmin.auditEvents)} learner-admin audit events</p>
    </section>

    <section id="owner-users" class="panel">
      <div class="section-heading"><div><span class="eyebrow">USERS + ACCESS</span><h2>Controlled learner administration</h2><p>Beta access is application state. Suspension uses Supabase Auth banning. Every write requires a reason, typed confirmation, and immutable audit receipt.</p></div><span class="badge">${number(users.total)} total</span></div>
      <div class="owner-metrics">${metric('New · 7d', number(users.new7d))}${metric('Signed in · 7d', number(users.signedIn7d))}${metric('Beta active', number(learnerAdmin.activeBetaLearners))}${metric('Suspended', number(learnerAdmin.suspendedLearners))}</div>
      <form id="owner-learner-search-form" class="owner-search"><label for="owner-learner-query">Find learner by email or exact user ID</label><div><input id="owner-learner-query" name="q" type="search" minlength="2" maxlength="160" autocomplete="off" placeholder="email or user UUID" required><button class="secondary" type="submit">Search</button></div></form>
      <div id="owner-learner-results" aria-live="polite"></div><div id="owner-learner-detail" aria-live="polite"></div>
      <h3>Recently created</h3>${recentUsers(users.recent)}
    </section>

    <section id="owner-learning" class="panel">
      <div class="section-heading"><div><span class="eyebrow">LEARNING ANALYTICS</span><h2>Evidence, not engagement theatre</h2><p>Raw platform activity counts are shown separately from inferred mastery.</p></div><span class="badge">7-DAY WINDOW</span></div>
      <div class="owner-metrics">${metric('Attempts', number(learning.attempts7d), `${number(learning.attemptsTotal)} lifetime`)}${metric('Sessions', number(learning.sessions7d), `${number(learning.openSessions)} open now`)}${metric('Exam runs', number(learning.examRuns7d), `${number(learning.examRunsTotal)} lifetime`)}${metric('Completed exams', number(learning.examCompletedTotal))}</div>
      <p class="muted">Latest recorded study attempt: ${escape(dateTime(learning.latestAttemptAt))}.</p>
    </section>

    <section id="owner-content" class="panel">
      <div class="section-heading"><div><span class="eyebrow">CONTENT SYSTEM</span><h2>Canonical content + review pipeline</h2><p>Concepts, questions, sources, NeuralVault notes and learner reports remain governed independently from learner access.</p></div><a class="primary action-link" href="/web/review.html">Open Content Review →</a></div>
      <div class="owner-metrics">${metric('Concepts', number(content.concepts))}${metric('Sources', number(content.sources))}${metric('Questions', number(content.questions))}${metric('Review evidence', number(content.reviewEvidence))}${metric('Learner reports', number(content.openLearnerReports), 'open')}${metric('Unresolved rights', number(content.unresolvedRights))}</div>
      <div class="owner-status-block"><strong>Question lifecycle</strong><p>${statusPills(content.questionStatus)}</p></div><div class="owner-status-block"><strong>Canonical notes</strong><p>${statusPills(content.canonicalNoteStatus)}</p></div><div class="owner-status-block"><strong>Pending human review</strong><p>${statusPills(content.pendingReview)}</p></div>
    </section>

    <section id="owner-review-authority" class="panel">
      <div class="section-heading"><div><span class="eyebrow">HUMAN REVIEW AUTHORITY</span><h2>${temporary ? 'Temporary by design' : 'Authority state'}</h2><p>Owner status is persistent. Medical, References and Rights review permissions remain separate time-bounded grants.</p></div><span class="badge">${temporary ? 'TEMPORARY GRANTS' : 'CHECK POLICY'}</span></div>${reviewGrantRows(data?.reviewAuthority)}
    </section>

    <section id="owner-ai" class="panel">
      <div class="section-heading"><div><span class="eyebrow">AI USAGE</span><h2>${ai.telemetryAvailable === true ? 'Canonical AI telemetry online' : 'Telemetry foundation not wired yet'}</h2><p>${escape(ai.message || '')}</p></div><span class="badge">${ai.telemetryAvailable === true ? 'LIVE' : 'NO FALSE NUMBERS'}</span></div>
      ${ai.telemetryAvailable === true ? '<p>AI run and cost ledgers are available for aggregation.</p>' : `<div class="review-packet"><strong>Required canonical ledgers</strong><p>${escape(Array.isArray(ai.requiredTelemetry) ? ai.requiredTelemetry.join(' + ') : 'ai_runs + ai_cost_ledger')}</p></div>`}
    </section>

    <section id="owner-infrastructure" class="panel">
      <div class="section-heading"><div><span class="eyebrow">INFRASTRUCTURE</span><h2>End-to-end operational signals</h2><p>Cloudflare and R2 are live-probed. Resend is sourced from verified account telemetry snapshots. Sentry shows configured SDK state until a read token is connected.</p></div><span class="badge">EVIDENCE ONLY</span></div>${infrastructureRows(infra)}
      <p class="muted">Catalog freshness checkpoint: ${escape(dateTime(infra.catalogFreshnessAt))}.</p>
    </section>
  </section>`;
}

function installOwnerNavigation() {
  const nav = app?.querySelector('.sidebar nav');
  if (!nav || nav.querySelector('[data-owner-nav]')) return;
  for (const [href, label] of [['#owner-overview','Owner Overview'],['#owner-users','Users'],['#owner-learning','Analytics'],['#owner-content','Content'],['#owner-ai','AI Usage'],['#owner-infrastructure','Infrastructure']]) {
    const anchor = document.createElement('a');
    anchor.href = href; anchor.dataset.ownerNav = 'true'; anchor.innerHTML = `${escape(label)}<span>↓</span>`; nav.append(anchor);
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
  const wrapper = document.createElement('div'); wrapper.innerHTML = dashboardMarkup(data); heading.insertAdjacentElement('afterend', wrapper.firstElementChild);
  ownerHeading(); installOwnerNavigation();
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
    lastDashboard = dashboard; mountDashboard(dashboard);
  } catch (error) {
    if (![401,403].includes(Number(error?.status || 0))) errorMonitor.capture(error, { component: 'owner-console', operation: 'load_dashboard', code: error?.code || null });
  } finally { loading = false; }
}

async function showLearner(learnerId) {
  const target = app?.querySelector('#owner-learner-detail');
  if (!target) return;
  target.innerHTML = '<p class="muted">Loading learner administration…</p>';
  try { target.innerHTML = learnerDetailMarkup(await owner.learnerDetail(learnerId)); }
  catch (error) { target.innerHTML = '<p class="muted">Learner details unavailable.</p>'; if (Number(error?.status || 0) >= 500) errorMonitor.capture(error, { component: 'owner-console', operation: 'learner_detail' }); }
}

app?.addEventListener('click', event => {
  const button = event.target.closest('[data-owner-learner-id]');
  if (!button) return;
  showLearner(button.dataset.ownerLearnerId);
});

app?.addEventListener('submit', event => {
  const search = event.target.closest('#owner-learner-search-form');
  if (search) {
    event.preventDefault();
    const results = app.querySelector('#owner-learner-results');
    const query = String(new FormData(search).get('q') || '').trim();
    if (query.length < 2) return;
    if (results) results.innerHTML = '<p class="muted">Searching…</p>';
    (async () => {
      try { const payload = await owner.searchLearners(query); if (results) results.innerHTML = learnerSearchResults(Array.isArray(payload?.learners) ? payload.learners : []); }
      catch (error) { if (results) results.innerHTML = '<p class="muted">Learner search unavailable.</p>'; announce('Learner search could not be completed.'); }
    })();
    return;
  }

  const actionFormElement = event.target.closest('.owner-action-form');
  if (!actionFormElement) return;
  event.preventDefault();
  const detail = actionFormElement.closest('[data-learner-id]');
  const learnerId = detail?.dataset.learnerId;
  if (!learnerId) return;
  const data = new FormData(actionFormElement);
  const action = actionFormElement.dataset.action;
  const betaRaw = data.get('betaAccessUntil');
  let betaAccessUntil = null;
  if (action === 'grant_beta') {
    const parsed = new Date(String(betaRaw || ''));
    if (Number.isNaN(parsed.getTime())) { announce('Choose a valid beta access expiry.'); return; }
    betaAccessUntil = parsed.toISOString();
  }
  const button = actionFormElement.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  (async () => {
    try {
      await owner.learnerAction({
        learnerId,
        action,
        reason: String(data.get('reason') || ''),
        confirmation: String(data.get('confirmation') || ''),
        requestId: crypto.randomUUID(),
        betaAccessUntil,
        suspensionHours: action === 'suspend' ? Number(data.get('suspensionHours')) : null
      });
      announce('Learner administration action recorded with an immutable audit receipt.');
      await showLearner(learnerId);
    } catch (error) {
      announce('Action not applied: ' + (error?.code || error?.message || 'owner_action_failed') + '.');
      if (Number(error?.status || 0) >= 500) errorMonitor.capture(error, { component: 'owner-console', operation: 'learner_action', code: error?.code || null });
    } finally { if (button) button.disabled = false; }
  })();
});

if (app) {
  const observer = new MutationObserver(() => queueMicrotask(enhance));
  observer.observe(app, { childList: true, subtree: true });
  enhance();
}

export { dashboardMarkup, recentUsers, reviewGrantRows, infrastructureRows, learnerDetailMarkup, learnerSearchResults };
