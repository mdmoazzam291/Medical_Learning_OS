// Operator-only local provisioning. Never expose these operations as HTTP routes.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { StudyService } from '../src/server/study-service.js';
process.umask(0o077);
const [command, argument, output] = process.argv.slice(2);
if (!['provision', 'revoke', 'import'].includes(command) || !argument || (command === 'provision' && !output)) {
  console.error('Usage: node scripts/admin.js provision LEARNER TOKEN_FILE | revoke LEARNER | import CATALOG_FILE');
  process.exit(1);
}
const path = resolve(process.env.MLOS_DB_PATH || '.local/study.sqlite');
mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
const service = new StudyService(path);
try {
  if (command === 'provision') {
    // Roll back issuance if a protected, exclusive output file cannot be written.
    service.transaction(() => {
      const token = service.provision(argument);
      writeFileSync(resolve(output), token + '\n', { mode: 0o600, flag: 'wx' });
    });
    console.log('Credential saved to the requested private file; expires in seven days.');
  }
  if (command === 'revoke') { service.revokeLearner(argument); console.log('Learner credentials revoked.'); }
  if (command === 'import') console.log(service.importCatalog(JSON.parse(readFileSync(argument, 'utf8'))));
} finally { service.close(); }
