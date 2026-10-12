// Read-only triage derived solely from the existing owner dashboard and alert contract.
// Never infer medical correctness, publication eligibility, mastery or an all-clear from missing telemetry.
const validCount = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const reviewKinds = [
  ['medical', 'Medical review pending', '/web/review.html?workspace=medical'],
  ['references', 'Reference review pending', '/web/review.html?workspace=references'],
  ['rights', 'Rights review pending', '/web/review.html?workspace=rights']
];
export function buildAdminActionInbox(dashboard, { alerts = null } = {}) {
  const content = dashboard?.content || {};
  const actions = [];
  const unresolvedRights = validCount(content.unresolvedRights);
  const openReports = validCount(content.openLearnerReports);
  const pending = content.pendingReview && typeof content.pendingReview === 'object' && !Array.isArray(content.pendingReview)
    ? content.pendingReview : null;
  const observedAlerts = Array.isArray(alerts) ? alerts : null;
  for (const alert of observedAlerts || []) {
    if (alert?.state !== 'open') continue;
    const severity = String(alert.severity || 'warning').toLowerCase();
    actions.push({
      kind: 'infrastructure', priority: severity === 'critical' ? 0 : 2,
      label: String(alert.provider || 'Infrastructure') + ' alert',
      detail: String(alert.status || 'Provider status requires inspection'),
      href: '/web/admin.html#owner-infrastructure-alerts',
      count: null
    });
  }
  if (openReports !== null && openReports > 0) actions.push({
    kind: 'learner-report', priority: 1, label: 'Learner-reported content issues',
    detail: 'Review exact reported versions; learner reports do not establish medical truth.',
    href: '/web/review.html', count: openReports
  });
  if (unresolvedRights !== null && unresolvedRights > 0) actions.push({
    kind: 'source-rights', priority: 1, label: 'Unresolved source rights',
    detail: 'Record verified reuse rights before considering affected items for publication.',
    href: '/web/review.html?workspace=rights', count: unresolvedRights
  });
  for (const [kind, label, href] of reviewKinds) {
    const count = validCount(pending?.[kind]);
    if (count !== null && count > 0) actions.push({
      kind: 'review-' + kind, priority: kind === 'medical' ? 2 : 3, label,
      detail: 'Human review only; a review queue count never confers publication authority.',
      href, count
    });
  }
  actions.sort((a, b) => a.priority - b.priority || a.kind.localeCompare(b.kind));
  const missing = [
    ...(observedAlerts ? [] : ['infrastructure alerts']),
    ...(openReports === null ? ['learner reports'] : []),
    ...(unresolvedRights === null ? ['source rights'] : []),
    ...(pending ? [] : ['human-review queues'])
  ];
  return { actions, missing, asOf: dashboard?.generatedAt || null };
}
