import { readFileSync } from 'node:fs';
import { sealDirectory, verifyDirectory, resolvePrivatePack } from './lib/migration-pack.js';

try {
  const [command, path, serviceId, ...extra] = process.argv.slice(2);
  if (!['seal', 'verify'].includes(command) || !path || extra.length || (command === 'seal' ? !serviceId : serviceId !== undefined)) throw new Error('usage: seal .local/migrations/PACK SERVICE_ID | verify .local/migrations/PACK');
  const serviceIds = JSON.parse(readFileSync('ops/portability/services.json', 'utf8')).services.map(service => service.id);
  const root = resolvePrivatePack(process.cwd(), path);
  const result = command === 'seal' ? await sealDirectory(root, { serviceId, serviceIds }) : await verifyDirectory(root, serviceIds);
  console.log(JSON.stringify({ integrity: command === 'seal' ? 'sealed' : 'verified', ...result, restoreTested: false }));
} catch {
  // Do not echo private export filenames, paths, payloads or credentials.
  console.error('Migration pack failed. Check command arguments, registered service, private directory, regular files and manifest integrity.');
  process.exitCode = 1;
}
