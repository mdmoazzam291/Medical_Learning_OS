import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const text = value => typeof value === 'string' && value.trim().length > 0;
const safePath = value => text(value) && !value.startsWith('/') && !value.includes('\\') && value.split('/').every(part => part && part !== '.' && part !== '..');

export function validateServiceRegister(register, referenceExists = existsSync) {
  const errors = [];
  if (register?.schemaVersion !== 1) errors.push('unsupported schemaVersion');
  if (!Array.isArray(register?.services) || !register.services.length) return [...errors, 'services required'];
  const ids = new Set();
  for (const service of register.services) {
    if (!service || typeof service !== 'object') { errors.push('invalid service'); continue; }
    if (typeof service.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(service.id)) errors.push('invalid service id');
    if (ids.has(service.id)) errors.push(`duplicate service ${service.id}`);
    ids.add(service.id);
    for (const field of ['provider', 'status', 'owner', 'data', 'boundary', 'export', 'restore', 'gaps']) {
      if (!text(service[field])) errors.push(`${service.id}: ${field} required`);
    }
    if (!Array.isArray(service.markers) || !service.markers.length || service.markers.some(marker => !text(marker))) errors.push(`${service.id}: markers required`);
    if (!Array.isArray(service.references) || !service.references.length) errors.push(`${service.id}: references required`);
    else for (const path of service.references) if (!safePath(path) || !referenceExists(path)) errors.push(`${service.id}: missing reference`);
  }
  return errors;
}

export function detectCoupling(files, services) {
  const result = {};
  for (const [path, source] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
    const haystack = `${path}\n${source}`.toLowerCase();
    const ids = services.filter(service => service.markers.some(marker => haystack.includes(marker.toLowerCase()))).map(service => service.id).sort();
    if (ids.length) result[path] = ids;
  }
  return result;
}

export function checkCoupling(files, services, baseline) {
  const actual = detectCoupling(files, services), errors = [];
  if (!baseline || typeof baseline !== 'object' || Array.isArray(baseline)) return ['invalid coupling baseline'];
  const ids = new Set(services.map(service => service.id));
  for (const [path, approved] of Object.entries(baseline)) {
    if (!Array.isArray(approved) || approved.some(id => !ids.has(id))) { errors.push(`unknown provider in ${path}`); continue; }
    if (new Set(approved).size !== approved.length) errors.push(`duplicate provider in ${path}`);
    for (const id of approved) if (!actual[path]?.includes(id)) errors.push(`stale coupling: ${path} ${id}`);
  }
  for (const [path, detected] of Object.entries(actual)) {
    for (const id of detected) if (!Array.isArray(baseline[path]) || !baseline[path].includes(id)) errors.push(`unreviewed coupling: ${path} ${id}`);
  }
  return errors;
}

// Implementation/config only. Tests, teaching material and documentation are not runtime integrations.
export function implementationFiles(root = '.') {
  const files = {};
  const roots = ['src', 'web', 'cloudflare', 'supabase', 'ops', 'scripts', '.github'];
  const include = path => /\.(?:[cm]?js|ts|tsx|jsx|jsonc?|ya?ml|py|sh|sql|html)$/.test(path) && !path.startsWith('ops/portability/') && !/(^|\/)test[^/]*\.(?:js|py)$/.test(path);
  function walk(directory) {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isSymbolicLink()) throw new Error('implementation symlink is unsupported');
      if (entry.isDirectory() && !['node_modules', '__pycache__', '.local'].includes(entry.name)) walk(path);
      else if (entry.isFile() && include(path)) files[path] = readFileSync(join(root, path), 'utf8');
    }
  }
  for (const directory of roots) if (existsSync(join(root, directory))) walk(directory);
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isFile() && include(entry.name)) files[entry.name] = readFileSync(join(root, entry.name), 'utf8');
  }
  return files;
}

export function checkServicePortability(root = '.') {
  const register = JSON.parse(readFileSync(join(root, 'ops/portability/services.json'), 'utf8'));
  const errors = validateServiceRegister(register, path => existsSync(join(root, path)));
  if (errors.length) throw new Error(errors.join('\n'));
  const baseline = JSON.parse(readFileSync(join(root, 'ops/portability/coupling-baseline.json'), 'utf8'));
  errors.push(...checkCoupling(implementationFiles(root), register.services, baseline));
  if (errors.length) throw new Error(errors.join('\n'));
  return { services: register.services.length, locations: Object.keys(baseline).length };
}
