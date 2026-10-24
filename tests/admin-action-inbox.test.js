import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdminActionInbox } from '../src/domain/admin-action-inbox.js';

test('action inbox ranks observed risks and never creates write authority', () => {
  const result = buildAdminActionInbox({
    generatedAt: '2026-10-12T00:00:00Z',
    content: { unresolvedRights: 3, openLearnerReports: 2, pendingReview: { medical: 1, references: 0, rights: 4 } }
  }, { alerts: [{ state: 'open', severity: 'critical', provider: 'Edge', status: 'degraded' }, { state: 'resolved', severity: 'critical', provider: 'R2', status: 'healthy' }] });
  assert.deepEqual(result.actions.map(x => x.kind), ['infrastructure', 'learner-report', 'source-rights', 'review-medical', 'review-rights']);
  assert.equal(result.actions[0].href, '/web/admin.html#owner-infrastructure-alerts');
  assert.ok(result.actions.every(x => x.href.startsWith('/web/')));
  assert.ok(result.actions.every(x => !('approve' in x) && !('publish' in x)));
  assert.deepEqual(result.missing, ['import drafts','medical relationship drafts']);
});

test('incomplete owner telemetry never masquerades as an all-clear', () => {
  const empty = buildAdminActionInbox({ content: {} });
  assert.equal(empty.actions.length, 0);
  assert.deepEqual(empty.missing, ['import drafts','medical relationship drafts','infrastructure alerts','learner reports','source rights','human-review queues']);
  const measuredZero = buildAdminActionInbox({ content: { openLearnerReports: 0, unresolvedRights: 0, pendingReview: { medical: 0 } } }, { alerts: [] });
  assert.equal(measuredZero.actions.length, 0);
  assert.deepEqual(measuredZero.missing, ['import drafts','medical relationship drafts','human-review queues']);
  const missingQueues = buildAdminActionInbox({ content: { openLearnerReports: 0, unresolvedRights: 0, pendingReview: {} } }, { alerts: [] });
  assert.deepEqual(missingQueues.missing, ['import drafts','medical relationship drafts','human-review queues']);
});

test('malformed count values and unknown alert statuses cannot invent issues', () => {
  const state = buildAdminActionInbox({ content: { openLearnerReports: '400', unresolvedRights: -1, pendingReview: { medical: Infinity } } }, { alerts: [{ state: 'closed', severity: 'critical' }, null] });
  assert.equal(state.actions.length, 0);
  assert.deepEqual(state.missing, ['import drafts','medical relationship drafts','learner reports','source rights','human-review queues']);
});
