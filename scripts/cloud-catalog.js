// Operator-only draft import. Never expose this command as an HTTP route.
import { readFileSync } from 'node:fs';
import { CloudCatalogStore, createStudyCloudClient } from '../src/server/cloud-catalog.js';

process.umask(0o077);
const [command, filename] = process.argv.slice(2);
if (command !== 'import-draft' || !filename) {
  console.error('Usage: node scripts/cloud-catalog.js import-draft CATALOG_FILE');
  process.exit(1);
}
const client = createStudyCloudClient({
  url: process.env.MLOS_SUPABASE_URL, secretKey: process.env.MLOS_SUPABASE_SECRET_KEY,
});
const catalog = JSON.parse(readFileSync(filename, 'utf8'));
const result = await new CloudCatalogStore(client).importDraft(catalog);
console.log(`Draft catalog imported at version ${result.version}; published ${result.published}.`);
