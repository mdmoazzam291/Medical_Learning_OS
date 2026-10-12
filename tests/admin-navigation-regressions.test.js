import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { navigationFor, routeIdentity } from '../src/domain/app-navigation.js';
import { navigationMarkup } from '../web/navigation-view.js';
import { resolvePinnedAccess } from '../web/navigation-access.js';

const source = (await readFile(new URL('../web/admin.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
async function openAdmin({ pending = false, pairFailure = false, initialAccessFailure = 0 } = {}) {
  const root = { innerHTML: '', addEventListener() {} }, notice = { hidden: true };
  let accessFailure = initialAccessFailure;
  const context = vm.createContext({
    document: { querySelector: selector => selector === '#admin-app' ? root : notice },
    createSupabaseAuth: () => ({ currentUser: () => ({ id: 'synthetic-owner', email: 'owner@example.invalid' }), getSession: () => pending ? new Promise(() => {}) : Promise.resolve({ user: { id: 'synthetic-owner' } }) }),
    createCloudReview: () => ({ me: async () => { if (accessFailure) throw Object.assign(new Error('forbidden'), { status: accessFailure }); return { isAdmin: true, reviewKinds: ['medical', 'references', 'rights'] }; }, transferPairs: async () => { if (pairFailure) throw Object.assign(new Error('projection_unavailable'), { status: 503 }); return { pairs: [], researchGate: null }; } }),
    cloudConfig: {}, errorMonitor: { capture() {} }, CustomEvent: class {}, dispatchEvent() {}, console
  });
  vm.runInContext(source, context); await new Promise(resolve => setImmediate(resolve));
  return { root, context, async revoke(status = 403) { accessFailure = status; await vm.runInContext('loadAdmin()', context); } };
}
test('the authorized Admin console does not mount a second sidebar or master header', async () => {
  const h = await openAdmin();
  const shared = navigationMarkup({ ...routeIdentity('/web/admin'), isAdmin: true, prefs: { expanded: true } });
  assert.equal(((shared + h.root.innerHTML).match(/<aside\b/g) || []).length, 1);
  assert.equal(((shared + h.root.innerHTML).match(/<header\b/g) || []).length, 1);
});
test('pending admin verification never labels a learner as server-authorized', async () => {
  const h = await openAdmin({ pending: true });
  assert.doesNotMatch(h.root.innerHTML, /Server authorized|Admin navigation|Open content review/);
});
test('an unavailable access check stays fail-closed with Retry instead of labeling an owner a learner', async () => {
  const h = await openAdmin({ initialAccessFailure: 503 });
  assert.equal(h.context.mlosNavigationAdmin, false);
  assert.match(h.root.innerHTML, /Admin access unavailable/);
  assert.match(h.root.innerHTML, /data-action="reload"/);
  assert.doesNotMatch(h.root.innerHTML, /This authenticated account is a learner|Open content review/);
});
test('Research Gate keeps its sidebar anchor when readiness is unavailable', async () => {
  const h = await openAdmin();
  assert.equal((h.root.innerHTML.match(/id="research-gate"/g) || []).length, 1);
});
test('a failed research projection retains verified Admin authority and exposes Retry', async () => {
  const h = await openAdmin({ pairFailure: true });
  assert.equal(h.context.mlosNavigationAdmin, true);
  assert.match(h.root.innerHTML, /Admin data unavailable/);
  assert.doesNotMatch(h.root.innerHTML, /Admin access only/);
});
test('revoked Admin authority removes Admin controls instead of retaining a stale grant', async () => {
  const h = await openAdmin(); await h.revoke();
  assert.equal(h.context.mlosNavigationAdmin, false);
  assert.doesNotMatch(h.root.innerHTML, /Open content review|Server authorized/);
});
test('the shared Admin menu includes every existing owner section exactly once', () => {
  const admin = navigationFor('account', { isAdmin: true }).find(row => row.id === 'admin');
  for (const hash of ['owner-overview', 'owner-users', 'owner-learning', 'owner-content', 'owner-review-authority', 'owner-features', 'owner-ai', 'owner-infrastructure', 'research-gate']) {
    assert.equal(admin.children.filter(row => row.href.endsWith('#' + hash)).length, 1, hash);
  }
  assert.equal(new Set(admin.children.map(row => row.href)).size, admin.children.length);
});
test('a pinned Admin does not duplicate the active Account sidebar menu', () => {
  for (const expanded of [false, true]) {
    const html = navigationMarkup({ master: 'account', section: 'admin', isAdmin: true, currentHref: '/web/admin#owner-users', prefs: { expanded, pins: ['account:admin'] } });
    assert.equal((html.match(expanded ? /data-group="account:admin"/g : /data-flyout="account:admin"/g) || []).length, 1);
  }
});
test('direct Admin tool pages verify access without requiring a previously pinned shortcut', async () => {
  assert.equal(await resolvePinnedAccess({ pins: [] }, async () => ({ isAdmin: true }), { adminRoute: true }), true);
  assert.equal(await resolvePinnedAccess({ pins: [] }, async () => ({ isAdmin: false }), { adminRoute: true }), false);
});
test('a child Admin destination is the only current page within its section navigation', () => {
  const html = navigationMarkup({ master: 'account', section: 'admin', isAdmin: true, currentHref: '/web/review?workspace=references', prefs: { expanded: true } });
  const local = html.split('<nav id="mlos-local-nav"')[1];
  assert.equal((local.match(/aria-current="page"/g) || []).length, 1);
  assert.match(local, /href="\/web\/admin.html" aria-current="location"/);
});
test('the collapsed Admin control identifies the current admin area', () => {
  const html = navigationMarkup({ master: 'account', section: 'admin', isAdmin: true, currentHref: '/web/admin#owner-users', prefs: {} });
  assert.match(html, /data-flyout="account:admin"[^>]*aria-current="location"/);
});
test('an expired Admin session asks for sign-in instead of calling the owner a learner', async () => {
  const h = await openAdmin(); await h.revoke(401);
  assert.match(h.root.innerHTML, /Sign in with the content-admin account/);
  assert.doesNotMatch(h.root.innerHTML, /This authenticated account is a learner/);
});
