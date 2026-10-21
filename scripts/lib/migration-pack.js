import { createReadStream, constants, existsSync, lstatSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, resolve, sep, isAbsolute } from 'node:path';

const manifestName = 'migration-manifest.json';
const validPath = path => typeof path === 'string' && path.length > 0 && !path.includes('\\') && !path.includes('\0') && !isAbsolute(path) && path.split('/').every(part => part && part !== '..' && part !== '.');
const exactKeys = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');

export function resolvePrivatePack(repositoryRoot, input) {
  const root = resolve(repositoryRoot), directory = resolve(root, input);
  const path = relative(root, directory), parts = path.split(sep);
  if (parts[0] !== '.local' || parts[1] !== 'migrations' || parts.length < 3 || parts.some(part => !part || part === '..')) throw new Error('private_pack_required');
  let cursor = root;
  for (const part of parts) {
    cursor = join(cursor, part);
    const stat = lstatSync(cursor);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('unsafe_directory');
  }
  return directory;
}

function inventory(root, prefix = '') {
  const rootStat = lstatSync(root);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error('unsafe_directory');
  const paths = [];
  for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (!validPath(path)) throw new Error('unsafe_file');
    const stat = lstatSync(join(root, path));
    if (stat.isSymbolicLink()) throw new Error('unsafe_file');
    if (stat.isDirectory()) paths.push(...inventory(root, path));
    else if (!stat.isFile() || stat.nlink !== 1) throw new Error('unsafe_file');
    else if (path !== manifestName) paths.push(path);
  }
  return paths.sort();
}

async function hashFile(root, path) {
  const hash = createHash('sha256');
  let bytes = 0;
  const stream = createReadStream(join(root, path), { flags: constants.O_RDONLY | constants.O_NOFOLLOW });
  for await (const chunk of stream) { hash.update(chunk); bytes += chunk.length; }
  return { path, bytes, sha256: hash.digest('hex') };
}

function validateManifest(manifest, serviceIds) {
  if (!exactKeys(manifest, ['schemaVersion', 'serviceId', 'createdAt', 'entries']) || manifest.schemaVersion !== 1 || !serviceIds.includes(manifest.serviceId) || typeof manifest.createdAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(manifest.createdAt) || !Number.isFinite(Date.parse(manifest.createdAt))) throw new Error('invalid_manifest');
  if (!Array.isArray(manifest.entries) || !manifest.entries.length) throw new Error('invalid_entries');
  const paths = new Set();
  for (const entry of manifest.entries) {
    if (!exactKeys(entry, ['path', 'bytes', 'sha256']) || !validPath(entry.path) || entry.path === manifestName || paths.has(entry.path) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error('invalid_entry');
    paths.add(entry.path);
  }
}

const summary = manifest => ({ serviceId: manifest.serviceId, files: manifest.entries.length, bytes: manifest.entries.reduce((sum, entry) => sum + entry.bytes, 0) });

export async function sealDirectory(root, { serviceId, serviceIds, createdAt = new Date().toISOString() }) {
  if (existsSync(join(root, manifestName))) throw new Error('manifest_exists');
  const paths = inventory(root);
  const manifest = { schemaVersion: 1, serviceId, createdAt, entries: [] };
  for (const path of paths) manifest.entries.push(await hashFile(root, path));
  validateManifest(manifest, serviceIds);
  // Exclusive creation prevents accidental resealing of an altered export.
  writeFileSync(join(root, manifestName), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return summary(manifest);
}

export async function verifyDirectory(root, serviceIds) {
  const paths = inventory(root);
  const manifest = JSON.parse(readFileSync(join(root, manifestName), 'utf8'));
  validateManifest(manifest, serviceIds);
  if (JSON.stringify(paths) !== JSON.stringify(manifest.entries.map(entry => entry.path).sort())) throw new Error('file_set_mismatch');
  for (const entry of manifest.entries) {
    const actual = await hashFile(root, entry.path);
    if (actual.bytes !== entry.bytes || actual.sha256 !== entry.sha256) throw new Error('file_integrity_mismatch');
  }
  return summary(manifest);
}
