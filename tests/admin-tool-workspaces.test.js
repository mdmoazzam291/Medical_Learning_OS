import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { buildAdminActionInbox } from '../src/domain/admin-action-inbox.js';
import { summarizeRecoveryEvidence } from '../src/domain/operational-recovery.js';
import { navigationFor, routeIdentity } from '../src/domain/app-navigation.js';
const views = await import('../web/admin-workspace-view.js').catch(error => { if (error.code === 'ERR_MODULE_NOT_FOUND') return {}; throw error; });
const source = (await readFile(new URL('../web/owner-console.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '').replace(/^export .*;\n?/gm, '');
const context = vm.createContext({ document: { querySelector: () => null }, createSupabaseAuth: () => ({}), createCloudOwner: () => ({}), cloudConfig: {}, buildAdminActionInbox, summarizeRecoveryEvidence, overviewMarkup: views.overviewMarkup, window: { addEventListener() {} } });
vm.runInContext(source, context);
function fixture() {
  const panels = ['overview', 'snapshot', 'actions', 'users', 'authority', 'learning', 'content', 'integrity', 'source-watch', 'ai', 'health', 'alerts', 'features', 'research'].map(id => ({ dataset: { adminPanel: id }, hidden: false, contains: () => false }));
  const heading = { textContent: '', focus() {} }, status = { hidden: true, innerHTML: '' };
  const app = { dataset: { ownerState: 'loaded' }, ownerDocument: { activeElement: null }, querySelectorAll: () => panels, querySelector: key => key === '.page-heading h1' ? heading : key === '#admin-workspace-status' ? status : null };
  return { app, panels, heading, status, visible: () => panels.filter(panel => !panel.hidden).map(panel => panel.dataset.adminPanel) };
}
test('mounted owner tools start hidden rather than flashing the full dashboard', () => {
  const markup = vm.runInContext('dashboardMarkup({})', context);
  for (const id of ['admin-actions', 'owner-overview', 'owner-users', 'owner-learning', 'owner-content', 'owner-integrity', 'owner-source-watch', 'owner-review-authority', 'owner-ai', 'owner-infrastructure']) {
    assert.match(markup, new RegExp('<section\\b[^>]*id="' + id + '"[^>]*\\bhidden\\b'), id);
  }
});
test('Overview, Learner Accounts and Feature Gates show only their own panels', () => {
  assert.equal(typeof views.applyAdminWorkspace, 'function');
  const h = fixture();
  for (const [hash, expected] of [['', 'overview'], ['#owner-users', 'users'], ['#owner-features', 'features'], ['#owner-infrastructure-alerts', 'alerts'], ['#research-gate', 'research']]) {
    views.applyAdminWorkspace(h.app, hash, true);
    assert.deepEqual(h.visible(), [expected]);
  }
});
test('workspace visibility never creates Admin authority from a URL', () => {
  assert.equal(typeof views.applyAdminWorkspace, 'function');
  const h = fixture(); views.applyAdminWorkspace(h.app, '#owner-users', false);
  assert.deepEqual(h.visible(), []); assert.equal(h.status.hidden, true);
});
test('a missing selected tool shows loading or an honest owner-data error', () => {
  assert.equal(typeof views.applyAdminWorkspace, 'function');
  const h = fixture(); h.panels.splice(h.panels.findIndex(panel => panel.dataset.adminPanel === 'features'), 1);
  views.applyAdminWorkspace(h.app, '#owner-features', true);
  assert.deepEqual(h.visible(), []); assert.equal(h.status.hidden, false); assert.match(h.status.innerHTML, /Loading/);
  h.app.dataset.ownerState = 'unavailable'; views.applyAdminWorkspace(h.app, '#owner-features', true);
  assert.match(h.status.innerHTML, /unavailable/); assert.match(h.status.innerHTML, /data-owner-dashboard-retry/);
});
test('Overview urgent counts retain unknown telemetry and contain no tool forms', () => {
  assert.equal(typeof views.overviewMarkup, 'function');
  const missing = views.overviewMarkup({ content: {} });
  assert.match(missing, /Not verified/); assert.doesNotMatch(missing, /<form\b/);
  const measured = views.overviewMarkup({ content: { openLearnerReports: 2, unresolvedRights: 1, pendingReview: { medical: 1 } } }, [{ state: 'open', severity: 'critical', provider: 'Synthetic' }]);
  assert.match(measured, /Learner reports/); assert.match(measured, /Critical alerts/); assert.match(measured, /Action Inbox/);
  assert.doesNotMatch(measured, /data-owner-v3-feature-form|owner-learner-search-form/);
});
test('existing Content Snapshot and AI Usage remain reachable in their owning groups', () => {
  const rows = navigationFor('admin', { isAdmin: true });
  assert.equal(rows.find(row => row.id === 'content').children.filter(row => row.href === '/web/admin.html#owner-content').length, 1);
  assert.equal(rows.find(row => row.id === 'operations').children.filter(row => row.href === '/web/admin.html#owner-ai').length, 1);
  assert.equal(routeIdentity('/web/admin', '', '#owner-ai').section, 'operations');
});
test('failed owner projection marks the selected workspace unavailable', async () => {
  const app = { dataset: {}, addEventListener() {}, querySelector: key => key === '.workspace main#main' ? main : null };
  const main = { querySelector: () => null }, events = [];
  const failed = vm.createContext({ document: { querySelector: key => key === '#admin-app' ? app : null }, createSupabaseAuth: () => ({ getSession: async () => ({ user: { id: 'synthetic' } }) }), createCloudOwner: () => ({ dashboard: async () => { throw Object.assign(new Error('synthetic_outage'), { status: 503 }); } }), cloudConfig: {}, errorMonitor: { capture() {} }, window: { addEventListener() {}, dispatchEvent: event => events.push(event) }, CustomEvent: class { constructor(type) { this.type = type; } }, MutationObserver: class { observe() {} }, queueMicrotask });
  vm.runInContext(source, failed); await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.dataset.ownerState, 'unavailable');
  assert.equal(events.filter(event => event.type === 'mlos:admin-ready').length, 1);
});
test('an owner-data outage stops mutation-driven retries until explicit Retry', async () => {
  let notify, reads = 0, html = ''; const handlers = {};
  const status = { hidden: true, get innerHTML() { return html; }, set innerHTML(value) { html = value; if (reads < 3) notify?.(); } };
  const main = { querySelector: () => null }, heading = { textContent: '', focus() {} };
  const app = { dataset: {}, querySelectorAll: () => [], querySelector: key => key === '.workspace main#main' ? main : key === '#admin-workspace-status' ? status : key === '.page-heading h1' ? heading : null, addEventListener(type, fn) { handlers[type] = fn; } };
  const failed = vm.createContext({ document: { querySelector: key => key === '#admin-app' ? app : null }, createSupabaseAuth: () => ({ getSession: async () => ({ user: { id: 'synthetic' } }) }), createCloudOwner: () => ({ dashboard: async () => { reads++; throw Object.assign(new Error('synthetic_outage'), { status: 503 }); } }), cloudConfig: {}, errorMonitor: { capture() {} }, window: { addEventListener() {}, dispatchEvent() { views.applyAdminWorkspace(app, '#owner-users', true); } }, CustomEvent: class {}, MutationObserver: class { constructor(fn) { notify = fn; } observe() {} }, queueMicrotask });
  vm.runInContext(source, failed); await new Promise(resolve => setImmediate(resolve));
  assert.equal(reads, 1);
  handlers.click({ target: { closest: key => key === '[data-owner-dashboard-retry]' ? {} : null } }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(reads, 2);
});
