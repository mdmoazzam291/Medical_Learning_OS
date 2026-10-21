import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'mlos-pack-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'objects'));
  writeFileSync(join(root, 'schema.sql'), '-- synthetic empty schema\n');
  writeFileSync(join(root, 'objects/example.bin'), Buffer.from([0, 255, 1, 2]));
  return root;
}
const options = { serviceId: 'example', serviceIds: ['example'], createdAt: '2026-10-21T00:00:00.000Z' };

test('migration pack verifies nested binary bytes and refuses silent resealing', async t => {
  const { sealDirectory, verifyDirectory } = await import('../scripts/lib/migration-pack.js');
  const root = await fixture(t);
  const sealed = await sealDirectory(root, options);
  assert.equal(sealed.files, 2);
  assert.equal(sealed.bytes, 30);
  assert.deepEqual(await verifyDirectory(root, options.serviceIds), sealed);
  await assert.rejects(sealDirectory(root, options), /manifest_exists/);
});

for (const mutation of ['changed', 'missing', 'extra', 'traversal', 'duplicate', 'wrong-size', 'wrong-provider', 'malformed', 'empty']) {
  test(`migration verification rejects ${mutation} export`, async t => {
    const { sealDirectory, verifyDirectory } = await import('../scripts/lib/migration-pack.js');
    const root = await fixture(t);
    await sealDirectory(root, options);
    const manifestPath = join(root, 'migration-manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (mutation === 'changed') writeFileSync(join(root, 'objects/example.bin'), Buffer.from([0, 254, 1, 2]));
    if (mutation === 'missing') rmSync(join(root, 'schema.sql'));
    if (mutation === 'extra') writeFileSync(join(root, 'extra.sql'), 'extra');
    if (mutation === 'traversal') manifest.entries[0].path = '../outside';
    if (mutation === 'duplicate') manifest.entries.push(manifest.entries[0]);
    if (mutation === 'wrong-size') manifest.entries[0].bytes++;
    if (mutation === 'wrong-provider') manifest.serviceId = 'unknown';
    if (mutation === 'empty') manifest.entries = [];
    if (mutation === 'malformed') manifest.entries[0].sha256 = 'bad';
    writeFileSync(manifestPath, JSON.stringify(manifest));
    await assert.rejects(verifyDirectory(root, options.serviceIds));
  });
}

test('migration sealing and verification refuse symlink traversal', async t => {
  const { sealDirectory, verifyDirectory } = await import('../scripts/lib/migration-pack.js');
  const root = await fixture(t);
  symlinkSync(join(root, 'schema.sql'), join(root, 'alias.sql'));
  await assert.rejects(sealDirectory(root, options), /unsafe_file/);
  rmSync(join(root, 'alias.sql'));
  await sealDirectory(root, options);
  rmSync(join(root, 'schema.sql'));
  symlinkSync(join(root, 'objects/example.bin'), join(root, 'schema.sql'));
  await assert.rejects(verifyDirectory(root, options.serviceIds), /unsafe_file/);
});

test('CLI export root must be private and cannot use parent symlinks', async t => {
  const { resolvePrivatePack } = await import('../scripts/lib/migration-pack.js');
  const root = await fixture(t);
  mkdirSync(join(root, '.local/migrations/example'), { recursive: true });
  assert.equal(resolvePrivatePack(root, '.local/migrations/example'), join(root, '.local/migrations/example'));
  assert.throws(() => resolvePrivatePack(root, 'objects'), /private_pack_required/);
  assert.throws(() => resolvePrivatePack(root, '.local/migrations/../../objects'), /private_pack_required/);
  symlinkSync(join(root, 'objects'), join(root, '.local/migrations/alias'));
  assert.throws(() => resolvePrivatePack(root, '.local/migrations/alias'), /unsafe_directory/);
});
