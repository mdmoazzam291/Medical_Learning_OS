import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAdminAccess } from '../web/navigation-access.js';

test('the Admin header requires a strict affirmative server grant', async () => {
  assert.equal(await resolveAdminAccess(async () => ({ isAdmin: true })), true);
  assert.equal(await resolveAdminAccess(async () => ({ isAdmin: false })), false);
  assert.equal(await resolveAdminAccess(async () => ({ isAdmin: 'true' })), false);
  assert.equal(await resolveAdminAccess(async () => ({ isAdmin: null })), false);
});
test('missing sessions and review endpoint outages fail closed', async () => {
  assert.equal(await resolveAdminAccess(async () => { throw new Error('not_authenticated'); }), false);
  assert.equal(await resolveAdminAccess(async () => { throw new Error('offline'); }), false);
});
