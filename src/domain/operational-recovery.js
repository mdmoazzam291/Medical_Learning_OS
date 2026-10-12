// A read-only presentation of the owner API's existing GitHub workflow signals.
// A successful run is not proof of complete recovery or a current restore point.
const workflows = Object.freeze([
  ['backup', 'Backup pipeline'],
  ['storageAudit', 'R2 storage audit'],
  ['restoreDrill', 'Restore drill']
]);
function safeWorkflowUrl(value) {
  if (typeof value !== 'string') return null;
  const prefix = 'https://github.com/mdmoazzam291/Medical_Learning_OS/actions/runs/';
  return value.startsWith(prefix) && /^\d+$/.test(value.slice(prefix.length)) ? value : null;
}
export function summarizeRecoveryEvidence(infrastructure = {}) {
  const r2 = infrastructure?.r2 || {};
  const rows = workflows.map(([key, label]) => {
    const x = r2[key] || {};
    const time = typeof x.updatedAt === 'string' && !Number.isNaN(Date.parse(x.updatedAt)) ? x.updatedAt : null;
    const status = ['healthy','degraded','configured','unavailable'].includes(x.status) ? x.status : 'unavailable';
    const conclusion = typeof x.conclusion === 'string' ? x.conclusion : null;
    const runStatus = typeof x.runStatus === 'string' ? x.runStatus : null;
    return { key, label, status, time, conclusion, runStatus, url: safeWorkflowUrl(x.htmlUrl) };
  });
  const observed = rows.filter(x => x.time !== null);
  return { rows, observedCount: observed.length, completeness: observed.length === rows.length ? 'timestamps_observed' : 'partial_or_unknown', recoveryVerified: false };
}
