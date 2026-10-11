import test from 'node:test';
import assert from 'node:assert/strict';
const access = await import('../web/navigation-access.js').catch(() => null);
const resolve = input => { assert.ok(access, 'pinned admin access is resolved from the server on every master'); return access.resolvePinnedAccess(...input); };
test('ordinary pins never trigger an admin access read', async () => {
  assert.equal(await resolve([{ pins: ['library:subjects'] }, () => { throw new Error('unexpected read'); }]), false);
});
test('an admin pin requires a fresh true server grant and cannot trust stored flags', async () => {
  assert.equal(await resolve([{ pins: ['account:admin'], isAdmin: true }, async () => ({ isAdmin: false })]), false);
  assert.equal(await resolve([{ pins: ['account:admin'] }, async () => ({ isAdmin: 'true' })]), false);
  assert.equal(await resolve([{ pins: ['account:admin'] }, async () => ({ isAdmin: true })]), true);
});
test('an access outage hides the admin pin without granting browser authority', async () => {
  assert.equal(await resolve([{ pins: ['account:admin'] }, async () => { throw new Error('offline'); }]), false);
});
