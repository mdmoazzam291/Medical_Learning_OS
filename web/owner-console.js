import { createSupabaseAuth } from '/src/adapters/supabase-auth.js';
import { createCloudOwner } from '/src/adapters/cloud-owner.js';
import { cloudConfig } from '/web/cloud-config.js';
import { errorMonitor } from '/web/monitoring.js';
import { buildAdminActionInbox } from '/src/domain/admin-action-inbox.js';
import { summarizeRecoveryEvidence } from '/src/domain/operational-recovery.js';
import { overviewMarkup } from '/web/admin-workspace-view.js';

const app = document.querySelector('#admin-app');
const notice = document.querySelector('#notice');
const auth = createSupabaseAuth({ ...cloudConfig });
const owner = createCloudOwner({ ...cloudConfig, auth });
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let loading = false;
let lastDashboard = null;
let latestAlerts = null;
let failedMain = null;

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

function recoveryEvidenceMarkup(infra) {
  const evidence = summarizeRecoveryEvidence(infra);
  const rows = evidence.rows.map(item => '<article class="owner-recovery-row"><div><strong>' + escape(item.label) +
    '</strong><small>' + escape(item.status) + ' · last observed ' + escape(dateTime(item.time)) +
    ' · run ' + escape(item.runStatus || 'unknown') + ' / ' + escape(item.conclusion || 'not reported') +
    '</small></div>' + (item.url ? '<a class="secondary action-link" href="' + escape(item.url) +
    '" target="_blank" rel="noopener noreferrer">Open run ↗</a>' : '') + '</article>').join('');
  return '<div id="owner-recovery" class="owner-status-block"><strong>Release & recovery evidence</strong>' +
    '<p class="muted">Latest recorded GitHub workflow outcomes for backup, storage audit and restore drill, not a guarantee of recovery or a fresh restore point.</p>' +
    '<div class="owner-recovery-evidence">' + rows + '</div>' +
    (evidence.completeness !== 'timestamps_observed'
      ? '<p class="muted">One or more workflow timestamps are unavailable. This view cannot confirm backup freshness.</p>'
      : '<p class="muted">Run timestamps are present for all three workflows; inspect logs and recovery checks before relying on them.</p>') +
    '</div>';
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

function actionInboxMarkup(dashboard, alerts = null) {
  const state = buildAdminActionInbox(dashboard, { alerts });
  const rows = state.actions.map(item => '<li class="owner-action-row"><div><strong>' + escape(item.label) +
    '</strong><p class="muted">' + escape(item.detail) + '</p></div><a class="secondary action-link" href="' +
    escape(item.href) + '">Inspect' + (item.count === null ? '' : ' (' + number(item.count) + ')') +
    ' →</a></li>').join('');
  const evidence = state.missing.length
    ? '<p class="muted">Not verified by this snapshot: ' + escape(state.missing.join(', ')) + '.</p>'
    : '<p class="muted">All listed signal families were returned; monitor availability and timestamp separately.</p>';
  return '<div class="section-heading"><div><span class="eyebrow">ACTION INBOX · READ ONLY</span><h2>What needs attention?</h2><p>Prioritized signals from authoritative owner counts and provider alert records. No action approves or publishes material.</p></div></div>' +
    (rows ? '<ul class="owner-action-inbox-list">' + rows + '</ul>'
      : '<p class="muted">No actionable issues were reported in the available evidence. This is not a system-wide all-clear.</p>') +
    evidence + '<p class="muted">Dashboard evidence: ' + escape(dateTime(state.asOf)) + '. Refresh to check for newer signals.</p>';
}
function refreshActionInbox() {
  const panel = app?.querySelector('#admin-actions');
  if (panel && lastDashboard) panel.innerHTML = actionInboxMarkup(lastDashboard, latestAlerts);
  const summary = app?.querySelector('#owner-home');
  if (summary && lastDashboard) summary.innerHTML = overviewMarkup(lastDashboard, latestAlerts);
}

const INTEGRITY_LABELS = {
  canonical_answer_conflict: 'Answer conflict in an exact question family',
  canonical_duplicate_family: 'Distinct canonical IDs contain the same stem and options',
  multiple_published_versions: 'More than one published version for a canonical question',
  missing_question_concept: 'Question refers to an absent concept',
  missing_question_source: 'Question refers to an absent source',
  missing_note_concept: 'Note refers to an absent concept',
  missing_note_source: 'Note refers to an absent source',
  missing_note_link_target: 'Note link refers to an absent note version',
  missing_question_link_target: 'Note link refers to an absent question',
  published_note_without_question: 'Published note has no linked canonical question',
  stale_question_graph_binding: 'Question graph metadata targets an older version',
  orphan_question_metadata: 'Question metadata has no canonical question',
  orphan_concept_metadata: 'Concept metadata has no canonical concept',
  repeated_pyq_occurrence: 'Same exam, year and session declared repeatedly'
};
function integrityMarkup(report) {
  if (report?.contractId !== 'owner-catalog-integrity-v1' || report?.scanComplete !== true ||
      report?.evidenceScope !== 'structural_only' || report?.clinicalAccuracyVerified !== false ||
      report?.rightsVerified !== false || !Array.isArray(report?.findings)) {
    return '<p class="muted">Incomplete or unexpected integrity contract. No audit findings can be trusted.</p>';
  }
  const x = report.totals || {};
  const rows = report.findings.map(f =>
    '<tr><td>' + escape(String(f.severity || 'unknown')) + '</td><td><strong>' +
    escape(INTEGRITY_LABELS[f.code] || String(f.code || 'unknown').replaceAll('_', ' ')) +
    '</strong><small>' + escape(f.code || '') + '</small></td><td>' +
    escape(f.entityType || '') + '</td><td><code>' + escape(f.entityId || '') +
    '</code></td><td>' + escape(Array.isArray(f.relatedIds) ? f.relatedIds.join(', ') : '') +
    '</td></tr>').join('');
  return '<p class="muted">Catalog v' + escape(report.catalogVersion) + ' · scanned ' +
    escape(report.observedAt || 'unknown time') + ' · complete structural scan: yes</p>' +
    '<div class="owner-metrics">' +
    metric('Questions', number(x.questions)) + metric('Concepts', number(x.concepts)) +
    metric('Sources', number(x.sources)) + metric('Notes', number(x.notes)) +
    metric('Graph edges', number(x.noteQuestionLinks)) + metric('Findings', number(report.findingCount)) +
    '</div>' + (report.emptyCatalog
      ? '<p>No canonical catalog content exists to assess yet. This is not proof of future-content quality.</p>'
      : report.findingCount === 0
        ? '<p>No structural inconsistencies detected within this snapshot. Medical accuracy, rights and contextual equivalence are not assessed.</p>'
        : '<p><strong>' + number(report.findingCount) +
          ' structural findings require investigation.</strong> Review exact IDs before considering repairs; nothing is changed automatically.</p>') +
    (rows ? '<div class="owner-table-wrap"><table class="owner-table"><thead><tr><th>Severity</th><th>Finding</th><th>Entity</th><th>ID</th><th>Related IDs</th></tr></thead><tbody>' +
      rows + '</tbody></table></div>' : '') +
    (report.findingsTruncated ? '<p class="muted">Only the first finding samples are shown. Totals include the complete bounded scan.</p>' : '') +
    '<p class="muted">Snapshot limitation: catalog version is rechecked, but metadata and note tables are read separately, not in one database transaction. A changing catalog should be re-audited. Clinical correctness, source licensing and semantic duplicates still require independent human review.</p>';
}
async function runContentIntegrity() {
  const output = app?.querySelector('#owner-integrity-results');
  const button = app?.querySelector('[data-owner-integrity-run]');
  if (!output || !button || button.disabled) return;
  button.disabled = true;
  output.innerHTML = '<p class="muted">Scanning catalog, note links and metadata…</p>';
  try {
    output.innerHTML = integrityMarkup(await owner.contentIntegrity());
  } catch (error) {
    output.innerHTML = '<p class="muted">Audit unavailable: ' +
      escape(error?.code || error?.message || 'read_failed') +
      '. No clean-status claim can be made. Retry after checking the owner API deployment.</p>';
    if (Number(error?.status || 0) >= 500) errorMonitor.capture(error, { component: 'owner-console', operation: 'content_integrity' });
  } finally {
    button.disabled = false;
  }
}


function sourceWatchMarkup(report) {
  if (report?.contractId !== 'owner-medical-source-watch-v1' ||
      report?.scope !== 'owner_submitted_evidence_only' ||
      report?.automatedWebChecks !== false ||
      report?.medicalUpdateVerified !== false ||
      report?.clinicalApprovalGranted !== false || !Array.isArray(report.sources)) {
    return '<p class="muted">Unrecognized source-watch evidence contract. No findings can be trusted.</p>';
  }
  const statuses = {
    possible_retirement: 'Possible source retirement',
    possible_version_change: 'Possible version change',
    not_monitored: 'No source sighting recorded'
  };
  const impact = (title, ids) => ids?.length
    ? '<div><strong>' + escape(title) + ' (' + number(ids.length) + ')</strong><small>' + escape(ids.join(', ')) + '</small></div>'
    : '';
  const rows = report.sources.map(source => {
    const a = source.affected || {}, o = source.sighting;
    return '<article class="owner-status-block"><div class="section-heading"><div><strong>' +
      escape(source.title || source.sourceId) + '</strong><p class="muted">Source ID ' +
      escape(source.sourceId) + ' · cited version ' + escape(source.citedVersion) +
      '</p></div><span class="badge">' + escape(statuses[source.status] || 'Status unavailable') +
      '</span></div><p class="muted">Directly referenced published and in-review items: ' +
      number(source.affectedCount) + '</p>' +
      (o ? '<p>Owner-submitted evidence: ' + escape(o.observedVersion || 'Possible retirement') +
        ' · recorded ' + escape(dateTime(o.recordedAt)) + '</p><p>' +
        escape(o.evidenceNote) + '</p><p class="muted">Evidence URL: ' +
        escape(o.evidenceUrl) + '</p>' : '') +
      '<div class="owner-source-impact">' +
      impact('Published question versions', a.publishedQuestionVersions) +
      impact('In-review question versions', a.inReviewQuestionVersions) +
      impact('Published note versions', a.publishedNoteVersions) +
      impact('In-review note versions', a.inReviewNoteVersions) +
      '</div></article>';
  }).join('');
  const options = report.sources.map(src => '<option value="' + escape(src.sourceId) +
    '">' + escape(src.title || src.sourceId) + ' (' + escape(src.sourceId) + ', cited ' +
    escape(src.citedVersion) + ')</option>').join('');
  const form = report.sources.length ? `
    <form id="owner-source-sighting-form" class="owner-source-form">
      <h3>Record a possible reference change</h3>
      <p class="muted">This saves a timestamped owner observation, not independent proof that a medical guideline changed. Use the exact reference and provide externally reviewable evidence.</p>
      <label>Canonical source<select name="sourceId" required>${options}</select></label>
      <label>Evidence type<select name="kind" required>
        <option value="version_seen">Different version observed</option>
        <option value="source_retired">Possible source retirement</option>
      </select></label>
      <label>Observed version (leave empty for possible retirement)<input name="observedVersion" maxlength="300" placeholder="Exact edition, revision identifier or date"></label>
      <label>Source evidence URL (HTTPS)<input name="evidenceUrl" type="url" pattern="https://.*" maxlength="2000" required placeholder="https://official-source.example/..."></label>
      <label>Evidence and why this matters<textarea name="evidenceNote" minlength="20" maxlength="2000" required placeholder="Describe the exact revision or retirement evidence."></textarea></label>
      <button class="secondary" type="submit">Save evidence sighting</button>
    </form>` : '<p class="muted">No canonical sources are present. New PYQ/content imports must pass the existing review process first.</p>';
  return '<span data-watch-catalog-version="' + escape(report.catalogVersion) +
    '" hidden></span><p class="muted">Catalog v' + escape(report.catalogVersion) +
    ' · source records ' + number(report.sourceCount) +
    ' · sources with owner sightings ' + number(report.sourcesWithSightings) +
    ' · with affected content awaiting independent verification ' + number(report.pendingVerification) +
    '</p><p class="muted">No automatic website checks have run. Neither observed versions nor their effect on medical truth have been independently confirmed. Older sightings for superseded source versions are not active alerts.</p>' +
    (report.unmatchedHistoricalSightings
      ? '<p class="muted">Historical sightings excluded by current source identity/version: ' +
        number(report.unmatchedHistoricalSightings) + '.</p>' : '') + rows + form +
    '<p class="muted">Use Reference Review for actual medical evaluation. Source-rights decisions and content publication remain separate human gates.</p>';
}
async function runSourceWatch() {
  const output = app?.querySelector('#owner-source-watch-results');
  const button = app?.querySelector('[data-owner-source-watch-run]');
  if (!output || !button || button.disabled) return;
  button.disabled = true;
  output.innerHTML = '<p class="muted">Reading canonical references and owner evidence…</p>';
  try { output.innerHTML = sourceWatchMarkup(await owner.sourceWatch()); }
  catch (error) {
    output.innerHTML = '<p class="muted">Source-watch evidence unavailable: ' +
      escape(error?.code || error?.message || 'read_failed') +
      '. Nothing has been verified automatically.</p>';
    if (Number(error?.status || 0) >= 500) errorMonitor.capture(error, { component: 'owner-console', operation: 'source_watch_read' });
  } finally { button.disabled = false; }
}
async function submitSourceSighting(form) {
  const button = form.querySelector('button[type="submit"]');
  if (button?.disabled) return;
  const source = app?.querySelector('#owner-source-watch-results');
  const version = Number(source?.querySelector('[data-watch-catalog-version]')?.dataset.watchCatalogVersion);
  if (!Number.isSafeInteger(version)) { announce('Load the current source watch first.'); return; }
  const data = new FormData(form);
  const kind = String(data.get('kind') || '');
  const observedVersion = String(data.get('observedVersion') || '').trim();
  if (kind === 'version_seen' && !observedVersion) {
    announce('Enter the different version you observed.'); return;
  }
  if (kind === 'source_retired' && observedVersion) {
    announce('Remove the observed version when reporting retirement.'); return;
  }
  if (button) button.disabled = true;
  try {
    const receipt = await owner.recordSourceSighting({
      requestId: crypto.randomUUID(), sourceId: String(data.get('sourceId') || ''),
      kind, observedVersion: kind === 'source_retired' ? null : observedVersion,
      evidenceUrl: String(data.get('evidenceUrl') || '').trim(),
      evidenceNote: String(data.get('evidenceNote') || '').trim(),
      catalogVersion: version
    });
    if (receipt.contractId !== 'owner-medical-source-sighting-receipt-v1') {
      throw Error('unexpected_sighting_receipt');
    }
    announce('Source sighting recorded; independent medical review remains required.');
    await runSourceWatch();
  } catch (error) {
    announce('Evidence was not recorded: ' + (error?.code || error?.message || 'source_sighting_failed') + '.');
    if (Number(error?.status || 0) >= 500) errorMonitor.capture(error, { component: 'owner-console', operation: 'source_watch_write' });
  } finally { if (button) button.disabled = false; }
}

function dashboardMarkup(data) {
  const users = data?.users || {};
  const learning = data?.learning || {};
  const content = data?.content || {};
  const ai = data?.ai || {};
  const infra = data?.infrastructure || {};
  const learnerAdmin = data?.learnerAdministration || {};
  const temporary = data?.reviewAuthority?.temporary === true;

  return `<section id="owner-console" class="owner-console" aria-label="Medretica owner console">
    <section id="owner-home" class="panel" data-admin-panel="overview" hidden>${overviewMarkup(data, latestAlerts)}</section>
    <section id="admin-actions" class="panel" data-admin-panel="actions" hidden>${actionInboxMarkup(data, latestAlerts)}</section>
    <section id="owner-overview" class="panel owner-hero" data-admin-panel="snapshot" hidden>
      <div class="section-heading"><div><span class="eyebrow">MEDRETICA OWNER</span><h2>Platform control tower</h2><p>Operational visibility and controlled owner actions. Authorization is server-side; every learner mutation is audited.</p></div><span class="badge">OWNER ONLY</span></div>
      <div class="owner-metrics">${metric('Learners', number(users.total), `${number(users.new7d)} new · 7d`)}${metric('Active learners', number(learning.activeLearners7d), 'attempt evidence · 7d')}${metric('Beta learners', number(learnerAdmin.activeBetaLearners), 'active access grants')}${metric('Suspended', number(learnerAdmin.suspendedLearners), 'auth bans active')}${metric('Questions', number(content.questions), `catalog v${number(content.catalogVersion)}`)}${metric('Database', bytes(infra.databaseBytes), `${number(infra.publicTableCount)} public tables`)}</div>
      <p class="muted">Snapshot ${escape(dateTime(data?.generatedAt))} · owner ${escape(data?.owner?.email || 'authenticated singleton')} · ${number(learnerAdmin.auditEvents)} learner-admin audit events</p>
    </section>

    <section id="owner-users" class="panel" data-admin-panel="users" hidden>
      <div class="section-heading"><div><span class="eyebrow">USERS + ACCESS</span><h2>Controlled learner administration</h2><p>Beta access is application state. Suspension uses Supabase Auth banning. Every write requires a reason, typed confirmation, and immutable audit receipt.</p></div><span class="badge">${number(users.total)} total</span></div>
      <div class="owner-metrics">${metric('New · 7d', number(users.new7d))}${metric('Signed in · 7d', number(users.signedIn7d))}${metric('Beta active', number(learnerAdmin.activeBetaLearners))}${metric('Suspended', number(learnerAdmin.suspendedLearners))}</div>
      <form id="owner-learner-search-form" class="owner-search"><label for="owner-learner-query">Find learner by email or exact user ID</label><div><input id="owner-learner-query" name="q" type="search" minlength="2" maxlength="160" autocomplete="off" placeholder="email or user UUID" required><button class="secondary" type="submit">Search</button></div></form>
      <div id="owner-learner-results" aria-live="polite"></div><div id="owner-learner-detail" aria-live="polite"></div>
      <h3>Recently created</h3>${recentUsers(users.recent)}
    </section>

    <section id="owner-learning" class="panel" data-admin-panel="learning" hidden>
      <div class="section-heading"><div><span class="eyebrow">LEARNING ANALYTICS</span><h2>Evidence, not engagement theatre</h2><p>Raw platform activity counts are shown separately from inferred mastery.</p></div><span class="badge">7-DAY WINDOW</span></div>
      <div class="owner-metrics">${metric('Attempts', number(learning.attempts7d), `${number(learning.attemptsTotal)} lifetime`)}${metric('Sessions', number(learning.sessions7d), `${number(learning.openSessions)} open now`)}${metric('Exam runs', number(learning.examRuns7d), `${number(learning.examRunsTotal)} lifetime`)}${metric('Completed exams', number(learning.examCompletedTotal))}</div>
      <p class="muted">Latest recorded study attempt: ${escape(dateTime(learning.latestAttemptAt))}.</p>
    </section>

    <section id="owner-content" class="panel" data-admin-panel="content" hidden>
      <div class="section-heading"><div><span class="eyebrow">CONTENT SYSTEM</span><h2>Canonical content + review pipeline</h2><p>Concepts, questions, sources, NeuralVault notes and learner reports remain governed independently from learner access.</p></div><a class="primary action-link" href="/web/review.html">Open Content Review →</a></div>
      <div class="owner-metrics">${metric('Concepts', number(content.concepts))}${metric('Sources', number(content.sources))}${metric('Questions', number(content.questions))}${metric('Review evidence', number(content.reviewEvidence))}${metric('Learner reports', number(content.openLearnerReports), 'open')}${metric('Unresolved rights', number(content.unresolvedRights))}</div>
      <div class="owner-status-block"><strong>Question lifecycle</strong><p>${statusPills(content.questionStatus)}</p></div><div class="owner-status-block"><strong>Canonical notes</strong><p>${statusPills(content.canonicalNoteStatus)}</p></div><div class="owner-status-block"><strong>Pending human review</strong><p>${statusPills(content.pendingReview)}</p></div>
    </section>

    <section id="owner-coverage" class="panel" data-admin-panel="coverage" hidden aria-label="Coverage Index">
      <div id="owner-coverage-body"><p>Open Coverage Index to load the current inventory.</p></div><section id="owner-concept-editor" class="concept-editor" aria-label="Concept draft editor"></section>
    </section>

    <section id="owner-integrity" class="panel" data-admin-panel="integrity" hidden aria-label="Catalog integrity audit">
      <div class="section-heading"><div><span class="eyebrow">CONTENT &amp; KNOWLEDGE GRAPH</span><h2>Catalog-wide integrity</h2><p>Scan canonical question versions, PYQ metadata, sources and linked NeuralVault notes. Diagnostic only, never a publication or deletion action.</p></div><button class="secondary" type="button" data-owner-integrity-run>Run read-only audit</button></div>
      <div id="owner-integrity-results" role="status" aria-live="polite"><p class="muted">No audit has been run in this session.</p></div>
    </section>

    <section id="owner-source-watch" class="panel" data-admin-panel="source-watch" hidden aria-label="Medical source change surveillance">
      <div class="section-heading"><div><span class="eyebrow">MEDICAL SOURCE GOVERNANCE</span><h2>Source change watch</h2><p>Evidence-based version observations linked to exact affected question and note versions. No automated clinical updates.</p></div><button class="secondary" type="button" data-owner-source-watch-run>Load source watch</button></div>
      <div id="owner-source-watch-results" aria-live="polite"><p class="muted">Source-watch evidence has not been loaded in this session.</p></div>
    </section>

    <section id="owner-review-authority" class="panel" data-admin-panel="authority" hidden>
      <div class="section-heading"><div><span class="eyebrow">HUMAN REVIEW AUTHORITY</span><h2>${temporary ? 'Temporary by design' : 'Authority state'}</h2><p>Owner status is persistent. Medical, References and Rights review permissions remain separate time-bounded grants.</p></div><span class="badge">${temporary ? 'TEMPORARY GRANTS' : 'CHECK POLICY'}</span></div>${reviewGrantRows(data?.reviewAuthority)}
    </section>

    <section id="owner-ai" class="panel" data-admin-panel="ai" hidden>
      <div class="section-heading"><div><span class="eyebrow">AI USAGE</span><h2>${ai.telemetryAvailable === true ? 'Canonical AI telemetry online' : 'Telemetry foundation not wired yet'}</h2><p>${escape(ai.message || '')}</p></div><span class="badge">${ai.telemetryAvailable === true ? 'LIVE' : 'NO FALSE NUMBERS'}</span></div>
      ${ai.telemetryAvailable === true ? '<p>AI run and cost ledgers are available for aggregation.</p>' : `<div class="review-packet"><strong>Required canonical ledgers</strong><p>${escape(Array.isArray(ai.requiredTelemetry) ? ai.requiredTelemetry.join(' + ') : 'ai_runs + ai_cost_ledger')}</p></div>`}
    </section>

    <section id="owner-infrastructure" class="panel" data-admin-panel="health" hidden>
      <div class="section-heading"><div><span class="eyebrow">INFRASTRUCTURE</span><h2>End-to-end operational signals</h2><p>Cloudflare and R2 are live-probed. Resend is sourced from verified account telemetry snapshots. Sentry shows configured SDK state until a read token is connected.</p></div><span class="badge">EVIDENCE ONLY</span></div>${infrastructureRows(infra)}
      ${recoveryEvidenceMarkup(infra)}
      <p class="muted">Catalog freshness checkpoint: ${escape(dateTime(infra.catalogFreshnessAt))}.</p>
    </section>
  </section>`;
}


function ownerHeading() {
  const heading = app?.querySelector('.workspace main#main > .page-heading');
  if (!heading) return;
  const eyebrow = heading.querySelector('.eyebrow');
  if (eyebrow) eyebrow.textContent = 'MEDRETICA OWNER';
}

function mountDashboard(data) {
  const main = app?.querySelector('.workspace main#main');
  if (!main || main.querySelector('#owner-console')) return;
  const heading = main.querySelector(':scope > .page-heading');
  if (!heading) return;
  const wrapper = document.createElement('div'); wrapper.innerHTML = dashboardMarkup(data); heading.insertAdjacentElement('afterend', wrapper.firstElementChild);
  ownerHeading();
  window.dispatchEvent(new CustomEvent('mlos:admin-ready'));
}

async function enhance() {
  if (loading || app?.querySelector('#owner-console')) return;
  const main = app?.querySelector('.workspace main#main');
  if (!main || main === failedMain) return;
  loading = true;
  app.dataset.ownerState = 'loading';
  try {
    const session = await auth.getSession();
    if (!session?.user) return;
    const dashboard = await owner.dashboard();
    if (app.querySelector('.workspace main#main') !== main) return;
    if (dashboard?.contractId !== 'owner-admin-dashboard-v1' || dashboard?.owner?.singleton !== true) throw Error('owner_dashboard_invalid_payload');
    app.dataset.ownerState = 'loaded';
    failedMain = null;
    latestAlerts = null;
    lastDashboard = dashboard; mountDashboard(dashboard);
  } catch (error) {
    if (app.querySelector('.workspace main#main') === main) {
      failedMain = main;
      app.dataset.ownerState = 'unavailable';
      window.dispatchEvent(new CustomEvent('mlos:admin-ready'));
    }
    if (![401,403].includes(Number(error?.status || 0))) errorMonitor.capture(error, { component: 'owner-console', operation: 'load_dashboard', code: error?.code || null });
  } finally {
    loading = false;
    const currentMain = app.querySelector('.workspace main#main');
    if (currentMain && currentMain !== main) queueMicrotask(enhance);
  }
}

async function showLearner(learnerId) {
  const target = app?.querySelector('#owner-learner-detail');
  if (!target) return;
  target.innerHTML = '<p class="muted">Loading learner administration…</p>';
  try { target.innerHTML = learnerDetailMarkup(await owner.learnerDetail(learnerId)); }
  catch (error) { target.innerHTML = '<p class="muted">Learner details unavailable.</p>'; if (Number(error?.status || 0) >= 500) errorMonitor.capture(error, { component: 'owner-console', operation: 'learner_detail' }); }
}

app?.addEventListener('click', event => {
  if (event.target.closest('[data-owner-dashboard-retry]')) { failedMain = null; enhance(); return; }
  if (event.target.closest('[data-owner-integrity-run]')) { runContentIntegrity(); return; }
  if (event.target.closest('[data-owner-source-watch-run]')) { runSourceWatch(); return; }
  const button = event.target.closest('[data-owner-learner-id]');
  if (!button) return;
  showLearner(button.dataset.ownerLearnerId);
});

app?.addEventListener('submit', event => {
  const sighting = event.target.closest('#owner-source-sighting-form');
  if (sighting) { event.preventDefault(); submitSourceSighting(sighting); return; }
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

window.addEventListener('mlos:owner-alerts', event => {
  latestAlerts = Array.isArray(event.detail?.alerts) ? event.detail.alerts : null;
  refreshActionInbox();
});

if (app) {
  const observer = new MutationObserver(() => queueMicrotask(enhance));
  observer.observe(app, { childList: true, subtree: true });
  enhance();
}

export { sourceWatchMarkup, integrityMarkup, recoveryEvidenceMarkup, actionInboxMarkup, dashboardMarkup, recentUsers, reviewGrantRows, infrastructureRows, learnerDetailMarkup, learnerSearchResults };
