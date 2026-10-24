import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { navigationFor, routeIdentity } from '../src/domain/app-navigation.js';
import { navigationMarkup, workspaceMenuMarkup } from '../web/navigation-view.js';
const source = (await readFile(new URL('../web/admin.js', import.meta.url), 'utf8')).replace(/^import .*;\n/gm, '');
async function openAdmin({ pending = false, pairFailure = false, accessFailure = 0, deferredAccess = false, deferredPairs = false } = {}) {
  const root = { innerHTML: '', addEventListener() {} }, notice = { hidden: true };
  const accessRequests = [], pairRequests = [];
  const context = vm.createContext({
    document: { querySelector: selector => selector === '#admin-app' ? root : notice },
    createSupabaseAuth: () => ({ currentUser: () => ({ id: 'synthetic-owner', email: 'owner@example.invalid' }), getSession: () => pending ? new Promise(() => {}) : Promise.resolve({ user: { id: 'synthetic-owner' } }) }),
    createCloudReview: () => ({ me: async () => { if (deferredAccess) return new Promise(resolve => accessRequests.push(resolve)); if (accessFailure) throw Object.assign(new Error('access_failed'), { status: accessFailure }); return { isAdmin: true, reviewKinds: ['medical', 'references', 'rights'] }; }, transferPairs: async () => { if (deferredPairs) return new Promise(resolve => pairRequests.push(resolve)); if (pairFailure) throw Object.assign(new Error('projection_unavailable'), { status: 503 }); return { pairs: [], researchGate: null }; } }),
    cloudConfig: {}, errorMonitor: { capture() {} }, CustomEvent: class {}, dispatchEvent() {}, console
  });
  vm.runInContext(source, context); await new Promise(resolve => setImmediate(resolve));
  return { root, context, accessRequests, pairRequests, async revoke(status) { accessFailure = status; await vm.runInContext('loadAdmin()', context); } };
}
test('pending Admin verification never exposes owner controls', async () => {
  const h = await openAdmin({ pending: true });
  assert.match(h.root.innerHTML, /Verifying Admin access/);
  assert.doesNotMatch(h.root.innerHTML, /Open content review/);
});
test('an unavailable access check stays fail-closed with Retry, not learner denial', async () => {
  const h = await openAdmin({ accessFailure: 503 });
  assert.equal(h.context.mlosNavigationAdmin, false);
  assert.match(h.root.innerHTML, /Admin access unavailable/);
  assert.match(h.root.innerHTML, /data-action="reload"/);
  assert.doesNotMatch(h.root.innerHTML, /This authenticated account is a learner/);
});
test('failed research projection retains verified Admin navigation and Retry', async () => {
  const h = await openAdmin({ pairFailure: true });
  assert.equal(h.context.mlosNavigationAdmin, true);
  assert.match(h.root.innerHTML, /Admin data unavailable/);
});
test('revoked Admin authority removes owner controls', async () => {
  const h = await openAdmin(); await h.revoke(403);
  assert.equal(h.context.mlosNavigationAdmin, false);
  assert.doesNotMatch(h.root.innerHTML, /Open content review/);
});
test('expired Admin session asks for sign-in, not learner denial', async () => {
  const h = await openAdmin(); await h.revoke(401);
  assert.match(h.root.innerHTML, /Sign in with the content-admin account/);
});
test('failed access revalidation does not reuse a previous Admin grant', async () => {
  const h = await openAdmin(); await h.revoke(503);
  assert.equal(h.context.mlosNavigationAdmin, false);
  assert.match(h.root.innerHTML, /Admin access unavailable/);
  assert.doesNotMatch(h.root.innerHTML, /Open content review/);
});
test('an older access response cannot override a newer denial', async () => {
  const h = await openAdmin({ deferredAccess: true });
  vm.runInContext('loadAdmin()', h.context); await new Promise(resolve => setImmediate(resolve));
  h.accessRequests[1]({ isAdmin: false }); await new Promise(resolve => setImmediate(resolve));
  h.accessRequests[0]({ isAdmin: true, reviewKinds: ['medical'] }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.context.mlosNavigationAdmin, false);
  assert.doesNotMatch(h.root.innerHTML, /Open content review/);
});
test('an older research projection cannot override a newer access revocation', async () => {
  const h = await openAdmin({ deferredPairs: true });
  await h.revoke(403);
  h.pairRequests[0]({ pairs: [], researchGate: null }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.context.mlosNavigationAdmin, false);
  assert.doesNotMatch(h.root.innerHTML, /Open content review/);
});
test('Research Gate retains its destination when readiness is unavailable', async () => {
  const h = await openAdmin();
  assert.equal((h.root.innerHTML.match(/id="research-gate"/g) || []).length, 1);
});
test('research controls belong to an initially hidden Research workspace', async () => {
  const h = await openAdmin();
  assert.match(h.root.innerHTML, /data-admin-panel="research" hidden/);
  assert.doesNotMatch(h.root.innerHTML, /class="two-column"><section class="panel"><span class="eyebrow">CONTENT GOVERNANCE/);
});
test('a delayed research projection updates its workspace without replacing loaded owner tools', async () => {
  const h = await openAdmin({ deferredPairs: true }), original = h.root.innerHTML;
  const research = { innerHTML: '' }; h.root.querySelector = () => research;
  h.pairRequests[0]({ pairs: [], researchGate: null }); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.root.innerHTML, original);
  assert.match(research.innerHTML, /Readiness unavailable/);
});
test('pinned Admin groups do not duplicate local sidebar controls', () => {
  for (const expanded of [false, true]) {
    const html = navigationMarkup({ signedIn: true, phone: true, ...routeIdentity('/web/admin'), isAdmin: true, prefs: { expanded, pins: ['admin:content', 'admin:operations'] } });
    for (const id of ['content', 'operations']) assert.equal((html.match(new RegExp((expanded ? 'data-group' : 'data-flyout') + '="admin:' + id + '"', 'g')) || []).length, 1);
  }
});
test('Admin shortcuts remain confined to the Admin master', () => {
  const html = navigationMarkup({ signedIn: true, phone: true, master: 'study', section: 'practice', isAdmin: true, prefs: { pins: ['admin:operations'] } });
  assert.doesNotMatch(html, /data-flyout="admin:operations"/);
});
test('Admin retains its identity and all five local tool groups', () => {
  const html = navigationMarkup({ signedIn: true, ...routeIdentity('/web/admin'), isAdmin: true });
  assert.match(html, /data-master="admin"[^>]*aria-current="page"/);
  assert.deepEqual(navigationFor('admin', { isAdmin: true }).map(row => row.id), ['overview', 'content', 'learners', 'research', 'operations']);
});

test('authorized Admin entry belongs only to the avatar, never the global learner masters', () => {
  for (const phone of [false, true]) {
    const html = navigationMarkup({ signedIn: true, phone, master: 'study', section: 'practice', isAdmin: true });
    const main = html.match(/<nav[^>]*aria-label="Main navigation"[^>]*>([\s\S]*?)<\/nav>/)[1];
    assert.deepEqual([...main.matchAll(/data-master="([^"]+)"/g)].map(m => m[1]), ['home', 'study', 'library', 'exams']);
    const avatar = html.match(/<nav[^>]*aria-label="Account navigation"[^>]*>([\s\S]*?)<\/nav>/)[1];
    assert.equal((avatar.match(/data-master="admin"/g) || []).length, 1);
    assert.match(avatar, /href="\/web\/admin\.html"/);
    assert.doesNotMatch(main, /admin|Admin/);
  }
});
test('legacy Admin pins cannot expose Admin tool groups inside learner menus', () => {
  const prefs = { expanded: true, pins: ['admin:content', 'admin:operations', 'library:compare'] };
  for (const master of ['home', 'study', 'library', 'exams', 'account']) {
    const menu = workspaceMenuMarkup({ master, isAdmin: true, prefs });
    assert.doesNotMatch(menu, /data-(?:group|pin|flyout)="admin:|content-import\.html|owner-infrastructure/);
    const phone = navigationMarkup({ master, signedIn: true, phone: true, isAdmin: true, prefs }).split('<aside')[1];
    assert.doesNotMatch(phone, /data-(?:group|pin|flyout)="admin:|content-import\.html|owner-infrastructure/);
    if (master !== 'library') assert.match(menu, /Compare Concepts/, 'Ordinary learner pins still work');
  }
});
test('Admin pages have a local tools trigger outside the global header on every layout', () => {
  for (const phone of [false, true]) {
    const html = navigationMarkup({ signedIn: true, phone, master: 'admin', section: 'content', isAdmin: true });
    const header = html.split('</header>')[0];
    assert.doesNotMatch(header.replace(/<details class="mlos-account">[\s\S]*/, ''), /Master Admin|data-workspace-menu="admin"/);
    assert.match(html.split('</header>')[1], /aria-label="Admin tools"/);
    assert.equal((html.match(/class="mlos-admin-toolbar"/g) || []).length, 1);
    if (phone) assert.equal((html.match(/data-rail/g) || []).length, 1, 'Only the local Admin trigger opens its drawer');
    else assert.match(html, /data-workspace-menu="admin"/);
  }
});
test('denied Admin authority hides avatar entry and local tools despite a saved URL or pins', () => {
  for (const phone of [false, true]) {
    for (const signedIn of [false, true]) {
      const html = navigationMarkup({ signedIn, phone, master: 'admin', isAdmin: false, prefs: { pins: ['admin:content'] } });
      assert.doesNotMatch(html, /data-master="admin"|class="mlos-admin-toolbar"|data-workspace-menu="admin"|content-import\.html/);
    }
  }
});
test('medical relationship tools are discoverable once inside the Admin content group', () => {
  const rows = navigationFor('admin', { isAdmin: true });
  const links = rows.find(r => r.id === 'content').children;
  assert.equal(links.filter(r => r.href === '/web/content-import.html#medical-relationships').length, 1);
});
