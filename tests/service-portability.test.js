import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// New provider coupling must stop the check until its exit boundary is reviewed.
test('portability guard detects new coupling and rejects stale exceptions', async () => {
  const { checkCoupling } = await import('../scripts/lib/service-portability.js');
  const services = [{ id: 'database', markers: ['vendor.example'] }];
  const files = { 'src/adapters/database.js': 'fetch("https://vendor.example")' };
  assert.deepEqual(checkCoupling(files, services, { 'src/adapters/database.js': ['database'] }), []);
  assert.match(checkCoupling({ ...files, 'src/domain/engine.js': 'vendor.example' }, services, { 'src/adapters/database.js': ['database'] }).join(), /unreviewed.*src\/domain\/engine/);
  assert.match(checkCoupling({}, services, { 'src/adapters/database.js': ['database'] }).join(), /stale/);
  assert.match(checkCoupling(files, services, { 'src/adapters/database.js': ['unknown'] }).join(), /unknown/);
});

test('service register requires a complete exit record with existing source references', async () => {
  const { validateServiceRegister } = await import('../scripts/lib/service-portability.js');
  const register = JSON.parse(readFileSync('ops/portability/services.json', 'utf8'));
  assert.deepEqual(validateServiceRegister(register, () => true), []);
  const broken = structuredClone(register);
  delete broken.services[0].restore;
  assert.match(validateServiceRegister(broken, () => true).join(), /restore/);
  assert.match(validateServiceRegister(register, () => false).join(), /missing reference/);
  const duplicate = structuredClone(register);
  duplicate.services.push(duplicate.services[0]);
  assert.match(validateServiceRegister(duplicate, () => true).join(), /duplicate/);
  assert.match(validateServiceRegister({ ...register, schemaVersion: 99 }, () => true).join(), /schemaVersion/);
});

test('register rejects array and numeric IDs instead of coercing them', async () => {
  const { validateServiceRegister } = await import('../scripts/lib/service-portability.js');
  const register = JSON.parse(readFileSync('ops/portability/services.json', 'utf8'));
  for (const id of [['zoho'], 123, null, {}]) {
    const broken = structuredClone(register);
    broken.services.at(-1).id = id;
    assert.match(validateServiceRegister(broken, () => true).join(), /invalid service id/);
  }
  const repeatedArrays = structuredClone(register);
  repeatedArrays.services.push({ ...repeatedArrays.services.at(-1), id: ['zoho'] });
  repeatedArrays.services.at(-2).id = ['zoho'];
  assert.match(validateServiceRegister(repeatedArrays, () => true).join(), /invalid service id/);
});
